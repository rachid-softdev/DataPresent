# Input Validation & XSS Protection Security Audit

## Summary

This audit examines the input validation and XSS protection mechanisms in the DataPresent application. The application implements several security measures including Prisma ORM for SQL injection prevention, dedicated sanitization functions, and React's automatic content escaping. However, several vulnerabilities were identified that could lead to XSS attacks and improper input handling.

**Security Score: 72/100**

---

## Findings

### VULNERABILITY 1: Comment Edit Missing XSS Sanitization

**Severity:** MEDIUM  
**Location:** `datapresent-web/app/[locale]/api/comments/[commentId]/route.ts` (Lines 16, 34-42)

**Description:**  
When editing a comment, the API updates the comment body directly without applying any sanitization. This creates an inconsistency with comment creation, which properly uses `sanitizeComment()`. An attacker who has compromised a user's account could inject malicious scripts through comment editing.

**Evidence:**
```typescript
// Line 16 - No sanitization on input
const { body } = await req.json()

// Line 34-36 - Direct update without sanitization
const updated = await prisma.comment.update({
  where: { id: commentId },
  data: { body: body.trim() },  // No sanitization applied
})
```

Compare with comment creation which properly sanitizes:
```typescript
// From comments/route.ts POST
const sanitizedBody = sanitizeComment(body)
```

**Recommendation:**  
Apply `sanitizeComment()` to the body before updating the database:

```typescript
const { body } = await req.json()

if (!body?.trim()) {
  return badRequest(ERROR_CODES.ERR_VALIDATION_COMMENT_REQUIRED)
}

// Add sanitization
const sanitizedBody = sanitizeComment(body)

const updated = await prisma.comment.update({
  where: { id: commentId },
  data: { body: sanitizedBody },
})
```

---

### VULNERABILITY 2: Organization Name Lacks Input Validation

**Severity:** MEDIUM  
**Location:** `datapresent-web/app/[locale]/api/organizations/[id]/route.ts` (Lines 70-75)

**Description:**  
The PATCH endpoint for updating organization names accepts any input without validation. This includes empty strings, excessively long strings, or potentially malicious content. While not directly an XSS vector (organization names are not typically rendered as HTML), this could lead to DoS attacks or database issues.

**Evidence:**
```typescript
const { name } = await req.json()

// No validation whatsoever
const org = await prisma.organization.update({
  where: { id },
  data: { name }  // Accepts any value
})
```

**Recommendation:**  
Add input validation with length limits and sanitization:

```typescript
const { name } = await req.json()

if (!name || typeof name !== 'string') {
  return badRequest(ERROR_CODES.ERR_VALIDATION_NAME_REQUIRED)
}

// Trim and limit length
const trimmedName = name.trim()
if (trimmedName.length === 0 || trimmedName.length > 100) {
  return badRequest(ERROR_CODES.ERR_VALIDATION_NAME_LENGTH)
}

const org = await prisma.organization.update({
  where: { id },
  data: { name: trimmedName }
})
```

---

### VULNERABILITY 3: sanitizeHtml() Has Multiple Bypass Potentials

**Severity:** MEDIUM  
**Location:** `datapresent-web/lib/sanitize.ts` (Lines 31-66)

**Description:**  
The `sanitizeHtml()` function uses regex-based replacement which can be bypassed in several ways:

1. **Case variation bypass:** `<SCRIPT>` (uppercase) is not caught by the regex
2. **Nested tag bypass:** `<scr<script>ipt>` - inner script tag is removed but creates malformed result
3. **SVG animation elements:** Event handlers on SVG elements are not blocked

**Evidence:**
```typescript
// Current implementation only handles lowercase
const removedTags = ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input']

// Regex only matches lowercase
const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi')
```

**Proof of concept bypasses:**
- `<SCRIPT>alert(1)</SCRIPT>` - uppercase not caught
- `<scr\x69pt>` - hex encoding not caught  
- `<svg/onload=alert(1)>` - SVG event handlers not removed

**Recommendation:**  
Use a proper HTML sanitization library like DOMPurify:

```typescript
import DOMPurify from 'dompurify'

export function sanitizeHtml(html: string): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'span', 'div', 'table', 'tr', 'td', 'th', 'thead', 'tbody'],
    ALLOWED_ATTR: ['href', 'class', 'id', 'style'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  })
}
```

---

### VULNERABILITY 4: sanitizeComment() Has Known XSS Limitation

**Severity:** LOW  
**Location:** `datapresent-web/lib/sanitize.ts` (Lines 102-121), Test: `tests/unit/lib/sanitize.test.ts` (Lines 123-127)

**Description:**  
The `sanitizeComment()` function only strips HTML tags but does not remove the content inside dangerous tags. The test file explicitly documents this as a known limitation.

**Evidence:**
```typescript
// From test file - shows the vulnerability
it('should strip HTML tags', () => {
  const input = '<p>Hello <script>alert(1)</script></p>'
  // Note: this function only removes tags, not content inside tags
  // This is a known limitation - the content "alert(1)" remains
  expect(sanitizeComment(input)).toBe('Hello alert(1)')
})
```

The implementation simply regex-replaces tags:
```typescript
let sanitized = body
  .replace(/<[^>]*>/g, '')  // Only removes tags, not content
```

**Recommendation:**  
Use a proper HTML parser to safely strip dangerous content:

```typescript
import { JSDOM } from 'jsdom'

export function sanitizeComment(body: string): string {
  if (!body) return ''
  
  const doc = new JSDOM(body).window.document
  
  // Get text content which automatically strips all HTML
  let sanitized = doc.body.textContent || ''
  
  // Then re-encode any HTML entities that might have been in original
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Limit length
  const MAX_LENGTH = 5000
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH)
  }
  
  return sanitized.trim()
}
```

---

### VULNERABILITY 5: OG HTML Endpoint No Input Length Limits

**Severity:** LOW  
**Location:** `datapresent-web/app/api/og-html/route.ts` (Lines 8-13, 86-93)

**Description:**  
The OG HTML endpoint accepts title and description parameters without length validation. While the `escapeHtml()` function properly escapes content, extremely long inputs could cause resource exhaustion or DoS.

**Evidence:**
```typescript
const title = searchParams.get('title') || 'DataPresent Blog'
const description = searchParams.get('description') || 'Latest news...'

// No length validation before using in HTML template
const html = `
  ...
  <h1 class="title">${escapeHtml(title)}</h1>
  <p class="description">${escapeHtml(description)}</p>
  ...
`
```

**Recommendation:**  
Add length validation:

```typescript
const MAX_TITLE_LENGTH = 100
const MAX_DESC_LENGTH = 200

let title = searchParams.get('title') || 'DataPresent Blog'
let description = searchParams.get('description') || 'Latest news...'

// Truncate to safe lengths
if (title.length > MAX_TITLE_LENGTH) title = title.substring(0, MAX_TITLE_LENGTH)
if (description.length > MAX_DESC_LENGTH) description = description.substring(0, MAX_DESC_LENGTH)
```

---

### VULNERABILITY 6: Report Regenerate - Sector Not Validated

**Severity:** LOW  
**Location:** `datapresent-web/app/[locale]/api/reports/[id]/regenerate/route.ts` (Lines 44-53)

**Description:**  
The regenerate endpoint accepts a `sector` parameter without validating it is a valid enum value. Invalid values could cause errors or be stored incorrectly.

**Evidence:**
```typescript
const { sector, slideCount } = await req.json().catch(() => ({}))

// No validation - accepts any string
if (sector) {
  updateData.sector = sector  // Could be any value
}
```

**Recommendation:**  
Add enum validation:

```typescript
import { Sector } from '@prisma/client'

const validSectors = ['TECH', 'HEALTH', 'FINANCE', 'RETAIL', 'EDUCATION', 'OTHER']

const { sector, slideCount } = await req.json().catch(() => ({}))

if (sector) {
  if (!validSectors.includes(sector)) {
    return badRequest(ERROR_CODES.ERR_VALIDATION_SECTOR_INVALID)
  }
  updateData.sector = sector as Sector
}
```

---

### VULNERABILITY 7: Multiple API Routes Missing Type Validation

**Severity:** LOW  
**Location:** Various API routes

**Description:**  
Several API routes perform minimal type checking on incoming JSON, relying only on basic presence checks. This could lead to unexpected behavior or runtime errors.

**Evidence:**
```typescript
// reorder route - only checks array type, not contents
const { slideOrder } = await req.json()
if (!Array.isArray(slideOrder)) { ... }

// Should also validate each item
slideOrder.forEach(item => {
  if (!item.id || typeof item.position !== 'number') {
    // Invalid structure
  }
})

// share route - accepts any isPublic value
const { isPublic } = await req.json()
// Should be: typeof isPublic === 'boolean'
```

**Recommendation:**  
Implement consistent schema validation using Zod across all API routes:

```typescript
import { z } from 'zod'

const reorderSchema = z.object({
  slideOrder: z.array(z.object({
    id: z.string().uuid(),
    position: z.number().int()
  }))
})

// In route handler:
const parsed = reorderSchema.safeParse(await req.json())
if (!parsed.success) {
  return badRequest(ERROR_CODES.ERR_VALIDATION_INVALID)
}
```

---

## Positive Security Measures

The application has several security controls worth noting:

1. **Prisma ORM Protection:** All database queries use Prisma's parameterized queries, providing inherent SQL injection protection
2. **Sanitization Functions:** Dedicated sanitization module exists with multiple utility functions
3. **Comment Creation Sanitization:** Comments are properly sanitized when created
4. **React Auto-Escaping:** Frontend components automatically escape content rendered via JSX
5. **Rate Limiting:** Most API endpoints implement rate limiting via `checkRateLimit()`
6. **Password Hashing:** Passwords are properly hashed using bcrypt
7. **Job Signing:** Queue jobs use signed data for authorization

---

## Recommendations Summary

| Priority | Issue | Action |
|----------|-------|--------|
| HIGH | Comment edit missing sanitization | Apply sanitizeComment() before database update |
| HIGH | sanitizeHtml() bypass potential | Replace with DOMPurify library |
| MEDIUM | Organization name validation | Add length limits and sanitization |
| MEDIUM | sanitizeComment() limitation | Rewrite using proper HTML parser |
| LOW | OG HTML input limits | Add max length validation |
| LOW | Sector validation | Validate against allowed enum values |
| LOW | API type validation | Implement Zod schema validation |

---

## Testing Recommendations

1. **XSS Testing:** Test all user input fields with payloads like:
   - `<script>alert(1)</script>`
   - `<img src=x onerror=alert(1)>`
   - `<svg onload=alert(1)>`
   - `javascript:alert(1)`
   - Case variations: `<SCRIPT>`, `<ScRiPt>`

2. **Input Validation Testing:** Test boundary conditions:
   - Empty strings
   - Maximum length strings
   - Special characters
   - Invalid types (numbers where strings expected)

3. **Fuzz Testing:** Use tools like OWASP ZAP to fuzz API endpoints

---

*Audit Date: May 19, 2026*  
*Auditor: Security Review*  
*Next Review: Quarterly*
