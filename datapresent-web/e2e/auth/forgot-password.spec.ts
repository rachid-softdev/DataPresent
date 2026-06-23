import { test, expect } from "@playwright/test";

test.describe("Mot de passe oublié — /forgot-password", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
  });

  // ─── Success cases ─────────────────────────────────────────────────

  test("la page charge avec le titre « Mot de passe oublié ? »", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Mot de passe oublié/i);
  });

  test("affiche le champ email avec type=email et l'attribut required", async ({ page }) => {
    const emailInput = page.getByPlaceholder(/vous@exemple/);
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("required", "");
  });

  test("le bouton de soumission est désactivé quand l'email est vide", async ({ page }) => {
    const submitBtn = page.getByRole("button", { name: /envoyer le lien/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("email valide → soumission → état succès avec icône CheckCircle et message", async ({
    page,
  }) => {
    // Mock la réponse API succès
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user@example.com");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    // Vérifie l'état succès
    await expect(page.locator(".text-green-500")).toBeVisible(); // CheckCircle icon
    await expect(page.getByText(/recevrez un lien de réinitialisation/)).toBeVisible({
      timeout: 10000,
    });
  });

  test("état succès → le lien « Retour à la connexion » navigue vers /login", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user@example.com");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });

    await page.getByRole("link", { name: /retour à la connexion/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("affiche l'état chargement avec spinner et texte « Envoi en cours... »", async ({
    page,
  }) => {
    // Ne pas résoudre la requête immédiatement pour observer le loading
    let resolveRoute: (value: unknown) => void;
    const routePromise = new Promise((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/api/auth/forgot-password", async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user@example.com");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    // Vérifie le spinner et le texte de chargement
    await expect(page.locator(".animate-spin")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Envoi en cours/)).toBeVisible();

    // Libère la requête
    resolveRoute!(undefined);

    // Vérifie que le succès s'affiche après résolution
    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });
  });

  test("soumission via la touche Entrée", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user@example.com");
    await page.getByPlaceholder(/vous@exemple/).press("Enter");

    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });
  });

  test("le lien « Retour à la connexion » en bas du formulaire navigue vers /login", async ({
    page,
  }) => {
    // Il y a deux liens « Retour à la connexion » : un visible uniquement après succès,
    // l'autre toujours visible en bas du formulaire
    const backLink = page
      .locator("a")
      .filter({ hasText: /retour à la connexion/i })
      .last();
    await expect(backLink).toBeVisible();
    await backLink.click();
    await expect(page).toHaveURL(/\/login/);
  });

  // ─── Error / Failure cases ─────────────────────────────────────────

  test("email invalide → la validation navigateur empêche la soumission", async ({ page }) => {
    const emailInput = page.getByPlaceholder(/vous@exemple/);
    await emailInput.fill("pas-un-email");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    // La validation HTML5 type=email empêche la soumission
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveValue("pas-un-email");
  });

  test("erreur API → message d'erreur affiché dans une alerte", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "Email non trouvé" }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("unknown@example.com");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    await expect(page.getByText("Email non trouvé")).toBeVisible({ timeout: 10000 });
  });

  test("erreur réseau → message « Erreur de connexion » affiché", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.abort("connectionrefused");
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user@example.com");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    await expect(page.getByText("Erreur de connexion")).toBeVisible({ timeout: 10000 });
  });

  test("erreur réseau toast → sonner toast affiché", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.abort("connectionrefused");
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user@example.com");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    // sonner toast est un element HTML [data-sonner-toast]
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({ timeout: 10000 });
  });

  // ─── Edge cases ────────────────────────────────────────────────────

  test("email avec espaces au début et à la fin → soumission réussie", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      // Vérifie que l'email est trim avant l'envoi
      const body = JSON.parse(route.request().postData() || "{}");
      expect(body.email).toBe("user@example.com");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("  user@example.com  ");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });
  });

  test("email très long (>254 caractères) → gestion sans plantage", async ({ page }) => {
    const longLocalPart = "a".repeat(240);
    const longEmail = `${longLocalPart}@ex.com`;

    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill(longEmail);

    // Le bouton doit être activé car l'email n'est pas vide
    const submitBtn = page.getByRole("button", { name: /envoyer le lien/i });
    await expect(submitBtn).not.toBeDisabled();
    await submitBtn.click();

    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });
  });

  test("injection XSS dans le champ email → pas d'exécution", async ({ page }) => {
    const xssPayload = "<script>alert('xss')</script>";

    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill(xssPayload);
    const submitBtn = page.getByRole("button", { name: /envoyer le lien/i });

    // Le bouton doit être activé car le champ n'est pas vide (trim ne supprime pas <script>)
    await expect(submitBtn).not.toBeDisabled();

    // Vérifie que le XSS n'apparaît pas dans le DOM exécuté
    const dialogHandler = (dialog: { type: () => string; dismiss: () => void }) => {
      throw new Error("Dialog déclenché par XSS — script exécuté !");
    };
    page.on("dialog", dialogHandler);

    await submitBtn.click();

    // Attendre que la requête aboutisse
    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });

    // Enlever le listener après test
    page.off("dialog", dialogHandler);
  });

  test("double-clic rapide sur le bouton submit → une seule requête envoyée", async ({ page }) => {
    let requestCount = 0;

    await page.route("**/api/auth/forgot-password", async (route) => {
      requestCount++;
      // Ne pas résoudre tout de suite pour que les deux clics comptent
      await new Promise((r) => setTimeout(r, 200));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user@example.com");
    const submitBtn = page.getByRole("button", { name: /envoyer le lien/i });

    // Double-clic rapide
    await submitBtn.click();
    await submitBtn.click();

    // Attendre que la requête soit traitée
    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });

    // Une seule requête doit avoir été envoyée (le bouton est disabled pendant le loading)
    expect(requestCount).toBe(1);
  });

  test("email avec des caractères spéciaux (ex: +) → accepté", async ({ page }) => {
    await page.route("**/api/auth/forgot-password", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.getByPlaceholder(/vous@exemple/).fill("user+tag@example.com");
    await page.getByRole("button", { name: /envoyer le lien/i }).click();

    await expect(page.getByText(/recevrez un lien/)).toBeVisible({ timeout: 10000 });
  });
});
