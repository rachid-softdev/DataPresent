import { expect, test } from "@playwright/test";

test.describe("Déconnexion — Sign out", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la déconnexion depuis les paramètres du compte redirige vers l'accueil", async ({
    page,
  }) => {
    // Naviguer vers la page des paramètres du compte (nécessite auth)
    await page.goto("/settings/account");
    // .first(): the page renders a duplicated (hidden) title variant
    await expect(page.locator("h1").first()).toBeVisible();

    // Cliquer sur le bouton de déconnexion
    const signOutButton = page.getByRole("button", { name: /Déconnexion/i });
    await expect(signOutButton).toBeVisible();
    await Promise.all([
      // signOut({ callbackUrl: "/" }) navigates home once the session is destroyed
      page.waitForURL((u) => !u.pathname.includes("/settings"), { timeout: 15000 }),
      signOutButton.click(),
    ]);

    // Après déconnexion, la session est détruite — navigation vers page protégée
    // redirige vers /login
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/login/);
  });

  test("après déconnexion, le cookie de session est supprimé", async ({ page }) => {
    // Each test gets a FRESH context restored from the storageState (which
    // contains the session cookie) — so this test must sign out itself.
    await page.goto("/settings/account");
    const signOutButton = page.getByRole("button", { name: /Déconnexion/i });
    await expect(signOutButton).toBeVisible();
    await Promise.all([
      page.waitForURL((u) => !u.pathname.includes("/settings"), { timeout: 15000 }),
      signOutButton.click(),
    ]);

    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name.includes("authjs.session-token"));
    expect(sessionCookie).toBeUndefined();
  });
});
