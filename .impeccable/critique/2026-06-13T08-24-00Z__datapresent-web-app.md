---
target: all pages (landing, dashboard, auth, pricing, about)
total_score: 28
p0_count: 0
p1_count: 2
p2_count: 3
timestamp: 2026-06-13T08-24-00Z
slug: datapresent-web-app
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Report generation progress unclear; form submits without timeline indicator |
| 2 | Match System / Real World | 4/4 | Fluent French, natural terminology, clear data-to-presentation metaphor |
| 3 | User Control and Freedom | 3/4 | Back buttons exist but missing undo for most actions |
| 4 | Consistency and Standards | 3/4 | Inconsistent CSS architecture: About/Pricing use inline Tailwind, rest uses `.app-*` classes |
| 5 | Error Prevention | 3/4 | Form validation solid but no autosave or draft recovery visible |
| 6 | Recognition Rather Than Recall | 3/4 | Good navigation labels; settings sections clear; some features buried in sidebar |
| 7 | Flexibility and Efficiency | 1/4 | No keyboard shortcuts, no bulk actions, no command palette, no accelerators |
| 8 | Aesthetic and Minimalist Design | 3/4 | Dashboard has 4 competing content zones (stats + reports + usage + checklist) |
| 9 | Error Recovery | 3/4 | Inline errors in French; no visible form data persistence on error |
| 10 | Help and Documentation | 2/4 | Help page exists but no contextual tooltips, no guided tour, no search |
| **Total** | | **28/40** | **Good — address weak areas for solid foundation** |

## Anti-Patterns Verdict

**Does this look AI-generated?** Partially — and only in specific areas.

**LLM assessment**: The core design system is deliberate and well-thought-out. The green palette with Fraunces + DM Sans typography is distinctive and avoids the SaaS-cream monoculture. However, several landing page section tropes weaken the identity:

- **The uppercase eyebrow on 5/7 sections**: `.landing-label` (0.7rem, weight 600, letter-spacing 0.12em, uppercase) appears above Formats, How It Works, Features, Pricing, and Testimonials — 5 of the 7 content sections. This is the #1 AI tell of 2023–2026. "AI made this" hits hardest here.
- **The hero layout is clean** but the pulse-ring badge ("Nouveau" dot with animated ring) is a common SaaS pattern, not AI-specific.
- **Dashboard page** avoids AI clichés well — stat cards are clean, report cards are functional, no gradient text or glassmorphism.
- **Identical card grids** in the feature section: 6 features (3×2 grid) with identical icon + title + description. While not egregious, the uniformity reads as templated.

**Deterministic scan**: `detect.mjs` ran across all key source files (landing page, dashboard, auth pages, globals.css, landing.css). **Result: 0 findings.** The automated scan found no instances of the banned patterns (side-stripe borders, gradient text, glassmorphism, hero-metric template, numbered section markers, text overflow).

**Visual overlays**: Skipped — no dev server was running and project environment constraints prevented reliable browser launch. The deterministic scan still provides objective coverage.

## Overall Impression

DataPresent has a **strong, opinionated design system** that successfully differentiates it from generic SaaS. The green-on-green palette with Fraunces serif typography is distinctive, and the flat-by-default elevation strategy creates a clean, confident interface. The greatest weakness is **execution inconsistency**: the landing page has one architecture with careful CSS variables and animation orchestration, while subsidiary pages (About, Pricing) use inline Tailwind with no connection to the design system. The landing page's section eyebrow pattern is the most visible AI tell and should be addressed. The dashboard is functional but lacks power-user features that the target audience (busy consultants, analysts) would immediately benefit from.

## What's Working

1. **Cohesive color philosophy**: The "one-voice rule" (green is the only accent) with tinted neutrals creates a memorable, warm identity that doesn't rely on generic grays. The dark mode preserves the green identity rather than switching to blue.

2. **Typography pairing**: Fraunces (display) + DM Sans (utilitarian) is well-judged. Fraunces is never used in UI elements (buttons, inputs, labels), strictly adhering to the product register rule. The contrast between the two voices creates clear hierarchy without extra visual weight.

3. **Auth flow clarity**: Login and signup pages are minimal, focused, and use the same design vocabulary. The magic-link flow is well explained, and the footer note about expiration time is a nice trust detail. The divider "ou" pattern is standard but well-executed.

## Priority Issues

### [P1] Inconsistent CSS architecture across pages

**What**: Three distinct styling approaches coexist:
- Landing page: dedicated `landing.css` with CSS custom properties
- Dashboard/auth: `globals.css` with `.app-*` utility classes
- About, Pricing, help pages: inline Tailwind utility classes (`text-4xl md:text-5xl`, `bg-card border-border`, etc.)

**Why it matters**: This creates visual drift and maintenance burden. The About page hero uses `text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight` while the dashboard uses `.app-heading.app-heading-xl`. Different heading sizes, different spacing rhythm, different color access patterns. A new developer can't tell which approach to follow.

**Fix**: Unify under the design system. Convert About, Pricing, and help pages to use the `.app-*` class vocabulary (`.app-heading-xl`, `.app-card`, `.app-btn-primary`) so all non-landing pages share one visual vocabulary.

**Suggested command**: `/impeccable distill about` and `/impeccable distill pricing`

---

### [P1] Dashboard information overload for the primary task

**What**: The dashboard page presents 4 distinct content zones simultaneously:
1. Page header with "New Report" button
2. Stats strip (4 stat cards with icon + number + label)
3. Report grid (up to 6 report cards with title + badge + sector)
4. Right sidebar: UsageCard (dynamically loaded)
5. Bottom: StartChecklist (onboarding checklist)

**Why it matters**: The user's primary task is "create a report" or "find an existing report." Everything else competes for attention. For a consultant rushing between meetings (the target persona), the cognitive load of parsing all 5 zones before acting creates friction.

**Fix**: Consider (a) hiding the checklist after completion, (b) lazy-loading the usage card below the fold, and (c) making the stats strip more visually recessive (smaller type, no icon boxes) since it's informational, not actionable.

**Suggested command**: `/impeccable distill dashboard`

---

### [P2] The landing section eyebrow pattern (5/7 sections)

**What**: The `.landing-label` class (0.7rem, weight 600, 0.12em tracking, uppercase) appears above the heading in Formats, How It Works, Features, Pricing, and Testimonials sections. It's the "tiny uppercase tracked eyebrow above every section" pattern from the absolute bans.

**Why it matters**: This is the single most recognizable "AI made this" signal in 2026 design. 5 out of 7 content sections use the same pattern — it's not a deliberate brand system, it's AI grammar. Even if the code is hand-written, the pattern reads as templated.

**Fix**: Keep at most one eyebrow if it carries real meaning (e.g., a live "BETA" badge on one section). For the others, remove the label entirely or use a different entry pattern for each section (some open with a narrative lede, some with a visual, some with a pull quote, etc.).

**Suggested command**: `/impeccable quieter landing`

---

### [P2] No keyboard shortcuts or power-user accelerators

**What**: The app has zero keyboard shortcuts, no command palette, no bulk selection on reports, no batch actions. The theme toggle and navigation are click-only.

**Why it matters**: The target audience (consultants, analysts, product managers in back-to-back meetings) values speed above all. A power user would need to click the "New Report" button, wait for the page, select files — each step is a full click interaction. This directly contradicts PRODUCT.md's "L'utilisateur est pressé, multitâche, souvent entre deux réunions."

**Fix**: Implement at minimum: `Cmd/Ctrl+K` command palette, `/` to search reports, `n` for new report, arrow navigation in report grid. Even these 4 shortcuts would dramatically improve efficiency perception.

**Suggested command**: `/impeccable harden dashboard`

---

### [P2] Pricing page: 4 tiers with comparison table pushes working memory limits

**What**: The pricing page presents 4 plan cards + a full feature comparison table with 6 categories and ~20 feature rows × 4 plans = 80 data points.

**Why it matters**: At any decision point, users can hold ≤4 items in working memory. Four plans with 12+ features each creates analysis paralysis. The comparison table, while thorough, requires horizontal scrolling and cross-referencing, forcing users to mentally map which plan had which features.

**Fix**: Reduce to 3 visible plans (relegate Agency to a "custom" link), highlight the recommended plan more aggressively, and make the comparison table use a sticky first column with visual row striping to reduce cognitive load.

**Suggested command**: `/impeccable distill pricing`

---

### [P3] Auth pages: placeholder contrast in dark mode

**What**: `.app-input::placeholder` uses `var(--muted-foreground)` with `opacity: 0.6`. In light mode, `--muted-foreground` is `#4a5c3a` — fine. In dark mode, `--muted-foreground` is `#7a9a62` with 60% opacity, which against `--surface` (`#162309`) gives approximately 3.2:1 contrast — below the 4.5:1 WCAG AA standard for text.

**Why it matters**: Placeholder text is body text, not decorative. WCAG requires the same 4.5:1 ratio. Users with low vision in dark mode cannot read field hints.

**Fix**: Use a dedicated `--placeholder` token with sufficient contrast, or apply `color: color-mix(in oklch, var(--foreground) 50%, transparent)` which inherits the foreground hue at guaranteed contrast.

**Suggested command**: `/impeccable audit auth`

---

### [P3] Landing hero heading ceiling below product register ceiling

**What**: The landing display uses `clamp(2.8rem, 6vw, 4.5rem)` — the max of 4.5rem (~72px) is well below the 6rem (~96px) ceiling. For a brand landing page, this underutilizes the allowed range.

**Why it matters**: The hero is the single most important visual moment. The current size is comfortable but not impactful. The Fraunces serif at 5–5.5rem would create a stronger first impression while staying within the "not shouting" range.

**Fix**: Bump to `clamp(3rem, 7vw, 5.5rem)` — matches the DESIGN.md spec for Display exactly. This is already documented but not implemented.

**Suggested command**: `/impeccable typeset landing`

---

### [P3] Stats strip on landing is the hero-metric template (lite version)

**What**: The `landing-stats-strip` shows 4 stat items with big numbers (Fraunces 700, 2rem) and small labels below. This is the hero-metric template — though without the gradient accent, which keeps it from being a full violation.

**Why it matters**: It's not a critical failure (no gradient text, no decorative overdesign), but it contributes to the "template" feel. Combined with the eyebrow pattern, it layers one generic pattern on another.

**Fix**: Consider making these stats more contextual — inline text like "Plus de 10 000 présentations générées" instead of a stat strip grid with big numbers.

**Suggested command**: `/impeccable bolder landing`

## Persona Red Flags

### Alex (Power User — Consultant/Analyst)
- **Zero keyboard shortcuts**: No `Cmd+K`, no `/` search, no `n` for new report. Every action requires a click and a page load.
- **No bulk operations**: Reports can only be viewed individually from the dashboard grid. No select-all, no batch delete, no bulk export.
- **Slow task completion**: Creating a new report requires navigating to `/new`, filling a form, uploading data, waiting — each step is a full interaction. No "quick create" or template reuse path.
- **Dashboard scroll cost**: The stats strip and usage card and checklist all consume viewport before the actionable report list. Alex needs to scan past 4 stat cards and a right column to reach the reports.

### Jordan (First-Timer — Non-technical professional)
- **Dashboard confusion**: The first dashboard view shows 5 zones (header, stats, reports, usage, checklist) without an obvious "start here" cue. Jordan will hesitate.
- **The onboarding flow is hidden**: `WelcomeScreen` triggers on first visit but is a one-time overlay. After dismissing it, Jordan gets the full dashboard with no guidance on what to do next. The `StartChecklist` at the bottom is the only guidance, but it's visually recessive.
- **No inline help**: No tooltips on unfamiliar terms (e.g., "usage", "entitlements"), no question-mark icons, no contextual help panel. If Jordan encounters an error, recovery depends entirely on error message clarity.
- **Pricing page paralysis**: 4 plans × 12+ features × full comparison table = Jordan will tab away to compare elsewhere or leave entirely.

### Casey (Mobile User — On-the-go professional)
- **Dashboard sidebar**: The `DashboardNav` sidebar at 240px on mobile may be collapsed or cramped. The responsive behavior needs verification.
- **Stats strip**: 4 stat cards in a 2×2 grid on mobile is dense. Touch targets for the report cards need to be ≥44×44pt.
- **Loading states**: The dynamic `UsageCard` with skeleton is good, but the dashboard fetches data server-side which means full page reloads for navigation.
- **Form inputs**: The new report form and auth forms are mobile-friendly, but the pricing comparison table requires horizontal scrolling on mobile — a known usability failure.

## Minor Observations

- **Logo hover rotation**: `.landing-logo-mark:hover` applies `scale(1.08) rotate(-3deg)`. This is a nice micro-interaction but slightly jarring — the rotation doesn't feel connected to the interaction. A scale + subtle vertical lift would feel more natural.
- **CTA section has no dark mode toggle**: The landing CTA section (`.landing-cta-section`) and footer (`.landing-footer`) use hardcoded `#0d1f06` backgrounds and don't respond to `data-theme="dark"`. They appear identical in both modes.
- **About page badges**: The "Confiant / Naturel / Précis" badges on the About page use `inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 border border-primary/20` — this is the eyebrow pattern appearing again outside the landing page. It's inconsistent with the landing's `.landing-label` system.
- **Dashboard `app-page-desc` spacing**: `app-page-desc` uses `margin-top: 0.3rem` which is very tight against the heading. Standard spacing would be 0.5rem.
- **UsageCard uses `ssr: false`**: The card is dynamically imported without SSR. While understandable for client-side measurements, it creates a layout shift when the skeleton resolves.

## Questions to Consider

- **"What if sections on the landing page each entered with their own personality?"** Right now every section uses the same `Reveal` wrapper (fade + translate). What if Formats entered as a staggered grid, How It Works as a horizontal timeline, Testimonials as a carousel fade — each entrance matching its content shape?
- **"What would a power user's dashboard look like?"** If Alex could customize their dashboard layout, hide the stats strip, and surface a command palette, how much faster would their workflow be? The current one-size-fits-all approach serves nobody perfectly.
- **"Is the Fraunces heading on the About page hero the right choice?"** The About page uses `text-4xl md:text-5xl lg:text-6xl font-bold` — system bold font, not Fraunces. The landing hero uses Fraunces display. Which page deserves the brand type more?
