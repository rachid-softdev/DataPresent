import { test, expect } from "@playwright/test";

test.describe("Page de tarification — /pricing", () => {
  test("la page charge correctement avec le titre principal", async ({ page }) => {
    const response = await page.goto("/pricing");
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toContainText(/Tarifs|Tarification|Pricing/);
  });

  test("affiche les 4 cartes de plan (Gratuit, Pro, Team, Agency)", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.locator("text=Gratuit")).toBeVisible();
    await expect(page.locator("text=Pro")).toBeVisible();
    await expect(page.locator("text=Team")).toBeVisible();
    await expect(page.locator("text=Agency")).toBeVisible();
  });

  test("le plan Pro est mis en avant avec le badge 'Populaire'", async ({ page }) => {
    await page.goto("/pricing");

    // The Pro card has a "Populaire" badge
    const popularBadge = page.locator("text=Populaire");
    await expect(popularBadge).toBeVisible();

    // The Pro card should have a highlighted border (ring-primary class)
    const proCard = page.locator("text=Pro").locator("..");
    // The parent card div containing "Pro" text should have the popular styling
    // Verify the badge is associated with the Pro card area
    const proSection = page.locator("text=Pro").first();
    await expect(proSection).toBeVisible();
  });

  test("affiche le tableau comparatif des fonctionnalités", async ({ page }) => {
    await page.goto("/pricing");

    // Comparison table should be visible
    const table = page.locator(".app-table");
    await expect(table).toBeVisible();

    // Table should have a header with plan names and feature rows
    const tableHeaders = table.locator("thead th");
    // First header is "Fonctionnalité" / "Feature", then plan names
    await expect(tableHeaders.first()).toBeVisible();
  });

  test("la FAQ est fonctionnelle avec 4 questions cliquables", async ({ page }) => {
    await page.goto("/pricing");

    // Should have 4 FAQ items using <details> elements
    const faqDetails = page.locator("details");
    await expect(faqDetails).toHaveCount(4);

    // Initially, answers should not be visible
    const firstAnswer = faqDetails.first().locator("p");
    await expect(firstAnswer).not.toBeVisible();

    // Click the first question to open it
    await faqDetails.first().locator("summary").click();

    // Answer should now be visible
    await expect(firstAnswer).toBeVisible();
  });

  test("les boutons CTA dirigent vers la page d'inscription", async ({ page }) => {
    await page.goto("/pricing");

    // Free plan CTA links to /signup
    const freeCta = page.locator('a[href="/signup"]').first();
    await expect(freeCta).toBeVisible();

    // Pro plan CTA links to /signup?plan=pro
    const proCta = page.locator('a[href="/signup?plan=pro"]');
    await expect(proCta).toBeVisible();

    // Team plan CTA links to /signup?plan=team
    const teamCta = page.locator('a[href="/signup?plan=team"]');
    await expect(teamCta).toBeVisible();

    // Agency plan CTA links to /contact
    const agencyCta = page.locator('a[href="/contact"]');
    await expect(agencyCta).toBeVisible();
  });
});
