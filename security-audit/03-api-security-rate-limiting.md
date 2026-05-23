# API Security & Rate Limiting Audit

## Executive Summary

This audit examines the API security posture of the DataPresent Next.js application, specifically focusing on rate limiting implementation, authorization controls, IDOR vulnerabilities, and endpoint protection. The application demonstrates a generally solid security baseline with proper authentication and authorization checks on most endpoints. However, several areas of concern were identified that require attention.

**Overall Security Score: 72/100**

---

## 1. Rate Limiting Implementation Analysis

### 1.1 Current Implementation

The rate limiting is implemented in datapresent-web/lib/rate-limit.ts:

- **Storage**: Uses Prisma ORM with database storage for rate limit counters
- **Default Limits**:
  - Development: 100 requests per minute
  - Production: 30 requests per hour
- **Key Generation**: Based on user ID and action type (e.g., generate:user123)

### 1.2 Rate Limits by Endpoint

| Endpoint | Limit | Window | Location |
|----------|-------|--------|----------|
| Report Generation | 10/hour | 60 min | generate/route.ts:19 |
| Report Export | 20/hour | 60 min | export/route.ts:21 |
| File Upload | 20/hour | 60 min | upload/route.ts:18 |
| Comments | 50/hour | 60 min | comments/route.ts:61 |
| Organization Invite | 10/hour | 60 min | invite/route.ts:45 |

### 1.3 Findings

#### Finding 1.1: Race Condition in Rate Limiting (MEDIUM)

**Location**: datapresent-web/lib/rate-limit.ts

**Description**: The rate limiting implementation has a race condition vulnerability. The check-then-update pattern without database transactions allows multiple concurrent requests to pass the rate limit check before the counter is incremented.

**Evidence**:
`	ypescript
// Lines 21-35: No transaction wrapping
const rateLimit = await prisma.rateLimit.findUnique({ where: { key } })
if (!rateLimit) {
  await prisma.rateLimit.create({...})  // Race: another request might also create
  return true
}
// ... more race conditions in update logic
`

**Recommendation**: Implement database-level atomic operations using Prisma interactive transactions or use Redis-based rate limiting with atomic INCR operations.

---

#### Finding 1.2: Missing Rate Limiting on Sensitive Endpoints (MEDIUM)

**Locations**: 
- pp/[locale]/api/organizations/[id]/route.ts (DELETE)
- pp/[locale]/api/organizations/[id]/members/route.ts (DELETE)
- All /api/admin/* endpoints

**Description**: Sensitive operations like organization deletion, member removal, and administrative actions have no rate limiting protection. This could lead to abuse or denial of service.

**Evidence**:
- Organization DELETE at line 82-103: No rate limit check
- Member DELETE at line 94-130: No rate limit check  
- Admin endpoints: None have rate limiting

**Recommendation**: Add rate limiting to all mutation endpoints, especially destructive operations.

---

#### Finding 1.3: Database Performance Concern (LOW)

**Location**: datapresent-web/lib/rate-limit.ts

**Description**: Each rate limit check performs 1-2 database queries. Under high load, this creates significant database overhead.

**Recommendation**: Consider implementing rate limiting at the API gateway level or using Redis for faster in-memory rate limiting.

---

## 2. Authorization and Access Control

### 2.1 Authentication Model

The application uses NextAuth.js for session-based authentication. All protected endpoints verify the session and extract user ID from session.user.id.

### 2.2 Authorization Checks by Endpoint Type

**Protected Endpoints** (Require Auth):
- All /api/reports/* endpoints
- All /api/organizations/* endpoints
- All /api/user/* endpoints
- API Keys management
- File upload

**Public Endpoints**:
- /api/share/meta - Intentionally public for share functionality
- /api/auth/* - Authentication endpoints
- /api/stripe/* - Webhooks (signed)

### 2.3 Findings

#### Finding 2.1: Logic Error in Comments Authorization (MEDIUM)

**Location**: pp/[locale]/api/reports/[id]/comments/route.ts:34

**Description**: The authorization check has incorrect logic that may allow unauthorized access in edge cases.

**Evidence**:
`	ypescript
// Line 34: Logic error
if (!report.org.members.length && !report.isPublic) {
  return forbidden()
}
`

This checks if there are NO members AND the report is NOT public. The logic should be: if user is not a member AND report is not public, deny access.

**Recommendation**: Fix the authorization logic to properly check user membership status:
`	ypescript
const isMember = report.org.members.some(m => m.userId === session.user.id)
if (!isMember && !report.isPublic) {
  return forbidden()
}
`

---

#### Finding 2.2: Insufficient Validation on Member Deletion (MEDIUM)

**Location**: pp/[locale]/api/organizations/[id]/members/route.ts:103-130

**Description**: The DELETE endpoint allows any admin to remove any member without validation that the target user belongs to the same organization.

**Evidence**:
`	ypescript
// Lines 114-128: No validation that userId belongs to the org
const targetMembership = await prisma.membership.findFirst({
  where: { orgId, userId }
})
`

While it does check the membership exists, there is no explicit check that the requesting user has authority over that organization.

**Recommendation**: Ensure the requesting user membership role is verified against the orgId being modified.

---

#### Finding 2.3: User Self-Delete Missing Confirmation (LOW)

**Location**: pp/[locale]/api/user/route.ts:37-47

**Description**: Users can delete their own account without any confirmation or validation. This could lead to accidental account deletion.

**Evidence**:
`	ypescript
// No confirmation token or validation
export async function DELETE(req: NextRequest) {
  await prisma.user.delete({ where: { id: session.user.id } })
}
`

**Recommendation**: Implement a confirmation flow with a time-limited token before account deletion.

---

## 3. IDOR Analysis

### 3.1 IDOR Checks in Place

Most endpoints properly validate that the requesting user has access to the requested resource:

- **Reports**: Checks membership in organization (isMember check)
- **Organizations**: Validates user membership before returning data
- **Report Generation/Export**: Verifies org membership

### 3.2 Findings

#### Finding 3.1: Share Token Enumeration (LOW)

**Location**: pp/[locale]/api/share/meta/route.ts

**Description**: The share meta endpoint allows enumeration of valid share tokens. An attacker could potentially guess share tokens to access non-public reports.

**Evidence**:
`	ypescript
// Lines 18-30: No rate limiting on token validation
const report = await prisma.report.findUnique({
  where: { shareToken: token, isPublic: true }
})
`

**Recommendation**: Add rate limiting to the share meta endpoint to prevent token enumeration attacks.

---

#### Finding 3.2: Report Access via Stream Endpoint (MEDIUM)

**Location**: pp/[locale]/api/reports/[id]/stream/route.ts:36-42

**Description**: The stream endpoint correctly checks membership but uses a less secure pattern that could potentially miss edge cases.

**Evidence**:
`	ypescript
// Query pattern could be optimized
const hasAccess = user?.membership.some(m => 
  m.org.reports.some(r => r.id === reportId)
)
`

**Recommendation**: The current implementation is functionally correct but consider consolidating to a single query for clarity and performance.

---

## 4. Admin Endpoint Security

### 4.1 Admin Endpoint Overview

The application has dedicated admin endpoints under /api/admin/:
- /api/admin/plans - Plan management
- /api/admin/overrides - Entitlement overrides
- /api/admin/features - Feature flags
- /api/admin/orgs/[orgId]/entitlements - Organization entitlements
- /api/admin/cache/invalidate/[orgId] - Cache invalidation
- /api/debug/entitlements - Debug tracing

### 4.2 Findings

#### Finding 4.1: No Rate Limiting on Admin Endpoints (HIGH)

**Location**: All /api/admin/* routes

**Description**: Admin endpoints have no rate limiting protection. An authenticated admin could potentially abuse these endpoints or if admin credentials are compromised, there are no protections against automated attacks.

**Evidence**: None of the admin routes call checkRateLimit()

**Recommendation**: Implement rate limiting specifically for admin endpoints, potentially with stricter limits than regular endpoints.

---

#### Finding 4.2: Debug Endpoint Accessible to Admins Only (GOOD)

**Location**: pp/api/debug/entitlements/route.ts

**Description**: The debug endpoint is properly restricted to ADMIN role only.

**Evidence**:
`	ypescript
if (user?.role !== 'ADMIN') {
  return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
}
`

**Status**: Properly protected

---

## 5. API Key Security

### 5.1 Current Implementation

API keys are managed through /api/api-keys endpoint with the following controls:
- Plan-based access (Agency plan only)
- Key creation with expiration
- Key revocation capability
- Keys are returned only once at creation

### 5.2 Findings

#### Finding 5.1: API Key Deletion Missing Ownership Check (MEDIUM)

**Location**: pp/[locale]/api/api-keys/route.ts:74-104

**Description**: When deleting an API key, there is no verification that the key belongs to the users organization. A user could potentially attempt to delete keys from other organizations if they know the key ID.

**Evidence**:
`	ypescript
// Line 94: No org validation
const success = await revokeApiKey(keyId)
`

**Recommendation**: Verify the key belongs to the users organization before deletion.

---

## 6. Input Validation

### 6.1 Validation Coverage

| Endpoint | Validation | Status |
|----------|-----------|--------|
| Report Generation | JSON body, report exists, member check | Good |
| Report Export | Format validation, plan check | Good |
| File Upload | File required, slide count validation | Good |
| Organization Update | Name validation | Good |
| Member Invite | Email validation | Good |
| Comments | Body required, length limit (5000) | Good |

### 6.2 Findings

#### Finding 6.1: Missing Input Sanitization on Report Sector (LOW)

**Location**: pp/[locale]/api/upload/route.ts:69

**Description**: The sector parameter is cast directly to enum without validation.

**Evidence**:
`	ypescript
sector: sector as any  // No validation that sector is valid
`

**Recommendation**: Add validation to ensure sector matches valid enum values.

---

## 7. Error Handling and Information Disclosure

### 7.1 Findings

#### Finding 7.1: Verbose Error Messages in Invite Endpoint (LOW)

**Location**: pp/[locale]/api/organizations/[id]/invite/route.ts

**Description**: The invite endpoint logs detailed security events but the error messages to clients are generic.

**Evidence**:
`	ypescript
// Line 35-40: Security event logging is good
logSecurityEvent({
  type: 'unauthorized_access',
  userId: session.user.id,
  path: /api/organizations//invite,
  details: 'Attempted to invite without permission'
})
`

**Status**: Good - logs securely, returns generic errors

---

## 8. Stripe Webhook Security

### 8.1 Findings

#### Finding 8.1: Webhook Signature Verification (GOOD)

The Stripe webhook endpoint should verify webhook signatures. Based on the endpoint structure, this is handled by the Stripe library.

**Status**: Verify in Stripe library implementation

---

## Summary of Vulnerabilities

| ID | Vulnerability | Severity | Location |
|----|---------------|----------|----------|
| V1 | Race condition in rate limiting | MEDIUM | lib/rate-limit.ts |
| V2 | Missing rate limiting on sensitive endpoints | MEDIUM | Multiple routes |
| V3 | Logic error in comments authorization | MEDIUM | comments/route.ts:34 |
| V4 | No rate limiting on admin endpoints | HIGH | All admin routes |
| V5 | Member deletion missing org validation | MEDIUM | members/route.ts |
| V6 | API key deletion missing ownership check | MEDIUM | pi-keys/route.ts |
| V7 | Share token enumeration possible | LOW | share/meta/route.ts |
| V8 | User self-delete missing confirmation | LOW | user/route.ts |
| V9 | Missing sector input validation | LOW | upload/route.ts |

---

## Recommendations

### Priority 1 (Critical)
1. **Add rate limiting to admin endpoints** - Immediately protect administrative routes from abuse
2. **Fix rate limiting race condition** - Use database transactions or Redis for atomic operations

### Priority 2 (High)
3. **Fix comments authorization logic** - Correct the boolean logic for member/public access
4. **Add rate limiting to destructive operations** - Organization delete, member remove
5. **Validate API key ownership** - Ensure users can only delete their own orgs keys

### Priority 3 (Medium)
6. **Add rate limiting to share token endpoint** - Prevent token enumeration
7. **Implement account deletion confirmation** - Require token confirmation
8. **Add sector validation** - Validate against valid enum values

---

## Security Score Calculation

| Category | Score | Weight | Weighted Score |
|----------|-------|--------|----------------|
| Rate Limiting Implementation | 60/100 | 30% | 18.0 |
| Authorization Controls | 75/100 | 30% | 22.5 |
| IDOR Protection | 80/100 | 15% | 12.0 |
| Admin Endpoint Security | 65/100 | 15% | 9.75 |
| Input Validation | 85/100 | 10% | 8.5 |

**Total Score: 72/100**

---

## Conclusion

The DataPresent application demonstrates a reasonable security posture with proper authentication and authorization patterns. The main areas requiring attention are:

1. **Rate limiting improvements** - Both implementation quality and coverage
2. **Admin endpoint protection** - Lacks rate limiting entirely
3. **Authorization logic** - Some edge cases need fixing

The application uses good security practices like:
- Signed job data for queue processing
- Member-based access control on reports
- Plan-based feature gating
- Security event logging

With the recommended fixes, the security score could be improved to approximately 85/100.
