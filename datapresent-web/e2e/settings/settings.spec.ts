import { test, expect } from "@playwright/test";

/**
 * Tests des pages de paramètres — nécessite un utilisateur authentifié.
 *
 * Prérequis :
 * - L'utilisateur de test E2E doit exister et être connecté
 * - L'utilisateur doit appartenir à une organisation
 * - Le fichier e2e/.auth/user.json doit être valide
 */
test.describe("Paramètres — Navigation latérale", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la navigation latérale affiche les 6 liens de paramètres", async ({ page }) => {
    await page.goto("/settings/profile");

    const sidebar = page.locator("aside.app-sidebar nav");
    const links = sidebar.locator("a");
    await expect(links).toHaveCount(6);

    await expect(sidebar.getByRole("link", { name: /mon compte|profile/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /organisation/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /équipe|team/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /abonnement|billing/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /api keys/i })).toBeVisible();
    await expect(sidebar.getByRole("link", { name: /sécurité|security|account/i })).toBeVisible();
  });

  test("le lien actif dans la sidebar a la classe 'active'", async ({ page }) => {
    await page.goto("/settings/profile");
    const monCompteLink = page.locator("aside nav a").filter({ hasText: /mon compte/i });
    await expect(monCompteLink).toHaveClass(/active/);

    await page.goto("/settings/organization");
    const orgLink = page.locator("aside nav a").filter({ hasText: /organisation/i });
    await expect(orgLink).toHaveClass(/active/);
  });
});

test.describe("Paramètres — Mon compte (/settings/profile)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page affiche le formulaire avec les champs nom et email", async ({ page }) => {
    await page.goto("/settings/profile");
    await expect(page.getByRole("heading", { name: /mon compte|profile/i })).toBeVisible();

    // Email field should be visible (may be disabled/read-only)
    const emailField = page.getByLabel(/email/i);
    await expect(emailField).toBeVisible();

    // Name field should be visible
    const nameField = page.getByLabel(/nom|name/i);
    await expect(nameField).toBeVisible();
  });

  test("le bouton de sauvegarde est visible sur la page profil", async ({ page }) => {
    await page.goto("/settings/profile");
    await expect(page.getByRole("button", { name: /sauvegarder|save|enregistrer/i })).toBeVisible();
  });
});

test.describe("Paramètres — Organisation (/settings/organization)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page affiche le formulaire avec le nom d'organisation", async ({ page }) => {
    await page.goto("/settings/organization");
    await expect(page.getByRole("heading", { name: /organisation|organization/i })).toBeVisible();

    // Organization name field
    const orgNameField = page.getByLabel(/nom.*organisation|organization.*name|org/i);
    await expect(orgNameField).toBeVisible();
  });

  test("le bouton de sauvegarde est visible", async ({ page }) => {
    await page.goto("/settings/organization");
    const saveBtn = page.getByRole("button", { name: /sauvegarder|save|enregistrer/i });
    await expect(saveBtn).toBeVisible();
  });
});

test.describe("Paramètres — Équipe (/settings/team)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page affiche la liste des membres", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page.getByRole("heading", { name: /équipe|team/i })).toBeVisible();

    // Member list should be visible (at least the current user)
    // The team page renders a list of members with avatars
    await expect(page.locator("text=/e2e-test|E2E Test/i").first()).toBeVisible();
  });

  test("le bouton d'invitation est visible", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page.getByRole("button", { name: /inviter|invite/i }).first()).toBeVisible();
  });
});

test.describe("Paramètres — Sécurité (/settings/account)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page affiche le formulaire de changement de mot de passe", async ({ page }) => {
    await page.goto("/settings/account");
    await expect(page.getByRole("heading", { name: /sécurité|security|account/i })).toBeVisible();

    // Password fields should be visible
    const passwordFields = page.getByLabel(/mot de passe|password/i);
    await expect(passwordFields.first()).toBeVisible();
  });

  test("le formulaire de mot de passe a au moins un champ", async ({ page }) => {
    await page.goto("/settings/account");
    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput.first()).toBeVisible();
  });

  test("le bouton de mise à jour du mot de passe est visible", async ({ page }) => {
    await page.goto("/settings/account");
    const updateBtn = page.getByRole("button", {
      name: /mettre.*jour|update|modifier|sauvegarder|save/i,
    });
    await expect(updateBtn).toBeVisible();
  });
});

test.describe("Paramètres — API Keys (/settings/api-keys)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page affiche la section de gestion des clés API", async ({ page }) => {
    await page.goto("/settings/api-keys");
    await expect(page.getByRole("heading", { name: /api keys|api/i })).toBeVisible();
  });

  test("le bouton de création de clé API est visible", async ({ page }) => {
    await page.goto("/settings/api-keys");
    await expect(
      page.getByRole("button", { name: /créer|create|nouvelle|new/i }).first(),
    ).toBeVisible();
  });

  test("la page affiche un tableau ou une liste des clés API", async ({ page }) => {
    await page.goto("/settings/api-keys");
    // Either a table, list, or empty state
    const keyList = page.locator("table, ul, [role='table'], [role='list']").first();
    await expect(keyList).toBeVisible();
  });
});
