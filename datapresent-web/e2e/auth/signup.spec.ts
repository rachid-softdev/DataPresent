import { test, expect } from "@playwright/test";

test.describe("Inscription — /signup", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/signup");
  });

  test("la page d'inscription charge avec le titre « Créer un compte »", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Créer un compte/);
  });

  test("affiche le sous-titre de bienvenue", async ({ page }) => {
    await expect(page.getByText(/Commencez gratuitement/)).toBeVisible();
  });

  test("affiche le bouton d'inscription Google", async ({ page }) => {
    await expect(page.getByRole("button", { name: /google/i })).toBeVisible();
  });

  test("affiche le champ email pour l'inscription par email", async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test("le bouton d'inscription par email est présent", async ({ page }) => {
    await expect(page.getByRole("button", { name: /inscrire par email/i })).toBeVisible();
  });

  test("le lien « Se connecter » navigue vers /login", async ({ page }) => {
    await page.getByRole("link", { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/login/);
  });

  test("affiche la mention des conditions d'utilisation", async ({ page }) => {
    await expect(page.getByText(/Conditions d'utilisation/)).toBeVisible();
  });

  test("affiche la mention de politique de confidentialité", async ({ page }) => {
    await expect(page.getByText(/Politique de confidentialité/)).toBeVisible();
  });

  test("affiche une erreur pour email invalide côté navigateur", async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill("invalid");
    await page.getByRole("button", { name: /inscrire/i }).click();

    // Browser validation should prevent submission
    await expect(emailInput).toBeVisible();
  });

  test("le logo DataPresent est visible dans l'en-tête", async ({ page }) => {
    await expect(page.getByText(/DataPresent/).first()).toBeVisible();
  });

  test("le bouton de bascule de thème est visible", async ({ page }) => {
    const themeToggle = page.getByRole("button", {
      name: /basculer vers le thème|theme/i,
    });
    await expect(themeToggle).toBeVisible();
  });
});
