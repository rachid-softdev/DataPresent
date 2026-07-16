import { expect, test } from "@playwright/test";

/**
 * Tests des fonctionnalités d'équipe — nécessite un utilisateur authentifié.
 *
 * Prérequis :
 * - L'utilisateur de test E2E doit exister et appartenir à une organisation
 * - L'organisation doit avoir au moins un membre (le test user)
 * - Le fichier e2e/.auth/user.json doit être valide
 */
test.describe("Équipe — /settings/team", () => {
  test.use({ storageState: "e2e/.auth/user.json" });

  test("la page /settings/team charge avec le titre", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page.getByRole("heading", { name: /équipe|team/i })).toBeVisible();
  });

  test("la liste des membres est visible", async ({ page }) => {
    await page.goto("/settings/team");

    // The member list should render at least one member (the current user)
    // Members are rendered with their avatar/initials, name and email
    const memberList = page
      .locator("ul, div")
      .filter({ has: page.locator("text=/e2e-test|E2E Test/i") });
    await expect(memberList.first()).toBeVisible();
  });

  test("les rôles sont affichés pour chaque membre", async ({ page }) => {
    await page.goto("/settings/team");

    // Roles: Propriétaire, Admin, Membre
    const roleLabels = page.locator("text=/propriétaire|owner|admin|membre|member/i");
    await expect(roleLabels.first()).toBeVisible();
  });

  test("le rôle de l'utilisateur actuel est affiché", async ({ page }) => {
    await page.goto("/settings/team");

    // The current user should have a role badge
    const badges = page.locator("text=/propriétaire|owner|admin|membre|member/i");
    await expect(badges.first()).toBeVisible();
  });

  test("le bouton 'Inviter un membre' est visible", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page.getByRole("button", { name: /inviter|invite/i })).toBeVisible();
  });

  test("le sidebar de navigation paramètres est présent", async ({ page }) => {
    await page.goto("/settings/team");
    await expect(page.locator("aside.app-sidebar")).toBeVisible();
  });

  test("le lien Équipe est actif dans la sidebar", async ({ page }) => {
    await page.goto("/settings/team");
    const teamLink = page.locator("aside nav a").filter({ hasText: /équipe|team/i });
    await expect(teamLink).toHaveClass(/active/);
  });

  test("le formulaire d'invitation peut être affiché en cliquant sur Inviter", async ({ page }) => {
    await page.goto("/settings/team");

    // Click the invite button to show the invite form
    const inviteBtn = page.getByRole("button", { name: /inviter|invite/i }).first();
    await inviteBtn.click();

    // The invite form should have an email input
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test("les avatars ou initiales des membres sont affichés", async ({ page }) => {
    await page.goto("/settings/team");
    // Member avatars are rendered - either as img or div with initials
    const avatars = page.locator('[class*="avatar"], img[alt*="avatar"], img[alt*="photo"]');
    // There could also be a div with initials
    const initials = page.locator("text=/^[A-Z]{1,2}$/");
    const hasAvatars = (await avatars.count()) > 0;
    const hasInitials = (await initials.count()) > 0;
    expect(hasAvatars || hasInitials).toBe(true);
  });
});
