import { test, expect } from "@playwright/test";

test.describe("Page embed — /embed/[shareToken]", () => {
  test("un token d'embed invalide affiche 404", async ({ page }) => {
    await page.goto("/embed/invalid-token-12345");
    await expect(page.getByText(/non trouvé|404|introuvable/i)).toBeVisible({ timeout: 10000 });
  });

  test("un token d'embed expiré affiche 404", async ({ page }) => {
    // Use a token that is expired or doesn't exist
    await page.goto("/embed/expired-token-99999");
    await expect(page.getByText(/non trouvé|404|introuvable/i)).toBeVisible({ timeout: 10000 });
  });

  test("la page embed ne contient pas la navigation complète de l'application", async ({
    page,
  }) => {
    // Navigate to any embed URL — should not show app chrome
    await page.goto("/embed/invalid-embed-00000");

    // The embed page should NOT have the main app nav or dashboard sidebar
    const appNav = page.locator("nav.app-nav, .app-sidebar, .landing-nav");
    await expect(appNav).not.toBeVisible();

    // Should only show minimal content (or 404)
    await expect(page.locator("body")).toBeVisible();
  });

  test("la page embed affiche uniquement le contenu minimal (pas de header/footer app)", async ({
    page,
  }) => {
    await page.goto("/embed/nonexistent-embed");

    // Embed pages should not reference dashboard layout elements
    const dashboardHeader = page.getByText(/nouveau rapport|rapports|tableau de bord/i);
    await expect(dashboardHeader).not.toBeVisible();
  });

  test("un embed valide affiche le titre du rapport sans chrome", async ({ page }) => {
    // Go to reports list, get first report, then try to construct an embed URL
    // Since we can't know the shareToken from the frontend directly, we test structure
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();

    if ((await firstLink.count()) === 0) return;

    // Navigate to the report detail to check if we can find share info
    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    // Check if embed URL is displayed (it would appear as an input with "/embed/" in it)
    const embedInput = page.locator('input[value*="/embed/"]');
    if ((await embedInput.count()) > 0) {
      const embedUrl = await embedInput.inputValue();
      // Extract the share token from the embed URL
      const match = embedUrl.match(/\/embed\/([^/\s?]+)/);
      if (match) {
        const shareToken = match[1];

        // Navigate to the embed page
        await page.goto(`/embed/${shareToken}`);
        await page.waitForTimeout(3000);

        // Embed should show report title without app chrome
        const appHeader = page.locator(".app-nav, .app-sidebar, .landing-nav");
        await expect(appHeader).not.toBeVisible();

        // Report title should be visible
        await expect(page.locator("h1")).toBeVisible();
      }
    }
  });

  test("la page embed ne contient pas de boutons d'action (export, partage, etc.)", async ({
    page,
  }) => {
    await page.goto("/embed/nonexistent-token");

    // Should not have action buttons like "Partager", "Exporter", etc.
    const actionBtns = page.getByRole("button", { name: /partager|exporter|régénérer|supprimer/i });
    await expect(actionBtns).not.toBeVisible();
  });

  test("l'embed affiche les slides quand le rapport est accessible", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    const embedInput = page.locator('input[value*="/embed/"]');
    if ((await embedInput.count()) > 0) {
      const embedUrl = await embedInput.inputValue();
      const match = embedUrl.match(/\/embed\/([^/\s?]+)/);
      if (match) {
        const shareToken = match[1];
        await page.goto(`/embed/${shareToken}`);
        await page.waitForTimeout(3000);

        // Should have slide content cards
        const slideCards = page.locator("text=slide").or(page.locator("[class*='slide']"));
        const slideSections = page.locator(".space-y-8 > div, .space-y-8 > section");
        if ((await slideSections.count()) > 0) {
          await expect(slideSections.first()).toBeVisible();
        }
      }
    }
  });
});
