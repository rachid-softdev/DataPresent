---
name: DataPresent
description: Transformez vos données en présentations professionnelles grâce à l'IA
colors:
  primary: "#1e4d0f"
  primary-light: "#2e6e18"
  accent: "#5cb82a"
  secondary: "#9edb7b"
  neutral-bg: "#f4f7f0"
  neutral-surface: "#ffffff"
  neutral-muted: "#ebf1e4"
  neutral-ink: "#111b09"
  neutral-muted-ink: "#4a5c3a"
  neutral-border: "#d4e2c4"
  destructive: "#dc2626"
  dark-bg: "#0a1505"
  dark-surface: "#162309"
  dark-ink: "#e8f5df"
  dark-primary: "#7ac94a"
  dark-accent: "#7ac94a"
  dark-muted: "#162309"
  dark-muted-ink: "#6a8a52"
  dark-border: "#1e3015"
typography:
  display:
    fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif"
    fontSize: "clamp(3rem, 7vw, 5.5rem)"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif"
    fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.01em"
  title:
    fontFamily: "var(--font-fraunces), Fraunces, Georgia, serif"
    fontSize: "clamp(1.3rem, 2.5vw, 1.7rem)"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "var(--font-dm-sans), 'DM Sans', Helvetica, Arial, sans-serif"
    fontSize: "0.975rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "var(--font-dm-sans), 'DM Sans', Helvetica, Arial, sans-serif"
    fontSize: "0.7rem"
    fontWeight: 600
    letterSpacing: "0.12em"
    textTransform: "uppercase"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.25rem"
  full: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1.4rem"
    size: "42px"
  button-primary-hover:
    backgroundColor: "{colors.primary-light}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0.6rem 1.4rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-muted-ink}"
    rounded: "{rounded.sm}"
    padding: "0.45rem 1rem"
  button-ghost-hover:
    backgroundColor: "{colors.neutral-muted}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.sm}"
    border: "1px solid {colors.neutral-border}"
  card:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
  input:
    backgroundColor: "{colors.neutral-surface}"
    textColor: "{colors.neutral-ink}"
    rounded: "{rounded.md}"
    padding: "0.6rem 1rem"
    height: "40px"
---

# Design System: DataPresent

## 1. Overview

**Creative North Star : "Le Tableau Vivant"**

DataPresent est un outil SaaS qui transforme des données brutes en présentations dynamiques. Son système de design reflète cette alchimie : des fondations solides (le vert profond, la typographie serif) qui laissent la place à des résultats qui respirent et communiquent. La métaphore est celle d'un jardin de données — structuré, naturel, en croissance.

L'esthétique est **confiante mais pas corporate**, **naturelle sans être rustique**, **précise sans être froide**. La palette verte ancre l'identité dans la croissance et la vitalité. Le duo typographique Fraunces + DM Sans équilibre personnalité (le serif) et lisibilité utilitaire (le sans). L'élévation est plate par défaut — la profondeur vient de la stratification tonale (surface sur fond), pas des ombres.

Ce système rejette explicitement : le SaaS corporate générique (bleu marine + or, tableaux de bord surchargés), le green-tech-washing (verts fluo, feuilles décoratives), et l'outil "IA magique" (boîte noire sans transparence).

### Key Characteristics
- **Palette restreinte mais chaude** : un vert profond comme ancre, des neutres vert-tintés, un unique accent
- **Typographie à deux voix** : Fraunces pour l'identité et les titres, DM Sans pour le corps et l'UI utilitaire
- **Flat par défaut** : la profondeur est tonale (surface ≠ background ≠ muted), les ombres sont réservées aux interactions
- **Coins généreux** : 12–16px radius sur les conteneurs, 8–10px sur les boutons et inputs
- **Vert cohérent en light et dark** : le vert domine les deux modes, pas de bascule vers du bleu nuit en dark

## 2. Colors

La palette s'articule autour d'un vert profond et naturel (`#1e4d0f` / `oklch(35% 0.08 140)`), soutenu par des neutres vert-tintés plutôt que des gris purs. L'accent est le même vert porté à sa luminance maximale — pas de seconde couleur chaude ou froide.

Cette cohérence entre mode clair et sombre est délibérée : le vert primaire reste reconnaissable dans les deux thèmes, seul son contraste s'adapte.

### Primary

- **Deep Forest** (`#1e4d0f` / `oklch(35% 0.08 140)`) : couleur d'identité. Utilisée sur les boutons principaux, les liens, les éléments actifs, le logo. Elle ancre le système et doit rester dominante mais pas oppressante (≤ 15 % de la surface d'un écran).
- **Glow Green** (`#7ac94a` / `oklch(68% 0.12 140)`) : équivalent dark mode du Deep Forest. Même teinte, luminance plus haute pour le contraste sur fond sombre.

### Secondary

- **Soft Sage** (`#9edb7b` / `oklch(78% 0.09 140)`) : arrière-plan secondaire, badges informatifs, états "succès" légers. En dark mode, cette couleur devient un accent plus sobre.
- **Meadow** (`#5cb82a` / `oklch(62% 0.13 140)`) : accent UI, hover states, indicateurs "actif". Plus saturé que Deep Forest, utilisé avec parcimonie.

### Neutral

- **Pale Mist** (`#f4f7f0`) : fond de page principal (light). Vert-tinté à peine perceptible (chroma < 0.02).
- **White** (`#ffffff`) : fond de cartes, inputs, surfaces élevées (light).
- **Soft Fern** (`#ebf1e4`) : fonds secondaires, zebra striping, états hover subtils. Équivalent dark : **Dark Forest** (`#162309`).
- **Ink** (`#111b09`) : texte principal. Quasiment noir mais vert-tinté (chroma infime). Équivalent dark : **Pale Leaf** (`#e8f5df`).
- **Olive** (`#4a5c3a`) : texte secondaire, labels moins importants. Équivalent dark : `#6a8a52`.
- **Sage Border** (`#d4e2c4`) : bordures de cartes, inputs, séparateurs. Équivalent dark : `#1e3015`.
- **Midnight Soil** (`#0a1505`) : fond de page principal (dark).

### Named Rules

**The One-Voice Rule.** Deep Forest et ses dérivés sont la seule voix couleur du système. Pas de second accent chaud ou froid — le vert porte l'identité, le contraste et les états. L'accent (Meadow) est une variation du même vert, pas une couleur étrangère.

**The Flat Neutral Rule.** Les neutres ne sont jamais gris purs. Chaque neutre est tinté vers la teinte du vert (hue 140, chroma 0.005–0.015). La différence est à peine perceptible individuellement, mais l'effet cumulé est une ambiance chaude et naturelle qui distingue DataPresent des SaaS au gris standard.

## 3. Typography

**Display Font :** Fraunces (serif, avec fallback Georgia / serif)
**Body Font :** DM Sans (sans-serif, avec fallback Helvetica / Arial / sans-serif)

**Caractère :** Fraunces apporte la personnalité — ses ligatures, ses italiques contrastées, son ossature classique mais pas poussiéreuse. DM Sans assure la lisibilité utilitaire : labels, données, tableaux, navigation. Le contraste entre les deux crée une hiérarchie claire sans recourir à la couleur ou au poids seul.

### Hierarchy

- **Display** (700, clamp(3rem, 7vw, 5.5rem), 1, -0.02em) : **Hero de la landing page uniquement.** Usage rare et percutant. Le `clamp` est volontairement large pour l'impact visuel. Ne pas réutiliser dans l'app.
- **Headline** (600, clamp(1.8rem, 3.5vw, 2.8rem), 1.15, -0.01em) : **Titres de sections** (landing et app). `text-wrap: balance`.
- **Title** (600, clamp(1.3rem, 2.5vw, 1.7rem), 1.2) : **Titres de cartes, noms de rapports.** `text-wrap: balance`.
- **Body** (400, 0.975rem / 15.6px, 1.65) : **Texte courant.** Longueur de ligne max 65–75ch.
- **Body Large** (400, 1.125rem, 1.7) : **Sous-titres de hero, descriptions de section.**
- **Label** (600, 0.7rem / 11.2px, 0.12em, uppercase) : **Étiquettes de section, kickers.** Utilisation sobre — pas sur chaque section.
- **UI / Buttons** (500, 0.875–0.95rem) : **DM Sans uniquement.** Pas de Fraunces dans les boutons ou inputs.

### Named Rules

**The Fraunces Ceiling Rule.** Fraunces est interdit dans les composants d'interface : boutons, inputs, labels, tableaux, navigation, données. Il est réservé aux titres et à l'identité. DM Sans porte tout le reste.

## 4. Elevation

Le système est **plat par défaut** avec une **stratification tonale**. La profondeur est créée par la différence de couleur entre les couches (background → surface → muted) plutôt que par des ombres. Cette approche est cohérente avec l'esthétique naturelle et sobre de DataPresent.

Les ombres portées existent mais sont réservées aux **états interactifs** (hover sur les cartes, boutons) et aux **modaux/dropdowns** (besoin de détachement explicite). Elles ne sont jamais utilisées comme effet décoratif.

### Shadow Vocabulary

- **Card Hover** (`box-shadow: 0 4px 16px rgba(30, 77, 15, 0.06)` / dark: `0 4px 16px rgba(0, 0, 0, 0.3)`) : survol de carte, légère élévation.
- **Auth Card** (`box-shadow: 0 8px 32px rgba(30, 77, 15, 0.06)` / dark: `0 8px 32px rgba(0, 0, 0, 0.3)`) : carte de connexion/inscription, besoin de détachement.
- **Button Hover** (`box-shadow: 0 6px 20px rgba(30, 77, 15, 0.25)` / dark: `0 6px 20px rgba(122, 201, 74, 0.2)`) : bouton primaire au survol.

### Named Rules

**The Flat-By-Default Rule.** Les surfaces sont plates au repos. Les ombres apparaissent uniquement en réponse à un état (hover, focus, modal). Si un élément n'est pas interactif, il n'a pas d'ombre.

## 5. Components

### Buttons

- **Forme :** Coins arrondis (0.5rem / 8px). Hauteur standard 40px (petit 34px, large 48px). DM Sans, weight 500.
- **Primary :** Fond Deep Forest, texte blanc. Hover : fond Primary Light, translateY(-1px), box-shadow.
- **Ghost :** Transparent, texte Olive. Hover : fond Soft Fern, texte Ink.
- **Outline :** Transparent, bordure Sage Border. Hover : bordure Deep Forest, texte Deep Forest.
- **Destructive :** Fond rouge (#dc2626), texte blanc. Hover : fond assombri.
- **Landing (XL) :** Mêmes variantes mais hauteur 58px, weight 600, padding plus large (1rem 2.4rem).

### Inputs / Fields

- **Forme :** Coins arrondis (0.75rem / 12px). Bordure Sage Border. Fond White. Hauteur 40px.
- **Focus :** Bordure Deep Forest + ring 3px (Deep Forest à 15 % d'opacité). Outline supprimée.
- **Placeholder :** Olive, opacité 0.6.
- **Disabled :** Opacité 0.5, curseur not-allowed.

### Cards / Containers

- **Forme :** Coins arrondis (1rem / 16px). Fond White. Bordure Sage Border (1px).
- **État :** Plat au repos. Hover : bordure tintée Primary, ombre légère (Card Hover).
- **Sous-composants :** Header, Body, Footer — padding 1.5rem partout. Title en Fraunces Title.

### Navigation

- **Landing Nav :** Fixe en haut, fond translucent (85% bg + blur 16px), bordure basse Sage Border. Logo + navigation links + CTA button.
- **App Nav (header) :** Même traitement que landing. Logo + nav links + user menu + theme toggle.
- **App Sidebar :** 240px de large. Liens en DM Sans 0.875rem, weight 500, Olive. Hover : fond Soft Fern, texte Ink. Actif : fond Primary 10%, texte Deep Forest, weight 600. Coins 10px.
- **Auth Header :** Fixe en haut, same blur/nav style. Liens minimes (logo + langue).

### Tabs

- **Forme :** Ligne horizontale avec indicateur actif en souligné. Liens en DM Sans, 0.875rem, weight 500, Olive. Actif : Deep Forest, souligné 2px.
- **Padding :** 0.7rem 1.25rem.

### Badges / Pills

- **Forme :** Pill (999px radius). DM Sans 0.75rem, weight 600.
- **Variantes :** Primary (Deep Forest 12% bg), Success (vert badge), Warning (jaune), Error (rouge), Outline (bordure seulement).

### Filter Pills

- **Forme :** Pill (999px radius). Bordure Sage Border, texte Olive. Hover : bordure Deep Forest. Actif : fond Deep Forest, texte blanc.

### Skeleton / Loading

- **Forme :** Blocs Soft Fern avec animation pulse (opacité 1 → 0.5). Radius 8px.

### Empty State

- **Composition centrée :** Icône dans boîte Soft Fern (56px, coins 16px), titre weight 600, description Olive, max-width 320px. Padding 4rem.

### Alert Banners

- **Forme :** 12px radius. Bordure 1px. Padding 0.9rem 1.1rem. DM Sans 0.875rem.
- **Info :** Fond Primary 8%, bordure Primary 20%.
- **Success :** Fond vert badge 8%, texte vert badge.
- **Warning :** Fond jaune 8%, texte jaune.
- **Error :** Fond rouge 8%, texte rouge.

## 6. Do's and Don'ts

### Do:

- **Do** utiliser Deep Forest comme ancre visuelle principale — boutons primaires, liens, indicateurs actifs.
- **Do** laisser Fraunces porter l'identité sur les titres, et DM Sans porter l'interface utilitaire.
- **Do** privilégier la stratification tonale (surface ≠ muted ≠ bg) plutôt que les ombres pour créer de la profondeur.
- **Do** utiliser les neutres vert-tintés (jamais des gris purs) pour que l'ambiance reste cohérente.
- **Do** appliquer `text-wrap: balance` sur les h1–h3 et `text-wrap: pretty` sur les paragraphes longs.
- **Do** réserver l'accent Meadow pour les micro-interactions, hover states et indicateurs — ≤ 10% de l'écran.
- **Do** inclure les états complets pour chaque composant interactif : default, hover, focus, active, disabled, loading.

### Don't:

- **Don't** utiliser Fraunces dans les composants d'interface (boutons, inputs, labels, tableaux, navigation).
- **Don't** ajouter une seconde couleur d'accent — le vert est la seule voix couleur du système.
- **Don't** utiliser des ombres décoratives. Les ombres sont réservées aux états interactifs et aux modaux.
- **Don't** faire du green-tech-washing : pas de verts fluo, pas de feuilles décoratives, pas d'emojis de plantes.
- **Don't** tomber dans le SaaS corporate générique : pas de bleu marine + or, pas de tableaux de bord surchargés.
- **Don't** utiliser le display clamp sur les titres dans l'interface produit (dashboard, settings). Le fluid scaling est réservé à la landing page.
- **Don't** créer de boîte noire IA — l'UI doit toujours montrer ce que l'IA fait, pas le cacher.
- **Don't** utiliser de side-stripe borders (border-left > 1px coloré). Utiliser des fonds teintés ou des bordures complètes.
- **Don't** utiliser de gradient text (`background-clip: text`). Un seul poids de couleur.
- **Don't** mettre un tiny uppercase eyebrow au-dessus de chaque section — c'est un tic d'IA générique.
