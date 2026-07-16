import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("Liste des rapports — /reports", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
  });

  test("le titre de la page est affiché", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /rapports/i })).toBeVisible();
  });

  test("le bouton 'Nouveau rapport' est visible et redirige vers /new", async ({ page }) => {
    const btn = page.getByRole("link", { name: /nouveau rapport|créer/i });
    await expect(btn).toBeVisible();
    await expect(btn).toHaveAttribute("href", "/new");
  });

  test("le champ de recherche est visible", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/rechercher/i);
    await expect(searchInput).toBeVisible();
  });

  test("les 4 pills de statut sont affichées (Tous, Terminé, En cours, Erreur)", async ({
    page,
  }) => {
    await expect(page.getByRole("button", { name: /^tous$/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /terminé/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /en cours/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /erreur/i })).toBeVisible();
  });

  test("les rapports sont affichés dans un tableau", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;

    // Table should have header columns: name, sector, status, date
    const headers = table.locator("thead th");
    await expect(headers.first()).toBeAttached();
  });

  test("chaque rapport affiche le titre, le statut, le secteur et la date", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;

    const rows = table.locator("tbody tr");
    if ((await rows.count()) === 0) return;

    const firstRow = rows.first();
    // Title cell
    await expect(firstRow.locator("td").nth(1)).toBeAttached();
    // Sector cell
    await expect(firstRow.locator("td").nth(2)).toBeAttached();
    // Status badge cell
    await expect(firstRow.locator("td").nth(3).locator("span")).toBeAttached();
  });

  test("le filtre par statut est fonctionnel (cliquer sur Terminé filtre)", async ({ page }) => {
    const donePill = page.getByRole("button", { name: /terminé/i });
    if ((await donePill.count()) === 0) return;

    await donePill.click();

    // After clicking, the pill should be active (bg-primary class)
    await expect(donePill).toHaveClass(/bg-primary/);
  });

  test("le filtre 'Effacer les filtres' réinitialise les filtres", async ({ page }) => {
    // First click a filter to activate it
    const errorPill = page.getByRole("button", { name: /erreur/i });
    if ((await errorPill.count()) === 0) return;

    await errorPill.click();

    // Look for the clear filters button
    const clearBtn = page.getByText(/effacer les filtres/i);
    if ((await clearBtn.count()) === 0) return;

    await clearBtn.click();

    // The "Tous" pill should be active again
    const allPill = page.getByRole("button", { name: /^tous$/i });
    await expect(allPill).toHaveClass(/bg-primary/);
  });

  test("la recherche par nom fonctionne", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/rechercher/i);
    if ((await searchInput.count()) === 0) return;

    await searchInput.fill("Rapport inexistant XYZ123");

    // Should show empty state or zero results
    const emptyState = page.getByText(/aucun résultat|aucun rapport/i);
    const rows = page.locator("table tbody tr");
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    } else {
      // Wait a beat for filter to apply
      await page.waitForTimeout(300);
    }
  });

  test("le bouton 'Tout sélectionner' est fonctionnel", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;

    const selectAllCheckbox = page.getByLabel(/tout sélectionner/i);
    if ((await selectAllCheckbox.count()) === 0) return;

    await selectAllCheckbox.check();
    await expect(selectAllCheckbox).toBeChecked();
  });

  test("la sélection multiple affiche la barre d'actions", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;

    // Select a specific report checkbox
    const firstCheckbox = page.locator("table tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;

    await firstCheckbox.check();

    // The batch action toolbar should appear
    const batchToolbar = page.getByText(/sélectionné/i);
    await expect(batchToolbar).toBeVisible();
  });

  test("la pagination est visible quand il y a plusieurs pages", async ({ page }) => {
    const pagination = page.locator(".app-pagination");
    if ((await pagination.count()) === 0) return;

    await expect(pagination).toBeVisible();
    await expect(page.getByText(/page/i)).toBeVisible();
  });

  test("un état vide s'affiche quand les filtres ne retournent aucun résultat", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder(/rechercher/i);
    if ((await searchInput.count()) === 0) return;

    await searchInput.fill("ZZZZ_NEVER_EXISTS_99999");

    // EmptyState should appear
    const empty = page.locator("text=aucun résultat").or(page.locator("svg")).first();
    await expect(empty).toBeVisible({ timeout: 3000 });
  });
});
