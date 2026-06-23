# Missing E2E Test Scenarios — Cross-Cutting & Edge Cases

**Analysis date:** 2026-06-22
**Existing tests:** navigation.spec.ts (10), responsive.spec.ts (10), accessibility.spec.ts (11), errors.spec.ts (7), home/landing/about/help/contact/blog/legal/pricing/pages (combined ~70)
**Estimated missing scenarios:** ~218+

---

## 1. NAVIGATION — Gaps

### Missing Success Cases
1. Browser back/forward — navigate landing→pricing, press back, verify landing, press forward, verify pricing
2. Deep linking to anchors — navigate to `/#pricing`, verify scroll with correct offset
3. Deep linking to `/help` from URL — verify FAQ renders
4. Deep linking to `/legal` from URL — verify sections render
5. Landing nav → `/help` link
6. Landing nav → `/blog` link
7. Footer → `/contact` link
8. Footer → `/privacy` link
9. Footer → `/terms` link
10. Root `/` redirects to `/fr` — 302 redirect
11. Dashboard nav routing (currently `test.skip`)
12. Settings sidebar routing (currently `test.skip`)

### Missing Error/Failure Cases
13. Invalid locale `/zz/page` → 404 or fallback to default locale
14. All 7 dashboard routes without auth → redirect to /login (only 4 tested)
15. URL normalization — `/pricing` vs `/pricing/` both work

### Missing Edge Cases
16. Language/locale switch — `/fr` ↔ `/en`, verify content + URL change
17. Locale persistence via cookie — `NEXT_LOCALE` persists across pages
18. Theme toggle persistence — dark mode persists across navigation
19. Mobile hamburger — open (click) → menu visible, close (click overlay/X) → menu hidden
20. Keyboard nav in nav — Tab, Enter, Escape for mobile menu
21. Sticky nav on scroll — nav stays at top
22. Anchor nav with offset — scroll position accounts for fixed nav height
23. Rapid nav clicks before page loads — race condition handling

---

## 2. RESPONSIVE — Gaps

### Missing Success Cases
1. Landscape mobile (812×375) — no overflow, readable content
2. Tablet landscape (1024×768) — 3-column pricing, no overflow
3. Very large desktop (2560×1440) — max-width containers, centered content
4. Responsive dashboard pages — layout at mobile/tablet/desktop
5. Responsive settings pages — sidebar collapses on mobile
6. Responsive error pages (404/500) — readable at all sizes
7. Responsive blog — single column on mobile, cards stack
8. Responsive nav — hamburger opens full-screen menu on mobile
9. Responsive tables — pricing table scrolls on 320px screens
10. Responsive help page — 2-column→1-column on mobile

### Missing Edge Cases
11. Very small screen (320px) — iPhone SE, no overflow, no cut-off, tappable CTAs
12. Zoom to 200% — no overlap, no horizontal scroll, readable text
13. Print layout — printer-friendly
14. Responsive sidebar/right-panel — dashboard sidebar collapses
15. Responsive font sizing — correct sizes across breakpoints
16. Responsive images — correct srcset/sizes
17. Responsive modals — centered and readable on mobile
18. Responsive forms — auth forms usable on mobile (login, signup, forgot-password)
19. Orientation change — rotate mid-session, layout adapts

---

## 3. ACCESSIBILITY — Gaps

### Missing Success Cases
1. Full aXe/Pa11y scan — all public pages (/, /pricing, /about, /help, /contact, /blog, /login, /signup)
2. Landmark regions — `<main>`, `<nav>`, `<footer>`, `<aside>` on every page
3. `<html lang>` attribute — matches locale
4. Heading hierarchy h1→h2→h3 (no skipping) on all pages
5. Link discernible text — no icon-only links without text
6. ARIA labels on ALL interactive elements — inputs, selects, toggles, switches, sliders, progress bars
7. Color contrast WCAG AA — measure ratio for body, headings, links
8. Logical focus order — matches visual layout
9. Reduced motion — animations disabled when `prefers-reduced-motion: reduce`
10. High contrast mode — content readable in Windows HCM
11. Text resize to 200% — no cut off, no overlapping
12. aria-live regions — dynamic content announcements (errors, success, loading)
13. Form error announcements — aria-describedby, aria-errormessage, role="alert"
14. Keyboard trap detection — no stuck focus
15. Focus visible on ALL interactive elements — buttons, links, inputs, selects
16. Touch target 44×44px minimum on mobile
17. Fieldset/legend for grouped fields

### Missing Error/Failure Cases
18. Decorative images have `alt=""` (not missing)
19. No input without label/aria-label/aria-labelledby on any page (only tested /login)
20. All iframes have descriptive title attributes

---

## 4. ERROR PAGES — Gaps

### Missing — 500 Error
1. 500 page content — "Une erreur est survenue" heading, "Réessayer" button, "Retour à l'accueil" link, header, footer
2. 500 retry button — click calls `reset()`, page recovers
3. Dev mode error details — message displayed in debug panel when NODE_ENV=development

### Missing — Auth Error
4. Auth error page — "Erreur d'authentification", "Réessayer", "Retour à la connexion"
5. Auth error recovery — retry returns to login page

### Missing — Dashboard Error
6. Dashboard error page — retry + home link
7. Dashboard error recovery — email support link

### Missing — Share Error
8. Share error page — "Rapport introuvable" heading, "Réessayer", "Retour à l'accueil"

### Missing — 404 Variants
9. Dashboard 404 (`/reports/nonexistent`) — dashboard 404 with header and back link
10. Deep path 404 (`/pricing/nonexistent/subpage`) — proper 404
11. URL with special chars (`/page@#$%`) — no crash, proper 404
12. Back button after 404 — "Page précédente" goes to previous page

### Missing Edge Cases
13. Network offline — graceful degradation or error message
14. API timeout — loading state + timeout → error message
15. Error page on mobile — 404/500 responsive at 375px
16. Multiple rapid errors — error boundary handles correctly
17. 404 after auth session expires — redirect to login with callback URL
18. Error page with query params — `/error?code=500` works

---

## 5. SEO — Gaps

### Missing per-page metadata
1. Landing — full audit (title, description, keywords, OG:title/description/image/url/type/locale/siteName, Twitter card, canonical, hreflang, JSON-LD)
2. Pricing — meta description, OG tags, JSON-LD (Product schema with offers), hreflang
3. About — metadata, OG, alternates
4. Blog list — OG, Twitter, alternates
5. Blog article — Article JSON-LD (headline, description, image, datePublished, author, publisher)
6. Blog article — per-article OG tags
7. Help — meta description
8. Contact — meta title/description
9. Privacy/Terms/Legal — static metadata
10. Canonical URL on all pages
11. Robots meta tag — `index, follow` on landing
12. Sitemap — `/sitemap.xml` returns 200 valid XML
13. OG locale/alternateLocale — changes with language switch
14. Twitter card on all public pages

---

## 6. i18n / LOCALIZATION — Gaps (Zero existing tests)

### Missing Success Cases
1. Root `/` redirects to `/fr` — 302 redirect
2. English locale `/en/` — English content (h1, nav, pricing, footer)
3. French locale `/fr/pricing` — French plan names, prices, CTAs
4. Blog locale filtering — `/fr/blog` shows French articles, `/en/blog` shows English
5. Legal pages bilingual — `/fr/legal` French, `/en/legal` English
6. Help FAQ bilingual — `/fr/help` French FAQ, `/en/help` English FAQ
7. Contact form bilingual — French/English labels, sidebar, subject options
8. Pricing FAQ bilingual — different questions per locale
9. Pricing metadata bilingual — OG title per locale
10. `<html lang>` matches locale — `lang="fr"` on `/fr/`
11. hreflang tags — `<link rel="alternate" hreflang="fr">` and `hreflang="en">`

### Missing Error/Failure Cases
12. Invalid locale `/zz` — fallback to default or 404
13. Missing translation key — fallback to key name or default locale
14. Locale cookie persistence — `NEXT_LOCALE` persists across pages

---

## 7. LANDING PAGE — Detail Gaps

1. Scroll-triggered animations (Reveal component) — sections animate with correct delays
2. Hero CTA "Générez votre présentation en 30s" navigates to /signup
3. Pain anchor band — time-saving pain text visible at top
4. LandingFeatures section — feature cards rendered
5. JSON-LD structured data — `<script type="application/ld+json">` with SoftwareApplication schema
6. Theme toggle click interaction — click toggles dark/light class on `<html>`
7. Theme persistence via cookie — reload after toggle, theme persists
8. Logo link — click DataPresent logo, stays on `/`
9. Section anchor deep links — `/#formats` scrolls to formats section
10. All FAQ items expandable — click each, verify answer visible
11. FAQ close — click open question again, answer hides
12. Hero mockup SVG — no broken assets

---

## 8. BLOG — Detail Gaps

1. Blog article detail — valid slug, h1 matches title
2. Tags displayed — Badge components
3. Meta info — published date, reading time, back link, share button
4. Cover image — display with correct alt text
5. Content rendering — via BlogRenderer
6. Related articles — section with 1-3 related posts
7. Article JSON-LD — Article schema in page
8. Share button — present and clickable
9. Back to blog link — click, navigates to `/blog`
10. Article cards — title, description, image on list page
11. Empty blog state — "Aucun article" when no posts
12. Malformed blog data — graceful error handling

---

## 9. HELP PAGE — Detail Gaps

1. Search with no results — "Aucun résultat trouvé" message
2. Search with special characters — `@#$%^&*` → no crash
3. Search with very long string (500 chars) — no UI breakage
4. Search clears — type, delete all, all 6 FAQs visible again
5. Support button click → navigates to /contact or opens modal
6. Meta description — `<meta name="description">` present
7. Case-insensitive search — "EXPORT", "Export", "export" all find question
8. Accented characters — "créer" finds French question

---

## 10. CONTACT PAGE — Detail Gaps (No form submission tested)

1. Form submit with ALL valid fields — name, email, subject, message → submit
2. Empty email — browser validation prevents
3. Empty name — required attribute prevents
4. Empty message — required attribute prevents
5. Invalid email format — HTML5 email validation
6. All 4 subject options — Général, Technique, Facturation, Partenariat content
7. Meta tags — title and description
8. Form state after refresh — all fields reset
9. Very long name (200+ chars) — no layout breakage
10. Very long message (10000+ chars) — textarea scrolls
11. XSS in fields — `<script>alert('xss')</script>` → no execution
12. Spam prevention — honeypot field if present
13. Rapid double-click — no duplicate submission

---

## 11. THEME TOGGLE — Gaps

1. Click toggle changes `data-theme` attribute on `<html>`
2. Theme persists on navigation — dark mode → go to /pricing → still dark
3. Theme persists on reload — via cookie
4. Toggle visual state — sun/moon icon switches
5. Toggle works on auth pages — /login, /signup

---

## 12. KEYBOARD SHORTCUTS — Gaps

1. Press `?` or `Cmd+/` — shortcut modal appears
2. Press Escape — modal closes
3. Registered shortcuts function correctly

---

## 13. SKIP-TO-CONTENT — Gaps

1. Skip link appears on first Tab press — "Aller au contenu principal" visible
2. Skip link navigates to `<main>` — focus moves to main content

---

## 14. LOADING/SUSPENSE STATES — Gaps

1. Reset password — Suspense fallback spinner
2. Accept invite — Suspense fallback spinner
3. Share page — Suspense fallback spinner

---

## SUMMARY

| Area | Existing Tests | Missing Scenarios |
|------|:-------------:|:-----------------:|
| Navigation | 10 | ~23 |
| Responsive | 10 | ~19 |
| Accessibility | 11 | ~20 |
| Error Pages | 7 | ~18 |
| SEO | 3 | ~16 |
| i18n | **0** | ~14 |
| Landing Page | 13 | ~12 |
| Blog | 6 | ~12 |
| Help Page | 10 | ~8 |
| Contact Page | 9 | ~13 |
| Theme Toggle | 1 | ~5 |
| Keyboard Shortcuts | **0** | ~3 |
| Skip-to-Content | 1 | ~2 |
| Loading/Suspense | **0** | ~3 |
| **TOTAL** | **~71** | **~218** |
