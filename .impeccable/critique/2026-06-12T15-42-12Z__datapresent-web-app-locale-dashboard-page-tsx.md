---
target: dashboard
total_score: 25
p0_count: 1
p1_count: 2
timestamp: 2026-06-12T15-42-12Z
slug: datapresent-web-app-locale-dashboard-page-tsx
---
# Critique UX — Dashboard DataPresent

## Design Health Score: 25/40

| # | Heuristique | Score | Key Issue |
|---|-------------|-------|-----------|
| 1 | Visibilité du statut système | 3 | Progress bar upload, skeletons. Pas d'indicateur mise à jour pendant polling. |
| 2 | Correspondance système/réel | 4 | FR natif, libellés clairs. |
| 3 | Contrôle et liberté utilisateur | 2 | Cancel pendant upload, mais pas de breadcrumb ni undo. |
| 4 | Cohérence et standards | 2 | Mélange `.app-*` classes et composants `@datapresent/ui`. |
| 5 | Prévention des erreurs | 3 | Validation fichier. Pas de garde-fou navigation pendant upload. |
| 6 | Reconnaissance plutôt que mémorisation | 3 | Empty states, onboarding. Pas de search. |
| 7 | Flexibilité et efficacité | 1 | Aucun raccourci clavier, pas d'actions batch. |
| 8 | Design esthétique et minimaliste | 3 | Palette propre. Cartes dashboard trop pauvres. |
| 9 | Aide à la reconnaissance d'erreurs | 3 | Messages inline + toast + retry. |
| 10 | Aide et documentation | 1 | Onboarding OK. Aucun tooltip contextuel. |

## Anti-Patterns Verdict
Inconsistent component vocabulary: double système CSS classes vs @datapresent/ui. Nav parle un langage, les cards un autre.

## Priority Issues

### P0 — Cartes dashboard non identifiables comme cliquables
Where: page.tsx → `<Link>` wrap `<Card>`
Why: Aucun indicateur visuel, pas de chevron, pas de focus visible garanti.
Fix: Ajouter icône ChevronRight + active border transition.
Command: Fix direct

### P1 — Pas de sidebar settings / secondary nav
Where: settings pages (profile, account, org, team, api-keys, billing)
Why: Aucun moyen de naviguer entre les settings. L'utilisateur doit revenir au dashboard.
Fix: Créer settings/layout.tsx avec sidebar.
Command: craft settings navigation

### P1 — Pas de retour arrière sur sous-pages
Where: /new et /reports/[id]
Why: Aucun breadcrumb, aucun bouton retour.
Fix: Ajouter "← Retour aux rapports" sur ces pages.
Command: Fix direct

### P2 — Liste des rapports sans search ni filtre
Where: reports/page.tsx
Why: Pagination OK mais pas de search, filtre ou tri.
Fix: Ajouter barre de filtres avec app-filter-pill.
Command: Fix direct

### P2 — handleRetry trompeur
Where: NewReportForm.tsx handleRetry()
Why: Réinitialise l'erreur mais ne relance pas l'upload. Le bouton ment.
Fix: handleRetry doit relancer handleSubmit, ou renommer en "Effacer l'erreur".
Command: Fix direct

## Persona Red Flags
Alex: 0 raccourcis clavier, pas de search, pas d'actions batch
Sam: `aria-current` manquant, contraste muted-foreground risque, badges couleur-only
Riley: handleRetry trompeur, pas de beforeunload, polling agressif
