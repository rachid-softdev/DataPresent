# E2E Test Coverage Gap Analysis — Master Summary

> **Project:** DataPresent  
> **Date:** 2026-06-22  
> **Existing test files:** 34 spec files, ~319 test declarations  
> **Estimated missing scenarios:** ~1,250+

---

## Coverage by Area

| Area | Existing Tests | Missing Scenarios | Gap Files |
|------|:-------------:|:-----------------:|-----------|
| **Auth & Security** | ~34 | ~180 | `auth-security-gap-analysis.md` |
| **Dashboard & Reports** | ~58 | ~255 | `dashboard-missing-scenarios.md` |
| **Settings, Teams, Sub, Admin** | ~52 | ~310+ | `settings-teams-subscription-admin-gap-analysis.md` |
| **API & Integration** | ~47 | ~285 | `api-integration-gap-analysis.md` |
| **Cross-cutting & Edge Cases** | ~71 | ~218 | `cross-cutting-edge-gap-analysis.md` |
| **TOTAL** | **~319** | **~1,250+** | |

---

## Critical Findings

### 🔴 Pages with ZERO Test Coverage
| Page | Route |
|------|-------|
| Forgot Password | `/forgot-password` |
| Reset Password | `/reset-password` |
| Auth Callback | `/auth/callback` |
| Accept Invite | `/accept-invite` |

### 🔴 Features with ZERO Test Coverage
| Feature | Route |
|---------|-------|
| Comments (slide-level + general) | `/reports/[id]` |
| Keyboard Shortcuts | Root layout |
| i18n/Localization | All pages |
| Error Boundaries | 500 errors, auth errors, dashboard errors |
| API Report Detail | `GET /api/reports/[id]` |
| Share Meta API | `GET /api/share/meta?token=X` |
| Share Verify Password API | `POST /api/share/verify-password` |
| Share Settings API | `GET/POST/PATCH /api/reports/[id]/share` |
| OG Image/HTML APIs | `GET /api/og-image`, `/api/og-html` |
| Admin Overrides API | `GET/POST/DELETE /api/admin/overrides` |
| Admin Orgs Entitlements | `GET /api/admin/orgs/[orgId]/entitlements` |
| Admin Downgrade Preview | `GET /api/admin/orgs/[orgId]/downgrade-preview` |
| Debug Entitlements | `GET /api/debug/entitlements` |
| Stripe Checkout/Portal/Webhook | Subscription management flows |

### 🔴 Test Files with Wrong/Misleading Tests
| File | Issue |
|------|-------|
| `e2e/settings/settings.spec.ts` (account section) | Tests password fields on `/settings/account` — page only has Sign Out + Delete Account, no password fields |
| `e2e/api/endpoints.spec.ts` (analytics) | Tests GET on analytics (returns 400/404) — route is POST-only |

---

## Top 10 Priority Areas

| Priority | Area | Rationale |
|:--------:|------|-----------|
| 1 | **Comment feature** (25+ scenarios) | Entirely untested, complex UI with CRUD operations |
| 2 | **Report creation flow** (67+ scenarios) | Only upload step tested; config/generation/result steps untouched |
| 3 | **Share API** (65+ scenarios) | Core product flow, 3 API endpoints with 20+ HTTP methods entirely untested |
| 4 | **Auth pages** (34+ scenarios) | 4 pages (forgot-password, reset-password, callback, accept-invite) with zero tests |
| 5 | **Batch operations** (12+ scenarios) | Multi-select, batch delete, batch export — core usability, untested |
| 6 | **Slide viewer** (28+ scenarios) | Navigation, sidebar, reorder, layouts — major UX untested |
| 7 | **Admin CRUD APIs** (60+ scenarios) | All org management, overrides, features, cache — production ops |
| 8 | **Error boundaries** (17+ scenarios) | 404 coverage exists but 500 errors, network errors, recovery flows missing |
| 9 | **i18n / Localization** (14+ scenarios) | Zero tests for bilingual support — critical for foreign users |
| 10 | **Accessibility (aXe scan)** (20+ scenarios) | Manual partial checks only; no automated audit tool used |

---

## Detailed Analysis Files

| File | Size | Content |
|------|------|---------|
| `e2e/auth-security-gap-analysis.md` | ~400 lines | Auth: signup, signin, password, magic-link, signout, forgot-password, reset-password, callback, accept-invite, security headers |
| `e2e/dashboard-missing-scenarios.md` | ~453 lines | Dashboard home, reports list, report detail, templates, navigation, onboarding |
| `e2e/settings-teams-subscription-admin-gap-analysis.md` | ~697 lines | Settings (7 pages), teams, pricing, billing, checkout, admin API (6 endpoints) |
| `e2e/api-integration-gap-analysis.md` | ~450 lines | All 19 API endpoints, share/embed pages, CORS, rate limiting, auth protection |
| `e2e/cross-cutting-edge-gap-analysis.md` | ~400 lines | Navigation, responsive, accessibility, error pages, SEO, i18n, blog, contact, theme, keyboard shortcuts |

---

## Recommended Action Plan

### Phase 1 — Critical Gaps (Priority)
1. Write tests for forgo-password, reset-password, auth/callback, accept-invite pages
2. Write tests for Share API endpoints (meta, verify-password, settings)
3. Write tests for Comments feature
4. Write tests for Report detail API
5. Fix wrong tests in settings account spec

### Phase 2 — Core Flow Gaps
6. Expand report creation flow tests (config → generation → result)
7. Add batch operations tests
8. Add slide viewer navigation and sidebar tests
9. Add i18n tests for bilingual support

### Phase 3 — Edge Cases & Quality
10. Add aXe/Pa11y accessibility scan
11. Add error boundary tests (500 auth, dashboard, share)
12. Add responsive tests for dashboard and settings
13. Add SEO metadata validation tests
14. Add keyboard shortcut tests

### Phase 4 — Admin & API Coverage
15. Add admin CRUD API tests
16. Add OG image/HTML tests
17. Add analytics API tests
18. Add rate limiting and security header tests

---

## Next Steps

See individual gap analysis files for complete scenario lists organized by success/error/edge cases.

**Would you like me to start generating the Playwright E2E spec files for any of these areas?**
