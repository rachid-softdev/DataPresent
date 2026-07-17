import { expect, test } from "@playwright/test";

test.describe("Blog — /blog", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/blog");
  });

  test("la page charge avec le titre du blog", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Blog/);
  });

  test("affiche le sous-titre du blog", async ({ page }) => {
    await expect(
      page.locator("text=Dernières actualités").or(page.locator("text=latest news")),
    ).toBeVisible();
  });

  test("affiche la liste d'articles (ou le message 'Aucun article')", async ({ page }) => {
    // Either articles exist or we see the empty state
    const articles = page.locator("article, .blog-card, [data-testid='blog-card']");
    const emptyState = page.locator("text=Aucun article").or(page.locator("text=No articles"));

    const articlesCount = await articles.count();
    const isEmptyVisible = await emptyState.isVisible();

    // At least one of these should be true
    expect(articlesCount > 0 || isEmptyVisible).toBeTruthy();
  });

  test("la balise meta description est présente pour le SEO", async ({ page }) => {
    const meta = page.locator('meta[name="description"]');
    await expect(meta).toHaveAttribute("content", /.+/);
  });

  test("le header du blog est visible", async ({ page }) => {
    // The BlogHeader component should render
    const header = page.locator("header, nav").first();
    await expect(header).toBeVisible();
  });

  test("les liens du footer sont présents", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });
});
