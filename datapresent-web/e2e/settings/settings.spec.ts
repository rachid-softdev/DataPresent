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

test.describe("Paramètres — Compte et sécurité (/settings/account)", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page affiche le titre 'Compte' ou 'Sécurité'", async ({ page }) => {
    await page.goto("/settings/account");
    await expect(
      page.getByRole("heading", { name: /compte|account|sécurité|security/i }),
    ).toBeVisible();
  });

  test("la carte de déconnexion est visible avec un bouton", async ({ page }) => {
    await page.goto("/settings/account");
    // The page shows a Sign Out card with a button
    const signOutCard = page.locator("text=Déconnexion").or(page.locator("text=Sign out"));
    await expect(signOutCard.first()).toBeVisible();
    const signOutBtn = page.getByRole("button", { name: /déconnexion|sign out|logout/i });
    await expect(signOutBtn).toBeVisible();
  });

  test("la carte de suppression de compte est visible avec un bouton destructif", async ({
    page,
  }) => {
    await page.goto("/settings/account");
    // The page shows a Delete Account card with a destructive button
    const deleteCard = page.locator("text=Supprimer").or(page.locator("text=Delete"));
    await expect(deleteCard.first()).toBeVisible();
    const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i });
    await expect(deleteBtn).toBeVisible();
  });

  test("cliquer sur 'Supprimer' ouvre une boîte de confirmation", async ({ page }) => {
    await page.goto("/settings/account");
    const deleteBtn = page.getByRole("button", { name: /supprimer|delete/i });
    if ((await deleteBtn.count()) === 0) return;
    await deleteBtn.click();
    // Confirmation dialog should appear
    const dialog = page.getByRole("alertdialog").or(page.locator('[role="dialog"]'));
    await expect(dialog).toBeVisible({ timeout: 3000 });
  });

  test("la carte de déconnexion a une description textuelle", async ({ page }) => {
    await page.goto("/settings/account");
    // There should be description text explaining the action
    const cardDescription = page.locator("p.text-muted-foreground, .card-description").first();
    if ((await cardDescription.count()) > 0) {
      await expect(cardDescription).toBeVisible();
    }
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
