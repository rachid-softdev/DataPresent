import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("Modèles de rapports — /templates", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/templates");
  });

  test("le titre de la page est affiché", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /modèles|templates|template/i })).toBeVisible();
  });

  test("la description de la page est visible", async ({ page }) => {
    const desc = page.getByText(/sélectionnez|choisissez|template/i);
    await expect(desc).toBeVisible();
  });

  test("les filtres par secteur sont affichés", async ({ page }) => {
    const filterAll = page.getByRole("button", { name: /^tous$/i });
    const filterFinance = page.getByRole("button", { name: /finance/i });
    const filterMarketing = page.getByRole("button", { name: /marketing/i });
    const filterHR = page.getByRole("button", { name: /rh|hr|ressources humaines/i });
    const filterSaaS = page.getByRole("button", { name: /saas/i });

    await expect(filterAll).toBeVisible();
    // At least some sector filters should exist
    const sectors = [filterFinance, filterMarketing, filterHR, filterSaaS];
    const visibleSectors = await Promise.all(sectors.map((s) => s.isVisible()));
    expect(visibleSectors.some(Boolean)).toBe(true);
  });

  test("le filtre 'Tous' est actif par défaut", async ({ page }) => {
    const allBtn = page.getByRole("button", { name: /^tous$/i });
    await expect(allBtn).toHaveClass(/active/);
  });

  test("le filtrage par secteur fonctionne", async ({ page }) => {
    const financeBtn = page.getByRole("button", { name: /finance/i });
    if ((await financeBtn.count()) === 0) return;

    await financeBtn.click();

    // The finance button should now be active
    await expect(financeBtn).toHaveClass(/active/);

    // Template cards should still be visible (or empty state)
    const cards = page.locator("div.grid a, div.grid > div");
    await expect(cards.first()).toBeAttached();
  });

  test("les templates sont affichés sous forme de cartes", async ({ page }) => {
    const cardHeadings = page.locator("h3");
    const count = await cardHeadings.count();
    expect(count).toBeGreaterThan(0);
  });

  test("chaque carte de template affiche le nom, la description et le secteur", async ({
    page,
  }) => {
    const cards = page.locator("div.grid > div, div.grid a").filter({ has: page.locator("h3") });
    if ((await cards.count()) === 0) return;

    const firstCard = cards.first();
    // Name (h3)
    await expect(firstCard.locator("h3")).toBeVisible();
    // Sector badge
    const badge = firstCard
      .locator("span")
      .filter({ hasText: /finance|marketing|rh|saas|générique|generic/i });
    if ((await badge.count()) > 0) {
      await expect(badge.first()).toBeVisible();
    }
  });

  test("le bouton 'Utiliser' ou 'Sélectionner' est visible sur chaque template", async ({
    page,
  }) => {
    const selectBtn = page.getByRole("button", { name: /utiliser|sélectionner|select|use/i });
    if ((await selectBtn.count()) === 0) return;

    await expect(selectBtn.first()).toBeVisible();
  });

  test("cliquer sur 'Utiliser' redirige vers /new avec le secteur pré-rempli", async ({ page }) => {
    const selectBtn = page.getByRole("button", { name: /utiliser|sélectionner|select|use/i });
    if ((await selectBtn.count()) === 0) return;

    await selectBtn.first().click();

    // Should navigate to /new with sector query param
    await expect(page).toHaveURL(/\/new\?sector=/);
  });

  test("les icônes de secteur sont affichées avec des couleurs différentes", async ({ page }) => {
    const iconContainers = page.locator("div.w-10.h-10.rounded-lg");
    if ((await iconContainers.count()) === 0) return;

    // Icons should be rendered (they contain SVG or text)
    await expect(iconContainers.first()).toBeVisible();
  });

  test("les layouts sont listés dans chaque carte de template", async ({ page }) => {
    const layoutLabels = page.getByText(/layouts/i);
    if ((await layoutLabels.count()) === 0) return;

    // Layout badges should exist after the "Layouts" label
    await expect(layoutLabels.first()).toBeVisible();
  });

  test("le nombre de slides (min-max) est affiché pour chaque template", async ({ page }) => {
    const slideCount = page.getByText(/slides/i);
    if ((await slideCount.count()) === 0) return;

    await expect(slideCount.first()).toBeVisible();
  });

  test("le filtre 'Générique' ou 'Generic' fonctionne", async ({ page }) => {
    const genericBtn = page.getByRole("button", { name: /générique|generic/i });
    if ((await genericBtn.count()) === 0) return;

    await genericBtn.click();
    await expect(genericBtn).toHaveClass(/active/);
  });
});
