import { expect, test } from "@playwright/test";

test.describe("SEO — Métadonnées des pages publiques", () => {
  async function checkMetaTags(
    page: import("@playwright/test").Page,
    checks: Array<{ selector: string; attribute: string; expected?: string | RegExp }>,
  ) {
    for (const { selector, attribute, expected } of checks) {
      const el = page.locator(selector);
      await expect(el).toBeAttached();
      if (expected) {
        if (expected instanceof RegExp) {
          await expect(el).toHaveAttribute(attribute, expected);
        } else {
          await expect(el).toHaveAttribute(attribute, expected);
        }
      } else {
        await expect(el).toHaveAttribute(attribute, /.+/);
      }
    }
  }

  test.describe("Page d'accueil /", () => {
    test("le titre de la page contient DataPresent", async ({ page }) => {
      await page.goto("/fr");
      const title = await page.title();
      expect(title).toContain("DataPresent");
    });

    test("la balise meta description est présente", async ({ page }) => {
      await page.goto("/fr");
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute("content", /.+/);
    });

    test("les balises OpenGraph sont présentes", async ({ page }) => {
      await page.goto("/fr");
      await checkMetaTags(page, [
        { selector: 'meta[property="og:title"]', attribute: "content" },
        { selector: 'meta[property="og:description"]', attribute: "content" },
        { selector: 'meta[property="og:image"]', attribute: "content" },
        { selector: 'meta[property="og:url"]', attribute: "content" },
        { selector: 'meta[property="og:type"]', attribute: "content", expected: "website" },
      ]);
    });

    test("les balises Twitter Card sont présentes", async ({ page }) => {
      await page.goto("/fr");
      await checkMetaTags(page, [
        {
          selector: 'meta[name="twitter:card"]',
          attribute: "content",
          expected: "summary_large_image",
        },
        { selector: 'meta[name="twitter:title"]', attribute: "content" },
      ]);
    });

    test("le lien canonical est présent", async ({ page }) => {
      await page.goto("/fr");
      const canonical = page.locator('link[rel="canonical"]');
      await expect(canonical).toHaveAttribute("href", /.+/);
    });

    test("la balise JSON-LD est présente", async ({ page }) => {
      await page.goto("/fr");
      const jsonld = page.locator('script[type="application/ld+json"]');
      await expect(jsonld.first()).toBeAttached();
    });

    test("la balise meta robots est présente", async ({ page }) => {
      await page.goto("/fr");
      const robots = page.locator('meta[name="robots"]');
      await expect(robots).toHaveAttribute("content", /index.*follow|all/i);
    });
  });

  test.describe("Page tarifs /pricing", () => {
    test("le titre contient Tarifs ou Pricing", async ({ page }) => {
      await page.goto("/fr/pricing");
      const title = await page.title();
      expect(title.toLowerCase()).toMatch(/tarif|pricing/i);
    });

    test("la meta description est présente", async ({ page }) => {
      await page.goto("/fr/pricing");
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute("content", /.+/);
    });

    test("les balises OpenGraph sont présentes", async ({ page }) => {
      await page.goto("/fr/pricing");
      await checkMetaTags(page, [
        { selector: 'meta[property="og:title"]', attribute: "content" },
        { selector: 'meta[property="og:description"]', attribute: "content" },
        { selector: 'meta[property="og:image"]', attribute: "content" },
      ]);
    });

    test("les balises hreflang sont présentes", async ({ page }) => {
      await page.goto("/fr/pricing");
      const frLink = page.locator('link[rel="alternate"][hreflang="fr"]');
      const enLink = page.locator('link[rel="alternate"][hreflang="en"]');
      await expect(frLink).toBeAttached();
      await expect(enLink).toBeAttached();
    });
  });

  test.describe("Page À propos /about", () => {
    test("le titre contient À propos", async ({ page }) => {
      await page.goto("/fr/about");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("à propos");
    });

    test("la meta description est présente", async ({ page }) => {
      await page.goto("/fr/about");
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute("content", /.+/);
    });

    test("les balises OpenGraph sont présentes", async ({ page }) => {
      await page.goto("/fr/about");
      await checkMetaTags(page, [
        { selector: 'meta[property="og:title"]', attribute: "content" },
        { selector: 'meta[property="og:description"]', attribute: "content" },
      ]);
    });
  });

  test.describe("Blog /blog", () => {
    test("le titre contient Blog", async ({ page }) => {
      await page.goto("/fr/blog");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("blog");
    });

    test("la meta description est présente", async ({ page }) => {
      await page.goto("/fr/blog");
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute("content", /.+/);
    });

    test("les balises OpenGraph sont présentes", async ({ page }) => {
      await page.goto("/fr/blog");
      await checkMetaTags(page, [
        { selector: 'meta[property="og:title"]', attribute: "content" },
        { selector: 'meta[property="og:description"]', attribute: "content" },
      ]);
    });
  });

  test.describe("Page d'aide /help", () => {
    test("le titre contient Aide", async ({ page }) => {
      await page.goto("/fr/help");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("aide");
    });

    test("la meta description est présente", async ({ page }) => {
      await page.goto("/fr/help");
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute("content", /.+/);
    });
  });

  test.describe("Page de contact /contact", () => {
    test("le titre contient Contact", async ({ page }) => {
      await page.goto("/fr/contact");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("contact");
    });

    test("la meta description est présente", async ({ page }) => {
      await page.goto("/fr/contact");
      const meta = page.locator('meta[name="description"]');
      await expect(meta).toHaveAttribute("content", /.+/);
    });
  });

  test.describe("Pages légales", () => {
    test("/privacy — titre contient Politique de confidentialité", async ({ page }) => {
      await page.goto("/fr/privacy");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("confidentialité");
    });

    test("/terms — titre contient Conditions d'utilisation", async ({ page }) => {
      await page.goto("/fr/terms");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("conditions");
    });

    test("/legal — titre contient Mentions légales", async ({ page }) => {
      await page.goto("/fr/legal");
      const title = await page.title();
      expect(title.toLowerCase()).toContain("mentions légales");
    });
  });

  test.describe("Sitemap", () => {
    test("/sitemap.xml retourne 200 avec du XML valide", async ({ request }) => {
      const response = await request.get("/sitemap.xml");
      expect(response.status()).toBe(200);
      const contentType = response.headers()["content-type"] || "";
      expect(contentType).toContain("xml");
    });
  });
});
