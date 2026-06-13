---
target: landing page
total_score: 21
p0_count: 1
p1_count: 2
timestamp: 2026-06-12T15-42-11Z
slug: datapresent-web-app-locale-page-tsx
---
# Critique UX — Landing Page DataPresent

## Design Health Score: 21/40

| # | Heuristique | Score | Key Issue |
|---|-------------|-------|-----------|
| 1 | Visibilité du statut système | 4 | n/a |
| 2 | Correspondance système/monde réel | 3 | Jargon technique absent mais métriques non sourcées |
| 3 | Contrôle et liberté utilisateur | 1 | Aucun contrôle de navigation, pas de breadcrumbs |
| 4 | Cohérence et standards | 3 | Structure cohérente mais répétitive |
| 5 | Prévention des erreurs | 1 | Liens morts dans le footer |
| 6 | Reconnaissance plutôt que mémorisation | 2 | Labels section répétés, tout se ressemble |
| 7 | Flexibilité et efficacité | 1 | Aucun raccourci, pas de recherche |
| 8 | Design esthétique et minimaliste | 3 | Palette réussie mais structure générique |
| 9 | Aide à la reconnaissance d'erreurs | 1 | Pas de scénario d'erreur visible |
| 10 | Aide et documentation | 2 | Pas de FAQ, docs, ou blog accessible |

## Anti-Patterns Verdict

OUI — la landing a un look "AI-generated template" fort. Tiny uppercase eyebrow répété 6×, numbered section markers 01/02/03, hero-metric template badge→titre→stats, identical card grids dans Features et Pricing.

## Priority Issues

### P0 — Aucune preuve visuelle du produit
Why: La landing ne montre jamais une capture d'écran. Le visiteur doit s'inscrire sans savoir à quoi ressemble le résultat.
Fix: Ajouter un mockup du générateur dans le hero (split layout).
Command: /impeccable bolder

### P1 — Architecture de contenu répétitive
Why: 5 sections suivent le template eyebrow→heading→grid. Le cerveau s'habitue après la 3e section.
Fix: Varier les layouts, supprimer les eyebrows de 4 sections.
Command: /impeccable layout

### P1 — Zero social proof
Why: Aucun témoignage, logo client, cas d'usage concret. Stats non sourcées.
Fix: Ajouter section témoignages. Remplacer stats génériques.
Command: /impeccable harden

### P2 — Hero sans démonstration
Why: Le hero badge + titre + body flotte sans ancrage visuel. Aucun élément "wow".
Fix: Split hero 50/50 avec mockup produit à droite.
Command: /impeccable bolder

### P2 — Footer liens morts
Why: Tous les href="#". Liens fantômes nuisent à la confiance.
Fix: Implémenter les pages ou supprimer les liens.
Command: /impeccable distill

## Persona Red Flags
Jordan: Aucun visuel du output, watermark Gratuit bloque
Alex: Aucune spécification technique, pas d'exemple output complexe
Casey: Hero CTA empilé en mobile, 6 features cartes stacked = scroll infini
