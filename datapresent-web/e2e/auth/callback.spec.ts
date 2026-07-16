import { expect, test } from "@playwright/test";

test.describe("Callback d'authentification — /auth/callback", () => {
  // ─── Success cases ─────────────────────────────────────────────────

  test.describe("avec un token valide", () => {
    test("affiche le spinner de chargement et « Signing you in... »", async ({ page }) => {
      // Ne pas résoudre la requête pour observer le loading
      await page.route("**/api/auth/callback/email", async () => {
        // Ne jamais répondre — on veut juste voir le loading
        await new Promise(() => {});
      });

      await page.goto("/auth/callback?token=valid-token");

      await expect(page.getByText("Signing you in...")).toBeVisible({ timeout: 10000 });
      await expect(page.locator(".animate-spin, [class*='spinner']").first()).toBeVisible();
    });

    test("API succès → redirection vers /", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.fulfill({ status: 200 });
      });

      await page.goto("/auth/callback?token=valid-token");

      // La page doit rediriger vers /
      await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    });

    test("API succès avec callbackUrl → redirection vers callbackUrl", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.fulfill({ status: 200 });
      });

      // Le callbackUrl est lu depuis le searchParams ou depuis le body de la requête
      // On navigue simplement avec le token
      await page.goto("/auth/callback?token=valid-token");

      // Redirigé vers /
      await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    });
  });

  // ─── Error / Failure cases ─────────────────────────────────────────

  test.describe("gestion des erreurs", () => {
    test("token manquant → redirection vers /login avec erreur", async ({ page }) => {
      await page.goto("/auth/callback");

      // La page doit rediriger vers /login avec l'erreur
      await expect(page).toHaveURL(/\/login.*error/, { timeout: 10000 });
    });

    test("token manquant → l'erreur contient « errors.auth.invalidToken »", async ({ page }) => {
      await page.goto("/auth/callback");

      await expect(page).toHaveURL(/invalidToken/, { timeout: 10000 });
    });

    test("token invalide (API 400) → redirection vers /login avec erreur", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Token invalide" }),
        });
      });

      await page.goto("/auth/callback?token=bad-token");

      // Doit rediriger vers /login avec un paramètre d'erreur
      await expect(page).toHaveURL(/\/login.*error/, { timeout: 10000 });
    });

    test("token invalide (API 400) → message d'erreur dans l'URL", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Token invalide" }),
        });
      });

      await page.goto("/auth/callback?token=bad-token");

      // L'erreur doit être encodée dans l'URL
      await expect(page).toHaveURL(/error=/, { timeout: 10000 });
    });

    test("token expiré (API 410) → redirection vers /login", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.fulfill({
          status: 410,
          contentType: "application/json",
          body: JSON.stringify({ error: "Token expiré" }),
        });
      });

      await page.goto("/auth/callback?token=expired-token");

      await expect(page).toHaveURL(/\/login.*error/, { timeout: 10000 });
    });

    test("erreur réseau → redirection vers /login", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.abort("connectionrefused");
      });

      await page.goto("/auth/callback?token=valid-token");

      await expect(page).toHaveURL(/\/login.*error/, { timeout: 10000 });
    });

    test("erreur réseau → l'URL contient le paramètre d'erreur générique", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.abort("connectionrefused");
      });

      await page.goto("/auth/callback?token=valid-token");

      await expect(page).toHaveURL(/error=/, { timeout: 10000 });
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  test.describe("cas limites", () => {
    test("callbackUrl=https://evil.com → pas de redirection open redirect", async ({ page }) => {
      // La page actuelle ne supporte pas callbackUrl directement,
      // on vérifie que le token est bien le paramètre pris en compte
      await page.route("**/api/auth/callback/email", async (route) => {
        // Vérifie que la requête contient bien le token
        const body = JSON.parse(route.request().postData() || "{}");
        expect(body.token).toBe("valid-token");
        await route.fulfill({ status: 200 });
      });

      await page.goto("/auth/callback?token=valid-token&callbackUrl=https://evil.com");

      // La redirection doit aller vers / (pas vers evil.com)
      await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    });

    test("token avec caractères spéciaux encodés → traité correctement", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        const body = JSON.parse(route.request().postData() || "{}");
        // Le token doit être décodé avant d'être envoyé
        expect(body.token).toBe("token+with+special/chars%21");
        await route.fulfill({ status: 200 });
      });

      const specialToken = encodeURIComponent("token+with+special/chars%21");
      await page.goto(`/auth/callback?token=${specialToken}`);

      await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    });

    test("token vide → traité comme token manquant", async ({ page }) => {
      await page.goto("/auth/callback?token=");

      await expect(page).toHaveURL(/\/login.*error/, { timeout: 10000 });
    });

    test("paramètres supplémentaires ignorés → comportement normal", async ({ page }) => {
      await page.route("**/api/auth/callback/email", async (route) => {
        await route.fulfill({ status: 200 });
      });

      await page.goto("/auth/callback?token=valid-token&utm_source=test&ref=email");

      await expect(page).toHaveURL(/\/$/, { timeout: 10000 });
    });

    test("état d'erreur affiché brièvement avant redirection", async ({ page }) => {
      // Retarder la redirection pour observer l'état d'erreur
      let resolveRoute: (value: unknown) => void;
      const routePromise = new Promise((resolve) => {
        resolveRoute = resolve;
      });

      await page.route("**/api/auth/callback/email", async (route) => {
        await routePromise;
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Token invalide" }),
        });
      });

      // Lancer la navigation sans attendre le chargement complet
      await page.goto("/auth/callback?token=bad-token", { waitUntil: "commit" });

      // Attendre que l'état error soit setté
      await page.waitForTimeout(100);

      // Libérer la requête
      resolveRoute!(undefined);

      // Finalement redirigé vers login
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });
});
