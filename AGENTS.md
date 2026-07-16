<!-- BEGIN:anchored-summary -->
## Active Work Stream: Plan-tier rename + entitlements bugfix + unit-suite greening
## Goal (current)
- Rename Plan enum `FREE/PRO/TEAM/AGENCY` → `FREE/STARTER/PRO/ULTRA` (price-preserving)
- Fix 15 catalogued entitlements bugs, write regression tests, push to `origin/main`
- Investigate + fix `node:` import errors in the vitest unit suite (vitest env setup)

## Constraints & Preferences
- Tiers: free, starter, pro, ultra (user-chosen)
- Feature flags are DB-backed (already implemented in `datapresent-web/lib/entitlements/`)
- Do NOT run `prisma migrate` (no DB); leave migration SQL unexecuted
- Do NOT run `pnpm install` without `--ignore-scripts` (husky prepare fails + aborts bin symlinks)
- Vitest 4.1.8 global `environment: "jsdom"`; `environmentMatchGlobs` is NOT supported — use per-file `// @vitest-environment node` pragma for Node-builtin tests

## Progress
### Done
- **Plan-tier rename:** applied repo-wide; plan literals `TEAM`/`AGENCY` eliminated; `tsc --noEmit` clean for all entitlements files
- **15 entitlements bugs fixed:** `feature-gate.ts`, `experiments.ts`, `repository.ts`, `middleware.ts`, `types.ts`
- **5 regression suites (94 tests) written + passing:** `feature-gate.bugs` (23), `consumption.bugs` (17), `experiments.bugs` (14), `downgrade.bugs` (23), `middleware.bugs` (8 — `withLimit` made a proper overload)
- **Fixed 3 regressions my own fixes introduced:** override `limitValue` check `!== null` → `!= null`; test-infra `getPlanFeatures` delegation; 2 tests asserted buggy behavior; 2 mocks missing `enabled:true` / modeled LIMIT as BOOLEAN
- **All entitlements tests green:** 162 passed, 3 skipped
- **Committed + pushed (`c4e2979`):** rename + 15 bugfixes + 5 suites + husky hook fix (replaced `lint-staged` with direct `biome format` NUL-delimited)
- **Rebased onto `origin/main`** (12 behind): resolved `package.json`/`pnpm-lock.yaml` conflicts (prisma `^5.22.0`) by taking remote
- **Post-push fix (`63efe03`):** `downgrade.test.ts` `mod`/`module` rebase-merge artifact
- **Rename test-expectation fix (`5fa09c1`):** updated stale `TEAM`/`AGENCY` names in `plans`, `plan-utils`, `slidecount-validation` tests (80/80 pass)
- **`node:` import error fix (`a8ddea0`):** added `// @vitest-environment node` pragma to 29 logic-test files importing Node builtins (crypto, fs, etc.). `No such built-in module: node:` errors: 12 → **0**; unit suite 1124 → **1242 passing**
- **All 33 genuine failures fixed (`a6393c4`):** created missing `middleware.ts` (`@/middleware` barrel: i18n + CORS + x-request-id), fixed duplicate-React crash via vitest.config.ts aliases (`@datapresent/ui` pins react 19.2.6 vs app 19.2.7), added missing `node` pragma to `csrf-protection.test.ts`, and corrected `module`→`mod` test typos in 12 files. No source logic bugs were found — all were test/env issues.
- **Unit suite now FULLY GREEN:** 1318 passed, 0 failed, 4 skipped (128 files). `node:` errors = 0.

### In Progress
- (none)

### Blocked
- (none) — unit suite is green

## Key Decisions
- `withLimit` overload: `(featureKey, handler)` and `(featureKey, amount, handler)`
- Override `limitValue` uses `!= null` (handles `undefined`)
- Husky hook: direct `biome format` on NUL-delimited staged paths (replaced broken `lint-staged` which failed on `[locale]`/`(dashboard)` bracket paths)
- Rebase conflict: took remote `package.json`/`pnpm-lock.yaml` (prisma already `^5.22.0`)
- **`node:` fix approach:** per-file `// @vitest-environment node` pragma (vitest 4.1.8 lacks `environmentMatchGlobs`); DOM tests keep default `jsdom`

## Relevant Files
- `datapresent-web/lib/entitlements/*.ts` — feature-gate, experiments, repository, middleware, types, compat, downgrade (rename + bugfixes)
- `datapresent-web/tests/unit/lib/entitlements/*.bugs.test.ts` — 5 regression suites (94 tests, green)
- `datapresent-web/tests/unit/lib/plans.test.ts`, `plan-utils.test.ts`, `queue/slidecount-validation.test.ts` — rename expectation fixes (`5fa09c1`)
- `datapresent-web/tests/unit/**` (29 files) — `// @vitest-environment node` pragma added (`a8ddea0`)
- `datapresent-web/vitest.config.ts` — global `environment: "jsdom"` (do NOT add `environmentMatchGlobs` — unsupported)
- `datapresent-web/prisma/migrations/20260716000000_rename_plan_tiers_to_free_starter_pro_ultra/migration.sql` — prepared, NOT run (needs DB)
- `.husky/pre-commit` — direct biome format (committed `c4e2979`)

## Next Steps
- Decide whether to fix the ~33 genuine failures (missing `@/middleware` barrel export is the biggest real bug; others are export/assertion bugs + DOM test setup)
- Optionally run full `tsc` and fix the 11 pre-existing type errors (Redis ping, puppeteer, AWS SDK, Stripe date literal, etc.)
- Execute the plan-tier migration SQL only when a DB is available

---

## (Prior work stream — E2E test blockers, mostly complete)
### Done
- Fix #1: `/contact` page + removed `/contact`→`/help` redirect
- Fix #2: Playwright auth fixture (JWT cookie → `e2e/.auth/user.json`)
- Fix #3: Extension skeleton (Manifest V3)
- Fix #4/#5: `SMTP_HOST`/`SMTP_PORT` + Stripe test keys in `e2e/.env.test`
- `scripts/qa-web.js` + `qa-web.ps1` (PromptBearer `qa` pattern)
- Restructured `tests/e2e/` → `e2e/` (34 spec files, ~319 declarations)
- `playwright.config.ts` 6 projects; committed+pushed (72 files)
- Aligned Playwright scripts with PromptBearer exactly (removed 5 duplicates, `web:qa`→`qa`)

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