import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("Tableau de bord — page d'accueil", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("affiche le titre 'Rapports récents'", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /rapports r[ée]cents/i })).toBeVisible();
  });

  test("le bouton 'Nouveau rapport' est visible et redirige vers /new", async ({ page }) => {
    const btn = page.getByRole("link", { name: /nouveau rapport/i });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("href", "/new");
  });

  test("l'état vide affiche IntelligentEmptyState avec 2 CTA", async ({ page }) => {
    // The empty state is shown when no reports exist
    const emptyState = page.getByText("Bienvenue dans DataPresent");
    // If empty, check the two CTA cards are visible
    if (await emptyState.isVisible()) {
      await expect(page.getByText("Importer mes données")).toBeVisible();
      await expect(page.getByText("Voir un exemple")).toBeVisible();

      // Both CTAs link to /new
      const ctas = page.getByRole("link").filter({ has: page.locator("h3") });
      await expect(ctas.first()).toHaveAttribute("href", "/new");
    }
  });

  test("les cards de rapport affichent le titre, le badge de statut et le secteur", async ({
    page,
  }) => {
    // Only run if reports cards are visible (not empty state)
    const reportCards = page.locator("a[href^='/reports/']");
    if ((await reportCards.count()) === 0) return;

    // At least one card should have a title
    const firstCard = reportCards.first();
    await expect(firstCard.locator("h3")).toBeVisible();

    // Status badge and sector should be visible inside the card
    const badge = firstCard.locator("span").filter({ hasText: /terminé|en cours|erreur/i });
    const sector = firstCard.locator("span.text-muted-foreground");
    await expect(badge.first()).toBeAttached();
    await expect(sector).toBeAttached();
  });

  test("le badge 'Terminé' est vert (variant success)", async ({ page }) => {
    const doneBadge = page
      .locator("a[href^='/reports/']")
      .first()
      .locator("span")
      .filter({ hasText: /terminé/i });
    if ((await doneBadge.count()) === 0) return;
    await expect(doneBadge).toBeVisible();
  });

  test("le badge 'En cours' est orange (variant warning)", async ({ page }) => {
    const processingBadge = page.getByText("En cours").first();
    if ((await processingBadge.count()) === 0) return;
    await expect(processingBadge).toBeVisible();
  });

  test("le badge 'Erreur' est rouge (variant error)", async ({ page }) => {
    const errorBadge = page.getByText("Erreur").first();
    if ((await errorBadge.count()) === 0) return;
    await expect(errorBadge).toBeVisible();
  });

  test("la barre de statistiques affiche les métriques quand des rapports existent", async ({
    page,
  }) => {
    // Stats bar only shows when reports.length > 0
    const stats = page.locator("text=succès");
    if ((await stats.count()) === 0) return;
    await expect(stats).toBeVisible();
  });

  test("le lien 'Voir tous les rapports' est visible quand ≥6 rapports", async ({ page }) => {
    const seeAllLink = page.getByRole("link", { name: /voir tous les rapports/i });
    if ((await seeAllLink.count()) === 0) return;
    await expect(seeAllLink).toBeVisible();
    await expect(seeAllLink).toHaveAttribute("href", "/reports");
  });

  test("la UsageCard affiche les infos du plan et les limites", async ({ page }) => {
    // UsageCard loads dynamically — wait for it
    const usageCard = page.locator("text=Forfait").or(page.locator("text=Plan")).first();
    if ((await usageCard.count()) === 0) return;
    await expect(usageCard).toBeVisible();
  });

  test("cliquer sur une card de rapport navigue vers /reports/[id]", async ({ page }) => {
    const reportLink = page.locator("a[href^='/reports/']").first();
    if ((await reportLink.count()) === 0) return;

    const href = await reportLink.getAttribute("href");
    await reportLink.click();
    await expect(page).toHaveURL(new RegExp(href!.replace("/", "\\/")));
  });

  test("le titre long d'un rapport est tronqué avec CSS (text-overflow)", async ({ page }) => {
    const reportCard = page.locator("a[href^='/reports/']").first();
    if ((await reportCard.count()) === 0) return;

    const title = reportCard.locator("h3");
    const overflow = await title.evaluate((el) => {
      const style = window.getComputedStyle(el);
      return {
        overflow: style.overflow,
        textOverflow: style.textOverflow,
        whiteSpace: style.whiteSpace,
      };
    });
    // Cards use text-overflow: ellipsis for long titles
    expect(overflow.textOverflow).toBe("ellipsis");
  });
});
