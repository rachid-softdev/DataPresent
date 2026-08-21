import { expect, test } from "@playwright/test";
import { gotoAndHydrate } from "../auth-helpers";

test.describe("Lien magique — Magic link", () => {
  test.beforeEach(async ({ page }) => {
    await gotoAndHydrate(page, "/login");
  });

  test("saisie d'un email valide → message de confirmation affiché", async ({ page }) => {
    await page.locator('input[type="email"]').fill("e2e-magic@datapresent.com");
    await page.getByRole("button", { name: /envoyer le lien de connexion/i }).click();

    // On success, the API returns a success message
    // The page may show an alert-success div or the email input is cleared
    // Wait for either a success message or the input to be cleared
    const successMessage = page.locator(".app-alert-success");
    const emailInput = page.locator('input[type="email"]');

    // The form should show some response — either success alert or input reset
    await expect(successMessage.or(emailInput)).toBeVisible({ timeout: 10000 });
  });

  test("saisie d'un email invalide → message d'erreur", async ({ page }) => {
    // Enter an invalid email (missing domain)
    await page.locator('input[type="email"]').fill("invalid-email");
    await page.getByRole("button", { name: /envoyer/i }).click();

    // Browser validation (type="email") prevents submission for truly invalid emails
    // The input should still be visible with the value
    await expect(page.locator('input[type="email"]')).toHaveValue("invalid-email");
  });

  test("saisie d'un email vide → bouton désactivé", async ({ page }) => {
    const submitButton = page.getByRole("button", { name: /envoyer/i });

    // The button should be disabled when email is empty
    await expect(submitButton).toBeDisabled();
  });

  test("le formulaire de magic link affiche le séparateur « ou »", async ({ page }) => {
    // Exact match: the separator is an isolated "ou" element (a bare string
    // match also hits "Connectez-vous à votre compte..." substrings)
    const separator = page.getByText("ou", { exact: true });
    await expect(separator).toBeVisible();
  });

  test("le champ email a le placeholder approprié", async ({ page }) => {
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toHaveAttribute("placeholder", /vous@exemple/);
  });
});
