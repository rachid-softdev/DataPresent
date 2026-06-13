# Product

## Register

product

## Users

**Qui :** Consultants, analystes, chefs de produit, marketers, entrepreneurs — des professionnels qui transforment régulièrement des données en présentations pour leurs clients, leur direction ou leurs parties prenantes.

**Contexte d'utilisation :**
- Préparation de rapports clients ou de pitch decks
- Reporting interne hebdomadaire / mensuel
- Présentations data-driven pour des conférences ou réunions
- L'utilisateur est pressé, multitâche, souvent entre deux réunions
- Il veut passer des données brutes à une présentation professionnelle en quelques clics, sans ouvrir PowerPoint

**Leur état d'esprit :** Ils cherchent à gagner du temps sans sacrifier la qualité. Ils ont besoin de confiance dans l'outil — le résultat final doit être présentable sans retouche.

## Product Purpose

DataPresent convertit des fichiers de données (Excel, CSV, PDF, Google Sheets) en présentations professionnelles générées par IA.

**Pourquoi ça existe :** Créer une présentation à partir de données prend des heures (nettoyage, structuration, design, mise en forme). DataPresent réduit ce temps à quelques minutes, tout en produisant un résultat de qualité professionnelle.

**Ce à quoi ressemble le succès :** L'utilisateur importe ses données, choisit un format, et en un clic obtient une présentation complète — slides, graphiques, mise en page — qu'il peut exporter ou partager sans retouche. L'outil disparaît dans la tâche.

## Brand Personality

**3 mots :** Confiant · Naturel · Précis

**Voice & Tone :**
- **Confiant** — L'outil maîtrise son sujet. Pas de jargon inutile, pas de fausse modestie. Les libellés sont directs, les actions prévisibles.
- **Naturel** — La palette verte évoque la croissance, la fraîcheur, le vivant. Les interactions sont organiques, pas mécaniques. Le ton est humain (français natif), pas corporate.
- **Précis** — Chaque pixel a une raison d'être. La typographie Fraunces (serif) apporte de la personnalité ; DM Sans (sans) apporte la lisibilité et la rigueur. Rien n'est laissé au hasard.

**Émotion cible :** L'utilisateur ressent une **confiance tranquille** — l'outil fait son travail proprement, rapidement, sans lui demander d'effort. Il peut se concentrer sur le fond, pas sur la forme.

## Anti-references

Ce que DataPresent ne doit PAS être :

1. **Le SaaS corporate générique** — Bleu marine + or, tableaux de bord surchargés, sidebar pléthorique, graphismes sans âme. DataPresent a une personnalité (verte, naturelle, typographique) qui le distingue.
2. **Le green-tech-washing** — Verts fluo, feuilles partout, emojis de plantes, "éco-responsable" visuel sans substance. Rester dans un vert profond et naturel (#1e4d0f, #5cb82a), pas dans les clichés.
3. **L'outil "IA magique"** — Boîte noire où l'utilisateur clique et attend sans comprendre ce qui se passe. DataPresent doit montrer son travail, pas le cacher.
4. **Le template PowerPoint générique** — L'outil produit des présentations, mais l'interface elle-même ne doit pas ressembler à PowerPoint. Pas de rubans, pas de menus tentaculaires, pas de fenêtres flottantes.

## Design Principles

### 1. Des données à l'impact en un geste
Chaque interaction doit rapprocher l'utilisateur de son objectif : une présentation convaincante. Pas d'écrans superflus, pas de confirmation inutile, pas de dead ends. Le workflow est un entonnoir : déposer des données → choisir un format → obtenir une présentation.

### 2. La confiance par la clarté
L'IA est une boîte noire par nature. L'UI doit la rendre transparente : montrer ce que l'IA a compris des données, laisser l'utilisateur valider ou ajuster, prévisualiser le résultat avant de l'exporter. Un utilisateur qui comprend l'outil lui fait confiance.

### 3. Professionnel sans être corporate
Les présentations produites sont professionnelles (clients, direction), mais l'outil ne doit pas ressembler à un logiciel d'entreprise froid. Le serif Fraunces apporte de l'âme, les micro-interactions de la personnalité, la palette verte de la chaleur. La qualité du résultat se ressent dès l'interface.

### 4. Montrer, pas décrire
Prévisualisations en direct, rendu instantané, WYSIWYG partout où c'est possible. L'utilisateur façonne sa présentation visuellement, pas à travers des formulaires et des menus déroulants. Si on peut le montrer, on le montre.

### 5. Le détail fait la différence
Micro-interactions, espacement précis, transitions fluides, états vides utiles, messages d'erreur humains. La finition de l'outil est le premier gage de qualité pour l'utilisateur. Chaque pixel a une raison d'être — si ce n'est pas le cas, on l'enlève.

## Accessibility & Inclusion

- **Cible :** WCAG AA (contraste ≥ 4.5:1 pour le texte courant, ≥ 3:1 pour les grands textes)
- **Motion :** Déjà implémenté — `@media (prefers-reduced-motion: reduce)` désactive toutes les animations
- **Navigation :** Support clavier, focus visible, landmarks ARIA
- **Couleur :** Les informations ne reposent jamais uniquement sur la couleur (graphiques avec motifs ou libellés directs)
- **Langue :** Interface 100 % française (i18n via next-intl pour l'internationalisation future)
- **Dyslexie :** Police DM Sans lisible, interlignage généreux (1.5–1.7), longueur de ligne limitée pour la prose
