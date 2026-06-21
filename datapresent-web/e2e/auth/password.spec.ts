import { test, expect } from "@playwright/test";
import {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  createTestUser,
  disconnectPrisma,
} from "../helpers/auth";

test.describe("Connexion par mot de passe — Password login", () => {
  test.beforeAll(async () => {
    // Ensure the test user exists in the database with a hashed password
    await createTestUser();
  });

  test.afterAll(async () => {
    await disconnectPrisma();
  });

  test("connexion avec email et mot de passe valides → redirection (302)", async ({ page }) => {
    // 1. Navigate to any page to initialise the browser context
    await page.goto("/");

    // 2. Fetch CSRF token from next-auth (sets CSRF cookie automatically)
    const csrfResponse = await page.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfResponse.json();
    expect(csrfToken).toBeTruthy();

    // 3. Submit credentials to the password provider callback
    const callbackResponse = await page.request.post("/api/auth/callback/password", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      form: {
        email: TEST_USER_EMAIL,
        password: TEST_USER_PASSWORD,
        csrfToken,
      },
      maxRedirects: 0,
    });

    // The callback should redirect on success (302 to callbackUrl)
    expect(callbackResponse.status()).toBe(302);
    const location = callbackResponse.headers()["location"];
    expect(location).not.toContain("error");
  });

  test("connexion avec mot de passe incorrect → redirection avec erreur", async ({ page }) => {
    await page.goto("/");

    const csrfResponse = await page.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfResponse.json();

    const callbackResponse = await page.request.post("/api/auth/callback/password", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      form: {
        email: TEST_USER_EMAIL,
        password: "WrongPassword123!",
        csrfToken,
      },
      maxRedirects: 0,
    });

    expect(callbackResponse.status()).toBe(302);
    const location = callbackResponse.headers()["location"];
    // Failed credentials should redirect with an error parameter
    expect(location).toContain("error");
  });

  test("connexion avec email inexistant → redirection avec erreur", async ({ page }) => {
    await page.goto("/");

    const csrfResponse = await page.request.get("/api/auth/csrf");
    const { csrfToken } = await csrfResponse.json();

    const callbackResponse = await page.request.post("/api/auth/callback/password", {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      form: {
        email: "nonexistent@test.com",
        password: TEST_USER_PASSWORD,
        csrfToken,
      },
      maxRedirects: 0,
    });

    expect(callbackResponse.status()).toBe(302);
    const location = callbackResponse.headers()["location"];
    expect(location).toContain("error");
  });
});
