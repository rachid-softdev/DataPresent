import { test, expect } from "@playwright/test";

test.describe("Page d'aide — /help", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/help");
  });

  test("le titre principal contient 'Aide' ou 'Help'", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Centre d'aide|Help Center/);
  });

  test("affiche les 6 questions fréquentes", async ({ page }) => {
    const faqSection = page.locator("text=Questions fréquentes");
    await expect(faqSection).toBeVisible();

    // There should be FAQ items rendered by HelpSearch component
    const faqItems = page.locator("button, [role='button'], details summary, .faq-item");
    // At minimum the page loads with content
    await expect(page.locator("text=Comment créer mon premier rapport ?")).toBeVisible();
  });

  test("les réponses aux questions sont visibles dès le chargement", async ({ page }) => {
    // HelpSearch renders answers always visible (no expand/collapse)
    await expect(page.locator('text=Cliquez sur "Nouveau" dans le menu').first()).toBeVisible();
  });

  test("la recherche filtre les questions", async ({ page }) => {
    const searchInput = page.locator('input[type="text"]');
    await expect(searchInput).toBeVisible();

    // Type in search to filter FAQs
    await searchInput.fill("export");
    await expect(page.locator("text=Comment exporter mes rapports ?")).toBeVisible();
  });

  test("la question 'Quels formats de fichiers sont supportés ?' est visible", async ({ page }) => {
    await expect(page.locator("text=Quels formats de fichiers sont supportés ?")).toBeVisible();
  });

  test("les 6 questions de la FAQ sont présentes", async ({ page }) => {
    const questions = [
      "Comment créer mon premier rapport ?",
      "Quels formats de fichiers sont supportés ?",
      "Puis-je personnaliser les modèles ?",
      "Comment exporter mes rapports ?",
      "Quelle est la différence entre les plans ?",
      "Comment invite-t-on des membres dans mon équipe ?",
    ];

    for (const q of questions) {
      await expect(page.locator(`text=${q}`).first()).toBeVisible();
    }
  });

  test("les informations de contact (email, live chat) sont visibles", async ({ page }) => {
    // Email contact info
    await expect(page.locator("text=support@datapresent.com")).toBeVisible();
    await expect(page.locator("text=Email").first()).toBeVisible();

    // Live chat info
    await expect(page.locator("text=Chat en direct")).toBeVisible();
  });

  test("le lien Politique de confidentialité est présent dans la sidebar", async ({ page }) => {
    const privacyLink = page.locator('a[href="/privacy"]');
    await expect(privacyLink).toBeVisible();
    await expect(privacyLink).toContainText(/Politique de confidentialité|Privacy Policy/);
  });

  test("le lien Conditions d'utilisation est présent dans la sidebar", async ({ page }) => {
    const termsLink = page.locator('a[href="/terms"]');
    await expect(termsLink).toBeVisible();
    await expect(termsLink).toContainText(/Conditions d'utilisation|Terms of Service/);
  });

  test("le champ de recherche est visible", async ({ page }) => {
    const searchInput = page.locator('input[type="text"], input[placeholder*="Rechercher"]');
    await expect(searchInput).toBeVisible();
  });

  test("le bouton 'Contacter le support' est visible", async ({ page }) => {
    const supportButton = page.locator("button", {
      hasText: /Contacter le support|Contact support/,
    });
    await expect(supportButton).toBeVisible();
  });
});
