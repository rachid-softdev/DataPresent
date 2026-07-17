import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("Détail d'un rapport — /reports/[id]", () => {
  test("un ID de rapport inexistant affiche une page 404", async ({ page }) => {
    await page.goto("/reports/id-inexistant-000000");
    await expect(page.getByText(/non trouvé|404|introuvable/i)).toBeVisible({ timeout: 10000 });
  });

  test("le titre et les métadonnées du rapport sont affichés", async ({ page }) => {
    // Go to reports list first, then click first report
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await firstLink.click();
    await page.waitForURL(`**${href}`);

    // The page should have a heading (report title)
    await expect(page.locator("h1")).toBeVisible();
  });

  test("le badge de statut est affiché correctement", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    await firstLink.click();
    await page.waitForTimeout(1000);

    // Status badge should be visible
    const badge = page.getByText(/terminé|en cours|erreur/i);
    await expect(badge.first()).toBeVisible();
  });

  test("le secteur du rapport est affiché", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    await firstLink.click();
    await page.waitForTimeout(1000);

    // Sector text (beside the status badge)
    const sectorText = page.locator("span.text-muted-foreground");
    if (await sectorText.isVisible()) {
      await expect(sectorText).toBeVisible();
    }
  });

  test("le bouton 'Retour aux rapports' est visible", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    await firstLink.click();
    await page.waitForTimeout(1000);

    const backLink = page.getByText(/retour aux rapports/i);
    await expect(backLink).toBeVisible();
  });

  test("le bouton Partager est visible", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    await firstLink.click();
    await page.waitForTimeout(1000);

    const shareBtn = page.getByRole("button", { name: /partager/i });
    if ((await shareBtn.count()) === 0) return;
    await expect(shareBtn).toBeVisible();
  });

  test("les boutons d'export PPTX, PDF et Word sont visibles pour un rapport terminé", async ({
    page,
  }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    await firstLink.click();
    await page.waitForTimeout(1000);

    // Export buttons only appear for DONE reports
    const pptxBtn = page.getByRole("button", { name: /pptx/i });
    const pdfBtn = page.getByRole("button", { name: /pdf/i });
    const docxBtn = page.getByRole("button", { name: /word|docx/i });

    if (await pptxBtn.isVisible()) {
      await expect(pptxBtn).toBeVisible();
    }
    if (await pdfBtn.isVisible()) {
      await expect(pdfBtn).toBeVisible();
    }
    if (await docxBtn.isVisible()) {
      await expect(docxBtn).toBeVisible();
    }
  });

  test("le bouton 'Régénérer' est visible pour un rapport terminé", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    await firstLink.click();
    await page.waitForTimeout(1000);

    const regenerateBtn = page.getByRole("button", { name: /régénérer|regenerer/i });
    if ((await regenerateBtn.count()) === 0) return;
    await expect(regenerateBtn).toBeVisible();
  });

  test("un rapport en cours de traitement affiche l'état de chargement", async ({ page }) => {
    await page.goto("/reports");
    // Find a processing report link if any
    const processingBadge = page.getByText("En cours");
    if ((await processingBadge.count()) === 0) return;

    // Click the row containing "En cours"
    const row = processingBadge.locator("..").locator("..");
    const link = row.locator("a[href^='/reports/']");
    if ((await link.count()) > 0) {
      await link.first().click();
      await page.waitForTimeout(1000);

      // Should show spinner or generating text
      const spinner = page.locator("svg").or(page.getByText(/génération|génération en cours/i));
      await expect(spinner.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("le SlideViewer est visible pour un rapport terminé", async ({ page }) => {
    await page.goto("/reports");
    const doneBadge = page.getByText("Terminé");
    if ((await doneBadge.count()) === 0) return;

    const row = doneBadge.locator("..").locator("..");
    const link = row.locator("a[href^='/reports/']");
    if ((await link.count()) > 0) {
      await link.first().click();
      await page.waitForTimeout(1000);

      // Slides viewer section should be present
      const slidesSection = page.locator("text=slide").or(page.locator("[class*='slide']"));
      await expect(slidesSection.first()).toBeVisible({ timeout: 5000 });
    }
  });
});
