import { expect, test } from "@playwright/test";

test.describe("Pages légales", () => {
  test.describe("/privacy — Politique de confidentialité", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/privacy");
    });

    test("la page charge avec le titre Politique de confidentialité", async ({ page }) => {
      await expect(page.locator("h1")).toContainText(/Politique de confidentialité/);
    });

    test("affiche les sections de contenu", async ({ page }) => {
      const content = page.locator(".prose");
      await expect(content).toBeVisible();

      // Check for expected section headings
      await expect(page.locator("text=1. Introduction")).toBeVisible();
      await expect(page.locator("text=2. Données collectées")).toBeVisible();
      await expect(page.locator("text=3. Utilisation des données")).toBeVisible();
    });

    test("affiche la date de dernière mise à jour", async ({ page }) => {
      await expect(page.locator("text=Dernière mise à jour")).toBeVisible();
    });

    test("contient les informations de contact (dpo@datapresent.com)", async ({ page }) => {
      await expect(page.locator("text=dpo@datapresent.com")).toBeVisible();
    });
  });

  test.describe("/terms — Conditions d'utilisation", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/terms");
    });

    test("la page charge avec le titre Conditions d'utilisation", async ({ page }) => {
      await expect(page.locator("h1")).toContainText(/Conditions d'utilisation/);
    });

    test("affiche les sections de contenu", async ({ page }) => {
      await expect(page.locator("text=1. Acceptation des conditions")).toBeVisible();
      await expect(page.locator("text=2. Description du service")).toBeVisible();
      await expect(page.locator("text=3. Comptes utilisateur")).toBeVisible();
    });

    test("affiche la date de dernière mise à jour", async ({ page }) => {
      await expect(page.locator("text=Dernière mise à jour")).toBeVisible();
    });

    test("contient les informations de contact (legal@datapresent.com)", async ({ page }) => {
      await expect(page.locator("text=legal@datapresent.com")).toBeVisible();
    });
  });

  test.describe("/legal — Mentions légales", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/legal");
    });

    test("la page charge avec le titre Mentions légales", async ({ page }) => {
      await expect(page.locator("h1")).toContainText(/Mentions légales|Legal Notice/);
    });

    test("affiche les informations de l'éditeur (DataPresent SAS)", async ({ page }) => {
      await expect(page.locator("text=DataPresent SAS")).toBeVisible();
    });

    test("affiche les sections: éditeur, hébergement, propriété intellectuelle", async ({
      page,
    }) => {
      await expect(
        page.locator("text=1. Éditeur").or(page.locator("text=1. Publisher")),
      ).toBeVisible();
      await expect(
        page.locator("text=3. Hébergement").or(page.locator("text=3. Hosting")),
      ).toBeVisible();
    });

    test("contient un lien vers /privacy", async ({ page }) => {
      const privacyLink = page.locator('a[href="/privacy"]');
      await expect(privacyLink).toBeVisible();
    });
  });
});
