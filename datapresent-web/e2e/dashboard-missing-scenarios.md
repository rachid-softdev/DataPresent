# Analyse des scénarios de test E2E manquants — Dashboard & Reports Management

> **Projet :** DataPresent  
> **Feature :** Dashboard & Reports Management  
> **Périmètre :** `/` (dashboard), `/reports`, `/reports/[id]`, `/templates`, `/reports/[id]/share`, navigation, onboarding, raccourcis clavier  
> **Fichiers de test existants :** `dashboard-nav.spec.ts` (5 tests auth redirect), `pages.spec.ts` (3 tests auth redirect), `report-creation.spec.ts` (2 tests auth + 3 tests skip), `share.spec.ts` (1 test), `navigation.spec.ts` (8 tests landing/templates/blog/auth)  
> **Tests réels avec session :** 0  
> **Tests skip en attente :** 3 (filtres reports)

---

## Sommaire

1. [Résumé de la couverture actuelle](#1-résumé-de-la-couverture-actuelle)
2. [Dashboard Home — `/` (20 scénarios)](#2-dashboard-home---)
3. [Reports List — `/reports` (35 scénarios)](#3-reports-list---reports)
4. [Report Detail — `/reports/[id]` (30 scénarios)](#4-report-detail---reportsid)
5. [Templates — `/templates` (12 scénarios)](#5-templates---templates)
6. [Dashboard Navigation (20 scénarios)](#6-dashboard-navigation)
7. [Onboarding & Empty State (18 scénarios)](#7-onboarding--empty-state)
8. [Raccourcis clavier & Command Palette (15 scénarios)](#8-raccourcis-clavier--command-palette)
9. [Partage — `/reports/[id]/share` (12 scénarios)](#9-partage---reportsidshare)
10. [Responsive & Accessibilité (8 scénarios)](#10-responsive--accessibilité)
11. [Race Conditions & Concurrence (8 scénarios)](#11-race-conditions--concurrence)
12. [Récapitulatif & Priorisation](#12-récapitulatif--priorisation)

---

## 1. Résumé de la couverture actuelle

| Page | Tests auth redirect | Tests fonctionnels skip | Tests fonctionnels réels | Statut |
|------|:---:|:---:|:---:|:------|
| `/` (dashboard) | 0 | 0 | 0 | ❌ non couvert |
| `/reports` | 2 | 3 (filtres) | 0 | ❌ non couvert |
| `/reports/[id]` | 0 | 0 | 0 | ❌ non couvert |
| `/templates` | 1 (dans nav) | 0 | 2 (dans `navigation.spec.ts`) | ⚠️ partiel |
| `/reports/[id]/share` | 0 | 0 | 0 | ❌ non couvert |
| Navigation dashboard | 4 (dans `dashboard-nav.spec.ts`) | 0 | 0 | ❌ non couvert |
| Onboarding | 0 | 0 | 0 | ❌ non couvert |
| Command palette / KB | 0 | 0 | 0 | ❌ non couvert |

**Constats clés :**
- **Zéro test E2E avec session authentifiée** — tous les tests existants passent sans session et ne vérifient que les redirects vers `/login`
- Les 3 tests skip dans `report-creation.spec.ts` décrivent les scénarios de filtre mais ne sont pas implémentés faute d'infrastructure de session
- La page templates a 2 tests superficiels qui passent sans auth car la page est publique
- Les compos critiques (pagination, polling, batch actions, slides, onboarding) ont 0 couverture

---

## 2. Dashboard Home — `/`

### 2.1 Success paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DH-01 | Affiche les rapports récents | Success | Le dashboard affiche les 6 derniers rapports de l'utilisateur | Utilisateur connecté avec 1 à 6 rapports | Les rapports sont visibles sous forme de cards avec titre, badge de statut et secteur |
| DH-02 | Stats rapides affichées avec rapports | Success | Les métriques (total, mois, taux succès, temps gagné) sont visibles | Utilisateur connecté avec au moins 1 rapport | Les 4 stats sont visibles dans la barre de métriques |
| DH-03 | Clic sur un rapport → détail | Success | Le clic sur une card de rapport navigue vers `/reports/[id]` | Utilisateur connecté avec rapports | La page de détail du rapport s'affiche |
| DH-04 | Bouton "Nouveau rapport" → `/new` | Success | Le bouton "Nouveau rapport" dans le header navigue vers la création | Utilisateur connecté | Navigation vers `/new` |
| DH-05 | Lien "Voir tous les rapports" avec ≥ 6 rapports | Success | Quand exactement 6 rapports ou plus, le lien "See all" apparaît | Utilisateur connecté avec 6+ rapports | Le lien `→ Voir tous les rapports` est visible et mène à `/reports` |
| DH-06 | UsageCard chargée et visible | Success | La carte d'utilisation (plan, limite rapports, slides) apparaît sous les rapports | Utilisateur connecté avec rapports | UsageCard affiche le plan, le nombre de rapports utilisés, la progress bar |
| DH-07 | Badge "succès" pour DONE | Success | Les rapports avec status DONE ont le badge vert "Terminé" | Rapport avec status DONE | `Badge` avec variant `success` et texte "Terminé" |
| DH-08 | Badge "warning" pour PROCESSING | Success | Les rapports avec status PROCESSING ont le badge orange "En cours" | Rapport avec status PROCESSING | `Badge` avec variant `warning` et texte "En cours" |
| DH-09 | Badge "error" pour ERROR | Success | Les rapports avec status ERROR ont le badge rouge "Erreur" | Rapport avec status ERROR | `Badge` avec variant `error` et texte "Erreur" |

### 2.2 Empty states

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DH-10 | IntelligentEmptyState sans rapports | Empty state | L'écran d'accueil intelligent s'affiche quand il n'y a aucun rapport | Utilisateur connecté avec 0 rapports | `IntelligentEmptyState` visible avec 2 CTA (importer / voir exemple) et lien "Explorer le tableau de bord" |
| DH-11 | Stats cachées sans rapports | Empty state | Les stats rapides ne sont pas affichées quand il n'y a aucun rapport | Utilisateur connecté avec 0 rapports | La div des stats est absente du DOM |
| DH-12 | CTA "Importer mes données" → `/new` | Empty state | Le bouton "Importer mes données" dans l'empty state navigue vers `/new` | Utilisateur connecté avec 0 rapports | Navigation vers `/new` |
| DH-13 | CTA "Voir un exemple" → `/new` | Empty state | Le bouton "Voir un exemple" dans l'empty state navigue vers `/new` | Utilisateur connecté avec 0 rapports | Navigation vers `/new` |

### 2.3 Edge cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DH-14 | Exactement 6 rapports → lien visible | Edge | Le lien "Voir tous les rapports" apparaît à partir de 6 rapports | 6 rapports exactement | Lien visible ; condition `reports.length >= 6` vraie |
| DH-15 | Titre de rapport très long | Edge | Un titre de rapport de 200+ caractères n'explose pas le layout | Rapport avec titre très long | Le titre est tronqué (CSS truncation) et la card reste bien formée |
| DH-16 | Rapport sans secteur | Edge | Un rapport avec secteur non défini s'affiche sans erreur | Rapport avec secteur vide/null | Le secteur est affiché (vide ou "Non défini") sans erreur |
| DH-17 | Stats précises selon le mois | Edge | `reportsThisMonth` compte uniquement les rapports du mois courant | Rapports créés ce mois-ci et le mois précédent | Le compteur affiche uniquement le nombre de rapports du mois en cours |
| DH-18 | Time saved estimate = 0 pour 0 DONE | Edge | `timeSavedEstimate` est 0 si aucun rapport n'est DONE | 0 rapports DONE | La stat affiche "~0h" |
| DH-19 | Taux de succès 0% si 0 DONE | Edge | Le pourcentage de succès est 0% si aucun rapport n'est DONE | 0 rapports DONE | La stat affiche "0%" |
| DH-20 | Utilisateur sans organisation | Error | Un utilisateur sans organisation est redirigé ou voit une page d'erreur | Utilisateur sans membership | `ensureUserHasOrganization` crée une org OU l'utilisateur voit une erreur |

---

## 3. Reports List — `/reports`

### 3.1 Success paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RL-01 | Page charge avec tableau | Success | La page `/reports` s'affiche avec le tableau des rapports | Utilisateur connecté avec plusieurs rapports | Table avec colonnes (checkbox, nom, secteur, statut, date, action) et en-têtes |
| RL-02 | Bouton "Nouveau rapport" visible | Success | Le bouton de création est présent dans le header de la page | Utilisateur connecté | Bouton "Nouveau rapport" naviguant vers `/new` |
| RL-03 | Champ de recherche visible | Success | L'input de recherche est présent avec placeholder "Rechercher un rapport..." | Utilisateur connecté | Input avec `aria-label="Rechercher par nom ou secteur"` visible |
| RL-04 | 4 pills de statut visibles | Success | Les 4 filtres (Tous, Terminé, En cours, Erreur) sont affichés | Utilisateur connecté | 4 boutons visibles : "Tous", "Terminé", "En cours", "Erreur" |
| RL-05 | Pill "Tous" active par défaut | Success | Le filtre "Tous" est actif (classe `bg-primary`) au chargement | Utilisateur connecté | La pill "Tous" a la classe `bg-primary`, les autres ont `bg-background` |
| RL-06 | Chaque ligne est cliquable vers le détail | Success | Le bouton "Voir" sur chaque ligne navigue vers `/reports/[id]` | Utilisateur connecté avec rapports | Clic → navigation vers `/reports/{id}` |
| RL-07 | Badge de statut dans le tableau | Success | Chaque ligne affiche un badge coloré selon le statut | Rapports avec DONE, PROCESSING, ERROR | Badge avec variant `success`/`warning`/`error` et texte traduit |

### 3.2 Filtres & Recherche

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RL-08 | Filtre "Terminé" → uniquement DONE | Filter | Cliquer sur "Terminé" filtre la liste pour montrer uniquement les rapports DONE | Rapports avec statuts mixtes | Seuls les rapports DONE sont visibles dans le tableau |
| RL-09 | Filtre "En cours" → uniquement PROCESSING | Filter | Cliquer sur "En cours" filtre la liste pour montrer uniquement PROCESSING | Rapports avec statuts mixtes | Seuls les rapports PROCESSING sont visibles |
| RL-10 | Filtre "Erreur" → uniquement ERROR | Filter | Cliquer sur "Erreur" filtre la liste pour montrer uniquement ERROR | Rapports avec statuts mixtes | Seuls les rapports ERROR sont visibles |
| RL-11 | Retour à "Tous" après filtre | Filter | Cliquer sur "Tous" après un autre filtre restaure tous les rapports | Rapports avec statuts mixtes | Tous les rapports sont de nouveau visibles |
| RL-12 | Recherche par nom | Filter | Saisir un nom de rapport dans la recherche filtre la liste | Rapports avec noms variés | Seuls les rapports dont le titre contient la chaîne sont visibles |
| RL-13 | Recherche par secteur | Filter | Saisir un secteur (e.g. "Finance") dans la recherche filtre la liste | Rapports avec secteurs variés | Seuls les rapports dont le secteur contient la chaîne sont visibles |
| RL-14 | Recherche + Filtre combinés | Filter | Les deux filtres (texte + statut) s'appliquent simultanément | Rapports avec statuts et noms variés | Liste filtrée par les deux critères (intersection) |
| RL-15 | Effacer le filtre de recherche | Filter | Cliquer sur le X dans l'input de recherche efface la recherche | Recherche active | Input vidé, tous les résultats rétablis |
| RL-16 | "Effacer les filtres" avec filtres actifs | Filter | Le lien "Effacer les filtres" apparaît quand un filtre est actif | Filtre statut OU recherche actif | Lien visible ; clic → reset de tous les filtres |
| RL-17 | Aucun résultat → EmptyState | Filter | Quand la recherche/filtre ne renvoie aucun résultat, afficher EmptyState | Recherche sans correspondance | `EmptyState` avec icône, titre "Aucun résultat" et description |
| RL-18 | Texte de nombre de résultats | Filter | Le texte "X résultats" est affiché quand des filtres sont actifs | Filtre appliqué avec résultats | Texte `{n} résultat(s)` visible |
| RL-19 | Recherche insensible à la casse | Filter | La recherche ignore la casse des caractères | Rapport "Rapport Finances" | Recherche "finances" trouve le rapport |
| RL-20 | Recherche après vidage du filtre statut | Filter | Après avoir changé de filtre puis vidé la recherche, combo correct | Filtre "Erreur" + recherche active | "Effacer les filtres" restaure la vue complète |

### 3.3 Pagination

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RL-21 | Pagination absente avec ≤ 20 rapports | Pagination | La pagination n'est pas affichée quand il y a ≤ 20 rapports | Moins de 20 rapports | `<div class="app-pagination">` absente du DOM |
| RL-22 | Pagination visible avec > 20 rapports | Pagination | La pagination apparaît quand il y a plus de 20 rapports | 25 rapports | Barre de pagination visible avec boutons Précédent/Suivant et info |
| RL-23 | Page 1 : Précédent désactivé | Pagination | Sur la page 1, le bouton "Précédent" est désactivé | Page 1 avec pagination | Bouton Précédent a l'attribut `disabled` |
| RL-24 | Page intermédiaire : navigation bidirectionnelle | Pagination | Sur une page intermédiaire, les deux boutons sont actifs | Page 2 de 5 | Précédent et Suivant sont cliquables |
| RL-25 | Dernière page : Suivant désactivé | Pagination | Sur la dernière page, le bouton "Suivant" est désactivé | Page 5 de 5 | Bouton Suivant a l'attribut `disabled` |
| RL-26 | Navigation Précédent via URL | Pagination | Cliquer "Précédent" met à jour l'URL en `?page=N-1` | Page 3 | URL change vers `?page=2` |
| RL-27 | Navigation Suivant via URL | Pagination | Cliquer "Suivant" met à jour l'URL en `?page=N+1` | Page 3 | URL change vers `?page=4` |
| RL-28 | Navigation directe par URL ?page=N | Pagination | Naviguer vers `/reports?page=3` affiche la page 3 | 60+ rapports | La page 3 est affichée avec les bons rapports |
| RL-29 | Page invalide (?page=-1) | Pagination | Naviguer vers `/reports?page=-1` est géré sans erreur | Paramètre négatif | La requête parse `NaN` → page par défaut 1, pas d'erreur |
| RL-30 | Page invalide (?page=abc) | Pagination | Naviguer vers `/reports?page=abc` est géré sans erreur | Paramètre non numérique | `parseInt` → `NaN` → page par défaut 1 |
| RL-31 | Page au-delà du max (?page=999) | Pagination | Naviguer vers `/reports?page=999` avec moins de pages | Paramètre > totalPages | Tableau vide (skip > count), pas d'erreur serveur |
| RL-32 | Texte de pagination correct | Pagination | Le texte "Affichage de X à Y sur Z rapports" est exact | 50 rapports, page 2 | Texte : "Affichage de 21 à 40 sur 50 rapports" |

### 3.4 Batch actions

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RL-33 | Checkbox "Tout sélectionner" | Batch | La checkbox dans l'en-tête coche/décoche toutes les lignes visibles | Rapports visibles filtrés | Clic → toutes les lignes cochées ; re-clic → toutes décochées |
| RL-34 | Checkbox intermédiaire | Batch | La checkbox d'en-tête montre un état indéterminé si sélection partielle | 2 lignes sélectionnées sur 5 | `checkbox.indeterminate === true` |
| RL-35 | Barre d'actions batch visible avec sélection | Batch | La toolbar d'actions batch apparaît quand au moins un rapport est sélectionné | 1+ rapports cochés | Barre avec compteur "X sélectionné(s)", boutons Supprimer/Exporter/Annuler |
| RL-36 | Batch delete avec confirmation | Batch | Cliquer "Supprimer" ouvre un ConfirmDialog, la confirmation supprime | 2 rapports sélectionnés | ConfirmDialog visible ; confirmation → API batch delete appelée, toast succès |
| RL-37 | Batch delete erreur API | Batch | Si l'API batch delete échoue, un toast d'erreur est affiché | API retourne 500 | Toast "Erreur lors de la suppression" |
| RL-38 | Batch export PPTX | Batch | Exporter la sélection en PPTX lance les exports un par un | 2 rapports sélectionnés | `POST /api/reports/{id}/export` appelé pour chaque ID, toast succès/échec |
| RL-39 | Batch export PDF | Batch | Exporter la sélection en PDF fonctionne | 2 rapports sélectionnés | Même comportement que PPTX avec format "PDF" |
| RL-40 | Annuler la sélection | Batch | Cliquer "Annuler" vide la sélection et cache la toolbar | Rapports sélectionnés | `selectedIds` vidé, toolbar disparue |
| RL-41 | "Sélectionner tout" + filtre puis changement | Batch | "Tout sélectionner", puis changer de filtre, puis revenir | Sélection active | Les sélections persistent-elles ou sont-elles réinitialisées ? (vérifier comportement) |

---

## 4. Report Detail — `/reports/[id]`

### 4.1 Success paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RD-01 | Page charge pour rapport DONE | Success | Le détail du rapport s'affiche avec slides, titre, badge, secteur | Rapport DONE avec slides | Titre, badge "Terminé" (vert), secteur, slides visibles |
| RD-02 | Lien retour vers `/reports` | Success | Le lien "Retour aux rapports" dans le header navigue vers `/reports` | Rapport DONE | Clic → navigation vers `/reports` |
| RD-03 | Slide viewer : slide courante affichée | Success | La slide active est affichée avec son contenu | Rapport DONE avec slides | `SlideCard` visible pour la slide active |
| RD-04 | Navigation slide suivante | Success | Cliquer sur le bouton suivant → slide suivante affichée | Rapport DONE avec ≥ 2 slides | Index passe de 0 à 1, animation de transition |
| RD-05 | Navigation slide précédente | Success | Cliquer sur le bouton précédent → slide précédente | Rapport DONE avec ≥ 2 slides, slide 2 active | Index passe de 1 à 0 |
| RD-06 | Boutons de navigation désactivés aux extrêmes | Success | Sur la première slide, "Précédent" désactivé ; sur la dernière, "Suivant" désactivé | Rapport DONE avec slides | `disabled` sur le bouton approprié |
| RD-07 | Dots de progression | Success | Les indicateurs de slide (dots) sont visibles et cliquables | Rapport DONE avec slides | Nombre de dots = nombre de slides, dot actif plus large (w-8) |
| RD-08 | Bouton "Afficher la liste des slides" | Success | Le bouton liste des slides ouvre le sidebar de navigation | Rapport DONE | Clic → sidebar avec `SortableSlideList` visible |
| RD-09 | Compteur "Slide X sur Y" | Success | Le texte "Slide 3 sur 10" est visible et précis | Rapport DONE avec 10 slides | Texte mis à jour à chaque navigation |

### 4.2 États de traitement

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RD-10 | Rapport PENDING : spinner et polling | Processing | Un rapport en attente affiche un spinner et un message | Rapport status PENDING | Spinner visible, `ReportDetailPoller` actif, pas de slides |
| RD-11 | Rapport PROCESSING : spinner et polling | Processing | Un rapport en cours affiche un spinner et un message | Rapport status PROCESSING | Spinner visible, `ReportDetailPoller` actif, pas de slides |
| RD-12 | Transition PROCESSING → DONE avec refresh | Processing | Le poller détecte le passage à DONE et rafraîchit la page | Rapport passe PROCESSING → DONE | `router.refresh()` appelé, slides affichées |
| RD-13 | Transition PROCESSING → ERROR avec refresh | Processing | Le poller détecte le passage à ERROR et rafraîchit la page | Rapport passe PROCESSING → ERROR | `router.refresh()` appelé, badge "Erreur" affiché |
| RD-14 | Max retries atteint (60 = 5 min) | Processing | Le poller s'arrête après 60 tentatives et log un warning | Rapport PROCESSING pendant > 5 min | `clearInterval`, console.warn, poller inactif |

### 4.3 ReportActions

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RD-15 | Actions cachées pour non-DONE | Actions | Les boutons d'export/régénération/partage sont invisibles pour PENDING/PROCESSING/ERROR | Rapport non-DONE | `ReportActions` retourne `null`, aucun bouton visible |
| RD-16 | Actions visibles pour DONE | Actions | Les boutons d'action sont présents pour un rapport terminé | Rapport DONE | Boutons : Partager, Régénérer, PPTX, PDF, DOCX |
| RD-17 | Export PPTX | Actions | Cliquer sur le bouton PPTX appelle l'API d'export | Rapport DONE | `POST /api/reports/{id}/export` avec `{ format: "PPTX" }`, toast "Export PPTX en cours" |
| RD-18 | Export PDF | Actions | Cliquer sur le bouton PDF appelle l'API d'export | Rapport DONE | `POST /api/reports/{id}/export` avec `{ format: "PDF" }` |
| RD-19 | Export DOCX | Actions | Cliquer sur le bouton DOCX appelle l'API d'export | Rapport DONE | `POST /api/reports/{id}/export` avec `{ format: "DOCX" }` |
| RD-20 | Export erreur API → toast erreur | Actions | Si l'API d'export échoue, un toast d'erreur est affiché | API retourne 500 | Toast "Erreur lors de l'export" |
| RD-21 | Export avec loading state | Actions | Pendant l'export, le bouton est désactivé avec spinner | Export en cours | `disabled` sur le bouton, `Loader2` avec animation |
| RD-22 | Régénération : ConfirmDialog | Actions | Cliquer "Régénérer" ouvre un dialogue de confirmation | Rapport DONE | `ConfirmDialog` avec titre "Régénérer le rapport ?" |
| RD-23 | Régénération confirmée | Actions | Confirmer la régénération appelle l'API et recharge la page | Rapport DONE | `POST /api/reports/{id}/regenerate`, toast, `window.location.reload()` après 1s |
| RD-24 | Régénération erreur → toast | Actions | Si l'API de régénération échoue, toast d'erreur | API retourne erreur | Toast avec le message d'erreur du serveur |

### 4.4 Partages, commentaires, slides

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RD-25 | Panneau de commentaires | Comments | Cliquer "Commenter" ouvre le panneau latéral des commentaires | Rapport DONE avec slides | Panneau avec `CommentThread`, `fixed` à droite |
| RD-26 | Fermeture du panneau commentaires | Comments | Cliquer sur l'overlay ou "X" ferme le panneau | Panneau de commentaires ouvert | Panneau disparaît, overlay disparaît |
| RD-27 | Compteur de commentaires par slide | Comments | Les dots montrent un indicateur pour les slides avec commentaires | Slide avec commentaires | Dot avec bulle rouge (w-2 h-2 bg-primary) |
| RD-28 | Texte "X commentaires sur cette slide" | Comments | Si la slide courante a des commentaires, un lien "Voir tout" est affiché | Slide courante avec commentaires | Texte "X commentaire(s) sur cette slide" + lien "Voir tout" |
| RD-29 | Slide reorder persisté | Slides | Réordonner les slides met à jour l'ordre via l'API | Rapport DONE avec slides | `PATCH /api/reports/{id}/reorder` appelé, toast si erreur |
| RD-30 | 0 slides → message "Aucune slide disponible" | Slides | Un rapport sans slide affiche un message dédié | Rapport DONE avec 0 slides | Texte "Aucune slide disponible" |

### 4.5 Error paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RD-31 | Rapport inexistant → 404 | Error | Naviguer vers un ID de rapport qui n'existe pas → page 404 | ID invalide | `notFound()` appelé, page "404 - Page non trouvée" |
| RD-32 | Rapport d'un autre utilisateur → 404 | Error | Un utilisateur tente d'accéder au rapport d'une autre org | Rapport d'une autre organisation | `findFirst` avec filtre org ne trouve rien → `notFound()` |
| RD-33 | Session expirée sur page détail | Error | L'utilisateur dont la session expire pendant la navigation est redirigé | Session invalide | Redirect vers `/login` |

---

## 5. Templates — `/templates`

### 5.1 Success paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| TP-01 | Grille de templates affichée | Success | La galerie affiche tous les templates disponibles | Page chargée | Templates disposés en grille avec cards (titre, description, badge secteur, layouts) |
| TP-02 | 6 pills de secteur visibles | Success | Les filtres Tous, Finance, Marketing, RH, SaaS, Générique sont présents | Page chargée | 6 boutons `app-filter-pill` avec les bons libellés |
| TP-03 | "Tous" sélectionné par défaut | Success | Le filtre "Tous" est actif au chargement | Page chargée | `selectedSector === "ALL"`, pill "Tous" avec classe `active` |
| TP-04 | Clic "Select" → `/new?sector=XXX` | Success | Le bouton "Sélectionner" sur un template navigue vers `/new` avec le secteur | Page chargée | Navigation vers `/new?sector={template.sector}` |

### 5.2 Filtres

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| TP-05 | Filtre Finance → templates Finance seulement | Filter | Cliquer "Finance" → seuls les templates FINANCE | Page chargée | Templates filtrés, `filteredTemplates` ne contient que ceux avec `sector === "FINANCE"` |
| TP-06 | Filtre Marketing → templates Marketing seulement | Filter | Cliquer "Marketing" → seuls les templates MARKETING | Page chargée | Même comportement |
| TP-07 | Filtre RH → templates RH seulement | Filter | Cliquer "RH" → seuls les templates HR | Page chargée | Même comportement |
| TP-08 | Filtre SaaS → templates SaaS seulement | Filter | Cliquer "SaaS" → seuls les templates SAAS | Page chargée | Même comportement |
| TP-09 | Filtre Générique → templates GENERIC seulement | Filter | Cliquer "Générique" → seuls les templates GENERIC | Page chargée | Même comportement |
| TP-10 | Retour à "Tous" après filtre | Filter | Cliquer "Tous" après un filtre secteur restaure tous les templates | Filtre actif | Tous les templates de nouveau visibles |

### 5.3 Edge cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| TP-11 | Secteur sans templates → EmptyState | Edge | Si un secteur filtré n'a aucun template (cas improbable mais couvert) | Secteur sans template dans `TEMPLATES` | `EmptyState` avec icône `Layout` affiché |
| TP-12 | Layouts affichés sous forme de badges | Edge | Chaque layout du template est affiché comme badge | Template avec layouts variés | Badges "KPI GRID", "BAR CHART", etc. dans la card |

---

## 6. Dashboard Navigation

### 6.1 Navigation links

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| NAV-01 | Tous les liens de navigation visibles | Navigation | Les 4 liens (Nouveau rapport, Rapports, Modèles, Paramètres) sont dans le header | Utilisateur connecté sur dashboard | 4 `app-nav-link` dans `<nav>` |
| NAV-02 | Lien actif a `aria-current="page"` | Navigation | Le lien de la page courante a l'attribut `aria-current="page"` | Navigation vers `/reports` | Le lien "Rapports" a `aria-current="page"` |
| NAV-03 | Lien "Nouveau rapport" → `/new` | Navigation | Cliquer sur "Nouveau rapport" navigue vers `/new` | Utilisateur connecté | Navigation vers `/new` |
| NAV-04 | Lien "Rapports" → `/reports` | Navigation | Cliquer sur "Rapports" navigue vers `/reports` | Utilisateur connecté | Navigation vers `/reports` |
| NAV-05 | Lien "Modèles" → `/templates` | Navigation | Cliquer sur "Modèles" navigue vers `/templates` | Utilisateur connecté | Navigation vers `/templates` |
| NAV-06 | Lien "Paramètres" → `/settings/profile` | Navigation | Cliquer sur "Paramètres" navigue vers `/settings/profile` | Utilisateur connecté | Navigation vers `/settings/profile` |
| NAV-07 | Logo → `/` | Navigation | Cliquer sur le logo DataPresent navigue vers la racine | Utilisateur connecté sur une sous-page | Navigation vers `/` |
| NAV-08 | Skip to content link | Navigation | Le lien "Aller au contenu principal" est présent et focusable | Page dashboard | Lien `sr-only` qui devient visible au focus, cible `#main-content` |

### 6.2 Mobile navigation

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| NAV-09 | Menu hamburger visible sur mobile | Mobile | Le bouton hamburger est visible sur écran < 768px | Viewport mobile (< 768px) | Bouton avec `aria-label="Ouvrir le menu"` visible ; nav desktop cachée |
| NAV-10 | Ouverture du menu mobile | Mobile | Cliquer sur hamburger ouvre le panneau mobile de navigation | Viewport mobile | `<nav>` mobile avec 4 liens visible, `aria-expanded="true"` |
| NAV-11 | Fermeture du menu mobile | Mobile | Cliquer sur X ou un lien ferme le menu | Menu mobile ouvert | `aria-expanded="false"`, panneau masqué |
| NAV-12 | Liens mobiles sont actifs correctement | Mobile | Les liens dans le menu mobile ont la classe active selon la page | Navigation vers `/reports` en mobile | Lien "Rapports" a `bg-muted text-foreground` |
| NAV-13 | Menu desktop caché sur mobile | Mobile | La navigation desktop (`hidden md:flex`) est invisible sur mobile | Viewport mobile | Navigation desktop a `display: none` |
| NAV-14 | LocaleSwitcher et ThemeToggle visibles desktop | Mobile | Les icônes de langue et thème sont présentes sur desktop | Viewport desktop | Les deux composants visibles dans le header |

### 6.3 OrgSwitcher

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| NAV-15 | OrgSwitcher affiche l'org active | Org | Le nom de l'organisation courante est affiché dans le header | Utilisateur avec 1+ org | Texte tronqué, icône `Building2` |
| NAV-16 | Dropdown liste les orgs | Org | Le dropdown contient toutes les organisations de l'utilisateur | Utilisateur avec 2+ orgs | Menu avec les orgs, badges de rôle, séparateur |
| NAV-17 | Changement d'org met à jour l'URL | Org | Sélectionner une org dans le dropdown → URL mise à jour avec `?org=XXX` | Utilisateur avec 2+ orgs | URL devient `/?org={newOrgId}` |
| NAV-18 | Lien "Créer ou rejoindre une org" | Org | Le menu contient un lien pour créer/rejoindre une org | Page chargée | `DropdownMenuItem` avec `Plus` navigue vers `/settings/organization` |
| NAV-19 | Loading state de l'OrgSwitcher | Org | Pendant le chargement des orgs, un bouton désactivé avec "..." est affiché | Requête API lente | Bouton `disabled` avec "..." et icône `Building2` |

---

## 7. Onboarding & Empty State

### 7.1 WelcomeScreen

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ONB-01 | WelcomeScreen affiché à la première connexion | Welcome | Le nouvel utilisateur voit l'écran de bienvenue avant le dashboard | Premier login, `localStorage` sans `datapresent-welcome-seen` | `WelcomeScreen` avec 3 étapes et bouton "C'est parti" |
| ONB-02 | WelcomeScreen masqué après completion | Welcome | Cliquer "C'est parti" → `localStorage` marqué, dashboard affiché | WelcomeScreen visible | `localStorage.setItem("datapresent-welcome-seen", "true")`, navigation vers dashboard |
| ONB-03 | WelcomeScreen non affiché aux visites suivantes | Welcome | L'utilisateur revient → WelcomeScreen ignoré | `datapresent-welcome-seen` présent | Dashboard directement, pas de welcome |

### 7.2 OnboardingTour

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ONB-04 | Tour guidé se lance après le welcome | Tour | Le tour avec les 6 étapes démarre automatiquement après le welcome | WelcomeScreen complété, première visite dashboard | Overlay onboarding visible, étape 1 |
| ONB-05 | Navigation Suivant / Précédent du tour | Tour | Les boutons Suivant/Précédent changent d'étape | Tour actif | Précédent désactivé à l'étape 1, Suivant mène à l'étape 2 |
| ONB-06 | Highlight de la cible avec `data-onboarding` | Tour | L'élément cible de l'étape est entouré d'un anneau | Étape 2 (cible `new-report`) | Élément avec `data-onboarding="new-report"` a la classe `ring-4 ring-primary` |
| ONB-07 | Fermeture du tour | Tour | Cliquer sur X ferme le tour et marque complete | Tour actif | Overlay disparaît, `localStorage.setItem("onboarding_complete")` |
| ONB-08 | Tour complété → plus revu | Tour | Une fois le tour terminé, il ne se relance pas | Tour terminé | localStorage `{ complete: true }`, dashboard normal |
| ONB-09 | RestartOnboardingButton réinitialise le tour | Tour | Cliquer "Recommencer le guide" remet à zéro le localStorage et recharge | Tour complété | `localStorage.removeItem`, page reload, tour réaffiche |

### 7.3 StartChecklist

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ONB-10 | Checklist affichée sur le dashboard | Checklist | La checklist de démarrage est visible en bas de chaque page dashboard | Toute page dashboard | 3 items non cochés avec titre "Checklist de démarrage", compteur "0/3" |
| ONB-11 | Marquage d'un item comme fait | Checklist | Cliquer sur le cercle d'un item → icône `CheckCircle2` avec animation | Item non coché | Item marqué `completed: true`, icône verte, texte barré, compteur "1/3" |
| ONB-12 | Persistence localStorage de la checklist | Checklist | Les progrès de la checklist survivent au rechargement de page | Items cochés puis reload | Items toujours cochés après `localStorage.getItem("datapresent-checklist")` |
| ONB-13 | Navigation vers /new par clic sur item | Checklist | Cliquer sur le texte d'un item non coché → navigation vers `/new` | Item "Importer mon premier fichier" | Navigation vers `/new` |
| ONB-14 | État "Tout est accompli" | Checklist | Quand les 3 items sont cochés, message de célébration | 3/3 items coché | `PartyPopper`, texte "Tout est accompli !", bouton "Réinitialiser" |
| ONB-15 | Réinitialisation de la checklist | Checklist | Cliquer "Réinitialiser" efface les progrès | État "Tout est accompli" | Items redeviennent non cochés, `localStorage.removeItem` |

### 7.4 IntelligentEmptyState

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ONB-16 | IntelligentEmptyState visible sans rapports | Empty | L'état vide avec CTA est affiché quand aucun rapport n'existe | 0 rapports, utilisateur connecté | `IntelligentEmptyState` avec 2 cards CTA et lien "Explorer le tableau de bord" |
| ONB-17 | CTA "Importer mes données" → `/new` | Empty | La card d'import navigue vers `/new` | État vide | Lien vers `/new` |
| ONB-18 | Lien "Explorer le tableau de bord" → `/settings/profile` | Empty | Le lien de découverte mène aux paramètres | État vide | Lien vers `/settings/profile` |

---

## 8. Raccourcis clavier & Command Palette

### 8.1 Raccourcis clavier globaux

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| KB-01 | Ctrl+K ouvre la command palette | Shortcuts | Presser Ctrl+K ou Cmd+K → command palette visible | Utilisateur connecté sur dashboard | `CommandPalette` avec `open=true`, overlay visible, input focusé |
| KB-02 | Ctrl+K ferme la command palette | Shortcuts | Presser Ctrl+K quand la palette est ouverte → fermeture | Palette ouverte | `onOpenChange(false)`, palette disparaît |
| KB-03 | Esc ferme la command palette | Shortcuts | Presser Esc dans la palette → fermeture | Palette ouverte | `onOpenChange(false)`, palette disparaît |
| KB-04 | N → Nouveau rapport sur dashboard | Shortcuts | Presser "n" sur le dashboard → navigation vers `/new` | Page dashboard (`pathname === "/"`) | `router.push("/new")` |
| KB-05 | N inactif hors dashboard | Shortcuts | Presser "n" sur une page non-dashboard → rien ne se produit | Page `/reports` (ou autre) | `isDashboard = false`, shortcut non enregistré |

### 8.2 Command Palette

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| KB-06 | Palette affiche 7 commandes | Palette | Toutes les commandes (Nouveau rapport, Dashboard, Rapports, Paramètres, Aide, Connexion, Inscription) sont listées | Palette ouverte sans recherche | 7 éléments visibles avec icônes et descriptions |
| KB-07 | Recherche filtre les commandes | Palette | Saisir "rap" → seules les commandes avec keyword "rap" sont visibles | Palette ouverte | Filtré : "Nouveau rapport" visible, les autres cachés |
| KB-08 | Navigation clavier ↑↓ | Palette | Flèches haut/bas changent l'élément actif | Palette ouverte avec résultats | `activeIndex` mis à jour, `aria-selected` change |
| KB-09 | Enter exécute la commande active | Palette | Presser Enter sur la commande active → action exécutée | Commande active non nulle | `filtered[activeIndex].action()` appelé, palette fermée |
| KB-10 | Clic sur commande exécute l'action | Palette | Cliquer sur une commande → action exécutée | Palette ouverte | `cmd.action()` appelé, navigation ou fermeture |
| KB-11 | Résultat vide → message "Aucun résultat" | Palette | Recherche sans correspondance → message dédié | Recherche "zzzzz" | Texte "Aucun résultat pour "zzzzz"" |
| KB-12 | Fermeture par clic sur overlay | Palette | Cliquer sur l'overlay sombre → palette fermée | Palette ouverte | `onOpenChange(false)` |
| KB-13 | Footer avec indicateurs clavier | Palette | Les raccourcis clavier (↑↓, ↵, Esc) sont affichés en bas de la palette | Palette ouverte | Footer avec 3 indicateurs `kbd` |

---

## 9. Partage — `/reports/[id]/share`

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| SH-01 | Page de partage charge avec spinner | Loading | État de chargement initial avec spinner | Navigation vers la page | `Loader2` avec animation, pas de contenu |
| SH-02 | Mode privé par défaut | Settings | Le rapport est privé au chargement initial | Rapport non partagé | Cadenas `Lock`, texte "Lien privé", Switch éteint |
| SH-03 | Activation du partage public | Settings | Activer le switch → API POST avec `isPublic: true` | Rapport privé | `POST /api/reports/{id}/share`, icône `Globe` vert, lien de partage visible |
| SH-04 | Copie du lien de partage | Settings | Cliquer "Copier" → URL copiée dans le presse-papiers | Rapport public avec lien | `navigator.clipboard.writeText` appelé, icône `Check` pendant 2s, toast |
| SH-05 | Options avancées visibles quand public | Settings | Les options de commentaires, embed, expiration, mot de passe apparaissent | Rapport public | Carte "Options avancées" avec switches et select |
| SH-06 | Sauvegarde des paramètres avancés | Settings | Cliquer "Sauvegarder" → API PATCH avec tous les paramètres | Rapport public, modifié | `PATCH /api/reports/{id}/share`, toast "Paramètres sauvegardés" |
| SH-07 | Désactivation du partage | Settings | Cliquer "Désactiver le partage" → confirmation → API POST avec `isPublic: false` | Rapport public | Bouton rouge "Désactiver le partage", confirm dialog, API appelée |
| SH-08 | Code d'intégration iframe | Settings | Si embed activé, le champ iframe est visible | Rapport public avec embed | Champ avec URL d'embed, bouton copie, texte d'aide |
| SH-09 | Compteur de commentaires | Settings | Si le rapport a des commentaires, une carte "Statistiques" les affiche | Rapport avec commentaires | Carte avec `MessageSquare` et nombre de commentaires |

---

## 10. Responsive & Accessibilité

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RA-01 | Grille responsive dashboard (1 col mobile) | Responsive | Sur mobile, les cards de rapport passent en 1 colonne | Viewport mobile, rapports existants | `grid-cols-1` (défaut), chaque card prend toute la largeur |
| RA-02 | Grille responsive templates (1 col mobile) | Responsive | Sur mobile, les templates passent en 1 colonne | Viewport mobile | `grid-cols-1` |
| RA-03 | Tableau /reports scrollable horizontalement | Responsive | Sur mobile, le tableau a un scroll horizontal | Viewport mobile | `app-table-wrap` avec `overflow-x: auto` |
| RA-04 | Slide viewer responsive sans dépassement | Responsive | La slide courante s'adapte à la largeur de l'écran | Viewport mobile, rapport avec slides | Slide ne dépasse pas, pas de scroll horizontal |
| RA-05 | ARIA labels sur tous les boutons d'action | Accessibilité | Tous les boutons ont des `aria-label` explicites | Page dashboard | `aria-label` présent sur : hamburger, export, navigation slides, commentaires |
| RA-06 | Navigation clavier du tableau | Accessibilité | On peut tabuler à travers les lignes du tableau et les actions | Page /reports | `Tab` navigue à travers les éléments interactifs, focus visible |
| RA-07 | Focus trap dans la command palette | Accessibilité | Le focus reste dans la palette quand elle est ouverte | Palette ouverte | Tab ne sort pas de la palette (ou Esc requis pour fermer) |
| RA-08 | `aria-current="page"` sur navigation | Accessibilité | Le lien actif de la barre de navigation a `aria-current="page"` | Navigation sur `/reports` | Lien "Rapports" a l'attribut |

---

## 11. Race Conditions & Concurrence

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RC-01 | Clic multiple sur export | Race | Double-clic rapide sur "PPTX" → un seul appel API | Rapport DONE | Le check `if (exportingFormat) return` empêche le second appel |
| RC-02 | Régénération + Export simultanés | Race | Déclencher régénération et export en même temps | Rapport DONE | États `regenerating` et `exportingFormat` indépendants, pas de conflit |
| RC-03 | Polling et navigation simultanés | Race | Poller actif sur /reports quand on navigue vers /reports/[id] | Rapports en PROCESSING | `clearInterval` du premier poller à l'unmount, pas de `router.refresh` après navigation |
| RC-04 | Poller après 404 (rapport supprimé) | Race | Le poller du détail reçoit une 404 (rapport supprimé pendant process) | Rapport supprimé pendant PROCESSING | `if (!res.ok) return;` ignoré, le retry continue ou le poller s'arrête |
| RC-05 | Changement rapide d'org | Race | Changer d'org rapidement via OrgSwitcher x3 | 3+ orgs | Seule la dernière requête compte, pas de race dans le state |
| RC-06 | Batch delete + nouveau rapport | Race | Supprimer en masse et immédiatement créer un rapport | Rapports sélectionnés | Les deux actions sont indépendantes, pas de conflit |
| RC-07 | Slide reorder + comment panel | Race | Réordonner des slides pendant que le panneau commentaire est ouvert | Rapport DONE avec slides | Le reorder persiste, le panneau reste cohérent |
| RC-08 | Commande palette + shortcut clash | Race | Presser N puis Ctrl+K rapidement | Palette ouverte ou non | Les deux raccourcis sont indépendants, pas de comportement inattendu |

---

## 12. Récapitulatif & Priorisation

### Total des scénarios manquants : **178 scénarios**

| Catégorie | Nb scénarios | Priorité | Justification |
|:----------|:------------:|:--------:|:--------------|
| Dashboard Home | 20 | P0 | Page d'atterrissage principale, état vide critique |
| Reports List | 41 | P0 | Cœur de la gestion des rapports, pagination + batch |
| Report Detail | 33 | P0 | Visualisation et actions sur les rapports, polling |
| Templates | 12 | P1 | Galerie existante, tests partiels déjà |
| Dashboard Navigation | 19 | P1 | Navigation essentielle, responsive |
| Onboarding & Empty State | 18 | P1 | Première impression utilisateur |
| Raccourcis clavier / Palette | 14 | P2 | Productivité, pas critique |
| Partage | 9 | P2 | Fonctionnalité avancée |
| Responsive & A11y | 8 | P2 | Qualité mais non-bloquant |
| Race Conditions | 8 | P2 | Robustesse |

### Recommandations d'implémentation

1. **Infrastructure de test de session** (prérequis critique) :
   - Créer un helper `authenticatedPage` qui soit :
     - Soit un fixture Playwright avec cookie de session pré-défini
     - Soit un setup global via `globalSetup` avec création d'utilisateur de test
   - Définir un `.env.test` avec DATABASE_URL de test isolée

2. **Order d'implémentation suggéré** :
   - Phase 1 (P0) : Dashboard Home (DH-01 à DH-20) + Reports List (RL-01 à RL-41) + Report Detail (RD-01 à RD-33)
   - Phase 2 (P1) : Templates (TP-01 à TP-12) + Navigation (NAV-01 à NAV-19) + Onboarding (ONB-01 à ONB-18)
   - Phase 3 (P2) : Keyboard Shortcuts (KB-01 à KB-13) + Share (SH-01 à SH-09) + Responsive/A11y (RA-01 à RA-08) + Race Conditions (RC-01 à RC-08)

3. **Pattern de test recommandé** :
   ```typescript
   // Exemple de structure pour un test avec session
   test.describe("Dashboard Home", () => {
     test.use({ storageState: "playwright/.auth/user.json" });

     test("affiche les rapports récents", async ({ page }) => {
       // Arrange - les données sont préparées via API ou DB seed
       // Act - navigation
       await page.goto("/");
       // Assert - vérifications
       await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rapports récents");
     });
   });
   ```

4. **Tests à supprimer ou fusionner** :
   - Les tests auth redirect dans `dashboard-nav.spec.ts` et `pages.spec.ts` sont redondants — garder un seul fichier `auth-redirect.spec.ts` dédié
   - Les tests skip dans `report-creation.spec.ts` doivent être implémentés ou supprimés
   - Fusionner `navigation.spec.ts` (templates) dans la suite templates

---

**Document généré le 2026-06-21** par analyse statique du code source.
