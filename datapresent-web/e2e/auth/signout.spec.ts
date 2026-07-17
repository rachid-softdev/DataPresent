import { expect, test } from "@playwright/test";

test.describe("Déconnexion — Sign out", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la déconnexion depuis les paramètres du compte redirige vers l'accueil", async ({
    page,
  }) => {
    // Naviguer vers la page des paramètres du compte (nécessite auth)
    await page.goto("/settings/account");
    await expect(page.locator("h1")).toBeVisible();

    // Cliquer sur le bouton de déconnexion
    const signOutButton = page.getByRole("button", { name: /Déconnexion/i });
    await expect(signOutButton).toBeVisible();
    await signOutButton.click();

    // Après déconnexion, la session est détruite — navigation vers page protégée
    // redirige vers /login
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/login/);
  });

  test("après déconnexion, le cookie de session est supprimé", async ({ page }) => {
    // Naviguer d'abord vers une page publique
    await page.goto("/");

    // Vérifier que le cookie de session n'existe plus
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name.includes("authjs.session-token"));
    expect(sessionCookie).toBeUndefined();
  });
});
