---
target: landing page
total_score: 23
p0_count: 0
p1_count: 2
p2_count: 2
timestamp: 2026-06-12T20-48-09Z
slug: datapresent-web-app-locale-page-tsx
---
# Design Critique: DataPresent Landing Page

**Target:** datapresent-web/app/[locale]/page.tsx
**Slug:** datapresent-web-app-locale-page-tsx
**Date:** 2026-06-12
**Reviewer:** Design Director

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Limited feedback for scroll position; no nav section highlighting |
| 2 | Match System / Real World | 3 | Clear French copy; some buzzwords ("Analyse IA") lack explanatory depth |
| 3 | User Control and Freedom | 2 | No back-to-top on a long page; no way to quickly navigate sections |
| 4 | Consistency and Standards | 3 | Testimonials use inline styles, breaking the class-based pattern |
| 5 | Error Prevention | 2 | No error states to assess; landing is informational only |
| 6 | Recognition Rather Than Recall | 3 | Section labels clear; no FAQ/help accessible from landing |
| 7 | Flexibility and Efficiency | 1 | No skip-to-content link; no keyboard navigation aids |
| 8 | Aesthetic and Minimalist Design | 3 | Clean palette; features card grid is monotonous (6 identical cards) |
| 9 | Error Recovery | 2 | Not testable on a static landing; no form errors to evaluate |
| 10 | Help and Documentation | 1 | No documentation, FAQ, or help accessible from the landing page |
| **Total** | | **23/40** | **Acceptable** |

---

## Anti-Patterns Verdict

**Does this look AI-generated? No.** — and that's a real achievement.

The page avoids every major tell from the SKILL.md ban list:
- No side-stripe borders ✅
- No gradient text ✅
- No glassmorphism ✅
- No eyebrow above every section ✅ (hero badge exists, others were removed)
- No numbered step markers rendered ✅ (data has them but JSX doesn't)

**Deterministic scan:** The bundled detector (detect.mjs) scanned all source files and returned **0 anti-patterns**. Zero hits. This is excellent — the codebase has been intentionally cleaned of the common AI template reflexes.

**Detector notes:** Ran with --json --gpt flags. Exited clean (code 0). No false positives to report. The only radar ping would be Fraunces appearing in the "overused fonts" rule, but that's part of the design system (not a Google Fonts reference), so the detector correctly skipped it.

---

## Overall Impression

This is a genuinely well-crafted landing page that has clearly been through a design audit before. The palette is cohesive (Deep Forest green anchors everything), the typography pair (Fraunces + DM Sans) is well-chosen, and the layout avoids the template-itis that plagues most AI-generated SaaS pages. The mockup SVG with animated bars is an unexpected delight.

The biggest opportunity: the page plays it **safe**. The design is correct but not memorable. In pursuit of "not AI-generated," it became "not particularly distinctive." The emotional journey is flat — it informs but doesn't excite. The identical card grids, uniform section padding, and careful-but-cautious layout give it a competent-but-corporate feel that doesn't fully match the "Confiant · Naturel · Précis" brand promise.

---

## What's Working

1. **Color system and theming.** The green-tinted neutrals are a subtle but powerful differentiator. --landing-bg: #f4f7f0 is not "another off-white SaaS bg" — it's genuinely tinted toward the brand hue. Dark mode handles the full palette without defaulting to blue. Excellent.

2. **SVG dashboard mockup.** Animated bars, KPIs with pulse rings, staggered entrance animations — this is the most memorable element on the page. It sells the product visually and the micro-animations (barRise, shimmer) make it feel alive without being distracting.

3. **AI template tell avoidance.** Someone has already gone through and removed the eyebrows, numbered markers, and other GPT-reflex structures. The label prop is still passed but not rendered — evidence of a conscious cleanup that wasn't fully finished.

---

## Priority Issues

### [P1] Identical Card Grid — Features Section

**What:** Six feature cards with the exact same structure: icon box → title → description paragraph. Repeated identically in a 3×2 grid.

**Why it matters:** This creates visual monotony. Users scan rather than read, and when every card is the same shape, nothing stands out. The SKILL.md explicitly bans this as a pattern: "Same-sized cards with icon + heading + text, repeated endlessly."

**Fix:** Break the grid rhythm. Alternate layout: some cards wider, some with background illustrations, some with data previews instead of descriptions. Or reduce to 3 strongest features with richer content. At minimum, vary the icon box colors (some accent, some primary, some muted) to create visual differentiation.

**Suggested command:** /impeccable layout

### [P1] Testimonials Use Inline Styles

**What:** landing-testimonials.tsx uses style={{}} for every visual property — grid layout, card backgrounds, borders, border-radius, padding, font sizes, colors, avatar styles. No CSS classes.

**Why it matters:** (a) Breaks the design system convention — every other component uses landing-* classes. (b) Inline styles can't respond to dark mode without JS. (c) Harder to maintain, harder to theme, harder for future developers.

**Fix:** Extract all inline styles to landing.css as .landing-testimonial-grid, .landing-testimonial-card, .landing-testimonial-avatar, etc.

**Suggested command:** /impeccable polish

### [P2] Dead Props — Unused label and step.num

**What:** The label prop is passed to LandingFormats, LandingHowItWorks, LandingFeatures, and LandingPricing in page.tsx, but none of these components render it. Similarly, step.num ("01", "02", "03") is in the data but never displayed.

**Why it matters:** Dead code confuses maintainers, signals incomplete cleanup, and adds noise. The label prop makes it look like eyebrows were removed but the wiring wasn't cleaned up.

**Fix:** Remove label from the component interfaces and page.tsx calls. Remove 
um from the steps data.

**Suggested command:** /impeccable distill

### [P2] Uniform Section Padding — No Rhythmic Variation

**What:** Every section uses padding: 90px 0 (.landing-section) with no variation between sections. Hero has 100px 0 80px.

**Why it matters:** Rhythm is a core design principle. When every section has the same vertical rhythm, the page feels mechanically gridded. Sections with heavier content (how-it-works) should breathe more; lighter sections (formats) could be tighter.

**Fix:** Introduce a spacing scale: hero sections get 100px, content-heavy sections get 80px, lighter sections get 64px. Alternate between spacious and tight to create rhythm.

**Suggested command:** /impeccable layout

### [P3] Footer Has Incomplete / Missing Links

**What:** "Formats supportés" and "Templates" are commented as page à créer. "Mentions légales" likewise commented out.

**Why it matters:** These are visible in the rendered footer (the links exist, but the pages don't). A stress-testing user (Riley) who clicks them will get 404s.

**Fix:** Either create the pages, remove the links, or add ria-disabled with a "coming soon" state.

**Suggested command:** /impeccable harden

---

## Persona Red Flags

### Jordan (First-Timer)

- Hero is clear, but after the fold there's no guidance — Jordan must scroll through 6 sections with no visible progress indicator or sticky nav section highlighting.
- "Analyse IA" step says "L'IA analyse & structure" but doesn't explain how the AI decides what to show. Jordan needs to trust the output; the page doesn't address this skepticism.
- No FAQ, no "How it works" video, no demo — Jordan has no way to validate the tool before signing up.

### Riley (Stress Tester)

- Footer links to /terms and /privacy — if these return 404 or don't exist, Riley will flag the site as not production-ready.
- Stats numbers (10K+, 99.9%) have no source or social proof. Riley will question their validity.
- The inline styles in testimonials will break if Riley tests dark mode and the style={{ color: "var(--landing-text3)" }} variables don't resolve correctly in the rendering context.

### Casey (Mobile User)

- Responsive breakpoints are well-implemented (900px, 640px, 480px) and handle most cases.
- However, the pricing grid goes to single column at 900px — at this breakpoint there's a single centered column with max-width 420px, which wastes a lot of screen real estate on tablets.
- The footer grid collapses to 1 column at 900px, so on an iPad in landscape it's already stacked. Could use a 2-column intermediate breakpoint.

---

## Minor Observations

1. **Stats strip hero-metric template:** The 4-stat strip (10K+, <30s, 4 formats, 99.9%) is the exact pattern the SKILL.md warns about ("Big number, small label, supporting stats"). It's valid here since these are real product metrics, but consider varying the display (mix icons, progress bars, or visual elements) to avoid the cliché.

2. **CTA section uses ackground: #0d1f06 hardcoded** instead of a CSS variable. Works in both themes since it's a dark section, but breaks the variable pattern.

3. **Hero SVG uses color=var(--accent) in JSX** — this is a custom attribute, not a CSS property. The SVG elements have color as a stroke attribute, which may not resolve CSS custom properties in all SVG renderers. Safer to use a concrete hex value or apply via CSS class.

4. **Reveal Framer Motion wrapper** applies to almost every section uniformly. The delay prop is used (0.05 for most) but the distance is always 30. The identical reveal treatment makes sections feel mechanically applied rather than purposefully animated.

5. **LandingClientWrapper** exists but is not imported or used in page.tsx. Dead component.

---

## Questions to Consider

1. **Is the emotional journey too flat?** The page is correct, clear, and competent — but is it exciting? "Confiant · Naturel · Précis" promises confidence and precision, but also nature and growth. Where's the visual warmth, the delight, the pulse? The mockup SVG has it; the rest of the page doesn't.

2. **Does 6 sections exhaust the visitor?** Features, Formats, How It Works — these overlap. A visitor reads "4 formats supported" in the stats, then sees the Formats section, then Features, then How It Works. Could some of these be consolidated or removed?

3. **What would make a first-timer click "Sign Up"?** Right now, the page explains the what and how, but not the why-me. The testimonial cards try this, but they're late in the scroll (position 6/7). Trust-building content (security badges, customer logos, case studies) comes after the fold. Should some of it move up?
