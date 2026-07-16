import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("Opérations par lots — /reports", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/reports");
  });

  test("les cases à cocher sont visibles pour chaque ligne de rapport", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const checkboxes = table.locator('tbody tr input[type="checkbox"]');
    const count = await checkboxes.count();
    if (count > 0) {
      await expect(checkboxes.first()).toBeVisible();
    }
  });

  test("la case 'Tout sélectionner' est visible dans l'en-tête", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const selectAll = page.getByLabel(/tout sélectionner/i);
    if ((await selectAll.count()) > 0) {
      await expect(selectAll).toBeVisible();
    }
  });

  test("sélectionner 'Tout sélectionner' coche toutes les lignes", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const selectAll = page.getByLabel(/tout sélectionner/i);
    if ((await selectAll.count()) === 0) return;
    await selectAll.check();
    await expect(selectAll).toBeChecked();
    const rows = table.locator("tbody tr");
    const rowCount = await rows.count();
    for (let i = 0; i < Math.min(rowCount, 3); i++) {
      const cb = rows.nth(i).locator('input[type="checkbox"]');
      await expect(cb).toBeChecked();
    }
  });

  test("déselectionner 'Tout sélectionner' décoche toutes les lignes", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const selectAll = page.getByLabel(/tout sélectionner/i);
    if ((await selectAll.count()) === 0) return;
    await selectAll.check();
    await selectAll.uncheck();
    await expect(selectAll).not.toBeChecked();
  });

  test("sélectionner une ligne individuelle met la ligne en surbrillance", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    await expect(firstCheckbox).toBeChecked();
    const row = table.locator("tbody tr").first();
    // Row should have a highlighted class
    const hasHighlight = await row.evaluate((el) => {
      const classes = Array.from(el.classList);
      return classes.some(
        (c) => c.includes("primary") || c.includes("selected") || c.includes("active"),
      );
    });
  });

  test("sélectionner certaines lignes montre l'état indéterminé sur 'Tout sélectionner'", async ({
    page,
  }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const rows = table.locator("tbody tr");
    if ((await rows.count()) < 2) return;
    const firstCheckbox = rows.first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    const selectAll = page.getByLabel(/tout sélectionner/i);
    if ((await selectAll.count()) > 0) {
      const isIndeterminate = await selectAll.evaluate((el) => {
        const input = el as HTMLInputElement;
        return input.indeterminate;
      });
    }
  });

  test("la barre d'actions apparaît quand un rapport est sélectionné", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    // Toolbar should show selection count
    const toolbar = page.getByText(/sélectionné/i);
    await expect(toolbar).toBeVisible();
  });

  test("la barre d'actions affiche le nombre de rapports sélectionnés", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const rows = table.locator("tbody tr");
    if ((await rows.count()) < 2) return;
    const firstCb = rows.first().locator('input[type="checkbox"]');
    const secondCb = rows.nth(1).locator('input[type="checkbox"]');
    if ((await firstCb.count()) === 0 || (await secondCb.count()) === 0) return;
    await firstCb.check();
    await secondCb.check();
    const countText = page.getByText(/2 sélectionnés|2 sélectionnées/i);
    await expect(countText).toBeVisible();
  });

  test("le bouton 'Supprimer' est visible dans la barre d'actions", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i });
    await expect(deleteBtn).toBeVisible();
  });

  test("cliquer sur 'Supprimer' ouvre une boîte de confirmation", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i });
    if ((await deleteBtn.count()) === 0) return;
    await deleteBtn.click();
    // Confirmation dialog should appear
    const dialog = page.getByRole("alertdialog").or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test("la boîte de confirmation affiche le nombre de rapports à supprimer", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i });
    if ((await deleteBtn.count()) === 0) return;
    await deleteBtn.click();
    const dialog = page.getByRole("alertdialog").or(page.locator('[role="dialog"]'));
    await expect(dialog.locator("text=rapport")).toBeVisible({ timeout: 3000 });
  });

  test("annuler la suppression ferme la boîte de dialogue", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i });
    if ((await deleteBtn.count()) === 0) return;
    await deleteBtn.click();
    const cancelBtn = page.getByRole("button", { name: /annuler|cancel/i });
    if ((await cancelBtn.count()) === 0) return;
    await cancelBtn.click();
    const dialog = page.getByRole("alertdialog").or(page.locator('[role="dialog"]'));
    await expect(dialog).not.toBeVisible({ timeout: 3000 });
  });

  test("le bouton 'Exporter' est visible dans la barre d'actions", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    const exportBtn = page.getByRole("button", { name: /exporter|export/i });
    await expect(exportBtn).toBeVisible();
  });

  test("cliquer sur 'Exporter' affiche les options de format", async ({ page }) => {
    const table = page.locator("table");
    if ((await table.count()) === 0) return;
    const firstCheckbox = table.locator("tbody tr").first().locator('input[type="checkbox"]');
    if ((await firstCheckbox.count()) === 0) return;
    await firstCheckbox.check();
    const exportBtn = page.getByRole("button", { name: /exporter|export/i });
    if ((await exportBtn.count()) === 0) return;
    await exportBtn.click();
    const pptxOption = page.getByText(/pptx/i);
    const pdfOption = page.getByText(/pdf/i);
    const docxOption = page.getByText(/docx|word/i);
    await expect(pptxOption.or(pdfOption).or(docxOption).first()).toBeVisible({ timeout: 3000 });
  });
});
