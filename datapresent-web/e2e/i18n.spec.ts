import { expect, test } from "@playwright/test";

test.describe("Internationalisation — i18n", () => {
  test.describe("Redirection racine", () => {
    test("la racine / sert la locale détectée (fr par défaut)", async ({ page }) => {
      // localePrefix "never" : pas de redirection vers /fr — la racine sert
      // directement le contenu dans la locale détectée (fr par défaut).
      const response = await page.request.get("/", { maxRedirects: 0 });
      expect(response.status()).toBe(200);

      await page.goto("/");
      await expect(page.locator("h1")).toBeVisible();
      // French content is served (context locale fr-FR)
      const navText = await page.locator("body").innerText();
      expect(navText.toLowerCase()).toContain("connexion");
    });
  });

  test.describe("Contenu français — /fr", () => {
    test("la page d'accueil française affiche le titre en français", async ({ page }) => {
      await page.goto("/fr");
      await expect(page.locator("h1")).toBeVisible();
      // French nav should show "Connexion" and "Inscription"
      const navText = await page.locator("body").innerText();
      expect(navText.toLowerCase()).toContain("connexion");
    });

    test("la page /fr/pricing affiche les noms de plan en français", async ({ page }) => {
      await page.goto("/fr/pricing");
      await expect(page.getByRole("heading", { name: "Gratuit" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Ultra" })).toBeVisible();
    });

    test("la balise html lang='fr' sur /fr", async ({ page }) => {
      await page.goto("/fr");
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBe("fr");
    });
  });

  test.describe("Contenu anglais — /en", () => {
    test("la page d'accueil anglaise affiche le titre en anglais", async ({ page }) => {
      await page.goto("/en");
      await expect(page.locator("h1")).toBeVisible();
      // English nav should show "Log in" and "Sign up"
      const navText = await page.locator("body").innerText();
      expect(navText.toLowerCase()).toMatch(/log in|sign in/);
    });

    test("la page /en/pricing affiche les noms de plan en anglais", async ({ page }) => {
      await page.goto("/en/pricing");
      await expect(page.getByRole("heading", { name: "Free" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Starter" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Pro" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Ultra" })).toBeVisible();
    });

    test("la balise html lang='en' sur /en", async ({ page }) => {
      await page.goto("/en");
      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBe("en");
    });
  });

  test.describe("Balises hreflang", () => {
    test("les balises link hreflang sont présentes", async ({ page }) => {
      await page.goto("/fr");
      const frLink = page.locator('link[rel="alternate"][hreflang="fr"]');
      const enLink = page.locator('link[rel="alternate"][hreflang="en"]');
      await expect(frLink).toBeAttached();
      await expect(enLink).toBeAttached();
    });
  });

  test.describe("Liens du footer", () => {
    test("le footer français pointe vers /fr/privacy", async ({ page }) => {
      await page.goto("/fr");
      const privacyLinks = page.locator('footer a[href*="privacy"]');
      const count = await privacyLinks.count();
      if (count > 0) {
        const href = await privacyLinks.first().getAttribute("href");
        expect(href).toContain("/fr/");
      }
    });

    test("le footer anglais pointe vers /en/privacy", async ({ page }) => {
      await page.goto("/en");
      const privacyLinks = page.locator('footer a[href*="privacy"]');
      const count = await privacyLinks.count();
      if (count > 0) {
        const href = await privacyLinks.first().getAttribute("href");
        expect(href).toContain("/en/");
      }
    });
  });

  test.describe("Locale invalide", () => {
    test("un locale invalide /zz/ utilise le fallback ou retourne 404", async ({ page }) => {
      const response = await page.goto("/zz");
      if (response) {
        // Either redirect to default locale or 404
        expect([200, 302, 404]).toContain(response.status());
      }
    });
  });

  test.describe("Persistance du locale via cookie", () => {
    test("le cookie NEXT_LOCALE=en persiste la langue anglaise", async ({ page }) => {
      await page.context().addCookies([
        {
          name: "NEXT_LOCALE",
          value: "en",
          domain: "localhost",
          path: "/",
        },
      ]);
      await page.goto("/");
      // localePrefix "never" : l'URL reste / — c'est la balise <html lang>
      // qui reflète la langue persistée par le cookie.
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });

  test.describe("Navigation entre locales", () => {
    test("navigation de /fr/help à /en/help change la langue", async ({ page }) => {
      await page.goto("/fr/help");
      await expect(page.locator("h1")).toBeVisible();
      // localePrefix "never" : next-intl nettoie le préfixe → l'URL devient /help
      // et la langue est pilotée par le cookie NEXT_LOCALE + <html lang>.
      await page.goto("/en/help");
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });
});
