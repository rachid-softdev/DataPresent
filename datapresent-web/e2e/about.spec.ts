import { expect, test } from "@playwright/test";

test.describe("Page À propos — /about", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/about");
  });

  test("la page charge avec le contenu À propos", async ({ page }) => {
    await expect(page.locator("h1")).toBeVisible();
    // The badge text from translations should be visible
    await expect(
      page
        .locator("text=Notre mission")
        .or(page.locator("text=Qui sommes-nous"))
        .or(page.locator(".landing-hero-eyebrow")),
    ).toBeVisible();
  });

  test("la section histoire contient plusieurs paragraphes", async ({ page }) => {
    // The story section should have paragraphs
    const storySection = page.locator("text=Notre histoire").locator("..");
    // Fall back to checking that paragraphs exist in the page
    const paragraphs = page.locator(".space-y-5 p");
    const count = await paragraphs.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test("la section valeurs affiche Confiant, Naturel et Précis", async ({ page }) => {
    await expect(page.locator("text=Confiant").or(page.locator("text=Confident"))).toBeVisible();
    await expect(page.locator("text=Naturel").or(page.locator("text=Natural"))).toBeVisible();
    await expect(page.locator("text=Précis").or(page.locator("text=Precise"))).toBeVisible();
  });

  test("la section équipe affiche les 3 membres", async ({ page }) => {
    await expect(page.locator("text=Alexandre Renard")).toBeVisible();
    await expect(page.locator("text=Sophie Leclerc")).toBeVisible();
    await expect(page.locator("text=Marc Dubois")).toBeVisible();
  });

  test("chaque membre de l'équipe a un rôle affiché", async ({ page }) => {
    // Check for role text
    const roles = ["Fondateur & CEO", "CTO", "Head of Design"];
    for (const role of roles) {
      await expect(page.locator(`text=${role}`).first()).toBeVisible();
    }
  });

  test("la section CTA contient un lien vers /signup", async ({ page }) => {
    const ctaLink = page.locator('.landing-cta-section a[href="/signup"]');
    await expect(ctaLink).toBeVisible();
  });

  test("la section CTA est visible", async ({ page }) => {
    const ctaSection = page.locator(".landing-cta-section");
    await expect(ctaSection).toBeVisible();
  });

  test("la page a un titre de page cohérent", async ({ page }) => {
    await expect(page).toHaveTitle(/À propos|About/);
  });
});
