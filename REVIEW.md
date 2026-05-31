# Code Review — DataPresent

> **Date :** 31 mai 2026
> **Projet :** DataPresent — Générateur de présentations IA à partir de données (Excel, CSV, PDF, Google Sheets)
> **Scope :** Codebase complet (`datapresent-web` + `@datapresent/ui` + projets satellites)

---

## 🗺️ ÉTAPE 0 — Cartographie du codebase

### 📋 Stack technique détectée

| Couche | Technologie | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.6 |
| **Langage** | TypeScript | ^5 |
| **UI** | Tailwind CSS | v4 |
| **UI Components** | shadcn/ui (surcouche locale `@datapresent/ui`) | workspace:* |
| **Auth** | NextAuth.js | v5 (beta) |
| **ORM** | Prisma | 5.22.0 |
| **Base de données** | PostgreSQL | — |
| **IA** | Anthropic Claude SDK | 0.92.0 |
| **Queue** | BullMQ + ioredis | 5.76.5 / 5.10.1 |
| **Stockage** | AWS SDK S3 (Cloudflare R2) | 3.1041.0 |
| **Paiement** | Stripe | 22.1.0 |
| **Email** | Nodemailer (dev) / Resend (prod) | 8.0.5 / 6.12.2 |
| **Monitoring** | Sentry | 10.53.1 |
| **Tests** | Playwright (e2e) + Vitest (unit) | 1.59.1 / 4.1.6 |
| **Linting** | ESLint + Biome + Prettier | — |
| **Internationalisation** | next-intl | 4.11.0 |
| **Runtime** | Node.js (via .nvmrc) | — |

### 📁 Arborescence des modules clés

```
datapresent/                          ← Monorepo racine (pnpm workspace)
├── packages/
│   └── datapresent-ui/               ← Package UI partagé
│       └── src/
│           ├── index.ts
│           ├── utils.ts
│           └── components/ui/        ← 24 composants (button, dialog, input, etc.)
├── datapresent-web/                  ← Application principale (Next.js)
│   ├── app/                          ← Routes & pages
│   │   ├── layout.tsx                ← Root layout (fonts, providers, theme)
│   │   ├── globals.css               ← Styles globaux Tailwind
│   │   ├── page.tsx                  ← Landing page (redirige vers [locale])
│   │   ├── sitemap.ts / robots.ts    ← SEO
│   │   ├── api/                      ← API routes non-localisées
│   │   │   ├── admin/                ← Routes admin
│   │   │   ├── csrf-token/           ← CSRF token endpoint
│   │   │   ├── debug/                ← Debug
│   │   │   ├── me/                   ← User info
│   │   │   ├── og-image/             ← OG image generation
│   │   │   ├── og-html/              ← OG HTML
│   │   │   └── og/                   ← OG generic
│   │   └── [locale]/                 ← Routes localisées (fr/en)
│   │       ├── layout.tsx
│   │       ├── (auth)/               ← Auth group
│   │       │   ├── login/            ← Page de connexion
│   │       │   └── signup/           ← Page d'inscription
│   │       ├── (dashboard)/          ← Dashboard (authentifié)
│   │       │   ├── layout.tsx        ← Sidebar + nav
│   │       │   ├── page.tsx          ← Liste des rapports
│   │       │   ├── new/              ← Upload + création
│   │       │   ├── reports/[id]/     ← Viewer slides + partage
│   │       │   ├── templates/        ← Galerie templates
│   │       │   └── settings/         ← Settings (account, billing, team, etc.)
│   │       ├── share/[shareToken]/   ← Vue publique partagée
│   │       ├── embed/[shareToken]/   ← Vue embed (iframe)
│   │       ├── blog/                 ← Blog
│   │       ├── api/                  ← API routes localisées
│   │       │   ├── auth/             ← Auth endpoints
│   │       │   ├── upload/           ← Upload fichier
│   │       │   ├── reports/          ← CRUD reports
│   │       │   ├── organizations/    ← CRUD organisations
│   │       │   ├── user/             ← Profil utilisateur
│   │       │   ├── share/            ← Partage
│   │       │   ├── comments/         ← Commentaires
│   │       │   ├── api-keys/         ← API keys
│   │       │   └── stripe/           ← Paiement (checkout, portal, webhook)
│   │       ├── forgot-password/
│   │       ├── reset-password/
│   │       ├── accept-invite/
│   │       ├── help/
│   │       ├── privacy/
│   │       └── terms/
│   ├── components/                   ← Composants React
│   │   ├── ui/                       ← 24 composants UI (shadcn-like)
│   │   ├── layout/                   ← Header, Footer
│   │   ├── landing/                  ← Landing page (hero, features, pricing...)
│   │   ├── reports/                  ← ReportActions
│   │   ├── slides/                   ← SlideViewer, SlideCard, layouts/
│   │   │   └── layouts/              ← 7 layouts (KpiGrid, BarChart, etc.)
│   │   ├── upload/                   ← DropZone, DataPreview, SectorSelector
│   │   ├── comments/                 ← CommentThread, CommentInput, CommentItem
│   │   ├── billing/                  ← PricingTable, PlanBadge, PlanSelector
│   │   ├── share/                    ← ShareModal
│   │   ├── org/                      ← DashboardNav, OrgSwitcher
│   │   ├── onboarding/              ← OnboardingTour, DashboardWithOnboarding
│   │   ├── blog/                     ← blog-card, blog-header, blog-renderer
│   │   ├── error/                    ← Error boundary
│   │   ├── usage/                    ← UsageCard
│   │   ├── watermark/                ← Watermark
│   │   ├── i18n/                     ← LocaleSwitcher
│   │   ├── hooks/                    ← HydrationGuard
│   │   ├── theme-provider.tsx
│   │   └── providers.tsx             ← Providers root
│   ├── lib/                          ← Logique métier & infrastructure
│   │   ├── auth.ts                   ← NextAuth config
│   │   ├── prisma.ts                 ← Prisma singleton
│   │   ├── stripe.ts                 ← Stripe client
│   │   ├── r2.ts                     ← Cloudflare R2 client
│   │   ├── redis.ts                  ← Redis/ioredis client
│   │   ├── cache.ts                  ← LRU cache
│   │   ├── crypto.ts                 ← Cryptographie (tokens, hash)
│   │   ├── password.ts               ← Argon2 password hashing
│   │   ├── password-service.ts       ← Password management service
│   │   ├── email.ts                  ← Email service
│   │   ├── email-normalize.ts        ← Email normalization
│   │   ├── api-client.ts             ← API client utilities
│   │   ├── api-keys.ts               ← API keys management
│   │   ├── rate-limit.ts             ← Rate limiting
│   │   ├── sentry.ts                 ← Sentry config
│   │   ├── sanitize.ts               ← HTML sanitization
│   │   ├── client-ip.ts              ← Client IP detection
│   │   ├── sector.ts                 ← Sector utilities
│   │   ├── upload-validation.ts      ← Upload validation
│   │   ├── validation-schemas.ts     ← Zod schemas
│   │   ├── utils.ts                  ← Utilitaires généraux
│   │   ├── errors.ts                 ← Codes d'erreur uniformes
│   │   ├── org.ts                    ← Organization helpers
│   │   ├── templates.tsx             ← Templates
│   │   ├── toast.ts                  ← Toast notifications
│   │   ├── plans.ts                  ← Plans definitions
│   │   ├── admin.ts                  ← Admin utilities
│   │   ├── ai/                       ← Couche IA
│   │   │   ├── index.ts
│   │   │   ├── analyze.ts            ← Appel Claude
│   │   │   ├── prompts.ts            ← Prompts par secteur
│   │   │   └── schemas.ts            ← Zod schemas réponse Claude
│   │   ├── parsers/                  ← Parsing fichiers
│   │   │   ├── index.ts
│   │   │   ├── csv.ts
│   │   │   ├── xlsx.ts
│   │   │   ├── pdf.ts
│   │   │   └── gsheets.ts
│   │   ├── exporters/                ← Export presentations
│   │   │   ├── index.ts
│   │   │   ├── pptx.ts
│   │   │   ├── pdf.ts
│   │   │   └── docx.ts
│   │   ├── queue/                    ← BullMQ queue
│   │   │   ├── index.ts
│   │   │   ├── client.ts
│   │   │   ├── job-security.ts
│   │   │   └── workers/
│   │   │       ├── generate.worker.ts
│   │   │       └── export.worker.ts
│   │   ├── security/                 ← Sécurité
│   │   │   ├── index.ts
│   │   │   ├── csrf.ts
│   │   │   ├── csrf-middleware.ts
│   │   │   └── error-logger.ts
│   │   ├── entitlements/             ← Feature flags & quotas
│   │   │   ├── index.ts
│   │   │   ├── cache.ts
│   │   │   ├── compat.ts
│   │   │   ├── downgrade.ts
│   │   │   ├── experiments.ts
│   │   │   ├── feature-gate.ts
│   │   │   ├── middleware.ts
│   │   │   ├── repository.ts
│   │   │   └── types.ts
│   │   ├── email-templates/          ← Templates email
│   │   ├── blog/                     ← Blog types
│   │   ├── stripe-webhook-handler.ts
│   │   └── i18n-client.ts
│   ├── hooks/                        ← React hooks
│   │   └── use-entitlements.tsx
│   ├── i18n/                         ← Internationalisation
│   │   ├── request.ts
│   │   └── routing.ts
│   ├── messages/                     ← Traductions
│   │   ├── en.json
│   │   └── fr.json
│   ├── prisma/                       ← Schéma BDD
│   │   └── schema.prisma             ← 18 modèles, 466 lignes
│   ├── middleware.ts                 ← Middleware (CORS, i18n, sécurité)
│   ├── env.ts                        ← Validation env avec Zod
│   ├── next.config.ts                ← Config Next.js
│   ├── vitest.config.ts              ← Config Vitest
│   ├── playwright.config.ts          ← Config Playwright
│   └── scripts/                      ← Scripts utilitaires (13 fichiers)
│       ├── start-workers.ts
│       ├── create-stripe-products.ts
│       ├── generate-blog-posts.ts
│       ├── check-env.ts / push-env.ts
│       └── ... (MailHog, Stripe CLI setup)
├── DataPresent-mobile/               ← Projet mobile (placeholder)
├── DataPresent-desktop/              ← Projet desktop (placeholder)
├── DataPresent-extension/            ← Extension navigateur (placeholder)
├── .github/                          ← GitHub workflows
├── .husky/                           ← Git hooks
├── security-audit/                   ← Rapports d'audit sécurité
├── package.json                      ← Root package.json
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
└── AGENTS.md / PLAN.md / README.md   ← Documentation
```

### 📊 Volume estimé

| Catégorie | Fichiers | Lignes estimées |
|---|---|---|
| Pages & Routes (`app/`) | ~97 | ~9 200 |
| Composants (`components/`) | ~74 | ~7 500 |
| Logique métier (`lib/`) | ~61 | ~6 800 |
| Tests (`tests/`) | ~87 | ~4 500 |
| Scripts (`scripts/`) | ~12 | ~800 |
| Package UI (`packages/`) | ~26 | ~1 200 |
| Hooks, i18n, config | ~10 | ~500 |
| **Total (source app)** | **~360** | **~30 000** |

### 🏗️ Découpage en couches identifié

```
┌──────────────────────────────────────────────┐
│                PRESENTATION                    │
│  app/[locale]/*.tsx  +  components/*          │
│  (Pages, Layouts, Composants UI)              │
├──────────────────────────────────────────────┤
│               CANAL (API)                      │
│  app/[locale]/api/*/route.ts  +  app/api/*    │
│  (Route handlers Next.js)                     │
├──────────────────────────────────────────────┤
│           APPLICATION / USE CASES              │
│  lib/* (auth, org, email, upload-validation)  │
│  lib/ai/, lib/exporters/, lib/parsers/        │
│  lib/queue/workers/                           │
├──────────────────────────────────────────────┤
│               DOMAIN / MÉTIER                  │
│  lib/entitlements/ (feature flags, quotas)    │
│  lib/security/, lib/errors.ts                 │
│  prisma/schema.prisma (modèles)              │
├──────────────────────────────────────────────┤
│            DATA ACCESS (Repositories)          │
│  lib/prisma.ts (PrismaClient)                 │
│  lib/cache.ts (LRU Cache)                    │
│  lib/entitlements/repository.ts              │
├──────────────────────────────────────────────┤
│              INFRASTRUCTURE                    │
│  lib/stripe.ts, lib/r2.ts, lib/redis.ts      │
│  lib/queue/client.ts                         │
│  lib/email.ts, lib/sentry.ts                 │
│  middleware.ts, next.config.ts               │
└──────────────────────────────────────────────┘
```

### 🚪 Points d'entrée principaux

#### Pages (Front-End)
| Route | Fichier | Type |
|---|---|---|
| `/` | `app/page.tsx` | Landing page |
| `/fr/` ou `/en/` | `app/[locale]/page.tsx` | Landing localisée |
| `/fr/login` | `app/[locale]/(auth)/login/page.tsx` | Connexion |
| `/fr/signup` | `app/[locale]/(auth)/signup/page.tsx` | Inscription |
| `/fr/dashboard` | `app/[locale]/(dashboard)/page.tsx` | Dashboard |
| `/fr/dashboard/new` | `app/[locale]/(dashboard)/new/page.tsx` | Nouveau rapport |
| `/fr/dashboard/reports/[id]` | `app/[locale]/(dashboard)/reports/[id]/page.tsx` | Viewer |
| `/fr/dashboard/settings` | `app/[locale]/(dashboard)/settings/page.tsx` | Paramètres |
| `/fr/share/[shareToken]` | `app/[locale]/share/[shareToken]/page.tsx` | Partagé |
| `/fr/embed/[shareToken]` | `app/[locale]/embed/[shareToken]/page.tsx` | Embed |
| `/fr/blog` | `app/[locale]/blog/page.tsx` | Blog |

#### API Routes (Back-End)
| Endpoint | Méthodes | Fichier |
|---|---|---|
| `/api/auth/*` | GET/POST | `app/[locale]/api/auth/[...nextauth]/route.ts` |
| `/api/upload` | POST | `app/[locale]/api/upload/route.ts` |
| `/api/reports/*` | GET/POST/PUT/DELETE | `app/[locale]/api/reports/*/route.ts` |
| `/api/organizations/*` | GET/POST/PUT | `app/[locale]/api/organizations/*/route.ts` |
| `/api/user/*` | GET/PUT | `app/[locale]/api/user/*/route.ts` |
| `/api/stripe/webhook` | POST | `app/[locale]/api/stripe/webhook/route.ts` |
| `/api/stripe/checkout` | POST | `app/[locale]/api/stripe/checkout/route.ts` |
| `/api/stripe/portal` | POST | `app/[locale]/api/stripe/portal/route.ts` |
| `/api/share/*` | GET/POST | `app/[locale]/api/share/*/route.ts` |
| `/api/comments/*` | GET/POST | `app/[locale]/api/comments/*/route.ts` |
| `/api/api-keys/*` | GET/POST/DELETE | `app/[locale]/api/api-keys/*/route.ts` |
| `/api/csrf-token` | GET | `app/api/csrf-token/route.ts` |
| `/api/og-image` | GET | `app/api/og-image/route.ts` |
| `/api/admin/*` | GET/POST | `app/api/admin/*/route.ts` |

### 🧪 Tests

| Type | Framework | Fichiers | Couverture |
|---|---|---|---|
| **Unitaires** | Vitest | ~65 | auth, crypto, validation, parsers, ai, rate-limit, security, cache, etc. |
| **E2E** | Playwright | ~5 | auth, home, navigation, report-creation, share, pages |
| **Setup** | — | `setup.ts` | Global test setup |

### 📦 Dépendances externes principales

**Runtime (dependencies) :**
- `next@16.2.6` — Framework
- `react@19.2.4`, `react-dom@19.2.4` — UI
- `@prisma/client@^5.22.0` + `prisma@^5.22.0` — ORM/DB
- `next-auth@^5.0.0-beta.31` — Auth
- `@auth/prisma-adapter@^2.11.2` — Auth DB adapter
- `@anthropic-ai/sdk@^0.92.0` — IA Claude
- `@aws-sdk/client-s3@^3.1041.0` — R2/S3 Storage
- `stripe@^22.1.0`, `@stripe/stripe-js@^9.4.0` — Paiement
- `bullmq@^5.76.5`, `ioredis@^5.10.1` — Queue/Redis
- `next-intl@^4.11.0` — i18n
- `zod@^4.4.2` — Validation
- `zod@^4.4.2` (double)
- `react-hook-form@^7.75.0` + `@hookform/resolvers@^5.2.2` — Forms
- `zustand@^5.0.12` — State management
- `recharts@^3.8.1` — Graphiques
- `framer-motion@^12.38.0` — Animations
- `@dnd-kit/*` — Drag & drop
- `lucide-react@^1.14.0` — Icônes
- `sonner@^2.0.7` — Toasts
- `sentry/nextjs@^10.53.1` — Monitoring
- `exceljs`, `docx`, `pptxgenjs`, `pdf-parse` — Parsing/export
- `puppeteer-core@^22.0.0` — PDF generation
- `nodemailer@8.0.5`, `resend@^6.12.2` — Email
- `@node-rs/argon2@^2.0.2` — Password hashing

**Dev dependencies :**
- TypeScript ^5, ESLint 9, Prettier, Biome
- Playwright, Vitest, Testing Library
- Husky, commitlint, lint-staged
- Tailwind CSS v4, PostCSS

---

> **Fin de l'ÉTAPE 0 — Cartographie.**
> Ce rapport est fourni en contexte à tous les agents spécialisés ci-dessous.

---

## 🖥️ ÉTAPE 1 — Analyse Front-End (Terminée)

### 🚨 Problèmes critiques

| Agent | Composant/Fichier | Description | Impact | Solution |
|---|---|---|---|---|
| **Agent 6** | `globals.css` (lignes 3-57 + 154-189) | **Design tokens dupliqués.** Les variables CSS de la landing page recréent les tokens globaux. | Toute modification couleur nécessite 2 changements. Risque de dérive landing/app. | Supprimer les tokens landing, utiliser les tokens globaux partout. |
| **Agent 5** | `globals.css` (lignes 152-739) | **~500+ lignes CSS landing dans le fichier global.** Styles `.landing-*` chargés sur toutes les pages. | L'app entière charge des styles landing inutiles. | Extraire vers `app/landing.css` importé conditionnellement. |
| **Agent 6** | `components/slides/layouts/Comparison.tsx` | **Couleurs Tailwind hardcodées.** `text-gray-900`, `bg-gray-50`, etc. ignorent le design system clair/sombre. | Cassé en mode dark : texte invisible. | Remplacer par `text-foreground`, `bg-muted`. |
| **Agent 6** | `components/slides/layouts/{BarChart,PieChart,LineChart}.tsx` | **Palettes Recharts hardcodées.** `['#6366f1', '#8b5cf6', '#ec4899', ...]` — violets/roses hors thème DataPresent (verts). | Incohérence marque. Dark mode ignoré. | Utiliser `var(--chart-1)` à `var(--chart-5)`. |
| **Agent 3** | `app/[locale]/(dashboard)/layout.tsx` (DashboardNav) | **Dashboard non-responsive.** Sidebar 240px fixe, pas de breakpoint mobile. | Impossible d'utiliser le dashboard sur mobile. | Ajouter sidebar hamburger/collapsible < 768px + nav mobile. |
| **Agent 2** | `app/[locale]/(dashboard)/new/page.tsx` | **Aucun retour de progression upload.** `fetch()` sans listener de progression. | L'utilisateur ne voit pas l'avancement pour fichiers > 5MB. | Ajouter `xhr.upload.onprogress` ou équivalent. |

### ⚠️ Améliorations importantes

| Agent | Composant/Fichier | Description | Solution |
|---|---|---|---|
| **Agent 1** | `components/ui/theme-toggle.tsx` | Icônes inversées (Lune en mode sombre → devrait être Soleil). | Intervertir `isDark ? <Sun/> : <Moon/>`. |
| **Agent 4** | `components/slides/SlideViewer.tsx:227-229` | Overlay commentaire non accessible clavier : div sans rôle/tabIndex. | Ajouter `role="presentation"` + Escape handler. |
| **Agent 4** | `components/slides/layouts/*.tsx` | Graphiques sans alternatives textuelles (SVG sans aria-labels). | Ajouter `aria-label` descriptif sur conteneurs SVG. |
| **Agent 3** | `components/slides/SlideViewer.tsx:99-118` | Sidebar slides animée 240px, overlap < 768px. | Remplacer par bottom sheet sur mobile. |
| **Agent 5** | `components/landing/landing-{features,how-it-works}.tsx` | SVG inline (50+ lignes) au lieu d'icônes Lucide. | Remplacer par composants Lucide. |
| **Agent 2** | `app/[locale]/(dashboard)/page.tsx` | Pagination manquante : seulement `take: 5` sans "Voir tout". | Ajouter pagination ou lien vers liste complète. |
| **Agent 2** | `app/[locale]/(dashboard)/reports/[id]/page.tsx` | Pas de polling auto pour les reports en génération. | Ajouter polling ou SSE pour mise à jour live. |

### ✨ Détails de finition (polish)

| Description | Fichier | Effort |
|---|---|---|
| `.app-page-header` flex-wrap manquant pour longs titres | `globals.css:1009` | XS |
| SVG inline dans `landing-hero.tsx` pourraient être Lucide | `components/landing/landing-hero.tsx` | XS |
| `.app-table` pas de variante responsive horizontale | `globals.css:844` | S |
| `.landing-hero::before` glow peut causer scroll horizontal | `globals.css:362-372` | XS |
| `Comparison.tsx` couleurs `text-gray-900` break dark mode | `components/slides/layouts/Comparison.tsx` | XS |
| `.landing-steps-grid::before` ligne cassée < 900px | `globals.css:483-491` | XS |
| Logo SVG dupliqué dans landing, app-nav, auth | multiples fichiers | S |
| Pas de `loading="lazy"` sur images landing | `app/layout.tsx:49` | XS |
| `.landing-cta-section` background `#0D1F06` hardcodé | `globals.css:649` | XS |

### Score global Front-End

| Catégorie | Score |
|---|---|
| **Design** | 7/10 |
| **UX** | 6.5/10 |
| **Responsive** | 4/10 |
| **Accessibilité** | 4/10 |
| **Maintenabilité** | 5/10 |

---

## ⚙️ ÉTAPE 2 — Analyse Back-End (Terminée)

### 🚨 Critiques (corriger immédiatement)

| Agent | Fichier/module | Description | Impact | Risque | Solution |
|---|---|---|---|---|---|
| **3** | `lib/exporters/pdf.ts:80` | **XSS dans PDF export.** `JSON.stringify(slide.content)` injecté dans HTML Puppeteer sans échappement. | XSS dans PDF exporté | Critical | Remplacer par `escapeHtml()` |
| **8** | `lib/queue/client.ts:4` | **Connexion BullMQ créée à l'import** (module level), pas lazy. Si Redis down au démarrage, le serveur crash. | Crash au startup, SPOF | High | Remplacer par factory lazy |
| **2** | `lib/auth.ts:126-133` | **`token.needsRefresh` jamais reset.** Après 24h, rotation infinie à chaque requête. | Perf dégradée, bug de refresh | High | Ajouter `delete token.needsRefresh` après rotation |
| **1** | `lib/entitlements/index.ts:61-68` | **Dépendance circulaire potentielle.** `entitlements/index` réexporte `handleWebhookEvent` de stripe-webhook-handler. | Couplage fort, risque d'import cyclique | High | Déplacer les réexports webhook dans module dédié |
| **3** | `lib/api-keys.ts:156` | **Modulo bias** dans `generateSecureKey` : distribution non-uniforme. | Clés API prévisibles | Medium | Utiliser `crypto.randomInt()` |
| **7** | `lib/queue/workers/generate.worker.ts:165-171` | **Race condition sur status ERROR.** Le `failed` event ET le `catch` mettent tous deux status ERROR. | Double écriture concurrente | Medium | Supprimer la MAJ status du `catch` |

### ⚠️ Problèmes importants
| Agent | Description | Solution |
|---|---|---|
| **4** | DB query dans `auth.ts` session callback à chaque requête (isVerified) | Cache Redis 60s ou stocker dans JWT |
| **5** | Pas d'index `used` sur MagicLinkToken → accumulation infinie | `@@index([used])` + cleanup job mensuel |
| **6** | Routes API sans versioning (`/api/v1/`) | Ajouter versioning avant scalabilité |
| **3** | CSRF absent sur routes `auth/magic-link`, `signup`, `forgot-password` | Ajouter `withCsrfProtection` |
| **3** | Magic link token dans URL → leak via Referer/logs | Utiliser POST body pour callback |
| **4** | Rate limiting sur PostgreSQL → contention >100 req/s | Migrer vers Redis INCR+EXPIRE |
| **2** | `entitlements/compat.ts` — PLAN_FEATURES statique dupliqué avec DB | Supprimer compat.ts à terme |
| **7** | Aucun endpoint `/api/health` ou `/api/ready` | Ajouter health checks |
| **8** | `tokenPrefix` collision : 48 bits → ~50% collision à 10k tokens | Augmenter à 16+ hex chars |

### 🔒 Sécurité
| Vulnérabilité | OWASP ref | Criticité | Solution |
|---|---|---|---|
| XSS dans PDF export | A03:2021-Injection | Critical | `escapeHtml()` dans generateHtmlFromSlides |
| Modulo bias clés API | A02:2021-Crypto Failures | High | `crypto.randomInt(chars.length)` |
| CSRF absent routes auth | A01:2021-Broken Access Control | Medium | `withCsrfProtection()` |
| Token magic link dans URL | A04:2021-Insecure Design | Medium | POST body au lieu de query param |
| Rate limiting auth absent | A04:2021-Insecure Design | Low | Limiter signIn par IP/minute |
| CSP 'unsafe-eval' en dev exposé | A05:2021-Misconfiguration | Medium | Restreindre en dev aussi |

### ⚡ Performance
| Problème | Impact estimé | Solution |
|---|---|---|
| DB query dans session callback auth.ts | +3ms par requête HTTP authentifiée | Cache Redis 60s |
| PostgreSQL rate limiting | Contention >100 req/s | Redis INCR + EXPIRE |
| Eager BullMQ connection | Crash startup si Redis down | Lazy init |
| Puppeteer PDF (~200MB/process) | Scale limité à ~5 instances | Service PDF dédié |
| Aucun batch dans parsers CSV/XLSX | RAM OOM sur fichiers >100k rows | Stream processing |

### 🗄️ Base de données
| Problème | Tables concernées | Solution |
|---|---|---|
| Pas d'index `used` sur tokens | MagicLinkToken, PasswordResetToken, InviteToken | `@@index([used])` + cleanup job |
| RateLimit jamais nettoyée | RateLimit | Cron DELETE WHERE expires < NOW() |
| `createdById` pas de cascade | ReportVersion | `onDelete: Cascade` |

### 🧱 Architecture
| Problème | Modules concernés | Solution |
|---|---|---|
| `entitlements/index` réexporte Stripe webhook | entitlements ← stripe-webhook-handler | Extraire dans module dédié |
| Deux sources vérité plans | compat.ts (static) vs PlanFeature (DB) | Migrer vers DB uniquement |
| BullMQ connection non-lazy | queue/client.ts | Factory function lazy |

### 📈 Scalabilité
| Risque | Seuil estimé | Solution |
|---|---|---|
| Contention PostgreSQL rate limiting | 50 req/s | Redis |
| Token prefix collision | 10k tokens | 16+ hex chars |
| Puppeteer mémoire | 5 instances | Service PDF dédié |

### 🧪 Tests manquants
| Zone non couverte | Type de test | Priorité |
|---|---|---|
| `crypto.ts` — timingSafeEqual | Unitaire | High |
| `experiments.ts` — bucketing distribution | Unitaire statistique | High |
| `rate-limit.ts` — atomic UPSERT | Unitaire + Intégration | High |
| Stripe webhook idempotency | Intégration | High |
| Entitlement resolution chain | Unitaire | High |
| API key lifecycle | Unitaire | Medium |

### 📋 Dette technique identifiée
| Description | Coût si ignoré | Effort |
|---|---|---|
| PLAN_FEATURES statique dupliqué avec DB | Bugs feature flags, confusion devs | S |
| `as any` dans stripe-webhook-handler.ts:96 | Perte type safety Stripe | XS |
| console.log partout | Impossible corréler logs | S |
| MurmurHash3 maison buggé | A/B testing incorrect | XS |
| Aucune health check API | Monitoring plateforme aveugle | XS |
| Aucun request ID | Impossible tracer requête → log → erreur | S |

### Score global Back-End
| Catégorie | Score |
|---|---|
| **Architecture** | 8/10 |
| **Sécurité** | 7/10 |
| **Performance** | 6/10 |
| **Maintenabilité** | 7/10 |
| **Scalabilité** | 5/10 |
| **Observabilité** | 6/10 |

---

## 🏢 ÉTAPE 3 — Couche Métier (Terminée)

### Agent Business Analyst — Règles Métier

| # | Problème | Impact Business | Exemple concret | Suggestion |
|---|---|---|---|---|
| 1 | **FREE plan maxSlides=8 vs default slideCount=10** | Nouveau FREE génère 10 slides (default) mais plan max=8 → crash ou dépassement silencieux | User FREE clique Générer sans changer slideCount → rejet ou génération 10 slides | Uniformiser default slideCount avec plan.maxSlides OU valider avant création |
| 2 | **Aucune vérification format d'export côté plan** | FREE peut demander export DOCX (interdit sur son plan) → worker génère et stocke sans blocage | FREE appelle export('DOCX') → job créé → worker génère DOCX → stocké dans R2 | Ajouter `canConsume(orgId, 'formatDOCX')` dans le worker |
| 3 | **Double source de vérité : PLANS (compat.ts) ≠ PlanFeature (DB)** | Admin modifie PlanFeature en DB mais compat.ts reste inchangé → comportements divergents | `canConsume()` lit DB, `planHasFeature()` lit compat.ts → UI dit "3 reports" mais DB autorise 30 | Supprimer compat.ts ou ajouter test sync |
| 4 | **Downgrade PRO→FREE non détecté** | Passage PRO→FREE non loggé, pas de downgrade effectué | Client PRO annule → `isDowngrade` retourne false → pas de cache invalidation pour FREE | Corriger condition dans stripe-webhook-handler |
| 5 | **Exports non limités (aucun quota)** | FREE peut exporter 1000 PPTX sans restriction | Script automatique exporte en boucle → coût R2 explose | Ajouter `exportPerMonth` feature + `consume()` dans export worker |
| 6 | **Agency sans price Stripe** | Aucun moyen d'acheter Agency via Stripe | Client enterprise clique "Upgrade to Agency" → erreur | Ajouter price ID Stripe ou documenter "contact us" |
| 7 | **Magic number -1 pour "illimité"** | -1 signifie "unlimited" mais fragilise la maintenance | Cohérent ici mais deux sémantiques pour -1 (limite et prix) | Remplacer par `null` (illimité) et `'custom'` (prix) |
| 8 | **maxOrganizations jamais enforce** | FREE/PRO ont maxOrganizations=1 mais rien n'empêche multi-org | User peut être invité dans 2 orgs sans blocage | Ajouter check dans l'invite |

### Agent Domain Expert — Modèle Métier (DDD)

| # | Entité/Agrégat | Problème | Impact | Suggestion |
|---|---|---|---|---|
| 1 | **Report** | **Modèle anémique** : entités sans comportement, logique dans services | Rien n'empêche création Report incohérent (slideCount > plan max) | Factory `Report.create()` avec vérifications |
| 2 | **Comment → Slide** | **Régénération détruit versions** : `deleteMany` slides supprime commentaires (SetNull) | Commentaires orphelins après régénération | Versionner commentaires ou rattacher au Report |
| 3 | **Value objects** | **Types primitifs partout** : Email = string, SlideCount = Int sans borne | Passer `slideCount: -5` à Claude → prompt invalide | Branded types Zod (SlideCountSchema, Email, Period, FileSize) |
| 4 | **UserRole vs MembershipRole** | **Conflit nommage** : `UserRole` (OWNER/MEMBER) vs `MembershipRole` (OWNER/ADMIN/MEMBER) | Différence sémantique floue, matrice d'héritage ambiguë | Renommer `UserRole` en `SystemRole` (SUPER_ADMIN, USER) |
| 5 | **Export → compat.ts** | **Fuites bounded context** : export worker lit watermark depuis compat.ts (statique) au lieu du feature gate | Override admin ignoré, watermark toujours affiché | Utiliser `hasFeature(orgId, 'noWatermark')` |
| 6 | **Membership** | **Invariant non respecté** : org peut avoir 0 OWNER | Dernier OWNER change son rôle → plus personne ne gère l'abonnement | Vérifier ≥1 OWNER avant modif rôle |
| 7 | **Report.slideCount** | **Ambigu** : nombre demandé ou réel ? | User demande 10, IA génère 8 → `report.slideCount=10` mais 8 slides réels | Renommer `requestedSlideCount`, stocker réel via `slides.length` |
| 8 | **Membership** | **Pas d'historique** : pas de `createdAt`, `invitedBy`, `roleChangedAt` | Audit impossible : "Qui était ADMIN le mois dernier ?" | Ajouter timestamps |

### Agent Use Cases Review

| # | Use case | Problème | Type | Suggestion |
|---|---|---|---|---|
| 1 | **generate.worker** | **Race condition version increment** : `findFirst` + `create` non atomique | Race condition | Remplacer par `UPDATE "version" = "version" + 1 ... RETURNING` |
| 2 | **export.worker** | **Pas de `consume()` pour quota tracking** | Manquant | Ajouter `consume(orgId, 'exportsPerMonth')` |
| 3 | **export.worker** | **Watermark lu depuis compat.ts** au lieu du feature gate | Couplage mauvais | Utiliser `hasFeature(orgId, 'noWatermark')` |
| 4 | **consumeUsage** | **Race condition sous charge concurrente** (P2002 catch) | Race condition | Utiliser `INSERT ... ON CONFLICT DO UPDATE` atomique |
| 5 | **hasFeature** | **N appels DB pour N features** | Perf | Ajouter `resolveFeatureBatch(orgId, keys)` |
| 6 | **assertFeature** | **Throw erreur métier au lieu de 403 HTTP** | Couplage | Documenter ou wrapper en réponse HTTP |
| 7 | **Webhook handler** | **Pas de Dead Letter Queue** si échec définitif | Idempotence | Marquer `DEAD_LETTER` après X échecs |
| 8 | **customer.subscription.deleted** | **Downgrade immédiat ignore stratégie** | Workflow incomplet | Appliquer `DowngradeService.applyDowngrade` au lieu d'update direct |
| 9 | **generate.worker** | **Pas de validation slideCount ≤ plan.maxSlides** | Validation absente | Ajouter `getLimit(orgId, 'maxSlides')` avant génération |
| 10 | **generate.worker** | **Pas de transaction globale** → report bloqué en PROCESSING si crash | Atomicité | Ajouter timeout job + recovery |

---

## 💾 ÉTAPE 4 — Couche Data Access (Terminée)

### 🗄️ Repository Review

| Repository | Méthode | Problème | Suggestion |
|---|---|---|---|
| `PrismaEntitlementRepository` | `getActiveSubscription` | Filtrage applicatif après `findUnique` (2 étapes au lieu d'1) | Ajouter `where: { status: { in: ['ACTIVE','TRIALING'] } }` |
| `PrismaEntitlementRepository` | `getAllPlanFeatures` | Retourne TOUS les features sans pagination | `findMany` avec pagination si x100 |
| `PrismaEntitlementRepository` | `consumeUsage` | Logique complexe (37 lignes post-UPDATE) avec double UPDATE | Extraire dans méthode privée `retryConsumeUsage` |
| `PrismaEntitlementRepository` | `getUsage` | `findFirst` au lieu de `findUnique` (contrainte unique existe) | Remplacer par `findUnique` |
| `IEntitlementRepository` | Toutes | Fuite ORM : expose types Prisma dans l'interface | Définir types métier dans `types.ts` + mapper |
| `FeatureGateService` | `resolveFeature` | Appelle `getAllOverrides` + `getActiveSubscription` à chaque résolution | Précharger tous les contextes en 1 appel |
| `compat.ts` | `getUserPlan` | Requête imbriquée User→Membership→Org→Subscription (4 niveaux) | Utiliser `getCachedOrg` + `findFirst` léger |

### ⚡ Query Performance

| Niveau | Fichier/méthode | Requête problématique | Explication | Solution |
|---|---|---|---|---|
| 🔴 | `auth.ts:102` JWT callback | `user.findUnique({ select: { isVerified, emailVerified } })` | Exécuté sur CHAQUE requête HTTP | Stocker `isVerified` dans le JWT token |
| 🔴 | `feature-gate.ts:148-203` getAllEntitlements | `getAllPlanFeatures()` + `getAllOverrides()` + `getAllUsage()` + boucle | 4 queries avant boucle, coût élevé si cache miss | Fusionner en raw SQL avec JOIN |
| 🟠 | `admin/plans/route.ts:24` | Boucle sur 4 plans → `getPlanFeatures(plan)` x4 | N+1 explicite | Une query `findMany({ where: { plan: { in: [...] } } })` + groupBy |
| 🟠 | `feature-gate.ts:46` hasFeature | `resolveFeature` → 3 queries à chaque appel | Triple appel DB par feature | Cache de résolution local par request |
| 🟡 | `downgrade.ts:207` | `findMany` peut scanner largement | Index manquant | Index composite `(status, plan, currentPeriodEnd)` |
| 🟡 | `cache.ts:31` getCachedOrg | Include `members` avec `user` pour TOUS les membres | 1000 membres = 1000 users chargés | Pagination interne ou cache par page |
| 🟢 | `rate-limit.ts` | UPSERT sur RateLimit | Correct mais écriture élevée | TTL PostgreSQL ou partitionnement temporel |

### 🔄 ORM Review

| Entité/fichier | Pattern problématique | Risque | Solution |
|---|---|---|---|
| `auth.ts` session callback | Query DB dans `callbacks.session` (lazy loading implicite) | +1 query par requête HTTP | Stocker `isVerified` dans le JWT |
| `admin/plans/route.ts` | Application-level JOIN bouclé | 4x les données nécessaires chargées | `findMany` avec `where: { plan: { in: [...] } }` |
| `feature-gate.ts:316` | `resolveFeatureWithOverrides` rappelle `getPlanFeatures` | Appels DB inutiles | Rendre `preloadedFeatures` obligatoire |
| API routes | `NextResponse.json(feature)` — entité ORM brute | Exposition champs internes, pas de contrôle shape | DTO/mapper `toFeatureResponse()` |
| `feature-gate.ts` | `isOverrideValid` refait `new Date()` sur champ déjà Date | Objet inutile | Comparer directement `expiresAt > new Date()` |

## 🗄️ ÉTAPE 5 — Couche Database (Terminée)

### 🏛️ DBA Review

| Table | Colonne/index | Problème | Recommandation SQL |
|---|---|---|---|
| `User` | `email` | Optionnel (`String?`) mais clé de lookup | NOT NULL pour email/password |
| `Report` | `slideCount` | `Int @default(10)` sans contrainte | CHECK (`slideCount > 0`) |
| `Subscription` | `status` | Pas d'index sur status | `CREATE INDEX "idx_subscription_status"` |
| `Account` | `userId` | Pas d'index explicite FK | `CREATE INDEX "idx_account_user_id"` |
| `Session` | `userId` | Idem | `CREATE INDEX "idx_session_user_id"` |
| `EntitlementOverride` | `scopeId` | Pattern polymorphique sans FK possible | CHECK + trigger applicatif |
| `ReportVersion` | `createdById` | Pas d'index FK | `CREATE INDEX "idx_report_version_created_by"` |
| `RateLimit` | `expires` | Pas d'index sur expires | `CREATE INDEX "idx_rate_limit_expires"` |
| `WebhookEvent` | `processedAt` | Pas d'index seul | `CREATE INDEX "idx_webhook_processed_at"` |
| `MagicLinkToken` | `expires` | Index présent mais pas de TTL cleanup | Job DELETE WHERE expires < NOW() - 30 days |

### 📈 Database Scalability

| Risque | Impact à x10 | Impact à x100 | Mitigation |
|---|---|---|---|
| RateLimit table non nettoyée | ~1M lignes, 30% ralentissement | ~100M lignes, UPSERT ralenti x5 | CRON de nettoyage + partitionnement temporel |
| MagicLinkToken/PRT accumulation | ~500K used=true | ~50M, cleanup impossible | TTL + DELETE WHERE used=true AND createdAt < 7 days |
| WebhookEvent accumulation | ~100K lignes | ~10M lignes | TTL + archive mensuelle |
| UsageTracking contention | 10 orgs concurrentes → OK | 100 orgs → deadlocs possibles | Advisory lock PostgreSQL |
| getAllEntitlements cache miss | ~50ms (4 queries) | ~500ms si 100+ features | Table matérialisée ou Redis |
| ReportVersion.slideData JSON | ~10K versions, OK | ~1M versions, ~10-50GB JSON | R2 pour slideData > 100KB |
| Pool connexions | Prisma singleton OK | 100 connexions → contention pool | PgBouncer + connection_limit |
| Rate-limit UPSERT chaud | 100 req/s OK | 1000 req/s → contention index unique | Redis pour rate-limiting |

### 🔒 Data Integrity

| Table/relation | Risque | Scénario de corruption | Solution |
|---|---|---|---|
| `InviteToken.createdById` → User | Orphelins | Suppression user → tokens invalides | `onDelete: Cascade` ou cleanup |
| `ReportVersion.createdById` → User | Orphelins | Idem | `onDelete: Cascade` ou SetNull |
| `Subscription.orgId` 1:1 | Doublon webhook | Stripe crée 2 subscriptions même org | Upsert idempotent (déjà partiel) |
| `EntitlementOverride` scope | Orphelins scope | Suppression user/org → overrides persistent | Cleanup job |
| `consumeUsage` périodes | Dérive JS vs DB | PeriodStart calculé JS peut diverger | Utiliser `date_trunc('month', NOW())` côté DB |
| `User.email` optional | Données partielles | User OAuth sans email → pas de notif | Rendre NOT NULL avec fallback |

---

## 🏗️ ÉTAPE 6 — Couche Infrastructure (Terminée)

### 🔧 Reliability

| Point de risque | Type de panne | Probabilité | Impact | Solution |
|---|---|---|---|---|
| `queue/client.ts` — Redis connecté à l'import | SPOF démarrage | H | Crash déploiement si Redis down | Lazy loading workers/queues |
| `getRedisConnection()` sync 3 retry max sans cooldown | Erreur transitoire | M | Échec toutes opérations queue | Migrer vers `getRedisConnectionAsync()` |
| Pas de circuit breaker Redis | Cascade | M | Si Redis ralentit, timeout accumulé | Ajouter circuit breaker (opossum) |
| generateWorker + exportWorker sans dédup par `jobId` | Non-idempotence | M | Même job traité 2× si re-livraison | Stocker jobId dans Redis set avec TTL |
| Stripe webhook — TOCTOU isEventProcessed/markEventProcessed | Double traitement | L | Doublon abonnement | INSERT ON CONFLICT DO NOTHING atomique |
| Email — aucune rétry/fallback | Erreur transitoire | M | Magic link non reçu | Ajouter retry expo. + fallback Resend→SMTP |
| R2 — pas de rétry S3 | Erreur transitoire | M | Échec upload/download fichier | Wrapper SDK AWS retry 3× + jitter |
| `cache.ts` utilise `unstable_cache` Next.js | Stabilité API | H | Changement comportement sans préavis | Isoler derrière abstraction, prévoir Redis fallback |

### 🔒 Security

| OWASP | Criticité | CVSS | Description | Remédiation |
|---|---|---|---|---|
| A01:2021 | **Haut** | 7.5 | `getRedisConnection()` sync au module level — si importé côté client, secret Redis exposé au browser | Initialisation lazy, vérifier arbre d'import |
| A02:2021 | **Haut** | 7.1 | `GOOGLE_SHEETS_PRIVATE_KEY` multi-lignes corrompu par parseur .env | Normaliser `\\n` → `\n`, valider PEM |
| A03:2021 | **Moyen** | 6.1 | Raw SQL dans rate-limit.ts : injection temporelle possible via paramètres utilisateur | Restreindre limit/windowMs à des valeurs connues |
| A04:2021 | **Moyen** | 5.9 | Aucun rate limiting sur endpoints auth (magic link, login, signup) | Rate limiting Redis : 3 req/min par email |
| A05:2021 | **Moyen** | 5.3 | CSP 'unsafe-eval' en dev — si staging exposé | Restreindre en dev si possible |
| A06:2021 | **Moyen** | 5.0 | Aucun Dependabot/Renovate configuré, pas de scan nightly | Ajouter `.github/dependabot.yml` weekly |
| A07:2021 | **Haut** | 7.0 | Magic Link dans URL — interception possible, pas de rotation/détection vol | authCode usage unique + 10min TTL + notification |
| A09:2021 | **Moyen** | 5.5 | `error-logger.ts` envoie vers console.warn + endpoint non authé | Remplacer par Sentry + log structuré |
| A10:2021 | **Bas** | 4.0 | generate.worker fetch(signedUrl) R2 — risque SSRF si URL malveillante | Valider domaine R2 autorisé |

### 📊 Observability

| Zone aveugle | Impact en cas d'incident | Instrumentation recommandée |
|---|---|---|
| **Aucun log structuré** (console.log) | Impossible filtrer/corréler logs par tenant, traceId, niveau | Pino/Winston + format JSON : `{ time, level, msg, traceId, userId, orgId }` |
| **Pas de health check endpoint** | Vercel ne peut pas monitorer workers ou uptime | `GET /api/health` : check DB (SELECT 1) + Redis (PING) + R2 (HeadBucket) |
| **Performance workers invisible** | Job generate 5min au lieu de 30s non alerté | Métriques RED : duration (histogram), rate, errors → Sentry metrics |
| **Cache hit/miss ratio inconnu** | Cache inefficace sans détection → charge DB inutile | Compteurs cache_hit/miss/revalidate dans cache.ts |
| **Aucune trace distribuée** | Impossible tracer requête API → queue → Anthropic → DB | Forcer Sentry traces 100% routes critiques (+ traceId header manuel) |
| **Pas de métriques business** | Impossible mesurer rapports/min, exports, conversions | Sentry custom metrics : business.reports_created, exports_completed |
| **Pas de log aggregation** | Logs Vercel éphémères, incident d'il y a 1h illisible | Configurer log drain Vercel → Axiom/Datadog |

### ☁️ Cloud & Ops

| Risque opérationnel | Impact | Probabilité | Solution |
|---|---|---|---|
| **Workers BullMQ non supportés par Vercel** (timeout 10-60s) | Appli plante, jobs de fond non exécutés | H | Déployer workers sur service séparé (Railway/Fly.io) |
| **Redis SPOF** (pas de sentinel/cluster) | File d'attente bloquée, génération/export impossibles | M | Upstash Redis (serverless HA) ou Redis Enterprise |
| **PostgreSQL SPOF** (1 instance, pas de replica) | Appli down si DB tombe (0 RTO, 0 RPO sans backup récent) | L | Backups auto (Neon). PgBouncer en serverless |
| **Aucune stratégie DR documentée** (RTO/RPO) | Perte données indéterminée, restauration inconnue | M | Documenter RTO≤1h/RPO≤5min. Automatiser restore. Tester trimestriellement |
| **Déploiement manuel** | Non reproductible, "works on my machine" | M | Ajouter deploy.yml : vercel deploy --prod après CI |
| **Aucun monitoring uptime externe** | Équipe découvre panne via utilisateurs | H | Better Uptime / Checkly / Sentry Cron Monitor + alertes Slack |
| **Coût Anthropic API non tracké** | Boucle regénération infinie = facture massive | M | Budget rate limiter + logger coût estimé par job |
| **Pas de Docker/IaC** | Environnement non reproductible, dépendances système (Chromium) non explicitées | M | Dockerfile pour worker avec Chromium + Redis sidecar |
| **Aucun environnement staging** | Config testée en prod direct | M | Créer environnement staging Vercel avec DB/Redis/R2 dédiés |

### Scores Infrastructure

| Catégorie | Score |
|---|---|
| **Reliability** | 4/10 |
| **Security** | 7/10 |
| **Observability** | 3/10 |
| **Cloud & Ops** | 3/10 |

---

## 🏛️ ÉTAPE 7 — Synthèse Architecte (Agent Final)

### Top 20 Problèmes (tous domaines confondus)

Classés par Impact Business × Urgence × Effort :

| Rang | Domaine | Problème | Impact | Effort | Sources |
|---|---|---|---|---|---|
| 1 | **Infra/Security** | XSS dans PDF export (escapeHtml manquant) | Perte données clients, compromission PDF | XS | Back-end Agent 3, Security Agent 2 |
| 2 | **Back-End** | BullMQ Redis connection au module level → SPOF démarrage | Crash au déploiement si Redis down | S | Back-end Agent 8/4, Infra Agent 1 |
| 3 | **Back-End** | JWT `needsRefresh` jamais reset → rotation infinie après 24h | Perf dégradée, refreshes inutiles | XS | Back-end Agent 2 |
| 4 | **Métier** | Exports non limités (FREE peut exporter à l'infini) | Coût R2 qui explose | S | Business Analyst #5, Use Case #2 |
| 5 | **Métier** | Downgrade PRO→FREE non détecté dans webhook Stripe | Clients gardent features PRO après annulation | S | Business Analyst #4, Use Case #8 |
| 6 | **Métier** | Double source de vérité plans (compat.ts vs DB PlanFeature) | Bugs feature flags, comportements divergents | M | Business Analyst #3, Back-end Agent 2 |
| 7 | **Data/DB** | Rate limiting sur PostgreSQL → contention >100 req/s | Goulot étranglement sous charge | M | Back-end Agent 4, DBA, Scalability |
| 8 | **Back-End** | DB query dans session callback auth.ts à chaque requête (isVerified) | +3ms sur chaque requête HTTP, pas de cache | XS | Back-end Agent 4, Query Perf Agent |
| 9 | **Infra** | Workers BullMQ incompatibles Vercel serverless (timeout) | Jobs de fond non exécutés en prod | L | Infra Agent 4 |
| 10 | **Data/DB** | Index manquants : `used` sur tokens, `status` sur Subscription | Ralentissement requêtes nettoyage | S | DBA, Query Perf Agent |
| 11 | **Front-End** | Dashboard non-responsive (sidebar fixe 240px, pas de breakpoint) | Impossible utiliser sur mobile | L | Front-End Agent 3 |
| 12 | **Front-End** | Design tokens dupliqués (landing CSS dans globals.css + 500 lignes) | Maintenance doublée, perf css | M | Front-End Agent 5/6 |
| 13 | **Front-End** | Couleurs graphiques hardcodées (violets/roses) hors thème DataPresent | Incohérence marque, dark mode cassé | S | Front-End Agent 6 |
| 14 | **Métier** | Race condition consumeUsage sous charge (P2002 catch) | Perte de quota, faux LIMIT_REACHED | M | Use Case Agent #4 |
| 15 | **Métier** | Race condition version increment generate.worker (non atomique) | Unique constraint violation, perte génération | M | Use Case Agent #1 |
| 16 | **Back-End** | Modulo bias dans génération clés API | Clés API prévisibles | XS | Back-end Agent 3 |
| 17 | **Infra** | Aucun endpoint health check (/api/health) | Monitoring impossible, downtimes invisibles | XS | Back-end Agent 7, Infra Agent 3 |
| 18 | **Infra** | Aucun log structuré (console.log uniquement) | Debugging impossible, pas de corrélation | S | Infra Agent 3 |
| 19 | **Front-End** | Pas de progression upload, pas de polling auto reports | Mauvaise UX, frustration utilisateur | M | Front-End Agent 2 |
| 20 | **Data/DB** | Orphelins potentiels : InviteToken, ReportVersion sans cascade | Données résiduelles, intégrité compromises | M | Data Integrity, DBA |

### 🧨 Dette technique critique (coûtera 10× plus cher dans 6 mois)

1. **Deux systèmes de plans** (`compat.ts` statique + `PlanFeature` en DB) — les bugs de divergence empireront avec le nombre de plans, chaque nouvelle feature devra être ajoutée aux deux endroits
2. **Pas de health check / monitoring** — aujourd'hui ça passe car petite app, mais dans 6 mois avec du trafic réel, chaque incident sera un aveugle debugging de 2h+
3. **Console.log** au lieu de logging structuré — avec la croissance de l'équipe, l'absence de logs corrélables rendra chaque incident nécessitant une rollback introuvable
4. **CSS landing dans globals.css** — plus la landing s'enrichit, plus le bundle CSS grossit pour RIEN sur les pages connectées
5. **Absence de versioning API** — dès qu'un client externe (API keys, embed) consomme les APIs, un breaking change force une migration douloureuse

### ⚠️ Risques à 6 mois

| Risque | Pourquoi devient bloquant |
|---|---|
| **Workers Vercel incompatibles** | Premier client enterprise → timeout sur génération → escalade support |
| **Coûts R2/Anthropic non trackés** | Premier mois à 1000 exports → facture surprise |
| **FREE export illimité** | Détournement du FREE plan comme API gratuite → coût infini |
| **Redis SPOF** | Prochaine panne Redis → tout le site down (queue + rate limit + cache) |
| **Dashboard non-responsive** | 30%+ du trafic mobile → taux de rebond ×2 sur la page clé |
| **Pas de staging** | Prochain déploiement cassé en prod sans détection préalable |

### 🔮 Risques à 2 ans

| Décision architecturale | Risque long terme |
|---|---|
| **Architecture monolithique Next.js** tout-en-un (pages + API + workers) | Impossibilité de scaler API séparément du front-end |
| **BullMQ non natif Vercel** nécessite infrastructure séparée | Complexité opérationnelle croissante |
| **Pas de séparation Bounded Context claire** (entitlements mélangé avec tout) | À 5 développeurs, chaque PR modifie le même module |
| **Prisma sans migration versionnée visible** | Schéma figé, migrations risquées à grande échelle |
| **Pas de feature flags auto-servis** (admin uniquement) | Déploiements risqués, rollbacks complexes |

---

### 📅 Plan d'action priorisé

#### Sprint 1 — Correctifs critiques (semaine 1-2)

| # | Priorité | Action | Effort | Responsable |
|---|---|---|---|---|
| 1 | 🔴 **CRITIQUE** | Fix XSS PDF export : ajouter escapeHtml dans generateHtmlFromSlides | XS | Back-end |
| 2 | 🔴 **CRITIQUE** | Lazy init BullMQ connection (supprimer eager import) | S | Back-end |
| 3 | 🔴 **CRITIQUE** | Fix JWT `needsRefresh` reset (delete token.needsRefresh) | XS | Back-end |
| 4 | 🔴 **CRITIQUE** | Supprimer dépendance circulaire entitlements → stripe | S | Back-end |
| 5 | 🔴 **CRITIQUE** | Fix modulo bias dans generateSecureKey | XS | Back-end |
| 6 | 🔴 **HAUT** | Ajouter rate limiting Redis sur endpoints auth (3/min par email) | S | Back-end |
| 7 | 🔴 **HAUT** | Ajouter CSRF sur routes auth manquantes (magic-link, signup, forgot-password) | S | Back-end |
| 8 | 🔴 **HAUT** | Ajouter `escapeHtml()` sur routes export PDF/docx | XS | Back-end |

#### Sprint 2 — Stabilisation (semaine 3-6)

| # | Priorité | Action | Effort | Responsable |
|---|---|---|---|---|
| 9 | 🟠 HAUT | Remplacer PostgreSQL rate limiting par Redis | M | Back-end |
| 10 | 🟠 HAUT | Ajouter index + cleanup job tokens expirés | S | Back-end |
| 11 | 🟠 HAUT | Ajouter `consume('exportsPerMonth')` dans export.worker | S | Back-end |
| 12 | 🟠 HAUT | Valider slideCount ≤ plan.maxSlides avant génération | S | Back-end |
| 13 | 🟠 HAUT | Fix downgrade PRO→FREE dans stripe-webhook handler | S | Back-end |
| 14 | 🟠 MOYEN | Rendre dashboard responsive (hamburger < 768px) | L | Front-end |
| 15 | 🟠 MOYEN | Remplacer couleurs hardcodées charts par tokens CSS | S | Front-end |
| 16 | 🟠 MOYEN | Ajouter health check endpoint (/api/health + /api/ready) | XS | Back-end |
| 17 | 🟠 MOYEN | Ajouter polling auto reports en cours de génération | M | Front-end |
| 18 | 🟠 MOYEN | Ajouter upload progression indicator | M | Front-end |

#### Sprint 3 — Amélioration (mois 2-3)

| # | Priorité | Action | Effort | Responsable |
|---|---|---|---|---|
| 19 | 🟡 MOYEN | Unifier design tokens (supprimer duplicate landing CSS) | M | Front-end |
| 20 | 🟡 MOYEN | Ajouter logging structuré (pino/winston + JSON) | M | Back-end |
| 21 | 🟡 MOYEN | Fix race condition consumeUsage (INSERT ON CONFLICT atomique) | M | Back-end |
| 22 | 🟡 MOYEN | Fix race condition version increment (atomic UPDATE RETURNING) | M | Back-end |
| 23 | 🟡 MOYEN | Ajouter pagination dashboard reports | S | Front-end |
| 24 | 🟡 MOYEN | Ajouter request ID + corrélation traces | M | Back-end |
| 25 | 🟡 FAIBLE | Supprimer compat.ts statique, migrer vers DB uniquement | M | Back-end |
| 26 | 🟡 FAIBLE | Ajouter Dependabot + CodeQL scanning | S | Infra |
| 27 | 🟡 FAIBLE | Extraire CSS landing de globals.css | M | Front-end |
| 28 | 🟡 FAIBLE | Ajouter alternatives textuelles graphiques (aria-label) | S | Front-end |

#### Horizon 6 mois — Évolution

| # | Priorité | Action | Effort |
|---|---|---|---|
| 29 | 🔵 ARCHI | Déployer workers BullMQ sur service dédié (Railway/Fly.io) | XL |
| 30 | 🔵 ARCHI | Ajouter circuit breaker Redis (opossum) + retry S3 | M |
| 31 | 🔵 ARCHI | Documenter stratégie DR (RTO≤1h/RPO≤5min) + tester | M |
| 32 | 🔵 ARCHI | Ajouter environnement staging avec DB/Redis/R2 dédiés | L |
| 33 | 🔵 ARCHI | Remplacer Puppeteer par service PDF dédié | XL |
| 34 | 🔵 ARCHI | Ajouter versioning API (/api/v1/) | M |
| 35 | 🔵 ARCHI | Ajouter monitoring uptime externe (Checkly/Better Uptime) | S |
| 36 | 🔵 ARCHI | Dockerfile pour worker + documentation déploiement | S |

---

### Score d'architecture global

| Catégorie | Score | Justification |
|---|---|---|
| **Architecture** | 7/10 | Bonne séparation modules, mais dépendance circulaire, eager connections, pas de bounded contexts clairs |
| **Sécurité** | 7/10 | Argon2, CSP, CSRF, HMAC = solide. XSS PDF + modulo bias + CSRF auth manquant = -3 |
| **Performance** | 5/10 | PG rate limiting, eager conn, Puppeteer mémoire, session callback DB, pas de cache Redis |
| **Maintenabilité** | 6/10 | Code propre TS, mais dette : dual plan system, `as any`, console.log, MurmurHash3 maison |
| **Scalabilité** | 4/10 | PG rate limiting, workers Vercel incompatibles, pas de versioning API, Puppeteer mémoire |
| **Observabilité** | 3/10 | Console.log, pas de health check, pas de request ID, pas de métriques RED, pas de log aggregation |
| **Score global** | **5.3/10** | — |

### Verdict

**DataPresent est un projet jeune et prometteur avec une base technique solide** (TypeScript strict, Argon2, CSP, Zod validation, architecture modulaire) **mais qui accumule une dette technique et des risques opérationnels préoccupants pour un passage en production à l'échelle.**

Les **correctifs critiques (Sprint 1)** sont rapidement adressables (XS/S) et doivent être traités immédiatement — en particulier le XSS PDF, le SPOF Redis/queue, et l'absence de rate limiting auth. La **stabilisation (Sprint 2)** est cruciale avant toute campagne d'acquisition significative : sans responsive mobile, sans limite d'export, et sans monitoring, le produit risque une crise client dès les premiers pics de trafic.

**La trajectoire recommandée** est : 2 semaines de correctifs critiques → 1 mois de stabilisation → 1 mois d'amélioration → puis planifier l'évolution architecturale (workers dédiés, staging, monitoring) avant de viser x10 de charge.
