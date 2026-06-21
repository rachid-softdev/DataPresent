import { test, expect } from "@playwright/test";

test.describe("Navigation du tableau de bord", () => {
  test("la page d'accueil (/) est publique et ne redirige pas", async ({ page }) => {
    await page.goto("/");
    // Landing page should show, no redirect
    await expect(page.locator("h1")).toBeVisible();
    expect(page.url()).not.toContain("/login");
  });

  test("la page /reports redirige vers /login (authentification requise)", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/login/);
  });

  test("la page /new redirige vers /login (authentification requise)", async ({ page }) => {
    await page.goto("/new");
    await expect(page).toHaveURL(/login/);
  });

  test("la page /settings/profile redirige vers /login (authentification requise)", async ({
    page,
  }) => {
    await page.goto("/settings/profile");
    await expect(page).toHaveURL(/login/);
  });

  test("la page /templates redirige vers /login (authentification requise)", async ({ page }) => {
    await page.goto("/templates");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Navigation du dashboard (après connexion)", () => {
  test.skip("les liens de navigation du dashboard ont les bons hrefs", async ({ page }) => {
    // Ce test nécessite une session utilisateur authentifiée.
    // Les liens du DashboardNav sont :
    //   - /new      → Nouveau rapport
    //   - /reports  → Rapports
    //   - /templates → Modèles
    //   - /settings/profile → Paramètres
    //
    // Configuration requise :
    //   1. Créer un utilisateur de test via Prisma/l'API
    //   2. Définir un cookie de session valide (next-auth.session-token)
    //   3. Naviguer vers / avec la session injectée
    //   4. Vérifier que chaque lien du nav est visible et a le bon href
  });

  test.skip("la sidebar des paramètres affiche 6 éléments de navigation", async ({ page }) => {
    // Ce test nécessite une session utilisateur authentifiée.
    // La SettingsLayout définit 6 éléments de navigation :
    //   - /settings/profile       → Mon compte
    //   - /settings/organization  → Organisation
    //   - /settings/team          → Équipe
    //   - /settings/billing       → Abonnement
    //   - /settings/api-keys      → API Keys
    //   - /settings/account       → Sécurité
    //
    // Configuration requise :
    //   1. Créer un utilisateur de test via Prisma/l'API
    //   2. Définir un cookie de session valide (next-auth.session-token)
    //   3. Naviguer vers /settings/profile
    //   4. Vérifier que .app-sidebar nav contient 6 liens
    //   5. Vérifier que chaque lien correspond aux hrefs ci-dessus
  });
});
