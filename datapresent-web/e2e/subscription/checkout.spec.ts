import { expect, test } from "@playwright/test";

/**
 * Tests du checkout et abonnement — nécessite un utilisateur authentifié.
 *
 * Prérequis :
 * - L'utilisateur de test E2E doit exister dans la base de données
 * - Aucun abonnement Stripe réel requis — on teste l'UI et la navigation
 * - Stripe test mode doit être configuré dans les variables d'environnement
 *
 * Note : Les tests de checkout Stripe réels nécessitent des cartes de test
 * spéficiques et ne peuvent pas être automatisés sans configuration spéciale.
 * Ces tests vérifient l'interface de gestion d'abonnement.
 */
test.describe("Checkout et abonnement", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page /settings/billing charge avec le titre", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(
      page.getByRole("heading", { name: /abonnement|billing|subscription/i }),
    ).toBeVisible();
  });

  test("les 4 options de plan sont affichées sur la page billing", async ({ page }) => {
    await page.goto("/settings/billing");
    await expect(page.getByText(/gratuit|free/i)).toBeVisible();
    await expect(page.getByText("Pro")).toBeVisible();
    await expect(page.getByText("Team")).toBeVisible();
    await expect(page.getByText(/agency|agence/i)).toBeVisible();
  });

  test("chaque plan a un bouton CTA (Souscrire, Plan actuel, Contacter)", async ({ page }) => {
    await page.goto("/settings/billing");

    // At least one "Souscrire" CTA should be visible for upgrade options
    const ctaButtons = page
      .locator("button, a")
      .filter({ hasText: /souscrire|subscribe|contacter|contact/i });
    await expect(ctaButtons.first()).toBeVisible();
  });

  test("la section d'information du plan actuel est visible si abonnement existant", async ({
    page,
  }) => {
    await page.goto("/settings/billing");
    // Check for plan status info (current plan, subscription status)
    const planLabel = page.locator("text=/plan:|status:|statut:/i").first();
    // If the user has a subscription, this section renders
    // If not, the PlanSelector renders with "Plan actuel" on FREE
    await expect(
      page
        .getByText(/plan actuel|current plan/i)
        .or(planLabel)
        .first(),
    ).toBeVisible();
  });

  test("le sélecteur de plan affiche les fonctionnalités pour chaque plan", async ({ page }) => {
    await page.goto("/settings/billing");
    // The PlanSelector component renders feature cards
    const featureElements = page.locator("text=/rapport|report|slide|export|watermark/i");
    await expect(featureElements.first()).toBeVisible();
  });

  test("les prix sont affichés pour chaque plan (hors Agency sur devis)", async ({ page }) => {
    await page.goto("/settings/billing");
    // Price elements should be visible
    await expect(page.getByText(/€/).first()).toBeVisible();
  });

  test("la navigation latérale des paramètres met l'abonnement en surbrillance", async ({
    page,
  }) => {
    await page.goto("/settings/billing");
    // The settings sidebar nav link for billing should be active
    const billingLink = page.locator("aside nav a").filter({ hasText: /abonnement|billing/i });
    await expect(billingLink).toHaveClass(/active/);
  });

  test("le chargement du sélecteur de plan est correct (pas d'erreur JS)", async ({ page }) => {
    // Navigate and check no console errors
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));

    await page.goto("/settings/billing");
    await page.waitForLoadState("networkidle");

    expect(errors.length).toBe(0);
  });
});
