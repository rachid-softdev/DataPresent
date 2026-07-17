import { expect, test } from "@playwright/test";

test.describe("Pages d'erreur", () => {
  test.describe("404 — Page non trouvée", () => {
    test("une page inexistante affiche une 404", async ({ page }) => {
      const response = await page.goto("/nonexistent-page");

      // Should be a 404 status or a client-side rendered 404 page
      if (response) {
        // Static pages might return 200 with a 404 page rendered client-side
        expect([200, 404]).toContain(response.status());
      }

      // The 404 page content should be visible
      await expect(page.locator("text=Page non trouvée")).toBeVisible();
    });

    test("la page 404 affiche le nombre 404", async ({ page }) => {
      await page.goto("/nonexistent-page");
      await expect(page.locator("text=404")).toBeVisible();
    });

    test("la page 404 a un lien 'Retour à l'accueil'", async ({ page }) => {
      await page.goto("/nonexistent-page");

      const homeLink = page.locator('a[href="/"]');
      await expect(homeLink).toBeVisible();
      await expect(homeLink).toContainText(/Retour à l'accueil/);
    });

    test("la page 404 a un bouton 'Page précédente'", async ({ page }) => {
      await page.goto("/nonexistent-page");
      await expect(page.locator("text=Page précédente")).toBeVisible();
    });

    test("la page 404 a le header et le footer visibles", async ({ page }) => {
      await page.goto("/nonexistent-page");

      // Header should be present
      const header = page.locator("header");
      await expect(header).toBeVisible();

      // Footer should be present
      const footer = page.locator("footer");
      await expect(footer).toBeVisible();
    });
  });

  test.describe("Blog - Article inexistant", () => {
    test("un article de blog inexistant affiche une 404 ou redirige", async ({ page }) => {
      await page.goto("/blog/nonexistent-article-slug");

      // Either we get a 404 page or a redirect to the blog list
      const url = page.url();

      if (url.includes("/blog/nonexistent")) {
        // Still on the 404 page
        await expect(
          page.locator("text=404").or(page.locator("text=Page non trouvée")),
        ).toBeVisible();
      }
      // If redirected, the test passes (no assertion needed for redirect)
    });

    test("la 404 du blog a un layout intact (header présent)", async ({ page }) => {
      await page.goto("/blog/nonexistent-article-slug");

      // Check that header is still visible if we're on the 404 page
      if (page.url().includes("/blog/nonexistent")) {
        const header = page.locator("header");
        await expect(header).toBeVisible();
      }
    });
  });

  test.describe("Pages d'erreur — layout", () => {
    test("les pages d'erreur ne cassent pas le layout global", async ({ page }) => {
      await page.goto("/nonexistent-page");

      // The page should have a proper layout — not just white screen
      const body = page.locator("body");
      await expect(body).toBeVisible();

      // Should have meaningful content
      const bodyText = await body.innerText();
      expect(bodyText.length).toBeGreaterThan(50);
    });
  });
});
