# Authentication & Session Security Audit Report

## Executive Summary

This security audit examines the authentication and session management implementation in the DataPresent Next.js application. The audit covers NextAuth configuration, CSRF protection, password hashing, and all authentication-related API endpoints.

**Overall Security Score: 72/100**

The application demonstrates solid foundational security practices with proper JWT token handling, strong password hashing using Argon2id, and CSRF protection mechanisms. However, several critical and medium-severity vulnerabilities were identified that require immediate attention, particularly around secret management and password validation strength.

---

## Findings Summary

| Severity | Count | Key Issues |
|----------|-------|------------|
| Critical | 1 | Default fallback secrets |
| High | 1 | Weak password validation |
| Medium | 2 | Unused OAuth config, token rotation gaps |
| Low | 3 | Rate limiting implementation, email patterns |

---

## Detailed Findings

### 1. Critical: Default Fallback Secrets

**Location**: 
- `datapresent-web/lib/security/csrf.ts` (line 4)
- `datapresent-web/lib/security/csrf-middleware.ts` (line 58)

**Description**: The CSRF protection implementation includes a dangerous fallback to a default secret value when environment variables are not set.

**Evidence**:
```typescript
// csrf.ts line 4
const CSRF_SECRET = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'default-secret-change-me'

// csrf-middleware.ts line 58
const secret = process.env.CSRF_SECRET || process.env.NEXTAUTH_SECRET || 'default-secret-change-me'
```

**Risk**: If either CSRF_SECRET or NEXTAUTH_SECRET environment variables are not properly configured in production, the system falls back to a well-known default value. Attackers who discover this can forge CSRF tokens, bypassing all CSRF protection.

**Recommendation**: 
1. Remove the fallback to 'default-secret-change-me'
2. Require CSRF_SECRET to be set in all environments
3. Add startup validation that fails if required secrets are missing
4. Consider using Next.js built-in CSRF protection via NextAuth

**Remediation Priority**: P0 - Immediate

---

### 2. High: Weak Password Validation

**Location**: `datapresent-web/lib/password.ts` (lines 37-40)

**Description**: The password validation only requires 8 characters and at least one letter, which does not meet modern security standards.

**Evidence**:
```typescript
export function isPasswordValid(password: string): boolean {
  return password.length >= 8 && /[a-zA-Z]/.test(password)
}
```

**Risk**: Users can set extremely weak passwords such as "aaaaaaaa" or "password1" that will pass validation but are vulnerable to brute force and dictionary attacks. The OWASP threshold for minimum password strength typically requires 12+ characters with complexity requirements.

**Recommendation**:
1. Increase minimum length to 12 characters
2. Require at least one uppercase letter, one lowercase letter, one number, and one special character
3. Add common password list checking (reject top 10,000 passwords)
4. Implement password strength meter in UI

**Remediation Priority**: P1 - Within 30 days

---

### 3. Medium: GitHub OAuth Configured But Not Used

**Location**: `datapresent-web/.env.example` (lines 52-53) vs `datapresent-web/lib/auth.ts`

**Description**: Environment variables for GitHub OAuth are documented and likely configured, but the OAuth provider is not implemented in the NextAuth configuration.

**Evidence**: The `.env.example` file shows:
```
GITHUB_ID=your-github-id
GITHUB_SECRET=your-github-secret
```

However, `auth.ts` only includes GoogleProvider and CredentialsProvider (magic-link).

**Risk**: 
1. Misleading configuration - developers may expect GitHub login to work
2. Potential credential leakage if these env vars are used elsewhere
3. Inconsistent user expectations

**Recommendation**:
1. Either implement GitHub OAuth provider or remove the configuration from .env.example
2. If intentionally not implementing, document this decision
3. Clean up unused environment variables from production

**Remediation Priority**: P2 - Within 90 days

---

### 4. Medium: Token Rotation Gap

**Location**: `datapresent-web/lib/auth.ts` (lines 74-78)

**Description**: While the JWT callback includes token age checking for rotation, there is no mechanism to automatically refresh the token when `needsRefresh` is set.

**Evidence**:
```typescript
// Check token age for rotation (24 hours)
const now = Math.floor(Date.now() / 1000)
if (token.iat && (now - token.iat) > 24 * 60 * 60) {
  token.needsRefresh = true
}
```

The `needsRefresh` flag is set but never acted upon. Users with sessions older than 24 hours will continue using stale tokens until they are explicitly invalidated.

**Risk**: 
1. Long-lived sessions without automatic rotation
2. No graceful token refresh mechanism
3. Potential session hijacking if token is compromised and session remains active

**Recommendation**:
1. Implement automatic token refresh in the session callback
2. Consider using refresh tokens for extended sessions
3. Add maximum session duration regardless of activity

**Remediation Priority**: P2 - Within 90 days

---

### 5. Low: Database-Based Rate Limiting

**Location**: `datapresent-web/lib/rate-limit.ts`

**Description**: Rate limiting uses the database (Prisma with PostgreSQL) instead of an in-memory or Redis-based solution.

**Evidence**: The implementation queries and updates the `rateLimit` table in PostgreSQL for every request check.

**Risk**: 
1. Performance degradation under high load
2. Database becomes a bottleneck for auth endpoints
3. Race conditions possible with concurrent requests

**Recommendation**:
1. Migrate to Redis-based rate limiting (already available per .env.example)
2. Implement sliding window algorithm
3. Consider using Upstash or similar serverless-compatible rate limiting

**Remediation Priority**: P3 - Within 6 months

---

### 6. Low: Email Normalization Inconsistency

**Location**: 
- `datapresent-web/app/[locale]/api/auth/magic-link/route.ts` (line 18)
- `datapresent-web/app/[locale]/api/auth/forgot-password/route.ts` (line 9)

**Description**: Magic-link normalizes email to lowercase but forgot-password does not.

**Evidence**:
```typescript
// magic-link/route.ts - normalized
const normalizedEmail = email.toLowerCase().trim()

// forgot-password/route.ts - NOT normalized
const { email } = await req.json()
```

**Risk**: Users with different email casing may experience inconsistent behavior. For example, "User@example.com" might not receive password reset emails if the account was created as "user@example.com".

**Recommendation**:
1. Normalize email to lowercase in all auth endpoints
2. Add email validation and normalization at the application layer
3. Consider using a dedicated email normalization library

**Remediation Priority**: P3 - Within 6 months

---

## Positive Security Findings

### 1. Strong Password Hashing

**Implementation**: Argon2id with appropriate parameters
- Memory cost: 64 MB (65536 KB)
- Time cost: 3 iterations
- Parallelism: 4 threads
- Output length: 32 bytes

This configuration aligns with OWASP recommendations and provides excellent protection against both GPU and ASIC-based attacks.

---

### 2. Proper JWT Session Configuration

**Implementation**:
- Uses JWT strategy (not database sessions)
- maxAge: 24 hours
- updateAge: 60 minutes (session refreshed hourly)
- Token includes issued-at timestamp for age tracking

The configuration provides a good balance between security and usability.

---

### 3. CSRF Token Encryption

**Implementation**: 
- Uses AES-256-GCM (authenticated encryption)
- 16-byte IV + 16-byte auth tag per token
- 1-hour token validity window
- Proper timing-safe comparison for HMAC operations

The cryptographic implementation is sound and uses modern best practices.

---

### 4. Magic Link Security

**Implementation**:
- 10-minute token expiry (appropriate for magic links)
- Tokens marked as used after consumption (prevents replay)
- Old token cleanup on each request
- Rate limiting per email address
- Generic success message to prevent email enumeration

---

### 5. Rate Limiting Coverage

All authentication endpoints implement rate limiting:
- `/api/auth/magic-link` - Rate limited
- `/api/auth/signup` - Rate limited
- `/api/auth/forgot-password` - 5 requests/hour
- `/api/auth/accept-invite` - 5 requests/hour with auth required

---

## Recommendations Summary

### Immediate Actions (This Week)
1. **P0**: Remove default secret fallback and validate environment configuration on startup
2. **P0**: Audit all environment variables to ensure CSRF_SECRET and NEXTAUTH_SECRET are properly set

### Short-Term Actions (Within 30 Days)
3. **P1**: Strengthen password validation requirements to meet OWASP guidelines
4. **P1**: Implement automatic JWT refresh mechanism

### Medium-Term Actions (Within 90 Days)
5. **P2**: Either implement GitHub OAuth or clean up unused configuration
6. **P2**: Add comprehensive email normalization across all endpoints

### Long-Term Improvements (Within 6 Months)
7. **P3**: Migrate rate limiting to Redis for better performance
8. **P3**: Implement additional security headers (HSTS, CSP)

---

## Security Checklist

| Control | Status | Notes |
|---------|--------|-------|
| Password Hashing (Argon2id) | Pass | Strong implementation |
| JWT Configuration | Partial | Works but needs refresh mechanism |
| CSRF Protection | Fail | Default secret vulnerability |
| Rate Limiting | Partial | Works but using wrong storage |
| Session Fixation | Pass | JWT strategy prevents this |
| Token Expiry | Pass | Appropriate timeouts |
| Email Enumeration Prevention | Pass | Generic messages returned |
| OAuth Security | Partial | Only Google implemented |
| Password Validation | Fail | Too weak |

---

## Conclusion

The DataPresent application implements several strong security controls for authentication and session management. The use of Argon2id for password hashing and proper JWT configuration demonstrates a security-conscious approach. However, the critical vulnerability around default fallback secrets and the weak password validation represent significant risks that require immediate remediation.

The overall score of 72/100 reflects a solid foundation with clear areas for improvement. Addressing the P0 and P1 priority items will significantly improve the security posture of the authentication system.

---

*Audit Date: May 19, 2026*
*Auditor: Security Review*
*Next Review: Recommended within 90 days after remediation*
