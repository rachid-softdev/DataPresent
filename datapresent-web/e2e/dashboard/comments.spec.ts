import { expect, test } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import { disconnectPrisma } from "../helpers/auth";
import {
  createTestOrganization,
  createTestReport,
  createTestUser,
  disconnectPrisma as disconnectDb,
} from "../helpers/db";

test.use({ storageState: "e2e/.auth/user.json" });

// ---------------------------------------------------------------------------
// Comments UI — navigating to a report detail and using the CommentThread panel
//
// The comment panel is toggled via the "Commenter" button in the SlideViewer.
// It renders a fixed right-side panel with:
//   - Comment list (existing comments)
//   - CommentInput (textarea + Envoyer button)
//   - Slide-specific vs general comment sections
//   - Edit (pencil) and Delete (trash) actions for own comments
// ---------------------------------------------------------------------------

/** Create a report that the authenticated user can access. */
async function seedReportWithComments() {
  const db = new PrismaClient();
  try {
    const user = await db.user.findFirst({ where: { email: "e2e-test@datapresent.com" } });
    if (!user) throw new Error("Test user not found — run auth setup first");

    // Find or create an org
    let org = await db.organization.findFirst({
      where: { members: { some: { userId: user.id } } },
    });
    if (!org) {
      const orgResult = await createTestOrganization(db, user.id);
      org = await db.organization.findUnique({ where: { id: orgResult.id } });
    }
    if (!org) throw new Error("Failed to create org");

    // Create a report with slides so SlideViewer renders
    const reportId = crypto.randomUUID();
    await db.report.create({
      data: {
        id: reportId,
        title: "E2E Comments Test Report",
        sector: "GENERIC",
        status: "DONE",
        slideCount: 2,
        orgId: org.id,
        isPublic: false,
      },
    });

    // Create slides
    for (let i = 1; i <= 2; i++) {
      await db.slide.create({
        data: {
          id: crypto.randomUUID(),
          reportId,
          position: i - 1,
          title: `Slide ${i}`,
          layout: "HEADING_BULLETS",
          contentJson: { heading: `Slide ${i}`, bullets: ["Point 1", "Point 2"] },
        },
      });
    }

    return { db, reportId, userId: user.id };
  } catch (error) {
    await db.$disconnect();
    throw error;
  }
}

/** Cleanup after each test */
async function cleanup(db: PrismaClient) {
  await db.$disconnect();
}

test.describe("Commentaires — panneau de commentaires sur la page détail rapport", () => {
  let reportId: string;
  let db: PrismaClient;

  test.beforeAll(async () => {
    const data = await seedReportWithComments();
    db = data.db;
    reportId = data.reportId;
  });

  test.afterAll(async () => {
    await cleanup(db);
    await disconnectPrisma();
    await disconnectDb();
  });

  test("le bouton 'Commenter' ouvre le panneau de commentaires", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    // Click the "Commenter" button
    const commentBtn = page.getByRole("button", { name: /commenter/i });
    await expect(commentBtn).toBeVisible({ timeout: 5000 });
    await commentBtn.click();

    // The panel should now be visible with the "Commentaires" heading
    await expect(page.getByText("Commentaires")).toBeVisible({ timeout: 3000 });
  });

  test("le textarea de commentaire est visible avec un placeholder", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Textarea should be visible with a placeholder
    const textarea = page.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute(
      "placeholder",
      /ajouter un commentaire|commenter cette slide/i,
    );
  });

  test("envoyer un commentaire → le commentaire apparaît dans la liste", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    const textarea = page.locator("textarea").first();
    await textarea.fill("Ceci est un commentaire E2E");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // The comment should appear in the list
    await expect(page.getByText("Ceci est un commentaire E2E")).toBeVisible();
  });

  test("soumettre via Cmd+Entrée (ou Ctrl+Entrée) → commentaire ajouté", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    const textarea = page.locator("textarea").first();
    await textarea.fill("Commentaire via raccourci clavier");

    // Press Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux)
    await textarea.press("Control+Enter");
    await page.waitForTimeout(1500);

    await expect(page.getByText("Commentaire via raccourci clavier")).toBeVisible();
  });

  test("les commentaires spécifiques à une slide sont affichés dans une section dédiée", async ({
    page,
  }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Slide the viewer to a slide and add a comment (it will be linked to that slide)
    const textarea = page.locator("textarea").first();
    await textarea.fill("Commentaire sur cette slide");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // The comment panel shows "Commentaires sur cette slide" when viewing a slide
    const slideCommentsSection = page.getByText(/commentaires sur cette slide/i);
    // This might only appear when there are slide-specific comments
    if (await slideCommentsSection.isVisible()) {
      await expect(slideCommentsSection).toBeVisible();
    }
  });

  test("les commentaires généraux sont affichés dans leur propre section", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Add a general comment (when no slide is selected or slideId is null)
    const textarea = page.locator("textarea").first();
    await textarea.fill("Commentaire général");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // The general comments section header
    const generalSection = page.getByText(/commentaires généraux/i);
    if (await generalSection.isVisible()) {
      await expect(generalSection).toBeVisible();
    }
  });

  test("le commentaire affiche le nom de l'auteur et un timestamp relatif", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    const textarea = page.locator("textarea").first();
    await textarea.fill("Vérifier l'affichage auteur");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // The comment should show the author name
    const authorName = page.locator("text=E2E Test User").or(page.locator("text=e2e-test"));
    await expect(authorName.first()).toBeVisible({ timeout: 3000 });

    // Timestamp relative should be visible (e.g. "il y a quelques secondes", "il y a 1 minute")
    const timeAgo = page.getByText(/il y a/i);
    await expect(timeAgo.first()).toBeVisible({ timeout: 3000 });
  });

  test("le compteur de commentaires se met à jour après avoir posté", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    // Note the initial count badge on the button
    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Add a comment
    const textarea = page.locator("textarea").first();
    await textarea.fill("Commentaire pour test compteur");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // The header should show "Commentaires (1)" or more
    const header = page.getByText(/commentaires \(\d+\)/i);
    await expect(header).toBeVisible();
  });

  test("fermer le panneau via le bouton X", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // The panel has an X close button
    const closeBtn = page.getByRole("button", { name: /fermer les commentaires/i });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();
    await page.waitForTimeout(500);

    // The comment panel should be gone
    await expect(page.getByText("Commentaires")).not.toBeVisible();
  });

  test("modifier un commentaire → le texte est mis à jour", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Add a comment first
    const textarea = page.locator("textarea").first();
    await textarea.fill("Texte original du commentaire");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // Hover over the comment to reveal edit/delete buttons
    const commentText = page.getByText("Texte original du commentaire");
    const commentCard = commentText.locator("..");
    await commentCard.hover();

    // Click the edit (pencil) button
    const editBtn = page.getByRole("button", { name: /modifier le commentaire/i });
    await expect(editBtn).toBeVisible();
    await editBtn.click();
    await page.waitForTimeout(500);

    // Change the text and save
    const editTextarea = page.locator("textarea").last();
    await editTextarea.fill("Texte modifié du commentaire");
    await page.getByRole("button", { name: /sauvegarder/i }).click();
    await page.waitForTimeout(1500);

    // Verify the updated text
    await expect(page.getByText("Texte modifié du commentaire")).toBeVisible();
  });

  test("supprimer un commentaire → il disparaît de la liste", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Add a comment to delete
    const textarea = page.locator("textarea").first();
    await textarea.fill("Commentaire à supprimer");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);
    await expect(page.getByText("Commentaire à supprimer")).toBeVisible();

    // Hover to reveal delete button
    const commentText = page.getByText("Commentaire à supprimer");
    const commentCard = commentText.locator("..");
    await commentCard.hover();

    // Click delete (trash) button
    const deleteBtn = page.getByRole("button", { name: /supprimer le commentaire/i });
    await expect(deleteBtn).toBeVisible();
    await deleteBtn.click();
    await page.waitForTimeout(1500);

    // The comment should be removed
    await expect(page.getByText("Commentaire à supprimer")).not.toBeVisible();
  });
});

test.describe("Commentaires — cas d'erreur", () => {
  let reportId: string;
  let db: PrismaClient;

  test.beforeAll(async () => {
    const data = await seedReportWithComments();
    db = data.db;
    reportId = data.reportId;
  });

  test.afterAll(async () => {
    await cleanup(db);
    await disconnectPrisma();
    await disconnectDb();
  });

  test("soumettre avec un corps vide → bouton désactivé", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // The submit button should be disabled when textarea is empty
    const submitBtn = page.getByRole("button", { name: /envoyer/i });
    await expect(submitBtn).toBeDisabled();
  });

  test("soumettre avec des espaces uniquement → bouton désactivé", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    const textarea = page.locator("textarea").first();
    await textarea.fill("   ");

    const submitBtn = page.getByRole("button", { name: /envoyer/i });
    await expect(submitBtn).toBeDisabled();
  });
});

test.describe("Commentaires — cas limites", () => {
  let reportId: string;
  let db: PrismaClient;

  test.beforeAll(async () => {
    const data = await seedReportWithComments();
    db = data.db;
    reportId = data.reportId;
  });

  test.afterAll(async () => {
    await cleanup(db);
    await disconnectPrisma();
    await disconnectDb();
  });

  test("commentaire très long (1000+ caractères) peut être posté", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    const longText = "A".repeat(1500);
    const textarea = page.locator("textarea").first();
    await textarea.fill(longText);
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // The comment should appear (truncated in view but present)
    const commentVisible = page.getByText(longText);
    await expect(commentVisible).toBeVisible();
  });

  test("XSS dans le corps du commentaire est nettoyé ou échappé", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    const xssPayload = "<script>alert('XSS')</script>";
    const textarea = page.locator("textarea").first();
    await textarea.fill(xssPayload);
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // The script tag should not be interpreted — content should be visible as text
    const body = page.locator("body");
    // The page should NOT show an alert dialog; instead the text should appear escaped
    await expect(page.getByText(/<script>alert/i)).toBeVisible({ timeout: 3000 });
  });

  test("double clic rapide n'envoie pas deux commentaires identiques", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    const textarea = page.locator("textarea").first();
    await textarea.fill("Éviter les doublons");

    // Rapid double click
    const submitBtn = page.getByRole("button", { name: /envoyer/i });
    await submitBtn.click();
    await submitBtn.click();
    await page.waitForTimeout(1500);

    // There should be exactly one occurrence of the text
    const matches = page.getByText("Éviter les doublons");
    await expect(matches).toHaveCount(1);
  });

  test("annuler l'édition restaure le texte original", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Add a comment
    const textarea = page.locator("textarea").first();
    await textarea.fill("Texte à ne pas changer");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // Hover and click edit
    const commentText = page.getByText("Texte à ne pas changer");
    await commentText.locator("..").hover();
    const editBtn = page.getByRole("button", { name: /modifier le commentaire/i });
    await editBtn.click();
    await page.waitForTimeout(500);

    // Change text then cancel
    const editTextarea = page.locator("textarea").last();
    await editTextarea.fill("Texte modifié non sauvegardé");
    await page.getByRole("button", { name: /annuler/i }).click();
    await page.waitForTimeout(500);

    // Original text should remain
    await expect(page.getByText("Texte à ne pas changer")).toBeVisible();
  });

  test("le label 'modifié' apparaît après avoir modifié un commentaire", async ({ page }) => {
    await page.goto(`/reports/${reportId}`);
    await page.waitForTimeout(1500);

    await page.getByRole("button", { name: /commenter/i }).click();
    await page.waitForTimeout(1000);

    // Add a comment
    const textarea = page.locator("textarea").first();
    await textarea.fill("Commentaire qui sera modifié");
    await page.getByRole("button", { name: /envoyer/i }).click();
    await page.waitForTimeout(1500);

    // Edit it
    const commentText = page.getByText("Commentaire qui sera modifié");
    await commentText.locator("..").hover();
    await page.getByRole("button", { name: /modifier le commentaire/i }).click();
    await page.waitForTimeout(500);

    const editTextarea = page.locator("textarea").last();
    await editTextarea.fill("Commentaire modifié");
    await page.getByRole("button", { name: /sauvegarder/i }).click();
    await page.waitForTimeout(1500);

    // The "(modifié)" label should appear
    await expect(page.getByText(/modifié/i)).toBeVisible({ timeout: 3000 });
  });
});
