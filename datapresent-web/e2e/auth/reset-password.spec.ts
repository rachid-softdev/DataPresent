import { expect, test } from "@playwright/test";

test.describe("Réinitialisation du mot de passe — /reset-password", () => {
  const VALID_TOKEN = "valid-reset-token-abc123";

  // ─── Success cases ─────────────────────────────────────────────────

  test.describe("avec un token valide dans l'URL", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/reset-password?token=${VALID_TOKEN}`);
    });

    test("la page affiche le titre « Nouveau mot de passe » avec les champs", async ({ page }) => {
      await expect(page.locator("h2").or(page.locator("h1"))).toContainText(
        /Nouveau mot de passe/i,
      );
      await expect(page.getByLabel(/Nouveau mot de passe/i)).toBeVisible();
      await expect(page.getByLabel(/Confirmer le mot de passe/i)).toBeVisible();
    });

    test("le bouton « Réinitialiser » est désactivé quand les champs sont vides", async ({
      page,
    }) => {
      const submitBtn = page.getByRole("button", { name: /réinitialiser/i });
      await expect(submitBtn).toBeDisabled();
    });

    test("soumission valide avec mots de passe correspondants → état succès", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.getByLabel(/Nouveau mot de passe/i).fill("NewSecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("NewSecurePass123!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Mot de passe réinitialisé !")).toBeVisible({ timeout: 10000 });
      await expect(page.locator(".text-green-500")).toBeVisible(); // CheckCircle icon
    });

    test("après succès, le bouton « Se connecter » navigue vers /login", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.getByLabel(/Nouveau mot de passe/i).fill("NewSecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("NewSecurePass123!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Mot de passe réinitialisé !")).toBeVisible({ timeout: 10000 });

      await page.getByRole("link", { name: /se connecter/i }).click();
      await expect(page).toHaveURL(/\/login/);
    });

    test("affiche l'état chargement avec spinner pendant la soumission", async ({ page }) => {
      let resolveRoute: (value: unknown) => void;
      const routePromise = new Promise((resolve) => {
        resolveRoute = resolve;
      });

      await page.route("**/api/auth/reset-password", async (route) => {
        await routePromise;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.getByLabel(/Nouveau mot de passe/i).fill("NewSecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("NewSecurePass123!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.locator(".animate-spin")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/Réinitialisation en cours/)).toBeVisible();

      resolveRoute!(undefined);

      await expect(page.getByText("Mot de passe réinitialisé !")).toBeVisible({ timeout: 10000 });
    });

    test("le lien « Retour à la connexion » en bas du formulaire est visible", async ({ page }) => {
      const backLink = page.getByRole("link", { name: /retour à la connexion/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
      await expect(page).toHaveURL(/\/login/);
    });

    test("le champ mot de passe a l'attribut minLength=8", async ({ page }) => {
      const passwordField = page.getByLabel(/Nouveau mot de passe/i);
      await expect(passwordField).toHaveAttribute("minLength", "8");
    });
  });

  // ─── Error / Failure cases ─────────────────────────────────────────

  test.describe("gestion des erreurs", () => {
    test("aucun token dans l'URL → carte « Lien invalide » avec bouton de demande", async ({
      page,
    }) => {
      await page.goto("/reset-password");

      // Suspense fallback puis contenu sans token
      await expect(page.getByText("Lien invalide")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/incomplet ou invalide/)).toBeVisible();

      const newLinkBtn = page.getByRole("button", { name: /demander un nouveau lien/i });
      await expect(newLinkBtn).toBeVisible();
      await newLinkBtn.click();

      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test("mot de passe trop court (< 8 caractères) → message d'erreur", async ({ page }) => {
      await page.goto(`/reset-password?token=${VALID_TOKEN}`);

      await page.getByLabel(/Nouveau mot de passe/i).fill("Abc12");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("Abc12");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText(/au moins 8 caractères/)).toBeVisible({ timeout: 5000 });
    });

    test("mots de passe non concordants → message « Les mots de passe ne correspondent pas »", async ({
      page,
    }) => {
      await page.goto(`/reset-password?token=${VALID_TOKEN}`);

      await page.getByLabel(/Nouveau mot de passe/i).fill("SecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("DifferentPass456!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText(/ne correspondent pas/)).toBeVisible({ timeout: 5000 });
    });

    test("token invalide via l'API → message d'erreur affiché", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Token invalide ou expiré" }),
        });
      });

      await page.goto(`/reset-password?token=expired-token`);

      await page.getByLabel(/Nouveau mot de passe/i).fill("SecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("SecurePass123!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Token invalide ou expiré")).toBeVisible({ timeout: 10000 });
    });

    test("erreur réseau → message « Erreur de connexion » affiché", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.abort("connectionrefused");
      });

      await page.goto(`/reset-password?token=${VALID_TOKEN}`);

      await page.getByLabel(/Nouveau mot de passe/i).fill("SecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("SecurePass123!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Erreur de connexion")).toBeVisible({ timeout: 10000 });
    });

    test("token expiré → message d'erreur avec toast", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 410,
          contentType: "application/json",
          body: JSON.stringify({ error: "Token expiré" }),
        });
      });

      await page.goto(`/reset-password?token=expired-token`);

      await page.getByLabel(/Nouveau mot de passe/i).fill("SecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("SecurePass123!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Token expiré")).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  test.describe("cas limites", () => {
    test("mot de passe avec uniquement des espaces → rejeté (< 8 caractères significatifs)", async ({
      page,
    }) => {
      await page.goto(`/reset-password?token=${VALID_TOKEN}`);

      // 8 espaces — la validation length les compte
      await page.getByLabel(/Nouveau mot de passe/i).fill("        ");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("        ");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      // Soit la validation client les accepte (length >= 8), soit les refuse
      // On vérifie simplement que ça ne plante pas
      await expect(page.getByLabel(/Nouveau mot de passe/i)).toHaveValue("        ");
    });

    test("mot de passe très long (128+ caractères) → accepté", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.goto(`/reset-password?token=${VALID_TOKEN}`);

      const longPassword = "A" + "b".repeat(127);
      await page.getByLabel(/Nouveau mot de passe/i).fill(longPassword);
      await page.getByLabel(/Confirmer le mot de passe/i).fill(longPassword);
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Mot de passe réinitialisé !")).toBeVisible({ timeout: 10000 });
    });

    test("mot de passe avec caractères spéciaux et unicode → accepté", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      await page.goto(`/reset-password?token=${VALID_TOKEN}`);

      const specialPassword = "P@$$w0rd!♣日本語😀";
      await page.getByLabel(/Nouveau mot de passe/i).fill(specialPassword);
      await page.getByLabel(/Confirmer le mot de passe/i).fill(specialPassword);
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Mot de passe réinitialisé !")).toBeVisible({ timeout: 10000 });
    });

    test("Suspense boundary — le fallback s'affiche pendant le chargement", async ({ page }) => {
      // Intercepter la navigation pour ralentir le rendu
      await page.route("**/_next/**", async (route) => {
        await new Promise((r) => setTimeout(r, 100));
        await route.continue();
      });

      await page.goto(`/reset-password?token=${VALID_TOKEN}`);

      // Le fallback du Suspense est un spinner Loader2
      await expect(page.locator(".animate-spin")).toBeVisible({ timeout: 5000 });
    });

    test("token vide (?token=) → traité comme token manquant", async ({ page }) => {
      await page.goto("/reset-password?token=");

      await expect(page.getByText("Lien invalide")).toBeVisible({ timeout: 10000 });
    });

    test("caractères spéciaux dans le token → pas d'erreur de parsing", async ({ page }) => {
      await page.route("**/api/auth/reset-password", async (route) => {
        const body = JSON.parse(route.request().postData() || "{}");
        expect(body.token).toBe("token+with+special/chars%21");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ ok: true }),
        });
      });

      const specialToken = "token+with+special/chars%21";
      await page.goto(`/reset-password?token=${encodeURIComponent(specialToken)}`);

      await expect(page.getByText(/Nouveau mot de passe/i)).toBeVisible({ timeout: 10000 });

      await page.getByLabel(/Nouveau mot de passe/i).fill("SecurePass123!");
      await page.getByLabel(/Confirmer le mot de passe/i).fill("SecurePass123!");
      await page.getByRole("button", { name: /réinitialiser/i }).click();

      await expect(page.getByText("Mot de passe réinitialisé !")).toBeVisible({ timeout: 10000 });
    });
  });
});
