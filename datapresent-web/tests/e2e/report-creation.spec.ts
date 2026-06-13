import { test, expect } from "@playwright/test";

test.describe("Création de rapport", () => {
  test("la page /new redirige vers /login (authentification requise)", async ({ page }) => {
    await page.goto("/new");
    await expect(page).toHaveURL(/login/);
  });

  test("la page /reports redirige vers /login (authentification requise)", async ({ page }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/login/);
  });
});

test.describe("Filtre des rapports (ReportsFilter)", () => {
  test.skip("le ReportsFilter affiche le champ de recherche et les pills de statut", async ({
    page,
  }) => {
    // Ce test nécessite une session utilisateur authentifiée.
    //
    // Le composant ReportsFilter sur /reports contient :
    //   1. Un champ de recherche (Input avec placeholder "Rechercher un rapport...")
    //   2. 4 pills de statut : "Tous", "Terminé", "En cours", "Erreur"
    //   3. Les pills sont des boutons cliquables qui filtrent la liste
    //
    // Configuration requise :
    //   1. Créer un utilisateur de test avec des rapports dans différents états (DONE, PROCESSING, ERROR)
    //   2. Définir un cookie de session valide (next-auth.session-token)
    //   3. Naviguer vers /reports avec la session injectée
    //   4. Vérifier que l'input de recherche est visible
    //   5. Vérifier que les 4 pills sont visibles avec leur texte attendu
    //   6. Cliquer sur "Terminé" et vérifier que le filtre s'applique
  });

  test.skip("les pills du ReportsFilter affichent 'Tous', 'Terminé', 'En cours', 'Erreur'", async ({
    page,
  }) => {
    // Ce test vérifie le rendu des 4 pills de statut dans ReportsFilter.
    //
    // Les pills sont définies dans ReportsFilter.tsx :
    //   - { key: "ALL", label: "Tous" }
    //   - { key: "DONE", label: t("reports.status.done") } → "Terminé"
    //   - { key: "PROCESSING", label: t("reports.status.processing") } → "En cours"
    //   - { key: "ERROR", label: t("reports.status.error") } → "Erreur"
    //
    // La pill active (statusFilter === pill.key) a la classe bg-primary
    // Les pills inactives ont bg-background
    //
    // Configuration requise :
    //   1. Créer un utilisateur de test
    //   2. Définir un cookie de session valide
    //   3. Naviguer vers /reports
    //   4. Vérifier visuellement les 4 pills avec getByRole('button')
  });

  test.skip("les pills du ReportsFilter sont interactives (cliquables)", async ({ page }) => {
    // Ce test vérifie que cliquer sur une pill change le filtre actif.
    //
    // Étapes :
    //   1. Naviguer vers /reports (authentifié)
    //   2. La pill "Tous" (ALL) est active par défaut
    //   3. Cliquer sur "Terminé" → la pill "Terminé" devient active (bg-primary)
    //   4. Cliquer sur "En cours" → la pill "En cours" devient active
    //   5. Cliquer sur le bouton "Effacer les filtres" → "Tous" redevient actif
    //
    // Configuration requise :
    //   1. Créer un utilisateur de test avec des rapports
    //   2. Définir un cookie de session valide
    //   3. Naviguer vers /reports
    //   4. Vérifier le comportement de changement de filtre
  });
});
