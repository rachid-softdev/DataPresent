<!-- BEGIN:anchored-summary -->
## Goal
- Fix all critical blockers found by 10 test-automation-engineer agents so the project can implement the ~1,990 missing E2E test scenarios

## Constraints & Preferences
- Use Playwright E2E (same pattern as `D:\git-projects\PromptBearer` with `qa`)
- Align Playwright execution scripts exactly with PromptBearer pattern — no duplicates, runs directly

## Progress
### Done
- Fix #1: Created `/contact` page at `app/[locale]/contact/page.tsx` with form + SEO metadata; removed `/contact` → `/help` redirect from `next.config.ts`
- Fix #2: Created Playwright auth fixture at `e2e/auth.setup.ts` + `e2e/auth-helpers.ts` + `e2e/helpers/auth.ts` + `e2e/helpers/db.ts` — injects `authjs.session-token` JWT cookie, persists storage state to `e2e/.auth/user.json`
- Fix #3: Created extension skeleton at `datapresent-extension/src/` — Manifest V3, background service-worker, popup (HTML+TS), content scripts (TS+CSS), types, tsconfig
- Fix #4: Added `SMTP_HOST=localhost` and `SMTP_PORT=1025` to `e2e/.env.test`
- Fix #5: Stripe test keys already existed as placeholders in `.env.test`
- Created `scripts/qa-web.js` + `scripts/qa-web.ps1` — interactive QA session (PromptBearer `qa` pattern)
- Restructured all tests: moved from `tests/e2e/` to `e2e/` with subdirectories (auth/, dashboard/, share/, subscription/, settings/, admin/, api/, teams/, helpers/)
- Wrote 34 spec files with ~319 test declarations covering auth, public pages, dashboard, reports, share, subscription, settings, admin, teams, API, accessibility, responsive, and extension structure
- Updated `playwright.config.ts` — multi-browser (chromium, firefox, webkit, authenticated, api), setup project with dependencies
- Committed + pushed to `origin/main` — 72 files, 8,963 lines added
- Cleaned unused remote branches (dependabot auto-merged)
- Aligned Playwright execution scripts with PromptBearer pattern exactly: removed 5 duplicate scripts (`test:e2e`, `test:e2e:ui`, etc.), renamed `web:qa` → `qa`, rewrote `qa-web.js` to use `execSync` + PowerShell `Start-Process` detached launcher (exact PromptBearer pattern)

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Switched from `tests/e2e/` to `e2e/` directory structure matching PromptBearer pattern
- Playwright projects: `setup` (creates auth state) → `authenticated` (depends on setup, uses storageState) + `chromium`/`firefox`/`webkit` (public tests only) + `api` (API tests)
- Auth fixture uses `next-auth/jwt` `encode()` directly for session token generation (no UI login flow needed)
- Extension tests are structural/unit-level (validate skeleton files exist with correct structure)
- Removed duplicate scripts — single clean set: `test`, `test:ui`, `test:headed`, `test:authenticated`, `test:api`, `test:unit`, + `qa`/`qa:headless`
- `qa-web.js` rewritten to use pure `execSync` + PowerShell `Start-Process` for detached server launch (PromptBearer pattern)

## Relevant Files
- `datapresent-web/app/[locale]/contact/page.tsx`: New contact page with form + sidebar info
- `datapresent-web/e2e/auth.setup.ts`: Global Playwright setup — creates user, injects JWT, saves storage state
- `datapresent-web/e2e/auth-helpers.ts`: JWT generation + cookie injection + Prisma user creation
- `datapresent-web/e2e/helpers/auth.ts`: Re-exports auth helpers for PromptBearer-style imports
- `datapresent-web/e2e/helpers/db.ts`: PromptBearer-style DB factories (createTestReport, createTestOrganization)
- `datapresent-web/scripts/qa-web.js`: Interactive QA session (execSync + PowerShell detached) — matches PromptBearer exactly
- `datapresent-web/playwright.config.ts`: 6 projects (setup, chromium, firefox, webkit, authenticated, api)
- `datapresent-web/package.json`: Clean scripts — `test`, `test:ui`, `test:headed`, `test:authenticated`, `test:api`, `test:unit`, `qa`, `qa:headless`
- `datapresent-extension/src/manifest.json`: Extension Manifest V3 skeleton
- `datapresent-extension/e2e/extension.spec.ts`: 20 structural tests for extension skeleton

## Next Steps
(Coming from user request)

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