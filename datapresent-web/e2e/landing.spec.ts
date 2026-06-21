import { test, expect } from "@playwright/test";

test.describe("Page d'accueil — / (Landing)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("affiche le titre principal dans le hero", async ({ page }) => {
    const h1 = page.locator("h1");
    await expect(h1).toContainText(/Vos données deviennent/);
    await expect(h1).toContainText(/des slides percutantes/);
  });

  test("affiche la barre de navigation avec les boutons Connexion et Inscription", async ({
    page,
  }) => {
    const nav = page.locator(".landing-nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: /connexion/i })).toBeVisible();
    await expect(nav.getByRole("link", { name: /inscription/i })).toBeVisible();
  });

  test("affiche le footer avec le lien Politique de confidentialité", async ({ page }) => {
    const footer = page.locator("footer.landing-footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByRole("link", { name: /confidentialité/i })).toBeVisible();
  });

  test("la section tarification #pricing est présente", async ({ page }) => {
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeVisible();
    await expect(pricingSection.locator("text=Gratuit")).toBeVisible();
    await expect(pricingSection.locator("text=Pro")).toBeVisible();
  });

  test("affiche le bouton de thème (ThemeToggle)", async ({ page }) => {
    // The theme toggle button exists in the nav
    const themeToggle = page.locator(".landing-nav-actions button").first();
    await expect(themeToggle).toBeVisible();
  });

  test("les boutons CTA contiennent des liens vers inscription", async ({ page }) => {
    const signupLink = page.locator('a[href="/signup"]').first();
    await expect(signupLink).toBeVisible();
  });

  test("la section témoignages est présente", async ({ page }) => {
    await expect(page.locator("text=Sophie Martin")).toBeVisible();
    await expect(page.locator("text=Thomas Dubois")).toBeVisible();
    await expect(page.locator("text=Camille Bernard")).toBeVisible();
  });

  test("la FAQ est fonctionnelle — cliquer révèle la réponse", async ({ page }) => {
    const faqSection = page.locator(".landing-faq-section");
    await expect(faqSection).toBeVisible();

    const firstDetails = faqSection.locator("details").first();
    const answer = firstDetails.locator(".landing-faq-answer");

    // Answer should be hidden initially
    await expect(answer).not.toBeVisible();

    // Click the question to expand
    await firstDetails.locator("summary").click();

    // Answer should now be visible
    await expect(answer).toBeVisible();
  });

  test("la section formats affiche les types de fichiers supportés", async ({ page }) => {
    const formatsSection = page.locator("#formats");
    await expect(formatsSection).toBeVisible();
    await expect(formatsSection.locator("text=Excel")).toBeVisible();
    await expect(formatsSection.locator("text=CSV")).toBeVisible();
    await expect(formatsSection.locator("text=PDF")).toBeVisible();
    await expect(formatsSection.locator("text=Google Sheets")).toBeVisible();
  });

  test("la section 'Comment ça marche' affiche les 3 étapes", async ({ page }) => {
    const stepsSection = page.locator(".landing-steps-grid");
    await expect(stepsSection).toBeVisible();
    await expect(stepsSection.locator("text=Importez vos données")).toBeVisible();
    await expect(stepsSection.locator("text=L'IA analyse & structure")).toBeVisible();
    await expect(stepsSection.locator("text=Exportez en un clic")).toBeVisible();
  });

  test("le hero contient un mockup SVG du tableau de bord", async ({ page }) => {
    const mockup = page.locator(".landing-hero-visual");
    await expect(mockup).toBeVisible();
    const svg = mockup.locator("svg");
    await expect(svg).toBeVisible();
  });
});
