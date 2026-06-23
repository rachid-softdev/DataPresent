# Missing E2E Test Scenarios — Auth & Security

**Analysis date:** 2026-06-22
**Existing tests:** 5 spec files (signup.spec.ts, signin.spec.ts, password.spec.ts, magic-link.spec.ts, signout.spec.ts), ~34 test declarations
**Estimated missing scenarios:** ~180+

---

## 1. SIGNUP (`/signup`) — Gaps

### Success Cases Missing
1. Successful email signup flow — fill valid email, click submit, verify success toast/message
2. Google OAuth button click — verify navigation to Google OAuth consent screen
3. Terms checkbox interaction (if present) — check/uncheck affects submit button state
4. Password visibility toggle — click eye icon, password becomes visible
5. Signup with plan parameter — navigate to `/signup?plan=pro`, verify plan pre-selected
6. Email already registered — submit existing email, verify "Email déjà utilisé" error message

### Error/Failure Cases Missing
7. Empty email submission — browser validation catches empty `required` field
8. Network error during signup — disconnect network, verify error message shown
9. Server 500 error — API returns 500, verify friendly error displayed
10. Rate limiting — multiple rapid signup attempts, verify 429 or captcha challenge
11. Invalid email format — enter `not-an-email`, verify HTML5 validation
12. XSS injection in name field — enter `<script>alert('xss')</script>`, verify no execution
13. SQL injection in email — enter `' OR 1=1--`, verify no bypass
14. Very long email (>254 chars) — verify validation or truncation
15. Unicode email — enter `user@münchen.de`, verify handled correctly

### Edge Cases Missing
16. Double-click submit prevention — rapid double-click, verify only one request sent
17. Browser back/forward after signup — navigate away, press back, verify no stale state
18. Session already exists — user already logged in visits /signup, verify redirect to dashboard
19. Tab away and return — fill form, switch tabs, return, verify form state preserved
20. Paste into email field — paste long string, verify no UI breakage
21. Autofill by browser/browser extension — verify autofill doesn't break validation

---

## 2. SIGNIN (`/login`) — Gaps

### Success Cases Missing
1. Successful magic link flow — enter valid email, submit, verify success message
2. Password tab exists and can be toggled — click password tab/link, verify password fields appear
3. Password login form loading — verify email + password fields visible after tab switch
4. "Se souvenir de moi" checkbox (if present) — check affects session persistence
5. Redirect after login — login with callback URL, verify redirect to original page

### Error/Failure Cases Missing
6. Empty form submission — both email and password empty, verify validation
7. Account locked after X attempts — multiple failed logins, verify lockout message
8. Session already exists at login — already logged in visits /login, verify redirect
9. Expired magic link — click magic link from email after expiration, verify error
10. Magic link for non-existent email — enter non-existent email, verify feedback (or lack thereof — security consideration)
11. Email with leading/trailing spaces — `" user@test.com "`, verify trimming before validation
12. Concurrent login attempts — same user multiple rapid login attempts

### Edge Cases Missing
13. Browser autofill credentials — verify autofill populates fields correctly
14. Login with Enter key — focus email, press Enter, verify form submits
15. Tab order in form — Tab through fields in logical order (email → button)
16. Disabled JavaScript — verify graceful degradation if JS fails
17. URL parameter injection — `/login?error=`, `/login?callbackUrl=https://evil.com`, verify sanitization

---

## 3. PASSWORD LOGIN — Gaps

### Success Cases Missing
1. CSRF token refresh between requests — verify new token on each page load
2. Session cookie attributes — verify `HttpOnly`, `Secure`, `SameSite` attributes

### Error/Failure Cases Missing
3. Expired CSRF token — submit with old token, verify 403
4. Missing CSRF token — submit without token, verify error
5. Invalid content-type — submit with `application/json` instead of form-urlencoded, verify 400/415
6. Password with special characters — `P@ssw0rd!` with symbols, verify success
7. Password with unicode — `MotDePasse€123`, verify handled
8. Very long password (>128 chars) — verify hashing handles without error
9. Blank password submitted — empty password string, verify 400
10. Whitespace-only password — `"   "`, verify trimmed or rejected

### Edge Cases Missing
11. Session token expiration — wait for `maxAge` to pass, verify redirect to login
12. Session refresh — activity extends session, verify no logout
13. Concurrent sessions — login from two browsers, both should work
14. Session invalidation on password change — change password, old sessions invalidated

---

## 4. MAGIC LINK — Gaps

### Success Cases Missing
1. Magic link email sent confirmation — visual confirmation text/label after submit
2. Magic link rate limit info — "Un email vous a été envoyé. Vérifiez vos spams." message

### Error/Failure Cases Missing
3. Rate limiting on magic link — multiple rapid requests, verify throttling
4. SMTP server error — API returns email failure, verify user-facing error
5. Magic link for unverified email — behavior when user email not verified
6. Invalid token format in URL — malformed token, verify error page

### Edge Cases Missing
7. Rapid re-send before cooldown — click send again immediately, verify disabled state
8. Browser blocking popup/redirect — magic link opens in same tab, test focus
9. Very old magic link token (>24h) — expired token security behavior

---

## 5. SIGNOUT — Gaps

### Success Cases Missing
1. Signout from navbar dropdown — click user avatar → "Déconnexion", verify redirected
2. Signout clears all cookies — verify no auth-related cookies remain
3. Signout and sign back in as different user — full session swap test
4. Signout from mobile hamburger menu — mobile-specific signout path
5. Signout confirmation dialog — if present, verify "Êtes-vous sûr ?" dialog

### Error/Failure Cases Missing
6. Signout API failure — mock 500 on signout endpoint, verify client-side error handling
7. Signout when already signed out — double-click signout, verify no crash

### Edge Cases Missing
8. Signout then press back — after signout, press browser Back, verify not re-authenticated
9. Multiple tabs signout — signout in tab A, verify tab B detects session loss on next action
10. Signout during active report generation — verify generation cancels or continues as anonymous
11. Signout redirect to custom URL — verify `callbackUrl` parameter respected

---

## 6. FORGOT PASSWORD (`/forgot-password`) — NO EXISTING TESTS

### Success Cases
1. Page renders — h1 "Mot de passe oublié ?", email input, submit button visible
2. Valid email submission — enter valid email, submit, verify success state (CheckCircle icon, confirmation message)
3. "Retour à la connexion" link — click, verify navigation to /login
4. Submit button disabled when email empty — disabled state with opacity/styling
5. Loading state — submit, verify Loader2 spinner + "Envoi en cours..." text

### Error/Failure Cases
6. Invalid email (browser validation) — type "invalid", submit, browser catches with `type="email"`
7. API error response — mock API returns error, verify error alert displayed
8. Network error — mock fetch failure, verify "Erreur de connexion" message
9. Non-existent email — submit email not in DB, verify no information disclosure
10. Rate limiting — multiple rapid submissions, verify throttling

### Edge Cases
11. Submit with Enter key — keyboard submit works
12. Double-click prevention — rapid double-click, verify single request
13. Session active during forgot-password — logged-in user visits page, verify behavior

---

## 7. RESET PASSWORD (`/reset-password`) — NO EXISTING TESTS

### Success Cases
1. Page with valid token — navigate to `/reset-password?token=valid123`, verify h2 "Nouveau mot de passe", password + confirm fields
2. Valid password submission — matching 8+ char passwords, submit, verify success state with "Mot de passe réinitialisé !"
3. "Se connecter" after success — click button, verify navigation to /login
4. Submit disabled when empty — button disabled when password or confirm empty
5. Loading state during submission — spinner + "Réinitialisation en cours..." text
6. Back to login link — always visible at bottom

### Error/Failure Cases
7. Missing token — no `?token=` param, verify "Lien invalide" card with "Demander un nouveau lien" button
8. Password too short (< 8 chars) — enter "abc", verify error "Le mot de passe doit contenir au moins 8 caractères"
9. Password mismatch — different passwords, verify error "Les mots de passe ne correspondent pas"
10. Invalid/expired token — API returns error, verify "Lien invalide ou expiré"
11. API error — mock 500, verify error message displayed
12. Network error — mock fetch failure, verify "Erreur de connexion" message
13. XSS in error message — verify error content is safely rendered (no HTML injection)

### Edge Cases
14. Suspense boundary — page wrapped in Suspense, fallback spinner shown briefly
15. Token from searchParams — `useSearchParams()` requires Suspense wrapper
16. Token with special characters — URL-encoded token, verify correctly decoded
17. Token replay — use same token twice, second attempt fails
18. Page refresh after success — verify doesn't re-attempt submission
19. Very long password (128+ chars) — verify no crash or truncation

---

## 8. AUTH CALLBACK (`/auth/callback`) — NO EXISTING TESTS

### Success Cases
1. Valid token → loading — navigate with `?token=valid`, verify spinner + "Signing you in..."
2. Valid token → API success — mock 200, verify redirect to `/`
3. Valid token → API success with callback — `?token=X&callbackUrl=/reports`, verify redirect to `/reports`

### Error/Failure Cases
4. Missing token — no `?token=`, verify redirect to `/login?error=errors.auth.invalidToken`
5. Invalid token — API returns 400, verify redirect to `/login?error=...`
6. Expired token — API returns 410, verify redirect to `/login?error=errors.auth.expiredToken`
7. Network error — fetch throws, verify redirect to `/login?error=errors.auth.failed`
8. Server error — API returns 500, verify redirect to `/login?error=...`

### Edge Cases
9. Callback URL open redirect — `?callbackUrl=https://evil.com`, verify no open redirect
10. Multiple callbacks in quick succession — race condition handling
11. Suspense fallback — page wrapped in Suspense, verify loading state

---

## 9. ACCEPT INVITE (`/accept-invite`) — NO EXISTING TESTS

### Success Cases
1. Valid invite + session — user logged in, valid token, API returns success, verify "Vous avez rejoint X" with org name and role
2. "Aller au dashboard" button — click, verify navigation to `/`
3. Role display — verify correct role (Admin, Membre) shown in success card

### Error/Failure Cases
4. Missing token — no `?token=`, verify error "Token d'invitation manquant" with login button
5. No session — API returns 401, verify redirect to `/login?callbackUrl=/accept-invite?token=X`
6. Invalid/expired token — API returns error, verify "Invitation invalide ou expirée"
7. Already member of org — API returns conflict, verify "Vous êtes déjà membre" message
8. Server error — mock 500, verify error card with retry option
9. Network error — mock fetch failure, verify error card

### Edge Cases
10. Suspense boundary — fallback spinner while loading
11. Loading state — page shows spinner + "Traitement de l'invitation..." text
12. Accept invite while already in another org — verify proper handling
13. Invite token with special characters — URL-encoded token decoding
14. Refresh after success — verify doesn't re-submit
15. Expired invite — invite with `expiresAt` in past, verify proper error

---

## 10. CROSS-CUTTING AUTH SECURITY — Gaps

### Session Management
1. Session cookie `HttpOnly` flag — verify cookie attributes via Playwright `page.context().cookies()`
2. Session cookie `Secure` flag — only set over HTTPS (skip in test if HTTP)
3. Session cookie `SameSite` — should be `Lax` or `Strict`
4. Multiple tabs — sign out in one tab, other tab detects on next navigation
5. Session extends with activity — idle vs active session behavior

### CSRF Protection
6. CSRF token required for mutations — all POST/PUT/PATCH/DELETE without token return 403
7. CSRF token rotation — verify token changes after use
8. CSRF token tied to session — token from session A doesn't work with session B

### Rate Limiting
9. Login rate limit — 5 failed attempts → temporary block
10. Signup rate limit — 3 signups/hour from same IP
11. Magic link rate limit — 1 request/60s
12. Forgot password rate limit — 3 requests/hour
13. API rate limit headers — verify `X-RateLimit-*` headers present in 429 responses

### Security Headers
14. `X-Frame-Options` — verify `DENY` or `SAMEORIGIN` on non-embed pages
15. `X-Content-Type-Options` — verify `nosniff`
16. `Strict-Transport-Security` — verify present (if HTTPS)
17. `Content-Security-Policy` — verify present
18. `Referrer-Policy` — verify present

---

## SUMMARY

| Area | Existing Tests | Missing Scenarios |
|------|:-------------:|:-----------------:|
| Signup | 11 | ~21 |
| Signin | 10 | ~17 |
| Password login | 3 | ~14 |
| Magic link | 5 | ~10 |
| Signout | 2 | ~11 |
| Forgot Password | **0** | ~13 |
| Reset Password | **0** | ~20 |
| Auth Callback | **0** | ~10 |
| Accept Invite | **0** | ~15 |
| Cross-cutting Auth | **0** | ~19 |
| **TOTAL** | **~34** | **~180** |
