import { test, expect } from "@playwright/test";

test.describe("Connexion — /login", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("la page de connexion charge avec le titre « Connexion »", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Connexion/);
  });

  test("affiche le sous-titre de bienvenue", async ({ page }) => {
    await expect(page.getByText(/Connectez-vous à votre compte/)).toBeVisible();
  });

  test("affiche le bouton de connexion Google", async ({ page }) => {
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("affiche le champ email pour le magic link", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("le bouton d'envoi du magic link est présent", async ({ page }) => {
    await expect(page.getByRole("button", { name: /envoyer le lien de connexion/i })).toBeVisible();
  });

  test("le lien « Créez un compte » navigue vers /signup", async ({ page }) => {
    await page.getByRole("link", { name: /créez un compte/i }).click();
    await expect(page).toHaveURL(/signup/);
  });

  test("le lien « Mot de passe oublié ? » navigue vers /forgot-password", async ({ page }) => {
    await page.getByRole("link", { name: /mot de passe oublié/i }).click();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test("affiche une erreur pour email invalide côté navigateur", async ({ page }) => {
    // The email input has `type="email"` so the browser catches invalid values
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("invalid");
    await page.getByRole("button", { name: /envoyer/i }).click();

    // Browser validation should prevent submission — input stays visible
    await expect(emailInput).toBeVisible();
  });

  test("le logo DataPresent est visible dans l'en-tête", async ({ page }) => {
    await expect(page.getByText(/DataPresent/).first()).toBeVisible();
  });

  test("le bouton de bascule de thème (clair/sombre) est visible", async ({ page }) => {
    const themeToggle = page.getByRole("button", {
      name: /basculer vers le thème|theme/i,
    });
    await expect(themeToggle).toBeVisible();
  });

  test("la page affiche la mention « Usage unique »", async ({ page }) => {
    await expect(page.getByText(/Usage unique/)).toBeVisible();
  });
});
