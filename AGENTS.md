<!-- BEGIN:anchored-summary -->
## Active Work Stream: Full-app audit (DONE — merged to `main`)
## Goal (current)
- Audit delivered on `audit/full-app-2026-10-16` → merged to `main` (`--no-ff`); 3-pass convergence, verdict AUDIT COMPLETE
- Keep `main` CI green (ci.yml + security.yml)

## Constraints & Preferences
- Tiers: free, starter, pro, ultra (renamed; migration SQL prepared, NOT executed — no DB)
- Do NOT run `prisma migrate` (no DB); leave migration SQL unexecuted
- Do NOT run `pnpm install` without `--ignore-scripts`
- Vitest 4: global `environment: "jsdom"`; per-file `// @vitest-environment node` pragma for server/Node tests (`environmentMatchGlobs` unsupported)
- No local DB; local Playwright has chromium only (pinned version mismatch for firefox/webkit) → integration/E2E verified via CI
- Local `next build` needs `NODE_OPTIONS=--max-old-space-size=4096` (V8 OOM at default heap); `next.config.ts` sets `experimental.cpus: 2` + `webpackMemoryOptimizations` when not CI
- `D:\Android\tmp\opencode` is shared scratch (another session runs Signavia on :3002 — leave its processes alone)

## Progress
### Done (audit branch, merged to main)
- `66cb270` core fixes: CSRF — 15 client mutation call sites → `apiFetch` + `withCsrfProtection` on comments POST / user-profile PATCH / accept-invite POST; regenerate — removed pre-enqueue `slide.deleteMany` (worker snapshot/swap atomic) + `maxSlides` 403 pre-check + `slideCount` clamp; upload — quota enforced BEFORE `consume` + `ERR_RESOURCE_LIMIT_REACHED` (en/fr); usage route — counters/limits from `getAllEntitlements`, slides from `limits.maxSlides`, real per-format export counts; billing page — per-plan catalog via `entitlementRepository.getPlanFeatures`; share verify-password — `hasFeature(org,"watermark")`; `app/api/reports/[id]/route.ts` — shim over canonical locale route (restores DELETE, kills IDOR drift); `typecheck` script now real `tsc --noEmit`
- `06aec12` E2E hardening: settings/teams/checkout sidebar locators → scoped `getByRole` (raw `aside nav a` counted a hidden duplicate shell — `div hidden id="S:0"` orphaned by an interrupted dev-server RSC reveal; visible UI/a11y tree have ONE sidebar); `.first()` on one visibility check
- `39d563d` deps: next + eslint-config-next 16.3.1 → 16.3.7; `@datapresent/ui` next pinned as devDep (auto-installed peer was frozen at vulnerable 16.2.4) → `pnpm audit --audit-level=critical` exit 0 (0 critical; 91 total, was 124/6)
- `93e8b03` i18n: `billing.plans.starter` added in en+fr (was `MISSING_MESSAGE` 30× per E2E run, on main too) + stale `pro` copy aligned with tier rename
- CI on branch head: Lint / TypeScript / Unit / Integration / Coverage / Build / 4× E2E shards / Dependency Audit / Static Analysis / Secret Scanning — green
- Local gates: unit 135 files / 1414 passed / 4 skipped; `tsc --noEmit` 0; eslint 0 errors; `next build` EXIT=0; biome clean; `pnpm audit` critical-clean

### Follow-ups committed directly on main
- `tests/unit/api/user/usage.test.ts` — usage route regression suite (9 tests; `@vitest-environment node`, `vi.hoisted` mocks like `upload.test.ts`)
- This anchored-summary refresh

### Report-only (deliberate, unchanged)
- Admin-route CSRF policy (admin session + same-origin); `membership[0]` multi-org assumption; export quota burn on worker failure; PAST_DUE→FREE immediate downgrade; regenerate worker default-10; PlanSelector silent `console.error`; billing page hardcoded French strings (Ultra description/CTAs); `billing.plans.enterprise` orphan key; `exportCounts[exp.format]` map is fragile if `ExportFormat` enum ever gains values (DB enum-constrained today)

## Key Decisions
- CSRF: client mutations via `apiFetch`; GETs / public share / verify-password / callback / email left unenforced (report-only)
- regenerate: worker snapshots into ReportVersion then swaps atomically — no pre-enqueue deletes
- upload: `getLimit(org,"maxSlides")` checked BEFORE `consume`; invalid `slideCount` → clamp 10
- usage route: display + enforcement share one source (`getAllEntitlements` / UsageTracking)
- E2E: prefer `getByRole` (a11y tree ignores hidden nodes) over raw CSS selectors
- Dependabot majors still deferred: prisma 7 (needs DB), eslint 10 (plugin peer)

## Relevant Files
- `datapresent-web/app/[locale]/api/{upload,user/usage,user/profile,auth/accept-invite}/route.ts`, `.../reports/[id]/{regenerate,comments}/route.ts`, `datapresent-web/app/api/reports/[id]/route.ts` (shim)
- `datapresent-web/app/[locale]/(dashboard)/settings/billing/page.tsx`, `components/billing/PlanSelector.tsx`
- `datapresent-web/tests/unit/api/{upload.test.ts,user/usage.test.ts}`, `tests/unit/api/reports/regenerate/csrf-protection.test.ts`, `tests/unit/components/billing/plan-selector.test.tsx`
- `datapresent-web/e2e/{settings/settings,teams/teams,subscription/checkout}.spec.ts`
- `datapresent-web/messages/{en,fr}.json` (`billing.plans.*`)
- `datapresent-web/prisma/migrations/20260716000000_rename_plan_tiers_to_free_starter_pro_ultra/migration.sql` (prepared, NOT run)
- `.github/workflows/{ci,security}.yml`

## Next Steps
- Prisma migration BLOCKED (no DB): run `prisma migrate deploy` when a DB is reachable (renames PRO→STARTER, TEAM→PRO, AGENCY→ULTRA)
- Optional: `billing.plans.enterprise` cleanup; defensive `exportCounts` fallback; refresh local firefox/webkit Playwright pins
<!-- END:anchored-summary -->

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:global-agent-rules -->

## Behavior Rules

### Think before coding
- State assumptions if unclear
- Ask only if ambiguity blocks progress
- Do not silently choose between multiple interpretations
- Ask only if ambiguity blocks progress or risks incorrect implementation

### Simplicity first
- Implement only what is requested
- Avoid unnecessary abstractions
- Prefer the smallest working solution
- Do not introduce new dependencies unless strictly necessary (no built-in or simple alternative exists)

### Surgical changes
- Only modify code related to the task
- Do not refactor unrelated parts
- Keep existing style

### Execution
- Define a clear success condition before coding
- Prefer verifiable outcomes (tests, reproducible checks)

### Speed vs caution
- For trivial tasks, execute immediately without overthinking

<!-- END:global-agent-rules -->