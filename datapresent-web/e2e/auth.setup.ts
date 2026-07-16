import { expect, test as setup } from "@playwright/test";
import {
  createTestUser,
  disconnectPrisma,
  generateSessionToken,
  setSessionCookie,
} from "./auth-helpers";

/**
 * Path where the authenticated storage state is persisted.
 * This file is consumed by the `authenticated` project in playwright.config.ts.
 */
const AUTH_STATE_FILE = "e2e/.auth/user.json";

setup("authenticate as E2E test user", async ({ page }) => {
  // 1. Upsert the test user in the database
  const user = await createTestUser();

  // 2. Generate a valid encrypted session JWT (same encoding as @auth/core)
  const sessionToken = await generateSessionToken(user);

  // 3. Inject the session cookie into the browser context
  await setSessionCookie(page.context(), sessionToken);

  // 4. Smoke-test: navigate to a protected page and confirm no redirect to login
  await page.goto("/reports");
  await expect(page).not.toHaveURL(/\/login/);

  // 5. Persist storage state (cookies, localStorage) so dependent test projects
  //    can reuse the authenticated session without re-running the setup.
  await page.context().storageState({ path: AUTH_STATE_FILE });

  // 6. Clean up the Prisma connection
  await disconnectPrisma();
});
