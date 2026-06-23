# Missing E2E Test Scenarios — Settings, Teams, Subscription & Admin

**Analysis date:** 2026-06-22  
**Source files analyzed:** 27 files (8 pages, 19 API routes)  
**Existing tests:** 6 spec files, ~52 test declarations  
**Estimated missing scenarios:** ~200+

---

## 1. SETTINGS

### 1.1 Settings Root (`/settings`) — 0 existing tests

#### Success Cases
1. Page heading "Paramètres" is visible
2. 5 settings section cards are displayed (Profil, Organisation, Équipe, Abonnement, Sécurité)
3. Each section card links to correct subpage (`/settings/profile`, `/settings/organization`, etc.)
4. Team section card shows member count badge
5. Billing section card shows plan name badge (e.g., "Free", "Pro")
6. Usage stats cards (3 cards) are rendered: plan, reports used, members
7. Reports usage card shows correct `used` / `limit` (or `∞` for unlimited, or remaining count)
8. Plan card shows the plan name (e.g., "Free")
9. Members card shows count and links to `/settings/team`
10. Each card has an icon matching the section (User, Building2, Users, CreditCard, Lock)
11. ArrowRight icon is present on each section card

#### Edge Cases
12. Loading state while fetching `/api/user/usage` — spinner or skeleton appears
13. API failure on `/api/user/usage` → page degrades gracefully (no crash, sections still render without stats)
14. Zero reports used → shows "0"
15. Unlimited plan (`limit === -1`) → shows "∞" or unlimited indicator
16. User with no organization → `/api/user/usage` returns error → handles gracefully

#### Responsive
17. Stats grid collapses to single column on mobile (md:grid-cols-3 → single)
18. Section cards grid collapses to single column on mobile (md:grid-cols-2 → single)

---

### 1.2 Profile (`/settings/profile`) — 5 existing tests

**Existing coverage:** Form fields exist (name + email), save button visible

#### Success Cases
1. **Update name successfully** → fill name, click Save → toast success, name updates in UI
2. Email field is **disabled/read-only** (code confirms `disabled` prop)
3. Avatar renders with user's name initials fallback when no image URL
4. User name and email display below the avatar
5. RestartOnboardingButton is visible in the second card

#### Error/Failure Cases
6. **Save with empty name** → verify API accepts it (name can be empty string `""`)
7. **API returns non-OK** (e.g., 500) → toast error `"errors.generic"` appears
8. **401 from API** → redirects to `/login`
9. **Network error** (fetch throws) → unhandled (potential crash)

#### Edge Cases
10. **Name with special characters** (e.g., `John <script>`, accents, emoji)
11. **Name with max-length boundary** (very long name, e.g., 500 chars)
12. Save button is **disabled while `saving` is true** (verify loading state)
13. Loading state while fetching user → shows "Chargement..." / loading text
14. Rapid double-click on Save → only one PATCH request sent

---

### 1.3 Organization (`/settings/organization`) — 2 existing tests

**Existing coverage:** Name field visible, save button visible

#### Success Cases
1. **Org list displays** all user's organizations with cards
2. **Org card shows** name, slug (`@slug`), role badge, plan badge
3. **Org selection** — clicking a card applies `ring-2 ring-primary` (selected state)
4. **Tab switching** — clicking "Membres" tab shows members section
5. **Members tab disabled** when no org is selected (verified by `disabled` attr)
6. **Members list loads** for selected org, showing member count in tab label
7. **Member entry** shows: avatar, name, email, role badge, remove button (if removable)
8. **Remove member** (non-owner) → click Supprimer → member disappears from list, toast "Membre supprimé"
9. **Auto-slug generation** — typing name auto-fills slug via `generateSlug()`
10. **Slug editing** — user can still manually set slug, subsequent name changes regenerate it
11. Create org with valid name + slug → toast "Organisation créée", redirect to `/?org=<id>`
12. Slug preview shows `datapresent.com/{slug}` below input

#### Error/Failure Cases
13. **Create org with empty name** → toast "Veuillez remplir tous les champs"
14. **Create org with empty slug** → same validation (button disabled? or toast)
15. **Create org with duplicate slug** → server returns error, toast shows error message
16. **Create org with slug containing invalid characters** → `generateSlug()` strips them automatically
17. **Remove OWNER role member** → remove button hidden (`member.role !== "OWNER"`)
18. **Invite without ADMIN/OWNER role** → API 403, toast error
19. **Invite already-existing member** → API returns error, toast displayed
20. **Invite with empty email** → button disabled (`disabled={saving || !inviteEmail}`)
21. **Remove member API failure** → no toast shown (code checks only `res.ok`, no else branch)
22. **Create org API failure** → toast shows error from response body

#### Edge Cases
23. **Loading state** while fetching orgs → "Chargement..." text
24. **User with no organizations** → empty orgs array, only create card shown
25. **Removing last owner** — should be prevented by API (OWNER can't be removed)
26. **Org slug uniqueness race condition** — two rapid creates with same slug
27. **Auto-slug for special characters** — `generateSlug()` handles accents, spaces, multiple hyphens
28. **Rapid-firing invite** → loading state prevents double submit
29. **Member list after invite** — auto-refreshes after successful invite
30. **Loading spinner on remove** — `Loader2` shown while `removingMemberId === member.id`

---

### 1.4 Team (`/settings/team`) — 9 existing tests

**Existing coverage:** Title, member list, role labels, current user role, invite button, sidebar, active link, invite form click, avatars/initials

#### Success Cases
1. **Invite with email + role (full flow)** → fill email, select role (ADMIN/MEMBER), click Inviter → form closes, member appears in list
2. **Role selection** in invite form shows Membre and Admin options
3. **Member count** in heading `Membres ({members.length})` matches actual list
4. **Remove member** (as OWNER/ADMIN, not self, not OWNER) → confirm dialog appears, member removed
5. **Cancel invite** → form hides, no member added
6. **Invite error display** → red error text appears below role selector
7. **Cancel invite form** → "Annuler" button hides the invite card
8. **Description text** "Gérez les membres de votre organisation" visible

#### Error/Failure Cases
9. **Invite with empty email** → button disabled (`!inviteEmail.trim()`)
10. **Invite with invalid email format** → API validation error displayed
11. **Invite already-existing member** → API returns error, displayed in `inviteError`
12. **Invite non-existent user** → API 404 (code in `/api/organizations/:id/members` returns 404 for not found)
13. **Remove member API failure** → error logged to console, no UI feedback
14. **Invite when user is MEMBER role** → invite button not rendered (`canManageTeam = false`)
15. **Remove when user is MEMBER role** → delete buttons not rendered

#### Edge Cases
16. **Empty member list** → shows "Aucun membre pour le moment"
17. **Loading spinner** while fetching members → `Loader2` centered
18. **Remove OWNER** → delete button not rendered (`member.role !== "OWNER"`)
19. **Remove self** → delete button not rendered (`member.id !== currentUserId`)
20. **Owner role color** → purple (`bg-purple-100 text-purple-700`)
21. **Admin role color** → blue (`bg-blue-100 text-blue-700`)
22. **Member role color** → gray (`bg-gray-100 text-gray-700`)
23. **Avatar fallback** → initials from name or first letter of email
24. **Loading state per-member on remove** → spinner appears on removed member's button
25. **Error on initial fetch** → `console.error("Failed to fetch members")`, no UI error message
26. **Invite rate limiting** → API returns 429 after too many invites (10/hour per org)

---

### 1.5 Account/Security (`/settings/account`) — 3 existing tests ⚠️

**CRITICAL: The existing tests check for password fields — the actual page has NO password fields.** It has sign-out and delete-account UI only.

#### Success Cases
1. **Sign out button** is visible in the first card
2. **Sign out flow** → click Déconnexion → user is signed out, redirected to `/`
3. **Delete account button** is visible (variant="destructive")
4. **Delete account confirmation dialog** appears on click (`ConfirmDialog`)
5. **Delete account dialog** has title, description, confirm button, cancel button
6. **Cancel delete** → dialog closes, no action taken
7. **Alert warning** about account deletion is visible inside the card

#### Error/Failure Cases
8. **Delete account with valid password** → DELETE `/api/user` success → toast, sign out
9. **Delete account with invalid password** → API 403, toast error
10. **Delete account without password (when user has password)** → API 400, toast error
11. **Delete account without `confirm: true` (no-password user)** → API 400
12. **API returns non-OK on delete** → toast error `"errors.generic"`

#### Edge Cases
13. **Page title** "Sécurité / Account" is correct in both locales
14. Logout button text matches locale (Déconnexion / Sign out)
15. Delete button text matches locale
16. User signed out via magic link only (no password) → delete requires confirm, not password
17. User signed out via password → delete requires password

---

### 1.6 API Keys (`/settings/api-keys`) — 3 existing tests

**Existing coverage:** Heading visible, create button visible, list/table visible

#### Success Cases
1. **Create API key flow** → click "Créer une clé" → dialog opens → enter name → click "Créer la clé" → dialog closes → key displayed in one-time alert
2. **Key appears in key list** after creation
3. **Copy key to clipboard** → click copy button → "Copied" indicator (CheckCircle icon) appears for 2 seconds
4. **Revoke key** → click trash icon → confirm dialog → key removed from list
5. **Key details display** — name, created date (relative), last used date, expires date
6. **Documentation section** visible — Authentication, Rate Limiting, Example
7. **Code block** in documentation shows `Authorization: Bearer dp_...` and curl example

#### Error/Failure Cases
8. **Non-Agency plan** → warning alert "L'accès API n'est disponible que sur le plan Agency" with "Voir les plans" link
9. **Create key with empty name** → button disabled (`!newKeyName.trim()`)
10. **Create key with name > 100 chars** → API 400, error displayed in alert
11. **Revoke non-existent key** → API error, error alert shown
12. **API failure on fetch** → error state set, error alert shown
13. **CSRF failure on create** → API error
14. **Rate limited on key creation** → API 429, error alert shown

#### Edge Cases
15. **Empty state** — no keys → icon + "Aucune clé API pour le moment" + "Créez votre première clé"
16. **Loading spinner** while fetching keys
17. **Expired badge** — key with past `expiresAt` shows "Expirée" badge
18. **Date formatting** — uses `formatDistanceToNow` with French locale
19. **Revoke loading state** — spinner on the specific key's button
20. **Key only shown once** — after page refresh, one-time alert disappears
21. **Multiple keys** — all render correctly in the list
22. **"Voir les plans" link** navigates to `/settings/billing`
23. **Cancel create dialog** — dialog closes, no key created

---

### 1.7 Billing (`/settings/billing`) — 8 existing tests

**Existing coverage:** Title, 4 plan options, CTA buttons, current plan info, features, prices, sidebar active, no JS errors

#### Success Cases
1. **Current subscription section** for non-FREE plans shows plan name, status, period end date
2. **"Plan actuel" indicator** on the currently subscribed plan card
3. **Souscrire button** on upgradeable plans (Pro, Team)
4. **Contacter les ventes** button on Agency plan
5. **Feature comparison per plan** reflects actual entitlements from DB (dynamic, not static)
6. **Feature categories** — Reports, Exports, Collaboration, Professional, Support

#### Error/Failure Cases
7. **Server component error** → what renders when `auth()` returns null? (returns `null`)
8. **User with no organization** → page renders without subscription data

#### Edge Cases
9. **Agency plan CTA** shows `Contacter les ventes` (not Souscrire)
10. **FREE plan CTA** shows `Plan actuel` (not Souscrire)
11. **Pro Plan "popular" badge** visible with `ring-primary` class
12. **Pricing display** for Agency — `price: -1` (custom pricing) — should not show monthly price
13. **Period end date** formatted in French locale
14. **Multiple subscriptions** (improbable but possible edge case)
15. **Stripe price IDs** passed correctly to PlanSelector
16. **Billing page with no subscription** (should default to FREE)

---

## 2. TEAMS (`/settings/team` equivalent already covered in 1.4 + teams.spec.ts)

**Existing coverage on separate teams.spec.ts:** Same page as settings/team, duplicate tests cover title, members, roles, invite button, sidebar, active link, invite form, avatars.

#### Additional Missing Scenarios (beyond 1.4)

#### Success Cases
1. **Accept invite flow** — `/accept-invite?token=...` validates token and adds user to org
2. **Invite token API validation** — POST `/api/auth/accept-invite` with valid token → success

#### Error/Failure Cases
3. **Accept invite with expired token** → error displayed
4. **Accept invite with invalid token** → error displayed  
5. **Accept invite while already logged in** → works (token validated against current user email)
6. **Accept invite for different email** → token is email-bound, should fail
7. **Cancel pending invitation** (no UI, API only) → DELETE invites
8. **Resend invitation** (no UI, API only)

#### Edge Cases
9. **Invite token rate limiting** (10 invites/hour/org)
10. **Invite token expiration** (7 days, check `expires` date)
11. **Invite for user who already has account** → added directly as member
12. **Invite for user who doesn't have account** → they must sign up first? (code only checks existing user)

---

## 3. SUBSCRIPTION

### 3.1 Pricing Page (`/pricing`) — 10 existing tests

**Additional missing scenarios:**

1. **Team plan CTA** links to `/signup?plan=team`
2. **Agency upsell "Contacter notre équipe"** links to `/contact`
3. **JSON-LD structured data** exists in page (schema.org Product)
4. **Comparison table categories** — Reports, Export, Collaboration, Support, API Access, White Label
5. **Comparison boolean values** — checkmarks for included, minus for not included
6. **Comparison text values** — "3/mois", "30/mois", "100/mois", "Illimité"
7. **SEO metadata** — og:title, og:description, twitter:card present
8. **FAQ open/close animation** — chevron rotates 180° on open
9. **FAQ answers match locale** (French vs English content)
10. **Page renders correctly for English locale** (`/en/pricing`)
11. **Responsive grid** — 1 column on mobile, 2 columns on tablet, 3 columns on desktop
12. **Comparison table horizontal scroll** on small viewports
13. **Hero section decorative glow** element exists (aria-hidden)

---

### 3.2 Free Tier — 8 existing tests

**Additional missing scenarios:**

1. **Free tier enforcement** — creating a 4th report shows limit error or redirects to upgrade
2. **Upgrade CTA** visible in usage card when approaching or hitting limits
3. **Watermark present** on exports for free-tier user (validation needed via export API)
4. **Export format limits** — only PDF available on Free (PPTX and DOCX locked)
5. **No team collaboration** UI elements visible on Free plan
6. **Usage API returns correct remaining** = `max(0, limit - used)`
7. **Usage API returns -1** for unlimited features → UI shows "∞" or "Illimité"

---

### 3.3 Billing/Checkout — 8 existing tests

**Additional missing scenarios:**

1. **Stripe checkout redirect** — clicking "Souscrire" on Pro → redirects to Stripe Checkout
2. **Stripe portal access** — subscription management link visible for paying users
3. **Annual vs monthly billing toggle** (if implemented in PlanSelector)
4. **Failed payment notification** — UI displays when subscription status is `past_due`
5. **Cancel subscription flow** — confirmation → cancel → status changes to `canceled`
6. **Reactivate subscription** — within grace period, reactivate restores access
7. **Invoice history** list (if implemented)
8. **Payment method display** — saved card details (last 4 digits, expiry)
9. **VAT/Tax ID field** entry and validation (if implemented in checkout)
10. **Coupon/discount code** entry (if implemented)
11. **Upgrade mid-cycle** → prorated billing display

---

## 4. ADMIN API

### 4.1 Plans (`/api/admin/plans`) — 4 existing tests

#### Success Cases
1. **POST with valid planKey + featureKey** → upserts plan feature, returns 200
2. **POST updates existing feature** (same planKey + featureKey) → updates `enabled`, `limitValue`, etc.
3. GET returns `downgradeStrategy` field per feature (currently not tested)

#### Error/Failure Cases
4. **POST with missing `planKey`** → 400
5. **POST with missing `featureKey`** → 400  
6. **POST with non-existent featureKey** → 404 "Feature not found"
7. **Access: unauthenticated** → 401
8. **Access: non-admin user** → 403
9. **Rate limit exceeded** (30 requests/min) → 429

#### Edge Cases
10. **Upsert with partial fields** (only `enabled`) → updates only that field
11. **Invalid `downgradeStrategy`** value → Prisma validation error (probably 500)
12. **GET with empty feature table** → returns features with `enabled: false`

---

### 4.2 Features (`/api/admin/features`) — 1 existing test

#### Success Cases
1. **GET with pagination** → `?page=1&limit=20` returns `pagination` object
2. **GET with sort** → `?sort=key:asc`
3. **PUT update feature** with valid fields → 200, returns updated feature
4. **PUT update feature description** → field updated
5. **POST create new feature** with valid data → 201
6. **POST create new feature with default values** → `type: BOOLEAN`, `isActive: true`

#### Error/Failure Cases
7. **PUT without key** → 400
8. **PUT on non-existent key** → 404 (Prisma `update` throws on not found)
9. **POST without key** → 400
10. **POST duplicate key** → 409 "Feature key already exists"
11. **Access: unauthenticated** → 401
12. **Access: non-admin** → 403
13. **Rate limit exceeded** → 429

#### Edge Cases
14. **PUT with only `isActive: false`** → deactivates feature
15. **POST with `type` validation** → invalid type → Prisma error (500)
16. **Pagination edge** → `page=0` or negative → Next.js default to 1

---

### 4.3 Overrides (`/api/admin/overrides`) — 0 existing tests

#### Success Cases
1. **GET overrides (no filters)** → list with pagination
2. **GET overrides filtered by `scope`** → `?scope=ORG` or `?scope=USER`
3. **GET overrides filtered by `scopeId`** → `?scopeId=<id>`
4. **GET overrides pagination** → `?page=1&limit=20` returns pagination object
5. **POST create override** (ORG scope) → 201, cache invalidated for org
6. **POST create override** (USER scope) → 201, no cache invalidation
7. **POST override with `expiresAt`** → future expiration date set
8. **DELETE existing override** → 200, cache invalidated for ORG scope
9. **DELETE existing override** (USER scope) → 200, no cache invalidation

#### Error/Failure Cases
10. **GET with invalid `scope`** (not USER or ORG) → 400
11. **GET with invalid `scopeId`** (>255 chars) → 400
12. **POST without required fields** → 400
13. **POST with invalid `scope`** → 400
14. **POST with non-existent `featureKey`** → 404
15. **DELETE non-existent override** → 404
16. **Access: unauthenticated** → 401
17. **Access: non-admin** → 403
18. **Rate limit exceeded** → 429

#### Edge Cases
19. **Override with `expiresAt` in the past** → immediately expired
20. **Override with `limitValue: 0`** → effectively disables the feature
21. **Override with `enabled: false`** → disables feature regardless of plan
22. **Multiple overrides for same scope+feature** → last write wins
23. **CreatedBy user info** included in GET response

---

### 4.4 Orgs Entitlements (`/api/admin/orgs/:orgId/entitlements`) — 0 existing tests

#### Success Cases
1. **GET valid orgId** → 200, returns orgId, orgName, plan, features, limits, usage, resetAt

#### Error/Failure Cases
2. **GET non-existent orgId** → 404
3. **GET unauthenticated** → 401
4. **GET as non-admin** → 403
5. **Rate limit exceeded** → 429

---

### 4.5 Downgrade Preview (`/api/admin/orgs/:orgId/downgrade-preview`) — 0 existing tests

#### Success Cases
1. **GET with valid orgId + targetPlan** → 200, returns downgrade info
2. **GET with same target plan** → message "No downgrade needed"
3. **GET with higher target plan** → message "No downgrade needed"

#### Error/Failure Cases
4. **GET without `targetPlan` param** → 400
5. **GET with invalid `targetPlan`** → 400
6. **GET non-existent orgId** → 404
7. **Access: unauthenticated** → 401
8. **Access: non-admin** → 403
9. **Rate limit exceeded** → 429

#### Edge Cases
10. **Downgrade from TEAM → FREE** → shows which features will be lost
11. **Downgrade from PRO → FREE** → watermark and format features affected

---

### 4.6 Cache Invalidate (`/api/admin/cache/invalidate/:orgId`) — 1 existing test

**Note: Existing test uses GET, but the actual route is POST.**

#### Success Cases
1. **POST valid orgId** → 200, `{ success: true, orgId, message: "Cache invalidated" }`

#### Error/Failure Cases
2. **POST non-existent orgId** → 404
3. **Access: unauthenticated** → 401
4. **Access: non-admin** → 403
5. **Rate limit exceeded** → 429

---

### 4.7 Debug Entitlements (`/api/debug/entitlements`) — 0 existing tests

#### Success Cases
1. **GET with valid `orgId` + `feature`** → 200, returns debug trace

#### Error/Failure Cases
2. **GET without `orgId`** → 400
3. **GET without `feature`** → 400
4. **GET unauthenticated** → 401
5. **GET as non-admin** → 403
6. **Rate limit exceeded** (10/hour per admin) → 429

---

## 5. USER API

### 5.1 Profile (`/api/user/profile` — PATCH) — 0 existing tests

1. **PATCH valid name** → 200, returns user object with updated name
2. **PATCH unauthenticated** → 401
3. **PATCH with empty name** → 200 (no validation, Prisma accepts empty string)

### 5.2 User (`/api/user` — DELETE) — 0 existing tests

1. **DELETE with valid password** → 200 `{ success: true }`
2. **DELETE without password** (when user has password) → 400
3. **DELETE with invalid password** → 403
4. **DELETE with `confirm: true`** (no-password user) → 200
5. **DELETE without `confirm`** (no-password user) → 400
6. **DELETE unauthenticated** → 401

### 5.3 User (`/api/user` — GET) — 0 existing tests

1. **GET authenticated** → returns user with id, name, email, image, membership[]
2. **GET unauthenticated** → 401

### 5.4 Usage (`/api/user/usage`) — 0 existing tests

1. **GET authenticated** → returns plan, planName, reports {used, limit, remaining}, members, exports
2. **GET unauthenticated** → 401
3. **GET with no org** → error response
4. **Report count is current month only** (filtered by `startOfMonth`)

### 5.5 Me Entitlements (`/api/me/entitlements`) — 2 existing tests

**Additional missing:**
1. **GET unauthenticated** → 401
2. **GET without organization** → 404
3. Response includes `Cache-Control: public, s-maxage=60` header
4. `resetAt` contains ISO date strings
5. Server error → 500 (try/catch returns it)
6. Dynamic route (`export const dynamic = "force-dynamic"`)

---

## 6. ORGANIZATION API

### 6.1 Organizations List (`/api/organizations` — GET) — 0 tests

1. **GET authenticated** → returns organizations array with id, name, slug, role, reportCount, memberCount, plan
2. **GET unauthenticated** → 401
3. **GET with no memberships** → empty array

### 6.2 Create Organization (`/api/organizations` — POST) — 0 tests

1. **POST valid name+slug** → 200, returns organization
2. **POST missing name** → error
3. **POST missing slug** → error
4. **POST duplicate slug** → error
5. **POST unauthenticated** → 401
6. **CSRF protection** → missing/invalid CSRF token → error
7. New org auto-creates OWNER membership for the creator

### 6.3 Get Org (`/api/organizations/:id` — GET) — 0 tests

1. **GET as member** → returns org details
2. **GET without membership** → 403
3. **GET non-existent id** → 404 (Prisma returns null, then `notFound()`)
4. **GET unauthenticated** → 401

### 6.4 Update Org (`/api/organizations/:id` — PATCH) — 0 tests

1. **PATCH as ADMIN/OWNER with valid name** → 200
2. **PATCH as MEMBER** → 403
3. **PATCH unauthenticated** → 401
4. **PATCH with empty name** → 400
5. **PATCH with name > 100 chars** → 400
6. **CSRF protection** → error if missing

### 6.5 Delete Org (`/api/organizations/:id` — DELETE) — 0 tests

1. **DELETE as OWNER** → 200
2. **DELETE as ADMIN** → error (must be OWNER)
3. **DELETE as MEMBER** → 403 (from membership check)
4. **DELETE unauthenticated** → 401
5. **CSRF protection** → error if missing

### 6.6 Members (`/api/organizations/:id/members`)

#### GET — 0 tests
1. **GET as org member** → returns members array with id, name, email, image, role
2. **GET without membership** → 403
3. **GET unauthenticated** → 401

#### POST — 0 tests
1. **POST as ADMIN/OWNER** with valid email → 200
2. **POST as MEMBER** → 403
3. **POST for already-existing member** → 400
4. **POST without email** → 400
5. **POST for non-existent user email** → 404
6. **CSRF protection** → error if missing

#### DELETE — 0 tests
1. **DELETE as ADMIN/OWNER** with valid userId → 200
2. **DELETE as MEMBER** → 403
3. **DELETE target with OWNER role** → 400 (cannot remove owner)
4. **DELETE non-existent member** → 404
5. **DELETE unauthenticated** → 401
6. **CSRF protection** → error if missing

### 6.7 Invite (`/api/organizations/:id/invite`) — 0 tests

1. **POST as ADMIN/OWNER** with valid email + role → 200
2. **POST as MEMBER** → 403
3. **POST with already-existing member email** → 400
4. **POST with invalid email format** → 400 (InviteSchema validation)
5. **POST unauthenticated** → 401
6. **Rate limit exceeded** (10/hour) → 429
7. **CSRF protection** → error if missing
8. **Invite token properties** → 7-day expiry, hashed token, prefix stored

---

## 7. STRIPE API

### 7.1 Checkout (`/api/stripe/checkout`) — 0 tests

1. **POST with valid priceId** → creates Stripe Checkout session, returns URL
2. **POST unauthenticated** → 401
3. **POST without required params** → error

### 7.2 Portal (`/api/stripe/portal`) — 0 tests

1. **GET/POST with valid subscription** → creates Portal session, returns URL
2. **GET/POST without subscription** → error

### 7.3 Webhook (`/api/stripe/webhook`) — 0 tests

1. **POST with valid Stripe event** → handles subscription updates
2. **POST with invalid signature** → 400
3. **Event: checkout.session.completed** → activates subscription
4. **Event: invoice.paid** → updates subscription status
5. **Event: invoice.payment_failed** → marks subscription past_due
6. **Event: customer.subscription.deleted** → marks subscription canceled

---

## 8. CROSS-CUTTING CONCERNS

### 8.1 Authentication & Authorization

1. **All mutation endpoints** protected by CSRF (`withCsrfProtection`)
2. **All admin endpoints** protected by `withAdmin` middleware (returns 401/403)
3. **Rate limiting on admin** endpoints (30 req/min)
4. **Rate limiting on invite** (10 req/hour per org)
5. **Rate limiting on API key create** (10 req/hour per org)
6. **Rate limiting on debug entitlements** (10 req/hour per admin)
7. **Unauthenticated access** to settings pages → redirect to `/login`
8. **Admin-only pages** (if any admin UI exists in frontend) → 403 for non-admin

### 8.2 CSRF Protection

1. All POST, PATCH, DELETE on user-facing APIs need valid CSRF token
2. `/api/csrf-token` endpoint returns fresh token
3. Tests should verify 403 when CSRF token is missing/invalid

### 8.3 Input Validation

1. **Organization name** — max 100 chars (API-side validation)
2. **API key name** — max 100 chars (API-side validation)
3. **Invite email** — validated via `InviteSchema` (Zod schema)
4. **Slug** — uniqueness enforced at DB level (unique constraint)

### 8.4 Empty States

1. **No API keys** → empty state with icon
2. **No team members** → "Aucun membre pour le moment"
3. **No organizations** → only "Créer une organisation" card visible

### 8.5 Loading States

1. Profile page loading → "Chargement..." text
2. Organization page loading → "Chargement..." text
3. Team page loading → Loader2 spinner
4. API keys page loading → Loader2 spinner
5. Settings root loading → conditional rendering of stats section

### 8.6 Responsive/Mobile

1. Settings sidebar collapses/hides on mobile viewport
2. Organization grid md:grid-cols-2 → single column on mobile
3. Team page member list adapts to mobile
4. API keys page layout adapts to mobile (stacks vertically)
5. Pricing page grid responsive (1→2→3 columns)
6. Comparison table horizontal scrolling on mobile

### 8.7 URL Manipulation

1. Accessing `/settings/team` of another org via URL tampering
2. Accessing admin endpoints with non-admin session
3. Accessing org settings without being a member of that org
4. Accessing `/settings/billing` while unauthenticated → redirect

### 8.8 Error Handling

1. Network error on profile fetch → graceful degradation
2. Network error on API keys fetch → error alert
3. Server 500 on save → toast error
4. Session expiry mid-session → redirect on next API call
5. Missing CSRF token → 403 with error message

---

## SUMMARY COUNTS

| Area | Existing Tests | Missing Scenarios (est.) |
|------|:---:|:---:|
| **Settings Root** | 0 | 18 |
| **Profile** | 5 | 14 |
| **Organization** | 2 | 30 |
| **Team** | 9 | 27 |
| **Account/Security** | 3 (⚠️ wrong page) | 17 |
| **API Keys** | 3 | 23 |
| **Billing** | 8 | 16 |
| **Pricing Page** | 10 | 12 |
| **Free Tier** | 8 | 7 |
| **Admin API (all)** | 7 | 60+ |
| **User API** | 2 | 18 |
| **Organization API** | 0 | 35+ |
| **Stripe API** | 0 | 12+ |
| **Cross-cutting** | 0 | 20+ |
| **TOTAL** | **~57** | **~310+** |

---

## URGENT: Existing Test Bug

The `settings/account` tests check for password-change UI elements (`getByLabel(/mot de passe|password/i)`, `input[type="password"]`). **The actual Account page has NO password fields** — it contains only a Sign Out button and a Delete Account section with confirmation dialog. These tests will **always fail** (false positives or false negatives depending on element presence) and need to be rewritten to match the actual page content.
