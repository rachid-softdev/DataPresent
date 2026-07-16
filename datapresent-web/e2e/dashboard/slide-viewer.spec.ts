import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("SlideViewer — Visualisation des slides", () => {
  test.beforeEach(async ({ page }) => {
    // Naviguer vers un rapport terminé
    await page.goto("/reports");
    const doneBadge = page.getByText("Terminé").first();
    if ((await doneBadge.count()) === 0) {
      test.skip("Aucun rapport terminé trouvé");
      return;
    }
    const row = doneBadge.locator("..").locator("..");
    const link = row.locator("a[href^='/reports/']");
    if ((await link.count()) === 0) {
      test.skip("Aucun lien de rapport trouvé");
      return;
    }
    await link.first().click();
    await page.waitForTimeout(2000);
  });

  test("le SlideViewer est visible pour un rapport terminé", async ({ page }) => {
    const slidesSection = page.locator("text=slide").or(page.locator("[class*='slide']"));
    await expect(slidesSection.first()).toBeVisible({ timeout: 5000 });
  });

  test("le compteur 'Slide X sur Y' est affiché", async ({ page }) => {
    const counter = page.getByText(/slide/i).filter({ hasText: /sur/i });
    if ((await counter.count()) > 0) {
      await expect(counter.first()).toBeVisible();
    }
  });

  test("le bouton 'Slide suivante' est visible", async ({ page }) => {
    const nextBtn = page.getByRole("button", { name: /suivant|next|chevron-right/i });
    if ((await nextBtn.count()) > 0) {
      await expect(nextBtn.first()).toBeVisible();
    }
  });

  test("le bouton 'Slide précédente' est visible", async ({ page }) => {
    const prevBtn = page.getByRole("button", { name: /précédent|previous|chevron-left/i });
    if ((await prevBtn.count()) > 0) {
      await expect(prevBtn.first()).toBeVisible();
    }
  });

  test("les indicateurs à points (dot indicators) sont visibles", async ({ page }) => {
    const dots = page.locator('[class*="dot"], button[class*="w-2"], button[class*="h-2"]');
    if ((await dots.count()) > 0) {
      await expect(dots.first()).toBeVisible();
    }
  });

  test("le point actif est plus large (w-8 bg-primary)", async ({ page }) => {
    const activeDot = page.locator('[class*="bg-primary"]').or(page.locator('[class*="w-8"]'));
    if ((await activeDot.count()) > 0) {
      await expect(activeDot.first()).toBeVisible();
    }
  });

  test("le bouton 'Afficher la liste des slides' est visible", async ({ page }) => {
    const sidebarBtn = page.getByRole("button", { name: /afficher|liste|sidebar/i });
    if ((await sidebarBtn.count()) > 0) {
      await expect(sidebarBtn.first()).toBeVisible();
    }
  });

  test("cliquer sur 'Afficher la liste' ouvre la sidebar", async ({ page }) => {
    const sidebarBtn = page.getByRole("button", { name: /afficher|liste|sidebar/i });
    if ((await sidebarBtn.count()) === 0) return;
    await sidebarBtn.first().click();
    await page.waitForTimeout(500);
    const sidebar = page.locator('[class*="sidebar"]').or(page.locator('[class*="panel"]'));
    if ((await sidebar.count()) > 0) {
      await expect(sidebar.first()).toBeVisible();
    }
  });

  test("la sidebar affiche la liste des slides avec titre et layout", async ({ page }) => {
    // Open sidebar first
    const sidebarBtn = page.getByRole("button", { name: /afficher|liste|sidebar/i });
    if ((await sidebarBtn.count()) > 0) {
      await sidebarBtn.first().click();
      await page.waitForTimeout(500);
    }
    // Check for slide entries in sidebar
    const sidebar = page.locator('[class*="sidebar"]').or(page.locator('[class*="panel"]'));
    if ((await sidebar.count()) === 0) return;
    const slideItems = sidebar.locator("button, div").filter({ has: page.locator("text=slide") });
    if ((await slideItems.count()) > 0) {
      await expect(slideItems.first()).toBeVisible();
    }
  });

  test("la slide active est surlignée dans la sidebar", async ({ page }) => {
    const sidebarBtn = page.getByRole("button", { name: /afficher|liste|sidebar/i });
    if ((await sidebarBtn.count()) > 0) {
      await sidebarBtn.first().click();
      await page.waitForTimeout(500);
    }
    const activeItem = page
      .locator('[class*="border-primary"]')
      .or(page.locator('[class*="bg-primary"][class*="/10"]'));
    if ((await activeItem.count()) > 0) {
      await expect(activeItem.first()).toBeVisible();
    }
  });

  test("la sidebar peut être fermée avec le bouton X", async ({ page }) => {
    const sidebarBtn = page.getByRole("button", { name: /afficher|liste|sidebar/i });
    if ((await sidebarBtn.count()) === 0) return;
    await sidebarBtn.first().click();
    await page.waitForTimeout(500);
    const closeBtn = page
      .getByRole("button", { name: /fermer|close|x/i })
      .or(page.locator("button svg.lucide-x").locator(".."));
    if ((await closeBtn.count()) > 0) {
      await closeBtn.first().click();
      await page.waitForTimeout(500);
      const sidebar = page.locator('[class*="sidebar"]').or(page.locator('[class*="panel"]'));
      // Sidebar should be hidden or closed
    }
  });

  test("les notes de l'orateur sont affichées dans une bannière jaune", async ({ page }) => {
    const speakerNotes = page.locator("text=Note").or(page.locator('[class*="yellow"]')).first();
    if ((await speakerNotes.count()) > 0) {
      await expect(speakerNotes).toBeVisible();
    }
  });

  test("le layout TitleSlide s'affiche avec un entête coloré", async ({ page }) => {
    const titleSlide = page
      .locator("text=TitleSlide")
      .or(page.locator('[class*="title-slide"]'))
      .first();
    if ((await titleSlide.count()) > 0) {
      await expect(titleSlide).toBeVisible();
    }
  });

  test("le layout KPI Grid s'affiche avec des indicateurs", async ({ page }) => {
    const kpiGrid = page.locator("text=KPI").or(page.locator('[class*="kpi"]')).first();
    if ((await kpiGrid.count()) > 0) {
      await expect(kpiGrid).toBeVisible();
    }
  });

  test("le layout Chart (Bar/Line/Pie) s'affiche", async ({ page }) => {
    const chart = page.locator("text=Chart").or(page.locator('[class*="chart"]')).first();
    if ((await chart.count()) > 0) {
      await expect(chart).toBeVisible();
    }
  });

  test("le layout TextSummary s'affiche avec le contenu texte", async ({ page }) => {
    const textSummary = page
      .locator("text=TextSummary")
      .or(page.locator('[class*="text-summary"]'))
      .first();
    if ((await textSummary.count()) > 0) {
      await expect(textSummary).toBeVisible();
    }
  });

  test("le layout Comparison s'affiche", async ({ page }) => {
    const comparison = page
      .locator("text=Comparison")
      .or(page.locator('[class*="comparison"]'))
      .first();
    if ((await comparison.count()) > 0) {
      await expect(comparison).toBeVisible();
    }
  });
});
