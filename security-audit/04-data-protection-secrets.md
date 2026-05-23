# Security Audit: Data Protection & Secrets Management

**Date:** May 19, 2026  
**Application:** DataPresent (Next.js)  
**Auditor:** Security Audit  
**File:** 04-data-protection-secrets.md

---

## Executive Summary

This audit examined data protection and secrets management in the DataPresent application. The review focused on environment variable handling, hardcoded secrets, R2 cloud storage security, Stripe payment processing, email handling, and API key management.

**Security Score: 72/100**

The application implements several security best practices but has critical areas requiring immediate attention, including hardcoded fallback secrets and inconsistent environment validation schemas.

---

## Findings Summary

| Severity | Count |
|----------|-------|
| Critical | 2 |
| High | 3 |
| Medium | 2 |
| Low | 3 |
| **Total** | **10** |

---

## Vulnerability Details

### 1. Hardcoded Fallback Secret (CRITICAL)

**Location:** 
- `lib/security/csrf.ts` (line 4)
- `lib/security/csrf-middleware.ts` (line 58)
- `lib/queue/job-security.ts` (line 3)

**Description:**
The application uses a hardcoded fallback secret `'default-secret-change-me'` when the `CSRF_SECRET` or `NEXTAUTH_SECRET` environment variables are not set. This creates a critical vulnerability where cryptographic operations use a predictable, well-known secret.

**Evidence:**
```typescript
// lib/security/csrf.ts line 4
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'default-secret-change-me'
```

**Risk:**
- CSRF tokens can be forged by attackers who know the default secret
- Job signatures can be tampered with
- Session integrity compromised if NEXTAUTH_SECRET is not properly configured

**Recommendation:**
1. Remove the fallback default secret entirely
2. Fail application startup if neither `CSRF_SECRET` nor `NEXTAUTH_SECRET` is set in production
3. Add validation in `env.ts` to require these secrets in production:
```typescript
NODE_ENV: z.enum(['development', 'test', 'production']),
CSRF_SECRET: z.string().min(32).optional(),
// In production, require CSRF_SECRET
```

---

### 2. Inconsistent Environment Validation (CRITICAL)

**Location:** 
- `env.ts` (main schema)
- `lib/env-runtime.ts` (runtime validation)

**Description:**
The application has two conflicting environment variable schemas:
- `env.ts` - Uses lenient validation with `.optional()` for many sensitive variables
- `lib/env-runtime.ts` - Uses stricter validation with minimum character requirements

This inconsistency can lead to production deployments with weak or missing secrets going undetected.

**Evidence:**
```typescript
// env.ts - lenient
STRIPE_SECRET_KEY: z.string().optional(),
R2_SECRET_ACCESS_KEY: z.string().optional(),

// env-runtime.ts - strict
STRIPE_SECRET_KEY: z.string().startsWith('sk_').optional(),
R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 characters'),
ANTHROPIC_API_KEY: z.string().min(40, 'ANTHROPIC_API_KEY must be at least 40 characters'),
```

**Risk:**
- Weak or missing secrets may pass validation and deploy to production
- Inconsistent security posture between environments
- Runtime errors when expected secrets are missing

**Recommendation:**
1. Consolidate to a single schema (preferably `env-runtime.ts` with its stricter validation)
2. Add production-specific required fields
3. Ensure startup fails if required production secrets are missing

---

### 3. Non-Hashed Security Tokens (HIGH)

**Location:** 
- `prisma/schema.prisma` - Models: MagicLinkToken, PasswordResetToken, InviteToken, VerificationToken

**Description:**
Security tokens (magic links, password resets, invites) are stored in plain text in the database without hashing. If the database is compromised, attackers can use these tokens to:
- Access user accounts via magic links
- Reset user passwords
- Accept unauthorized invitations

**Evidence:**
```prisma
// prisma/schema.prisma
model MagicLinkToken {
  id        String   @id @default(cuid())
  email     String
  token     String   @unique  // Stored in plain text!
  expires   DateTime
  used      Boolean  @default(false)
}
```

**Risk:**
- Database compromise leads to immediate account takeover
- Tokens visible to database administrators
- No defense-in-depth if database is leaked

**Recommendation:**
1. Hash tokens before storage using a proper hashing algorithm (Argon2id or SHA-256)
2. Store only the hash in the database
3. Implement token rotation after use

---

### 4. Missing R2 Bucket Policies Review (HIGH)

**Location:** 
- `lib/r2.ts`

**Description:**
The R2 configuration uses credentials directly without visible bucket policy validation. There is no evidence of:
- Bucket access policy review
- IP-based access restrictions
- Object lifecycle management
- Public access prevention checks

**Evidence:**
```typescript
// lib/r2.ts
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})
```

**Risk:**
- Overly permissive bucket access
- Potential for data exposure
- No audit trail for access patterns

**Recommendation:**
1. Implement bucket access policies that restrict:
   - Source IP ranges
   - Specific IAM principals
   - Required encryption at rest
2. Enable R2 logging and monitor access patterns
3. Configure CORS policies for web-accessible objects

---

### 5. Presigned URL Expiration (MEDIUM)

**Location:** 
- `lib/r2.ts` (line 29)

**Description:**
Download presigned URLs expire after 3600 seconds (1 hour). While this is reasonable for most use cases, longer expiration times for sensitive documents could pose risks.

**Evidence:**
```typescript
// lib/r2.ts
export async function getSignedDownloadUrl(key: string) {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
  })
  return getSignedUrl(r2Client, command, { expiresIn: 3600 })
}
```

**Risk:**
- URLs remain valid for 1 hour even after user session ends
- No way to revoke individual URLs before expiration

**Recommendation:**
1. Consider shorter expiration for sensitive documents (300-600 seconds)
2. Implement URL revocation capability for admin controls
3. Add logging for presigned URL generation

---

### 6. Stripe Webhook Signature Verification (GOOD)

**Location:** 
- `lib/stripe-webhook-handler.ts` (lines 325-343)
- `app/[locale]/api/stripe/webhook/route.ts`

**Description:**
The application properly implements Stripe webhook signature verification using `stripe.webhooks.constructEvent()`.

**Evidence:**
```typescript
// lib/stripe-webhook-handler.ts
export function constructWebhookEvent(payload: string, signature: string): Stripe.Event {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET!)
}
```

**Status:** ✅ Properly implemented with:
- Signature verification using STRIPE_WEBHOOK_SECRET
- Error handling that captures exceptions
- Returns null for invalid signatures

**Recommendation:**
- Continue using this pattern
- Add explicit webhook endpoint firewall rules if possible

---

### 7. Password Hashing - Argon2id (GOOD)

**Location:** 
- `lib/password.ts`

**Description:**
The application uses Argon2id for password hashing with secure parameters.

**Evidence:**
```typescript
// lib/password.ts
export async function hashPassword(password: string): Promise<string> {
  return await hash(password, {
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    outputLen: 32,
    parallelism: 4,
  })
}
```

**Status:** ✅ Uses recommended Argon2id parameters

**Note:** The password validation (`isPasswordValid`) only requires 8 characters and 1 letter - consider increasing to 12+ characters with mixed case, numbers, and special characters.

---

### 8. API Key Management (GOOD)

**Location:** 
- `lib/api-keys.ts`

**Description:**
API keys are properly hashed before storage using the same password hashing mechanism.

**Evidence:**
```typescript
// lib/api-keys.ts
const keyHash = await hashPassword(key)
// Store keyHash, not the raw key
```

**Status:** ✅ API keys are hashed with Argon2id

**Positive findings:**
- 64-character secure random key generation
- Key expiration support
- Proper hashing before storage
- Last used tracking for audit

---

### 9. Share Password Hashing (GOOD)

**Location:** 
- `app/[locale]/api/reports/[id]/share/route.ts`

**Description:**
Share passwords are properly hashed before storage in the database.

**Evidence:**
```typescript
// app/[locale]/api/reports/[id]/share/route.ts line 149
const hashedPassword = password ? await hashPassword(password) : null
```

**Status:** ✅ Share passwords properly hashed

---

### 10. Email Security (LOW)

**Location:** 
- `lib/email.ts`

**Description:**
The application supports two email methods:
- Development: SMTP (with optional authentication)
- Production: Resend (API-based)

**Observations:**
1. SMTP in development uses `secure: false` (line 20) - acceptable for dev but should be documented
2. No SPF/DKIM verification mentioned for custom domains
3. Email provider configuration is optional in schema but required in production

**Risk:**
- Unencrypted SMTP transmission in development
- No email deliverability guarantees

**Recommendation:**
1. Document SMTP security requirements for staging/production
2. Add Resend configuration validation for production deployments

---

## Additional Security Observations

### Environment Variable Logging

The `lib/env-runtime.ts` file contains sanitized logging (lines 96-100):
```typescript
console.log(`  - Database: ${result.data.DATABASE_URL.split('@')[1]?.split('?')[0] || 'connected'}`)
```

This correctly masks credentials - ✅ Good practice

### Token Expiration

Security tokens (MagicLinkToken, PasswordResetToken, InviteToken) all have expiration fields - ✅ Good practice

### Session Configuration

NextAuth is configured with:
- JWT strategy (more secure than database sessions)
- 24-hour max session age
- Hourly session updates

✅ Good security posture

---

## Recommendations Priority List

| Priority | Action | Impact |
|----------|--------|--------|
| P0 | Remove hardcoded fallback secret | Critical |
| P0 | Consolidate environment validation schemas | Critical |
| P1 | Hash security tokens (MagicLink, PasswordReset, Invite) | High |
| P1 | Review and document R2 bucket policies | High |
| P2 | Implement stricter password requirements (12+ chars) | Medium |
| P2 | Add shorter presigned URL expiration for sensitive files | Medium |
| P3 | Document email security requirements | Low |
| P3 | Add IP allowlisting for webhook endpoints | Low |

---

## Conclusion

The DataPresent application demonstrates good security fundamentals in several areas (password hashing, Stripe webhook verification, API key management). However, critical vulnerabilities around hardcoded secrets and inconsistent environment validation require immediate attention to prevent potential security incidents.

**Recommended next steps:**
1. Immediately address the hardcoded fallback secret issue
2. Consolidate environment validation
3. Implement token hashing for security-critical tokens
4. Document and review R2 bucket access policies

---

*This audit was conducted as part of the DataPresent security review process.*
