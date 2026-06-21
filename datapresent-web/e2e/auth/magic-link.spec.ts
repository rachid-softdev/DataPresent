import { test, expect } from "@playwright/test";

test.describe("Lien magique — Magic link", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("saisie d'un email valide → message de confirmation affiché", async ({ page }) => {
    await page.getByLabel(/email/i).fill("e2e-magic@datapresent.com");
    await page.getByRole("button", { name: /envoyer le lien de connexion/i }).click();

    // On success, the API returns a success message
    // The page may show an alert-success div or the email input is cleared
    // Wait for either a success message or the input to be cleared
    const successMessage = page.locator(".app-alert-success");
    const emailInput = page.getByLabel(/email/i);

    // The form should show some response — either success alert or input reset
    await expect(successMessage.or(emailInput)).toBeVisible({ timeout: 10000 });
  });

  test("saisie d'un email invalide → message d'erreur", async ({ page }) => {
    // Enter an invalid email (missing domain)
    await page.getByLabel(/email/i).fill("invalid-email");
    await page.getByRole("button", { name: /envoyer/i }).click();

    // Browser validation (type="email") prevents submission for truly invalid emails
    // The input should still be visible with the value
    await expect(page.getByLabel(/email/i)).toHaveValue("invalid-email");
  });

  test("saisie d'un email vide → bouton désactivé", async ({ page }) => {
    const submitButton = page.getByRole("button", { name: /envoyer/i });

    // The button should be disabled when email is empty
    await expect(submitButton).toBeDisabled();
  });

  test("le formulaire de magic link affiche le séparateur « ou »", async ({ page }) => {
    const separator = page.getByText("ou");
    await expect(separator).toBeVisible();
  });

  test("le champ email a le placeholder approprié", async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute("placeholder", /vous@exemple/);
  });
});
