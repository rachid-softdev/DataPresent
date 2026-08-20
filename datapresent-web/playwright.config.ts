import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load E2E-specific test env vars from e2e/.env.test (safe for forks)
dotenv.config({ path: path.resolve(__dirname, "e2e", ".env.test") });

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  // `next dev` compiles routes on first request — give cold compilations
  // (up to ~60s on CI runners) room so they don't fail as timeouts.
  timeout: 90000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:3000",
    // Force French locale so tests asserting French content behave the same
    // on CI (headless browsers default to en-US) as they do locally.
    locale: "fr-FR",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    // ── Setup: creates test user + session, persists storage state ──
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    // ── Public pages & unauthenticated tests ──
    {
      name: "chromium",
      testIgnore: [
        /auth\.setup\.ts/,
        /auth\/signout/,
        /auth\/accept-invite/,
        /dashboard\//,
        /settings\//,
        /share\//,
        /subscription\//,
        /admin\//,
        /teams\//,
        /dashboard-nav/,
        /pages/,
        /report-creation/,
        /responsive-dashboard/,
        /error-boundaries/,
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    // ── Authenticated tests — depends on setup for storageState ──
    {
      name: "authenticated",
      dependencies: ["setup"],
      testMatch: [
        /auth\/signout/,
        /auth\/accept-invite/,
        /dashboard\//,
        /settings\//,
        /share\//,
        /subscription\//,
        /admin\//,
        /teams\//,
        /dashboard-nav/,
        /pages/,
        /report-creation/,
        /share/,
        /responsive-dashboard/,
        /error-boundaries/,
      ],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/user.json",
      },
    },
    {
      name: "firefox",
      testIgnore: [
        /auth\.setup\.ts/,
        /auth\/signout/,
        /auth\/accept-invite/,
        /dashboard\//,
        /settings\//,
        /share\//,
        /subscription\//,
        /admin\//,
        /teams\//,
        /dashboard-nav/,
        /pages/,
        /report-creation/,
        /responsive-dashboard/,
        /error-boundaries/,
      ],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: [
        /auth\.setup\.ts/,
        /auth\/signout/,
        /auth\/accept-invite/,
        /dashboard\//,
        /settings\//,
        /share\//,
        /subscription\//,
        /admin\//,
        /teams\//,
        /dashboard-nav/,
        /pages/,
        /report-creation/,
        /responsive-dashboard/,
        /error-boundaries/,
      ],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "api",
      dependencies: ["setup"],
      testMatch: "api/**/*.spec.ts",
      use: {
        baseURL: "http://localhost:3000",
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
  webServer: {
    command: "node --max-old-space-size=2048 node_modules/next/dist/bin/next dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Override DATABASE_URL + NEXTAUTH_SECRET so the app queries the same
    // test database that E2E helpers seed, and decodes session JWTs correctly.
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? "",
    },
  },
});
