---
target: all pages
total_score: 34
p0_count: 0
p1_count: 0
p2_count: 0
p3_count: 2
timestamp: 2026-06-13T10-37-13Z
slug: datapresent-web-app
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3/4 | Report generation has sub-stages + progress bar + stall detection; still no real backend-tied progress |
| 2 | Match System / Real World | 4/4 | Fluent French, natural terminology; tooltips now clarify sector, watermark, slug, white-label |
| 3 | User Control and Freedom | 4/4 | Command palette + keyboard shortcuts + Esc dismiss + cancel/retry on generation + batch actions |
| 4 | Consistency and Standards | 4/4 | All non-landing pages use the design system; no CSS drift; app-table, app-card, app-* classes everywhere |
| 5 | Error Prevention | 3/4 | Confirm dialogs on delete/regenerate; file type/size validation on upload; no autosave |
| 6 | Recognition Rather Than Recall | 3/4 | Clear nav labels, command palette for discoverability, contextual tooltips on jargon |
| 7 | Flexibility and Efficiency | 3/4 | Cmd+K palette, N for new report, bulk select/delete/export now available |
| 8 | Aesthetic and Minimalist Design | 4/4 | Clean dashboard hierarchy, narrative proof bar, no decorative clutter |
| 9 | Error Recovery | 3/4 | Inline French errors, toast confirmations, retry on generation stall; no draft recovery |
| 10 | Help and Documentation | 3/4 | Help page exists; contextual tooltips on sector, watermark, white-label, slug; no help search |
| **Total** | | **34/40** | **Good — improved from 32/40** |

## Anti-Patterns Verdict

**LLM assessment**: The interface no longer reads as AI-generated. The green-branded palette with Fraunces + DM Sans is distinctive and intentional. The design system is consistently applied across all pages. The dashboard is functional without being cluttered. The batch operation toolbar and inline help icons show deliberate feature-building rather than templated scaffolding. No eyebrow patterns, no numbered section markers, no gradient text, no glassmorphism, no hero-metric stats strips.

**Deterministic scan**: `detect.mjs` across all changed files. **0 findings.** Clean across the board — no gradient text, glassmorphism, side-stripe borders, hero-metric template, numbered section markers, eyebrow patterns, or text overflow.

## What Changed Since Last Critique

| Issue | Previous | Now | Status |
|-------|----------|-----|--------|
| Batch operations on reports | None | Checkboxes, select-all, batch delete + export toolbar | ✅ Fixed P2 |
| Contextual tooltips | None | InlineHelp on sector, watermark, white-label, slug | ✅ Fixed P3 |
| Generation progress | Sub-stages existed | Already had spinner, progress bar, stall detection (no change needed) | ✅ Already done |
| About page CSS drift | Inline Tailwind | Landing design system | ✅ Fixed P1 |
| Dashboard overload | 5 competing zones | Clean hierarchy | ✅ Fixed P1 |
| Pricing analysis paralysis | 4 plans | 3 plans + Agency upsell | ✅ Fixed P2 |
| Keyboard shortcuts | None | Cmd+K palette, N for new, Esc | ✅ Fixed P2 |
| Hero heading | 4.5rem max | 5.5rem max + text-wrap balance | ✅ Fixed P3 |
| Placeholder contrast | opacity 0.6 | color-mix guaranteed contrast | ✅ Fixed P3 |
| Logo hover rotation | rotate(-3deg) | translateY(-1px) subtle | ✅ Fixed P3 |
| CTA/footer dark bg | #0d1f06 hardcoded | CSS variable responsive | ✅ Fixed P3 |
| Stats strip | 4-box grid | Narrative proof line | ✅ Fixed P3 |

## What's Still Open

No P0/P1/P2 issues remain. Only P3 polish items:

- **P3 — Generation progress**: Sub-stages are simulated (time-based, not backend-driven). Real progress from the generation pipeline would be more accurate but requires a backend change.
- **P3 — Help search**: The help page exists but has no search functionality.

## Priority Issues

### [P3] Simulated generation sub-stages
The GenerationProgress component already shows "Analyse → Graphiques → Mise en page → Finalisation" with a spinner, progress bar, and stall detection. The sub-stages advance every 3.5s regardless of actual backend progress. This works for now but could be inaccurate for very large or very fast reports.

**Fix**: Connect sub-stage advancement to real backend status events (SSE or polling) rather than the timer.

### [P3] No help search
The help page (`/help`) provides a static FAQ. Users looking for a specific term or feature must scan the page.

**Fix**: Add a client-side search or filter to the help page.

## Overall Impression

DataPresent has made significant progress. From 28→32→34 in three critique passes, with all P0/P1/P2 issues resolved. The design system is cohesive, the power-user features (keyboard shortcuts, batch operations) are in place, and the contextual help addresses the jargon barrier for first-timers. The interface reads as a deliberate, opinionated product — not an AI template.

The remaining items are polish: the generation progress simulation and help search. Neither blocks a release.

## What's Working

1. **Batch operations feel native**: The checkbox column integrates cleanly with the existing table, the batch toolbar slides in with motion, and the export dropdown follows the same pattern as individual report actions. No new UI vocabulary needed.

2. **Design system consistency**: Every page now uses the same `.app-*` and `.landing-*` class vocabulary. The green palette with Fraunces serif headings is recognizable across all surfaces.

3. **Inline help is light-touch**: The `InlineHelp` component (question-mark circle with hover tooltip) adds clarification without cluttering the interface. It's used sparingly — just where jargon would be a blocker.

## Minor Observations

- The reports table pagination uses Link-based navigation (`?page=N`), which means the batch selection state is lost on page change. This is expected behavior (no server-side selection persistence) but worth noting.
- `InlineHelp` uses the Tooltip from `@datapresent/ui`, which works on hover but not on focus/keyboard. Adding focus visibility would help accessibility.
- The batch delete ConfirmDialog title hardcodes "Supprimer X rapports?" in French rather than using translation keys. For a 100% French interface this is acceptable, but adding a translation key would future-proof.

## Questions to Consider

- Would real-time generation progress (via SSE) materially improve user trust, or is the simulated sub-stage animation sufficient?
- The batch export loops through individual export endpoints — should there be a dedicated batch export endpoint that queues once instead of N times?
- Should the select-all checkbox persist across pagination (select all matching filter, not just current page)?
