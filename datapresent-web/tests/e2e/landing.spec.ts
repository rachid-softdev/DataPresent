import { test, expect } from "@playwright/test";

test.describe("Page d'accueil — Landing", () => {
  test("affiche le titre principal dans le hero", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    await expect(h1).toContainText(/Vos données deviennent/);
    await expect(h1).toContainText(/des slides percutantes/);
  });

  test("affiche le mockup SVG du tableau de bord dans la section hero", async ({ page }) => {
    await page.goto("/");
    const mockup = page.locator(".landing-hero-visual");
    await expect(mockup).toBeVisible();
    // The mockup contains an inline SVG with role="img"
    const svg = mockup.locator("svg");
    await expect(svg).toBeVisible();
  });

  test("la section tarification affiche les cartes de plan", async ({ page }) => {
    await page.goto("/");
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeVisible();

    // Check for individual plan cards — Gratuit, Pro, Team
    await expect(pricingSection.locator("text=Gratuit")).toBeVisible();
    await expect(pricingSection.locator("text=Pro")).toBeVisible();
    await expect(pricingSection.locator("text=Team")).toBeVisible();
  });

  test("la section CTA est visible et contient un lien vers la tarification", async ({ page }) => {
    await page.goto("/");
    const ctaSection = page.locator(".landing-cta-section");
    await expect(ctaSection).toBeVisible();

    // CTA button links to /pricing
    const ctaLink = ctaSection.locator('a[href="/pricing"]');
    await expect(ctaLink).toBeVisible();
  });

  test("les liens de navigation (connexion, inscription) sont visibles", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator(".landing-nav");

    await expect(nav.locator('a[href="/login"]')).toBeVisible();
    await expect(nav.locator('a[href="/signup"]')).toBeVisible();
  });

  test("affiche les témoignages clients", async ({ page }) => {
    await page.goto("/");
    // Testimonial names should be rendered
    await expect(page.locator("text=Sophie Martin")).toBeVisible();
    await expect(page.locator("text=Thomas Dubois")).toBeVisible();
    await expect(page.locator("text=Camille Bernard")).toBeVisible();
  });

  test("les sections avec scroll reveal sont présentes dans le DOM", async ({ page }) => {
    await page.goto("/");
    // Key landing sections should be present in the DOM
    await expect(page.locator("#features")).toBeVisible();
    await expect(page.locator("#pricing")).toBeVisible();
    await expect(page.locator(".landing-cta-section")).toBeVisible();
    await expect(page.locator("footer.landing-footer")).toBeVisible();
  });
});
