import { expect, test } from "@playwright/test";

/**
 * Tests du plan gratuit — nécessite un utilisateur authentifié.
 * Prérequis : l'utilisateur de test E2E doit être sur le plan FREE
 * (pas d'abonnement Stripe actif) pour que les limites s'appliquent.
 */
test.describe("Plan Gratuit — limites et comportement", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("le tableau de bord affiche la carte d'utilisation/limites", async ({ page }) => {
    await page.goto("/");
    // The UsageCard component shows quotas and limits
    await expect(page.getByText(/rapport|utilisation|limite|report|usage|limit/i)).toBeVisible();
  });

  test("la page des rapports (/reports) est accessible", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole("heading", { name: /rapports|reports/i })).toBeVisible();
  });

  test("le menu de navigation latérale est visible", async ({ page }) => {
    await page.goto("/");
    // Dashboard navigation should be present
    await expect(page.getByRole("link", { name: /nouveau|new/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /rapports|reports/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /paramètres|settings/i }).first()).toBeVisible();
  });

  test("la page /settings/billing affiche les informations du plan actuel", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.getByRole("heading", { name: /abonnement|billing/i })).toBeVisible();
  });

  test("le plan FREE est indiqué comme plan actuel sur la page billing", async ({ page }) => {
    await page.goto("/settings/billing");
    // The PlanSelector should show FREE as current plan
    await expect(page.getByText(/gratuit|free/i)).toBeVisible();
  });

  test("la section 'Plan actuel' ou les informations d'abonnement sont visibles", async ({
    page,
  }) => {
    await page.goto("/settings/billing");
    // Look for plan info text (if subscription block is rendered)
    const planInfo = page.locator("text=Plan actuel").or(page.locator("text=Current plan"));
    const planSection = page.locator('p:has-text("Gratuit"), p:has-text("Free")').first();
    await expect(planSection.or(planInfo).first()).toBeVisible();
  });

  test("les limites du plan gratuit sont visibles dans l'interface", async ({ page }) => {
    await page.goto("/settings/billing");
    // The PlanSelector renders feature comparison for the current plan
    // Check that key Free limits appear in the feature list
    await expect(page.getByText(/3.*rapport|3.*report/i)).toBeVisible();
  });

  test("l'entête du tableau de bord ne redirige pas vers la connexion", async ({ page }) => {
    await page.goto("/");
    await expect(page).not.toHaveURL(/login/);
    await expect(page.locator("header, nav").first()).toBeVisible();
  });
});
