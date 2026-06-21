import { test, expect } from "@playwright/test";

test.describe("Page de contact — /contact", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contact");
  });

  test("la page charge avec le titre 'Nous contacter'", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Nous contacter|Contact us/);
  });

  test("le champ Nom est visible", async ({ page }) => {
    const nameInput = page.locator("#name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute("type", "text");
  });

  test("le champ Email est visible", async ({ page }) => {
    const emailInput = page.locator("#email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("le champ Sujet (select) est visible avec des options", async ({ page }) => {
    const subjectSelect = page.locator("#subject");
    await expect(subjectSelect).toBeVisible();

    // Check that the select has options
    const options = subjectSelect.locator("option");
    await expect(options).toHaveCount(4);
    await expect(options.nth(0)).toContainText("Général");
  });

  test("le champ Message est visible", async ({ page }) => {
    const messageTextarea = page.locator("#message");
    await expect(messageTextarea).toBeVisible();
  });

  test("le bouton 'Envoyer le message' est visible", async ({ page }) => {
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    await expect(submitButton).toContainText(/Envoyer le message|Send message/);
  });

  test("les informations de contact sont visibles dans la sidebar", async ({ page }) => {
    await expect(page.locator("text=contact@datapresent.com")).toBeVisible();
    await expect(page.locator("text=support@datapresent.com")).toBeVisible();
    await expect(page.locator("text=Paris, France")).toBeVisible();
  });

  test("le lien Politique de confidentialité est présent dans la sidebar", async ({ page }) => {
    const privacyLink = page.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
  });

  test("le lien Conditions d'utilisation est présent dans la sidebar", async ({ page }) => {
    const termsLink = page.locator('a[href="/terms"]');
    await expect(termsLink).toBeVisible();
  });
});
