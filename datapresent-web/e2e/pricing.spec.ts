import { expect, test } from "@playwright/test";

test.describe("Page de tarification — /pricing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("la page charge avec le titre Tarifs", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Tarifs|Tarification|Pricing/);
  });

  test("affiche les 4 cartes de plan (Gratuit, Pro, Team, Agency)", async ({ page }) => {
    await expect(page.locator("text=Gratuit")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
    await expect(page.locator("text=Team")).toBeVisible();
    await expect(page.locator("text=Agency")).toBeVisible();
  });

  test("le plan Pro est mis en avant avec le badge 'Populaire'", async ({ page }) => {
    const popularBadge = page.locator("text=Populaire");
    await expect(popularBadge).toBeVisible();
  });

  test("le tableau comparatif des fonctionnalités est visible", async ({ page }) => {
    const table = page.locator(".app-table");
    await expect(table).toBeVisible();

    // The table should have header cells
    const tableHeaders = table.locator("thead th");
    await expect(tableHeaders.first()).toBeVisible();
  });

  test("la FAQ contient 4 questions cliquables avec <details>", async ({ page }) => {
    const faqDetails = page.locator("details");
    await expect(faqDetails).toHaveCount(4);

    // Initially answers should be hidden
    const firstAnswer = faqDetails.first().locator("p");
    await expect(firstAnswer).not.toBeVisible();

    // Click first question to reveal answer
    await faqDetails.first().locator("summary").click();
    await expect(firstAnswer).toBeVisible();
  });

  test("le bouton CTA du plan Gratuit redirige vers /signup", async ({ page }) => {
    const freeCta = page.locator('a[href="/signup"]').first();
    await expect(freeCta).toBeVisible();
  });

  test("le bouton CTA du plan Pro redirige vers /signup?plan=pro", async ({ page }) => {
    const proCta = page.locator('a[href="/signup?plan=pro"]');
    await expect(proCta).toBeVisible();
  });

  test("le bouton CTA du plan Team redirige vers /signup?plan=team", async ({ page }) => {
    const teamCta = page.locator('a[href="/signup?plan=team"]');
    await expect(teamCta).toBeVisible();
  });

  test("le plan Agency propose un lien vers /contact", async ({ page }) => {
    const agencyLink = page.locator('a[href="/contact"]');
    await expect(agencyLink).toBeVisible();
  });

  test("les 4 FAQ se ferment et s'ouvrent individuellement", async ({ page }) => {
    const allDetails = page.locator("details");

    // Open all questions one by one
    for (let i = 0; i < 4; i++) {
      const detail = allDetails.nth(i);
      await detail.locator("summary").click();
      await expect(detail.locator("p")).toBeVisible();
    }
  });
});
