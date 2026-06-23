# Missing E2E Test Scenarios — API & Integration

**Analysis date:** 2026-06-22
**Source files analyzed:** 19 API route files + 3 page components + 2 share API routes
**Existing tests:** 3 spec files (health.spec.ts, endpoints.spec.ts, admin.spec.ts), ~47 test declarations
**Estimated missing scenarios:** ~285+

---

## 1. `/api/health` + `/api/v1/health` + `/api/ready`

### Already tested
- GET → 200 + JSON status "ok" + content-type
- No auth required
- OPTIONS /api/health → 204 + CORS headers
- GET /api/v1/health delegates
- GET /api/ready → 200 + status "ok"

### Missing
1. Degraded service — returns 503 when `runHealthChecks()` fails
2. Specific service failures — per-service status (database, redis, queue) reported
3. Deprecated HTTP methods — POST, PUT, PATCH, DELETE → 405
4. /api/ready degraded — returns 503 when any check fails
5. /api/ready checks object — individual ok/error/unavailable per subsystem
6. /api/ready timestamp — ISO timestamp in response
7. Origin-specific CORS — OPTIONS with specific Origin returns matching allow-origin
8. Request ID header — x-request-id present in all responses

---

## 2. `/api/v1/me` (GET)

### Already tested
- 401 without auth + JSON error shape

### Missing
1. 200 with valid auth — returns user profile
2. DTO shape — id, email, name, isVerified, createdAt, image
3. User deleted from DB — session valid but user gone → 404
4. Invalid/expired session token → 401
5. 405 on non-GET methods
6. Content-type application/json on both success and error
7. Private fields excluded — password hash, verify token NOT in response

---

## 3. `/api/v1/reports` (GET)

### Already tested
- 401 without auth
- `?limit=-1` returns 200/400/422

### Missing
1. 200 with auth + org — paginated report list with DTO
2. Empty list — 200 with empty items array
3. DTO shape — id, title, status, sector, slideCount, createdAt
4. Cursor pagination — `?cursor=X` returns next page
5. Limit clamping — `?limit=200` → max 100
6. Limit minimum — `?limit=0` → treated as 1
7. Limit boundary — `?limit=1` returns exactly 1 item
8. Invalid cursor — non-existent cursor → empty items
9. Malformed cursor — empty `?cursor=` → treated as no cursor
10. No org membership → 404 with ERR_RESOURCE_NO_ORGANIZATION
11. 25 reports with limit=10 → 10 items + cursor for next page
12. 405 on non-GET methods
13. Response content-type application/json

---

## 4. `/api/reports/[id]` (GET)

### Already tested
- Nothing — entirely untested

### Missing
1. 200 with auth + existing report — returns { id, status }
2. Not found → 404 with JSON error
3. Invalid ID format → 404 or 400
4. No auth → 401
5. Cross-org access → 404
6. 405 on non-GET methods
7. Response shape exactly { id: string, status: string }

---

## 5. `/api/me/entitlements`

### Already tested
- 401 without auth
- 200 with auth + validates plan/features/limits/usage keys

### Missing
1. Plan value is one of FREE/PRO/TEAM/AGENCY
2. Features is object (or array) with enabled/disabled per feature
3. Limits has numeric values
4. Usage has numeric/boolean values
5. resetAt ISO serialization — ISO date strings or null
6. Cache-Control header — public, s-maxage=60
7. No org → 404 with "No organization found"
8. Plan change reflected after subscription change
9. 405 on non-GET methods

---

## 6. `/api/share/meta?token=xxx` (GET)

### Already tested
- Nothing — entirely untested

### Missing
1. Valid token → { hasPassword, title, sector }
2. Missing token → 400 "Token is required"
3. Invalid token → 404
4. Expired share → 410 with code: "expired"
5. Password-protected → hasPassword: true
6. No password → hasPassword: false
7. Not public → 404
8. Rate limiting → 429
9. Sector is valid enum value
10. Unicode/special chars in title
11. 405 on non-GET methods

---

## 7. `/api/share/verify-password` (POST)

### Already tested
- Nothing — entirely untested

### Missing
1. Correct password → 200 with full report + slides
2. No password set → 200 (password param ignored)
3. Wrong password → 401 with invalidPassword error
4. Missing shareToken → 400
5. Missing password → 400
6. Empty password → 400
7. Invalid token → 404
8. Expired → 410
9. Not public → 404
10. Rate limiting → 429 after 10 failed attempts
11. FREE plan → isWatermarked: true, PRO+ → false
12. Slides ordered by position ascending
13. Each slide has id, position, title, layout, contentJson, speakerNotes
14. Content-type application/json
15. GET on POST route → 405
16. Malformed JSON body → 400
17. Concurrent verify attempts

---

## 8. `/api/reports/[id]/share` (GET, POST, PATCH)

### Already tested
- Nothing as API

### GET — Missing
1. 200 with auth → share settings (shareToken, isPublic, shareUrl, embedUrl, allowComments, allowEmbed, expiresAt, password, commentCount)
2. Report not found → 404
3. No auth → 401
4. Not org member → 403
5. commentCount >= 0
6. shareUrl null when private
7. embedUrl null when embed disabled
8. embedUrl present when public + embed enabled
9. shareUrl contains `/share/{shareToken}`

### POST — Missing
10. Make public → 201, generates shareToken
11. Make private → 200, clears shareToken
12. No auth → 401
13. Not found → 404
14. Not org member → 403
15. Missing body → 400
16. Invalid body type → 400
17. CSRF missing → 403
18. Rate limiting → 429
19. Public → Private → Public → new shareToken generated

### PATCH — Missing
20. Update allowComments → 200
21. Update allowEmbed → 200
22. Set expiration 7d → shareExpiresAt ~7 days
23. Set expiration 30d → shareExpiresAt ~30 days
24. Set expiration 90d → shareExpiresAt ~90 days
25. Clear expiration → shareExpiresAt null
26. Set password → password: true in response
27. Clear password → password: false in response
28. No auth → 401
29. Not found → 404
30. Not org member → 403
31. Invalid expiresAt value → 400
32. Invalid allowComments type → 400
33. CSRF missing → 403
34. Rate limiting → 429
35. PATCH on private report → settings stored
36. Empty body `{}` → succeeds, no changes

---

## 9. `/api/analytics` (POST)

### Missing
1. Valid event → 200 { success: true }
2. Event with properties → 200
3. Missing event field → 400
4. Invalid event name → 403
5. Event not string → 400
6. Nested properties → 400
7. Array properties → 400
8. Null properties → 200
9. Rate limiting → 429
10. Malformed JSON → 400
11. GET on POST route → 405

---

## 10. `/api/csrf-token` (GET)

### Missing
1. Token shape { token: "string..." }
2. Token is non-empty string
3. Token changes between requests
4. Content-type application/json
5. 405 on non-GET methods

---

## 11. `/api/og-image` (GET)

### Missing
1. Default params → valid PNG with "DataPresent" title
2. Custom title rendered
3. Custom description rendered
4. Custom locale → URL shows `datapresent.com/{locale}`
5. Report type → indigo badge
6. Blog type → green badge
7. Default type → no badge
8. Long title (>50 chars) → 36px font
9. Short title (≤50 chars) → 48px font
10. Content-type image/png
11. Image dimensions 1200×630
12. XSS prevention — script tags safely rendered as text
13. 405 on non-GET methods

---

## 12. `/api/og-html` (GET)

### Missing
1. Default params → HTML with default title/description
2. Custom title in h1
3. Custom description in p
4. Custom slug → URL shows /blog/{slug}
5. Custom locale
6. Content-type text/html
7. Cache-Control: public, max-age=31536000, immutable
8. Title > 200 chars → 400
9. Description > 500 chars → 400
10. Slug > 100 chars → 400
11. Boundary values (200/500/100 exactly)
12. HTML escaping — &<>"' escaped correctly
13. 405 on non-GET methods

---

## 13. Admin Endpoints

### `/api/admin/plans` (GET, POST)
1. POST success with valid planKey + featureKey → 200
2. POST non-existent featureKey → 404
3. POST missing featureKey → 400
4. POST with all optional fields (enabled, limitValue, configJson, downgradeStrategy)
5. POST non-admin → 403
6. POST no auth → 401
7. GET non-admin → 403
8. GET no auth → 401
9. POST duplicate → upsert behavior (not error)

### `/api/admin/features` (GET, PUT, POST)
1. GET full shape with pagination (data, pagination with page/limit/total/totalPages)
2. GET pagination params work
3. GET sort parameter
4. POST create feature → 201
5. POST missing key → 400
6. POST duplicate key → 409
7. PUT update → 200
8. PUT non-existent → 404
9. Non-admin all methods → 403
10. No auth all methods → 401

### `/api/admin/overrides` (GET, POST, DELETE)
1. GET returns paginated overrides
2. GET scope filter (ORG/USER)
3. GET invalid scope → 400
4. POST create ORG override → 201
5. POST missing fields → 400
6. POST with expiresAt
7. DELETE existing → 200
8. DELETE non-existent → 404
9. Non-admin → 403

### `/api/admin/orgs/[orgId]/entitlements` (GET)
1. Valid orgId → entitlements with orgId, orgName, plan, features, limits, usage
2. Non-existent → 404
3. Non-admin → 403
4. No auth → 401

### `/api/admin/orgs/[orgId]/downgrade-preview` (GET)
1. Valid orgId + targetPlan → downgrade info
2. Missing targetPlan → 400
3. Invalid targetPlan → 400
4. Same/higher plan → 200 with "No downgrade needed"
5. Non-admin → 403

### `/api/admin/cache/invalidate/[orgId]` (POST)
1. POST success → 200 { success: true }
2. Non-existent orgId → 404
3. Non-admin → 403
4. No auth → 401
5. GET on POST → 405

### `/api/debug/entitlements` (GET)
1. Valid params → debug trace
2. Missing orgId → 400
3. Missing feature → 400
4. Non-admin → 403
5. Rate limiting → 429

---

## 14. Share Page (`/share/[shareToken]`) — UI

1. Valid token (no password) — renders title, sector badge, slides
2. Password protected — shows password form (lock, input, button)
3. Correct password — sees report content
4. Wrong password — stays on form, shows error
5. Expired — error screen with alert icon
6. Loading state — spinner
7. Watermark for FREE plan
8. No watermark for PRO+
9. Zero slides — renders without slides section
10. Special chars in title
11. Refresh after password — no re-prompt

---

## 15. Embed Page (`/embed/[shareToken]`) — UI

1. Dark theme ?theme=dark — black bg, white text
2. Light theme (default) — white bg, dark text
3. FREE watermark visible
4. PRO+ no watermark
5. allowEmbed=false → 404
6. Not public → 404
7. Expired boundary → 404
8. Slides in correct order by position
9. No action buttons
10. Custom origin embedding (X-Frame-Options)

---

## 16. Cross-Cutting API

1. CORS on ALL endpoints — OPTIONS returns correct headers
2. Consistent error format — all 4xx/5xx follow { error: "..." } shape
3. Auth consistency — all protected endpoints return 401
4. Admin auth consistency — all admin endpoints return 403 for non-admin
5. Response time < 5s
6. Content-type application/json on all API responses
7. Rate limit Retry-After header on 429 responses
8. Unicode/special chars in all string params

---

## SUMMARY

| Area | Endpoints | Tests Exist | Missing |
|------|-----------|:-----------:|:-------:|
| Health/Readiness | 3 | ✅ Good | ~8 |
| Auth/Profile | 1 | ⚠️ Partial | ~7 |
| Reports (list) | 1 | ⚠️ Partial | ~13 |
| Reports (detail) | 1 | ❌ None | ~7 |
| Entitlements | 1 | ⚠️ Partial | ~9 |
| Share Meta (public) | 1 | ❌ None | ~11 |
| Share Verify (public) | 1 | ❌ None | ~17 |
| Share Settings (auth) | 3 | ❌ None | ~37 |
| Analytics | 1 | ❌ None (wrong test) | ~11 |
| CSRF Token | 1 | ⚠️ Light | ~5 |
| OG Image | 1 | ❌ None | ~13 |
| OG HTML | 1 | ❌ None | ~13 |
| Admin Plans | 2 | ⚠️ Partial | ~10 |
| Admin Features | 3 | ⚠️ Light | ~10 |
| Admin Overrides | 3 | ❌ None | ~9 |
| Admin Orgs | 2 | ❌ None | ~10 |
| Admin Cache | 1 | ❌ None (wrong) | ~6 |
| Debug | 1 | ❌ None | ~5 |
| Share Page (UI) | 1 | ⚠️ Partial | ~11 |
| Embed Page (UI) | 1 | ⚠️ Partial | ~10 |
| Cross-cutting | — | ❌ None | ~8 |
| **TOTAL** | **~19 routes** | **~47 tests** | **~285** |
