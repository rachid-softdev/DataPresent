import { test, expect } from "@playwright/test";

test.describe("Navigation cross-pages", () => {
  test("navigation de l'accueil vers les tarifs via 'Voir tous les forfaits'", async ({ page }) => {
    await page.goto("/");

    // Click on "Voir tous les forfaits" link
    await page.locator("text=Voir tous les forfaits").click();

    // Should navigate to /pricing
    await expect(page).toHaveURL(/\/pricing/);
  });

  test("navigation de l'accueil vers Connexion", async ({ page }) => {
    await page.goto("/");

    // Click on Connexion in nav
    await page.locator(".landing-nav-actions a[href='/login']").click();

    // Should navigate to /login
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("h1")).toContainText(/Connexion/);
  });

  test("navigation de l'accueil vers Inscription via 'Essai gratuit'", async ({ page }) => {
    await page.goto("/");

    // Click on the hero CTA button
    const signupCta = page.locator('.landing-hero-cta a[href="/signup"]');
    await expect(signupCta).toBeVisible();
    await signupCta.click();

    // Should navigate to /signup
    await expect(page).toHaveURL(/\/signup/);
  });

  test("navigation de l'accueil vers Inscription via le bouton nav", async ({ page }) => {
    await page.goto("/");

    // Click on Inscription in nav
    await page.locator(".landing-nav-actions a[href='/signup']").click();

    // Should navigate to /signup
    await expect(page).toHaveURL(/\/signup/);
    await expect(page.locator("h1")).toContainText(/Créer un compte/);
  });

  test("navigation de la tarification vers contact (Agency CTA)", async ({ page }) => {
    await page.goto("/pricing");

    // Find the Agency upsell link to /contact
    const contactLink = page.locator('a[href="/contact"]');
    await expect(contactLink).toBeVisible();
    await contactLink.click();

    // Should navigate to /contact
    await expect(page).toHaveURL(/\/contact/);
  });

  test("navigation de la page d'aide vers la politique de confidentialité", async ({ page }) => {
    await page.goto("/help");

    // Click on Politique de confidentialité link
    const privacyLink = page.locator('a[href="/privacy"]').first();
    await expect(privacyLink).toBeVisible();
    await privacyLink.click();

    // Should navigate to /privacy
    await expect(page).toHaveURL(/\/privacy/);
    await expect(page.locator("h1")).toContainText(/Politique de confidentialité/);
  });

  test("navigation de la page À propos vers Inscription via le CTA", async ({ page }) => {
    await page.goto("/about");

    // Find the CTA link to /signup
    const signupLink = page.locator('.landing-cta-section a[href="/signup"]');
    await expect(signupLink).toBeVisible();
    await signupLink.click();

    // Should navigate to /signup
    await expect(page).toHaveURL(/\/signup/);
  });

  test("navigation depuis le footer vers la page À propos", async ({ page }) => {
    await page.goto("/");

    // Click on "À propos" in the footer
    await page.locator('footer a[href="/about"]').click();

    // Should navigate to /about
    await expect(page).toHaveURL(/\/about/);
  });

  test("navigation depuis le footer vers le blog", async ({ page }) => {
    await page.goto("/");

    // Click on "Blog" in the footer
    await page.locator('footer a[href="/blog"]').click();

    // Should navigate to /blog
    await expect(page).toHaveURL(/\/blog/);
  });

  test("navigation depuis le footer vers les mentions légales", async ({ page }) => {
    await page.goto("/");

    // Click on "Mentions légales" in the footer
    await page.locator('footer a[href="/legal"]').click();

    // Should navigate to /legal
    await expect(page).toHaveURL(/\/legal/);
  });
});
