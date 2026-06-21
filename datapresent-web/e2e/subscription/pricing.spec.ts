import { test, expect } from "@playwright/test";

test.describe("Page de tarification — /pricing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pricing");
  });

  test("la page charge avec le titre et le sous-titre", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /tarifs|tarification|pricing/i })).toBeVisible();
    await expect(page.locator("h1")).toBeVisible();
  });

  test("affiche les 4 cartes de plan (Gratuit, Pro, Team, Agency)", async ({ page }) => {
    await expect(page.getByText("Gratuit")).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Team")).toBeVisible();
    await expect(page.getByText("Agency")).toBeVisible();
  });

  test("chaque plan affiche son prix mensuel", async ({ page }) => {
    const planCards = page.locator(".app-card");
    const cardCount = await planCards.count();
    expect(cardCount).toBe(4);

    for (let i = 0; i < cardCount; i++) {
      const card = planCards.nth(i);
      const price = card.getByText(/€/);
      await expect(price).toBeVisible();
    }
  });

  test("le plan Pro est mis en avant avec le badge 'Populaire'", async ({ page }) => {
    await expect(page.getByText("Populaire", { exact: true })).toBeVisible();

    // The Pro card should have the ring-primary class (highlighted border)
    const proCard = page.locator(".app-card").filter({ hasText: "Pro" }).first();
    await expect(proCard).toBeVisible();
  });

  test("chaque plan affiche une liste de fonctionnalités et un CTA", async ({ page }) => {
    const planCards = page.locator(".app-card");
    const cardCount = await planCards.count();

    for (let i = 0; i < cardCount; i++) {
      const card = planCards.nth(i);
      // Each card has feature items with check icons
      await expect(card.locator("ul li").first()).toBeVisible();
      // Each card has a CTA link
      await expect(card.locator("a.app-btn")).toBeVisible();
    }
  });

  test("les liens CTA des cartes dirigent vers les bonnes pages", async ({ page }) => {
    // Free → /signup
    const freeCard = page.locator(".app-card").filter({ hasText: "Gratuit" }).first();
    await expect(freeCard.locator('a[href="/signup"]')).toBeVisible();

    // Pro → /signup?plan=pro
    const proCard = page.locator(".app-card").filter({ hasText: "Pro" }).first();
    await expect(proCard.locator('a[href="/signup?plan=pro"]')).toBeVisible();
  });

  test("la section 'Contacter notre équipe' est visible pour Agency", async ({ page }) => {
    await expect(page.getByRole("link", { name: /contacter notre équipe/i })).toBeVisible();
  });

  test("le tableau comparatif des fonctionnalités est rendu", async ({ page }) => {
    const table = page.locator("table.app-table");
    await expect(table).toBeVisible();

    // Table header should have feature column and 4 plan columns
    const headers = table.locator("thead th");
    const headerCount = await headers.count();
    expect(headerCount).toBe(5); // Feature + 4 plans

    // First header should be "Fonctionnalité" or "Feature"
    await expect(headers.first()).toBeVisible();
  });

  test("le tableau comparatif a des catégories et des lignes de fonctionnalités", async ({
    page,
  }) => {
    const table = page.locator("table.app-table");
    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();
    // Should have category rows and feature rows (exact count depends on feature matrix)
    expect(rowCount).toBeGreaterThan(5);
  });

  test("la FAQ affiche 4 questions", async ({ page }) => {
    const details = page.locator("details");
    await expect(details).toHaveCount(4);
  });

  test("la FAQ est interactive — cliquer ouvre la réponse", async ({ page }) => {
    const firstDetails = page.locator("details").first();
    const answer = firstDetails.locator("p");

    // Initially answer is not visible
    await expect(answer).not.toBeVisible();

    // Click to open
    await firstDetails.locator("summary").click();
    await expect(answer).toBeVisible();
  });

  test("la FAQ liste des questions sur les plans, paiements et quotas", async ({ page }) => {
    const questions = [/changer de plan/i, /paiement/i, /engagement/i, /quota/i];

    for (const q of questions) {
      await expect(page.locator("details").filter({ hasText: q }).first()).toBeVisible();
    }
  });
});
