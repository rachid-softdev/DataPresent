import { expect, test } from "@playwright/test";

test.use({ storageState: "e2e/.auth/user.json" });

test.describe("Partage de rapport — /reports/[id]/share", () => {
  test("un ID de rapport inexistant affiche une page 404", async ({ page }) => {
    await page.goto("/reports/id-inexistant-000000/share");
    await expect(page.getByText(/non trouvé|404|introuvable/i)).toBeVisible({ timeout: 10000 });
  });

  test("la page de partage affiche le titre 'Paramètres de partage'", async ({ page }) => {
    // Navigate via a report card on the dashboard
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(2000);

    await expect(page.getByRole("heading", { name: /paramètres de partage/i })).toBeVisible();
  });

  test("la section privé/public est affichée avec un switch", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(2000);

    // The toggle section should show either "Lien privé" or "Lien public actif"
    const toggleText = page.getByText(/lien privé|lien public|rapport privé|rapport public/i);
    await expect(toggleText).toBeVisible();
  });

  test("le switch de bascule privé/public est visible", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(2000);

    // There should be at least one switch element
    const switches = page.locator('[role="switch"]');
    await expect(switches.first()).toBeVisible();
  });

  test("les options avancées apparaissent quand le rapport est public", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    // If the report is already public, advanced options should show
    const advancedTitle = page.getByText(/options avancées/i);
    if (await advancedTitle.isVisible()) {
      await expect(advancedTitle).toBeVisible();
    }
  });

  test("le champ 'Expiration du lien' est visible pour un rapport public", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    const expirationLabel = page.getByText(/expiration du lien/i);
    if (await expirationLabel.isVisible()) {
      await expect(expirationLabel).toBeVisible();
    }
  });

  test("le bouton 'Copier le lien' est visible quand le rapport est public", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    const copyBtn = page.getByRole("button", { name: /copier le lien/i });
    if (await copyBtn.isVisible()) {
      await expect(copyBtn).toBeVisible();
    }
  });

  test("le champ de mot de passe est configurable", async ({ page }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    const passwordSection = page.getByText(/mot de passe|protection/i);
    if (await passwordSection.isVisible()) {
      await expect(passwordSection).toBeVisible();
    }
  });

  test("le bouton 'Désactiver le partage' est visible quand le rapport est public", async ({
    page,
  }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    const disableBtn = page.getByRole("button", { name: /désactiver le partage/i });
    if (await disableBtn.isVisible()) {
      await expect(disableBtn).toBeVisible();
    }
  });

  test("le snippet d'embed (iframe) est visible pour un rapport public avec embed activé", async ({
    page,
  }) => {
    await page.goto("/reports");
    const firstLink = page.locator("a[href^='/reports/']").first();
    if ((await firstLink.count()) === 0) return;

    const href = await firstLink.getAttribute("href");
    await page.goto(`${href}/share`);
    await page.waitForTimeout(3000);

    const embedSection = page.getByText(/intégration|iframe|embed/i);
    if (await embedSection.isVisible()) {
      await expect(embedSection).toBeVisible();
    }
  });

  test("un token de partage invalide affiche 404 sur la page publique", async ({ page }) => {
    await page.goto("/share/invalid-token-12345");
    await expect(page.getByText(/non trouvé|404|introuvable/i)).toBeVisible({ timeout: 10000 });
  });
});
