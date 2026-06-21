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
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
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
        /dashboard\//,
        /settings\//,
        /share\//,
        /subscription\//,
        /admin\//,
        /teams\//,
        /dashboard-nav/,
        /pages/,
        /report-creation/,
      ],
      use: { ...devices["Desktop Chrome"] },
    },
    // ── Authenticated tests — depends on setup for storageState ──
    {
      name: "authenticated",
      dependencies: ["setup"],
      testMatch: [
        /auth\/signout/,
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
        /dashboard\//,
        /settings\//,
        /share\//,
        /subscription\//,
        /admin\//,
        /teams\//,
        /dashboard-nav/,
        /pages/,
        /report-creation/,
      ],
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      testIgnore: [
        /auth\.setup\.ts/,
        /auth\/signout/,
        /dashboard\//,
        /settings\//,
        /share\//,
        /subscription\//,
        /admin\//,
        /teams\//,
        /dashboard-nav/,
        /pages/,
        /report-creation/,
      ],
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "api",
      testMatch: "api/**/*.spec.ts",
      use: { baseURL: "http://localhost:3000" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
