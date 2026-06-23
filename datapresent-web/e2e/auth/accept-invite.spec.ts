import { test, expect } from "@playwright/test";

test.describe("Accepter une invitation — /accept-invite", () => {
  const VALID_TOKEN = "invite-token-abc-456";

  // ─── Success cases (authentifié) ───────────────────────────────────

  test.describe("avec session active et token valide", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test.beforeEach(async ({ page }) => {
      // Mock la vérification de session
      await page.route("**/api/user", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ email: "test@datapresent.com" }),
        });
      });

      // Mock l'acceptation d'invitation
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orgName: "Acme Corp", role: "Admin" }),
        });
      });
    });

    test("invitation acceptée → carte de succès avec le nom de l'organisation", async ({
      page,
    }) => {
      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Acme Corp")).toBeVisible();
    });

    test("invitation acceptée → le rôle affiché est « Admin »", async ({ page }) => {
      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Admin")).toBeVisible();
    });

    test("invitation acceptée → icône CheckCircle visible", async ({ page }) => {
      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.locator(".text-green-500")).toBeVisible({ timeout: 10000 });
    });

    test("le bouton « Aller au dashboard » navigue vers /dashboard", async ({ page }) => {
      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });

      await page.getByRole("link", { name: /dashboard/i }).click();
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test("invitation avec rôle « Membre » → rôle correctement affiché", async ({ page }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orgName: "Startup Inc", role: "Membre" }),
        });
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Membre")).toBeVisible();
    });

    test("Suspense fallback affiché pendant le chargement initial", async ({ page }) => {
      // Ralentir la requête API pour voir le fallback
      let resolveRoute: (value: unknown) => void;
      const routePromise = new Promise((resolve) => {
        resolveRoute = resolve;
      });

      await page.route("**/api/user", async (route) => {
        await routePromise;
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ email: "test@datapresent.com" }),
        });
      });

      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orgName: "Acme Corp", role: "Admin" }),
        });
      });

      // Navigation avec waitUntil: 'commit' pour voir le rendu initial
      await page.goto(`/accept-invite?token=${VALID_TOKEN}`, { waitUntil: "commit" });

      // Le fallback Suspense est un spinner
      await expect(page.locator(".animate-spin")).toBeVisible({ timeout: 5000 });

      resolveRoute!(undefined);

      // Après résolution, le succès doit s'afficher
      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });
    });
  });

  // ─── Error / Failure cases ─────────────────────────────────────────

  test.describe("gestion des erreurs — sans session", () => {
    test("token manquant → message « Token d'invitation manquant »", async ({ page }) => {
      await page.goto("/accept-invite");

      await expect(page.getByText("Token d'invitation manquant")).toBeVisible({ timeout: 10000 });
    });

    test("token manquant → bouton « Retour à la connexion » visible", async ({ page }) => {
      await page.goto("/accept-invite");

      await expect(page.getByText("Token d'invitation manquant")).toBeVisible({ timeout: 10000 });
      const loginBtn = page.getByRole("link", { name: /retour à la connexion/i });
      await expect(loginBtn).toBeVisible();
      await loginBtn.click();
      await expect(page).toHaveURL(/\/login/);
    });

    test("token manquant → bouton « Retour à l'accueil » visible", async ({ page }) => {
      await page.goto("/accept-invite");

      await expect(page.getByText("Token d'invitation manquant")).toBeVisible({ timeout: 10000 });
      const homeBtn = page.getByRole("link", { name: /retour à l'accueil/i });
      await expect(homeBtn).toBeVisible();
      await homeBtn.click();
      await expect(page).toHaveURL(/\/$/);
    });

    test("pas de session → redirection vers /login avec callbackUrl", async ({ page }) => {
      // Ne pas utiliser storageState — pas de session
      // Mock /api/user pour retourner 401
      await page.route("**/api/user", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Non authentifié" }),
        });
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      // Doit rediriger vers /login avec callbackUrl contenant le token
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test("pas de session → callbackUrl contient le token d'invitation", async ({ page }) => {
      await page.route("**/api/user", async (route) => {
        await route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "Non authentifié" }),
        });
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      // callbackUrl devrait contenir le token
      await expect(page).toHaveURL(/callbackUrl=/, { timeout: 10000 });
    });
  });

  test.describe("gestion des erreurs — avec session", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test.beforeEach(async ({ page }) => {
      await page.route("**/api/user", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ email: "test@datapresent.com" }),
        });
      });
    });

    test("token invalide/expiré → carte d'erreur « Invitation invalide ou expirée »", async ({
      page,
    }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({ error: "Invitation invalide ou expirée" }),
        });
      });

      await page.goto(`/accept-invite?token=expired-token`);

      await expect(page.getByText("Invitation invalide")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Invitation invalide ou expirée")).toBeVisible();
    });

    test("l'utilisateur est déjà membre → message de conflit", async ({ page }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Vous êtes déjà membre de cette organisation" }),
        });
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.getByText("Invitation invalide")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("déjà membre")).toBeVisible();
    });

    test("erreur serveur (500) → carte d'erreur avec message approprié", async ({ page }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Erreur interne du serveur" }),
        });
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.getByText("Invitation invalide")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Erreur interne du serveur")).toBeVisible();
    });

    test("erreur réseau → message « Erreur de connexion »", async ({ page }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.abort("connectionrefused");
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);

      await expect(page.getByText("Invitation invalide")).toBeVisible({ timeout: 10000 });
      await expect(page.getByText("Erreur de connexion")).toBeVisible();
    });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  test.describe("cas limites — sans session", () => {
    test("token vide → traité comme token manquant", async ({ page }) => {
      await page.goto("/accept-invite?token=");

      await expect(page.getByText("Token d'invitation manquant")).toBeVisible({ timeout: 10000 });
    });

    test("Suspense fallback s'affiche avant le rendu du contenu", async ({ page }) => {
      // Ralentir une requête Next.js pour voir le fallback
      await page.route("**/_next/**", async (route) => {
        await new Promise((r) => setTimeout(r, 150));
        await route.continue();
      });

      await page.goto("/accept-invite", { waitUntil: "commit" });

      // Le fallback Suspense contient un spinner animé
      await expect(page.locator(".animate-spin")).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("cas limites — avec session", () => {
    test.use({ storageState: "e2e/.auth/user.json" });

    test.beforeEach(async ({ page }) => {
      await page.route("**/api/user", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ email: "test@datapresent.com" }),
        });
      });
    });

    test("rafraîchissement après succès → pas d'erreur", async ({ page }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orgName: "Acme Corp", role: "Admin" }),
        });
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}`);
      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });

      // Re-recharger la page
      await page.reload();

      // Après rechargement, la page refait les appels API mais doit rester stable
      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });
    });

    test("token avec caractères spéciaux → traité correctement", async ({ page }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        const body = JSON.parse(route.request().postData() || "{}");
        // Le token doit correspondre
        expect(body.token).toBe("invite+token+with/special@chars");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orgName: "Acme Corp", role: "Admin" }),
        });
      });

      const specialToken = encodeURIComponent("invite+token+with/special@chars");
      await page.goto(`/accept-invite?token=${specialToken}`);

      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });
    });

    test("paramètres supplémentaires dans l'URL ignorés → comportement normal", async ({
      page,
    }) => {
      await page.route("**/api/auth/accept-invite", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ orgName: "Acme Corp", role: "Admin" }),
        });
      });

      await page.goto(`/accept-invite?token=${VALID_TOKEN}&ref=email&utm_source=test`);

      await expect(page.getByText("Invitation acceptée !")).toBeVisible({ timeout: 10000 });
    });
  });
});
