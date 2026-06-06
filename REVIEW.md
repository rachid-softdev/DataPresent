# Code Review — DataPresent

> **Date :** 6 juin 2026
> **Projet :** DataPresent — Générateur de présentations IA à partir de données (Excel, CSV, PDF, Google Sheets)
> **Scope :** Codebase complet (`datapresent-web` + `@datapresent/ui` + workers)
> **État :** Post-Sprints 1-3 — Revue de l'existant et mise à jour

---

## 📋 Résumé exécutif — Où en sommes-nous ?

Le REVIEW.md original a été créé comme **analyse de référence** avant l'exécution des Sprints 1, 1.5, 2 et 3. Depuis :

| Sprint | Statut | Correctifs appliqués |
|---|---|---|
| **Sprint 1** — Correctifs critiques | ✅ Terminé | XSS PDF, BullMQ lazy init, JWT needsRefresh, modulo bias, dépendance circulaire |
| **Sprint 1.5** — Sécurité & Tests | ✅ Terminé | 103 tests, audit sécurité, Dependabot, CSRF auth, rate limiting auth |
| **Sprint 2** — Stabilisation | ✅ Terminé | Health checks, polling reports, chart colors CSS vars, quotas, downgrade detection |
| **Sprint 3** — Amélioration | ✅ Terminé | Workers Phase 1, CI pipeline rewrite, integration tests |
| **Sprint 4+** — Reste à faire | ⏳ En cours | Responsive dashboard, compat.ts migration, upload progress, logs structurés |

**Ce document reflète l'état ACTUEL du codebase après ces sprints.**

---

## 🗺️ ÉTAPE 0 — Cartographie du codebase

### 📋 Stack technique détectée

| Couche | Technologie | Version |
|---|---|---|
| **Framework** | Next.js (App Router) | 16.2.6 |
| **Langage** | TypeScript | ^5 (web), ^6 (workers) |
| **UI** | Tailwind CSS | v4 |
| **UI Components** | shadcn/ui (surcouche locale `@datapresent/ui`) | workspace:* |
| **Auth** | NextAuth.js | v5 (beta 31) |
| **ORM** | Prisma | 5.22.0 (client), 7.8.0 (web) |
| **Base de données** | PostgreSQL | — |
| **IA** | Anthropic Claude SDK | 0.100.1 |
| **Queue** | BullMQ + ioredis | 5.76.5 / 5.10.1 |
| **Stockage** | AWS SDK S3 (Cloudflare R2) | 3.1041.0+ |
| **Paiement** | Stripe | 22.1.0 |
| **Email** | Nodemailer (dev) / Resend (prod) | 7.0.7 / 6.12.2 |
| **Monitoring** | Sentry | 10.53.1 |
| **Tests** | Playwright (e2e) + Vitest (unit) | 1.59.1 / 4.1.6 |
| **Linting** | ESLint 9 + Biome + Prettier | — |
| **Internationalisation** | next-intl | 4.13.0 |
| **Runtime** | Node.js (via .nvmrc) | — |

### 📁 Arborescence des modules clés

```
datapresent/                          ← Monorepo racine (pnpm workspace)
├── packages/
│   └── datapresent-ui/               ← Package UI partagé (26 fichiers src)
├── datapresent-web/                  ← Application principale (Next.js) ~390 fichiers
│   ├── app/                          ← Routes & pages (102 fichiers)
│   │   ├── layout.tsx / page.tsx     ← Layout racine + landing
│   │   ├── api/                      ← API routes non-localisées (admin, health, CSRF, OG)
│   │   └── [locale]/                 ← Routes localisées (fr/en)
│   │       ├── (auth)/               ← Auth group (login, signup)
│   │       ├── (dashboard)/          ← Dashboard (reports, new, settings/, templates)
│   │       ├── share/[shareToken]/   ← Vue publique partagée
│   │       ├── embed/[shareToken]/   ← Vue embed (iframe)
│   │       ├── blog/                 ← Blog
│   │       └── api/                  ← API routes localisées
│   │           ├── auth/             ← 7 endpoints (nextauth, magic-link, signup, forgot-password, etc.)
│   │           ├── upload/           ← Upload fichier
│   │           ├── reports/          ← CRUD reports
│   │           ├── organizations/    ← CRUD organisations
│   │           ├── stripe/           ← Paiement (checkout, portal, webhook)
│   │           ├── share/            ← Partage (meta, verify-password)
│   │           ├── comments/         ← Commentaires
│   │           ├── api-keys/         ← API keys
│   │           └── user/             ← Profil utilisateur
│   ├── components/                   ← Composants React (77 fichiers)
│   │   ├── ui/                       ← 24 composants UI (button, dialog, card, etc.)
│   │   ├── layout/                   ← Header, Footer
│   │   ├── landing/                  ← Landing page (9 composants)
│   │   ├── slides/                   ← SlideViewer, SlideCard, 7 layouts (BarChart, PieChart, etc.)
│   │   ├── upload/                   ← DropZone, DataPreview, SectorSelector, SlideCountSlider
│   │   ├── comments/                 ← CommentThread, CommentInput, CommentItem
│   │   ├── billing/                  ← PricingTable, PlanBadge, PlanSelector
│   │   ├── org/                      ← DashboardNav, OrgSwitcher
│   │   ├── onboarding/              ← OnboardingTour
│   │   ├── reports/                  ← ReportActions, ReportsPoller, ReportDetailPoller
│   │   ├── blog/                     ← blog-card, blog-header, blog-renderer
│   │   └── providers.tsx             ← Providers root
│   ├── lib/                          ← Logique métier & infrastructure (62 fichiers)
│   │   ├── auth.ts                   ← NextAuth config (NextAuth v5)
│   │   ├── prisma.ts                 ← Prisma singleton
│   │   ├── stripe.ts / stripe-webhook-handler.ts
│   │   ├── rate-limit.ts             ← Rate limiting (PostgreSQL + Redis fallback)
│   │   ├── cache.ts                  ← LRU cache + Next.js unstable_cache
│   │   ├── crypto.ts                 ← Cryptographie (tokens, hash HMAC)
│   │   ├── password.ts               ← Argon2 password hashing
│   │   ├── email.ts                  ← Email service
│   │   ├── security/                 ← CSRF middleware + CSRF tokens
│   │   ├── ai/                       ← Couche IA (analyze, prompts, schemas)
│   │   ├── parsers/                  ← Parsing fichiers (csv, xlsx, pdf, gsheets)
│   │   ├── exporters/                ← Export PPTX/PDF/DOCX
│   │   ├── queue/                    ← BullMQ (client, workers: generate + export)
│   │   ├── entitlements/             ← Feature flags, quotas, plans (10 fichiers)
│   │   └── sentry.ts                 ← Sentry config
│   ├── hooks/                        ← use-entitlements
│   ├── i18n/                         ← next-intl routing + request
│   ├── prisma/                       ← Schéma BDD (18 modèles, 466 lignes)
│   ├── middleware.ts                 ← CORS + i18n routing + security headers
│   ├── env.ts                        ← Validation Zod stricte
│   └── tests/                        ← 109 fichiers test (unit + integration + e2e)
├── workers/                          ← Cloudflare Workers (29 fichiers)
│   └── src/
│       ├── index.ts                  ← Entry point
│       ├── parsers/                  ← CSV, XLSX, PDF, GSheets
│       ├── exporters/                ← PPTX, PDF, DOCX
│       ├── ai/                       ← Analyze, prompts, schemas
│       ├── entitlements/             ← Feature gates (cache, repository)
│       ├── redis.ts / r2.ts / prisma.ts / sentry.ts / crypto.ts
│       └── workers/                  ← generate.worker, export.worker
├── .github/                          ← Workflows CI/CD
├── security-audit/                   ← Rapports d'audit
└── docs/                             ← Architecture & gap analysis
```

### 📊 Volume estimé

| Module | Fichiers | Type |
|---|---|---|
| `datapresent-web/app/` | 102 | Pages & API routes |
| `datapresent-web/components/` | 77 | Composants React |
| `datapresent-web/lib/` | 62 | Logique métier |
| `datapresent-web/tests/` | 109 | Tests (unit, integration, e2e) |
| `datapresent-web/scripts/` | 14 | Scripts utilitaires |
| `packages/datapresent-ui/src/` | 26 | Package UI partagé |
| `workers/src/` | 29 | Background workers |
| **Total** | **~419** | **~35 000+ lignes estimées** |

### 🏗️ Découpage en couches

```
┌──────────────────────────────────────────────┐
│               PRESENTATION                     │
│  app/[locale]/*.tsx + components/*             │
├──────────────────────────────────────────────┤
│               CANAL (API)                      │
│  app/[locale]/api/*/route.ts + app/api/*      │
├──────────────────────────────────────────────┤
│          APPLICATION / USE CASES               │
│  lib/auth, lib/org, lib/email                 │
│  lib/ai/, lib/parsers/, lib/exporters/        │
│  lib/queue/workers/                           │
├──────────────────────────────────────────────┤
│              DOMAIN / MÉTIER                   │
│  lib/entitlements/ (feature flags, quotas)    │
│  lib/security/, lib/errors.ts                 │
│  prisma/schema.prisma                         │
├──────────────────────────────────────────────┤
│           DATA ACCESS (Repositories)           │
│  lib/prisma.ts (PrismaClient)                 │
│  lib/cache.ts (LRU + unstable_cache)          │
│  lib/entitlements/repository.ts               │
├──────────────────────────────────────────────┤
│             INFRASTRUCTURE                     │
│  lib/stripe.ts, lib/r2.ts, lib/redis.ts       │
│  lib/queue/client.ts                          │
│  lib/email.ts, lib/sentry.ts                  │
│  middleware.ts, next.config.ts                │
│  workers/src/                                 │
└──────────────────────────────────────────────┘
```

### 🚪 Points d'entrée principaux

**Pages (Front-End) :**
| Route | Fichier | Type |
|---|---|---|
| `/` | `app/page.tsx` | Landing page |
| `/fr/` ou `/en/` | `app/[locale]/page.tsx` | Landing localisée |
| `/fr/login` | `app/[locale]/(auth)/login/page.tsx` | Connexion |
| `/fr/signup` | `app/[locale]/(auth)/signup/page.tsx` | Inscription |
| `/fr/dashboard` | `app/[locale]/(dashboard)/page.tsx` | Dashboard (take:5) |
| `/fr/dashboard/new` | `app/[locale]/(dashboard)/new/page.tsx` | Nouveau rapport |
| `/fr/dashboard/reports/[id]` | `app/[locale]/(dashboard)/reports/[id]/page.tsx` | Viewer slides |
| `/fr/dashboard/settings/*` | settings/{account,billing,organization,team,api-keys,profile} | Paramètres |
| `/fr/share/[shareToken]` | `app/[locale]/share/[shareToken]` | Vue publique |
| `/fr/embed/[shareToken]` | `app/[locale]/embed/[shareToken]` | Embed iframe |
| `/fr/blog` | `app/[locale]/blog` | Blog |
| `/api/health` | `app/api/health/route.ts` | Health check |

**API Routes (Back-End) :**
| Endpoint | Méthodes |
|---|---|
| `/api/health` | GET |
| `/api/auth/*` | GET/POST |
| `/api/upload` | POST |
| `/api/reports/*` | GET/POST/PUT/DELETE |
| `/api/organizations/*` | GET/POST/PUT |
| `/api/stripe/webhook` | POST |
| `/api/stripe/checkout` | POST |
| `/api/stripe/portal` | POST |
| `/api/share/*` | GET/POST |
| `/api/comments/*` | GET/POST |
| `/api/api-keys/*` | GET/POST/DELETE |
| `/api/admin/*` | GET/POST |
| `/api/csrf-token` | GET |

### 🧪 Tests

| Type | Framework | Stats |
|---|---|---|
| **Unitaires** | Vitest | ~90+ tests (auth, crypto, validation, parsers, ai, rate-limit, security, cache) |
| **Intégration** | Vitest | Config dédiée (vitest.integration.config.ts) |
| **E2E** | Playwright | auth, home, navigation, report-creation, share |
| **Couverture** | Vitest + c8 | Configuré via `@vitest/coverage-v8` |

---

## 🖥️ ÉTAPE 1 — Analyse Front-End (Mise à jour post-sprints)

### Statut des correctifs

| Correctif | Statut | Note |
|---|---|---|
| Chart colors → CSS variables (`--chart-1` à `--chart-6`) | ✅ **Corrigé** | `chart-colors.ts` lit les vars CSS avec fallback |
| Dashboard responsive (sidebar < 768px) | ❌ **Non corrigé** | DashboardNav n'a pas de breakpoint mobile |
| Upload progression indicator | ❌ **Non corrigé** | DropZone.tsx sans listener `onprogress` |
| Polling auto reports en génération | ✅ **Corrigé** | `ReportDetailPoller.tsx` + `ReportsPoller.tsx` existent |
| Pagination dashboard (take:5) | ❌ **Non corrigé** | Toujours `take: 5` sans "Voir tout" |
| Design tokens dupliqués (landing CSS) | ⚠️ **Partiel** | 119 lignes `landing-` dans globals.css (vs 500+ initialement) |
| Theme toggle icônes inversées | ⚠️ **Discutable** | Affiche l'icône du thème actuel (convention UX : les deux existent) |

### 🚨 Problèmes critiques

| Agent | Composant/Fichier | Description | Impact | Solution |
|---|---|---|---|---|
| **Agent 3** | `DashboardNav.tsx` | **Dashboard non-responsive.** Sidebar non adaptée mobile. | Impossible d'utiliser le dashboard sur mobile. 30%+ trafic perdu. | Ajouter sidebar hamburger/collapsible < 768px |
| **Agent 2** | `DropZone.tsx` | **Aucun retour de progression upload.** `fetch()` sans listener. | L'utilisateur ne voit pas l'avancement pour fichiers > 5MB. | Ajouter `xhr.upload.onprogress` ou équivalent |
| **Agent 5** | `globals.css` | **~119 lignes CSS landing dans le fichier global.** Styles `.landing-*` chargés sur toutes les pages. | Bundle CSS inutile sur pages connectées. | Extraire vers `app/landing.css` importé conditionnellement |

### ⚠️ Améliorations importantes

| Agent | Composant/Fichier | Description | Solution |
|---|---|---|---|
| **Agent 1** | `theme-toggle.tsx` | Icône montre état actuel vs état cible (convention discutable). | Adopter convention "afficher ce qu'on va obtenir" (Soleil en dark → texte clair) |
| **Agent 4** | `SlideViewer.tsx` | Overlay commentaire non accessible clavier. | Ajouter `role="presentation"` + Escape handler |
| **Agent 4** | `slides/layouts/*.tsx` | Graphiques sans alternatives textuelles (SVG sans aria-labels). | Ajouter `aria-label` descriptif sur conteneurs SVG |
| **Agent 2** | Dashboard `page.tsx` | Pagination absente : `take: 5` sans "Voir tout". | Ajouter pagination ou lien vers liste complète |
| **Agent 5** | `landing-*.tsx` | SVG inline (50+ lignes) au lieu d'icônes Lucide. | Remplacer par composants Lucide |
| **Agent 6** | `Comparison.tsx` | Couleurs `text-gray-900` peuvent casser en dark mode. | Remplacer par `text-foreground` |

### ✨ Détails de finition (polish)

| Description | Fichier | Effort |
|---|---|---|
| `.app-page-header` flex-wrap manquant pour longs titres | `globals.css` | XS |
| Logo SVG dupliqué dans landing, app-nav, auth | multiples fichiers | S |
| Pas de `loading="lazy"` sur images landing | `app/layout.tsx` | XS |
| `.landing-hero::before` glow peut causer scroll horizontal | `globals.css` | XS |

### Score global Front-End (mis à jour)

| Catégorie | Score | Δ vs baseline |
|---|---|---|
| **Design** | 7/10 | = |
| **UX** | 7/10 | +0.5 (polling ajouté) |
| **Responsive** | 4/10 | = (toujours pas corrigé) |
| **Accessibilité** | 4.5/10 | +0.5 |
| **Maintenabilité** | 5.5/10 | +0.5 (chart colors unifiés) |

---

## ⚙️ ÉTAPE 2 — Analyse Back-End (Mise à jour post-sprints)

### Statut des correctifs

| Correctif | Statut | Note |
|---|---|---|
| XSS dans PDF export (escapeHtml) | ✅ **Corrigé** | `escapeHtml()` existe et est utilisé partout dans `pdf.ts` |
| BullMQ eager connection (module level) | ✅ **Corrigé** | `queue/client.ts` utilise des factory functions asynchrones lazy |
| JWT `needsRefresh` jamais reset | ✅ **Corrigé** | `delete token.needsRefresh` présent ligne 138 |
| Dépendance circulaire entitlements → stripe | ✅ **Corrigé** | Vérifié : pas de dépendance cyclique directe |
| Modulo bias dans `generateSecureKey` | ✅ **Corrigé** | Utilise `crypto.randomBytes` |
| Race condition status ERROR (double écriture) | ⚠️ **Partiel** | Logique de retry présente |
| DB query dans session callback auth.ts | ❌ **Non corrigé** | Toujours 1 query DB par requête pour `isVerified` |
| Rate limiting PostgreSQL contention | ✅ **Amélioré** | Migration vers Redis `INCR+EXPIRE` avec fallback PostgreSQL |
| Compat.ts dual plan system | ❌ **Non corrigé** | Toujours présent, marqué "compatibility adapter" avec migration planifiée |
| As any dans stripe-webhook-handler | ❌ **Non corrigé** | Toujours présent (ligne 97, 121) |
| Health check endpoint | ✅ **Corrigé** | `/api/health` opérationnel (DB + Redis check) |
| Auth rate limiting | ✅ **Corrigé** | `authRateLimit()` avec Redis (3/min par email, 10/min par IP) |
| Stripe webhook retry + idempotency | ✅ **Corrigé** | Exponential backoff + idempotency check |
| Downgrade PRO→FREE détection | ✅ **Corrigé** | `isDowngrade` check présent dans webhook handler |
| Ci pipeline rewrite | ✅ **Corrigé** | GitHub Actions CI complète |

### 🚨 Critiques (corriger immédiatement)

| Agent | Fichier/module | Description | Impact | Risque | Solution |
|---|---|---|---|---|---|
| **4** | `auth.ts:106` | **DB query dans session callback** — `findUnique` sur CHAQUE requête HTTP | +3ms/req, pas scalable | High | Stocker `isVerified` dans le JWT token |
| **2** | `entitlements/compat.ts` | **Double source de vérité plans** — statique + DB PlanFeature | Bugs feature flags quand les deux divergent | High | Supprimer compat.ts après migration |
| **5** | Prisma schema | **Pas d'index `used` sur tokens** — MagicLinkToken, PasswordResetToken, InviteToken | Accumulation infinie, perf dégradée | Medium | `@@index([used])` + cleanup job |
| **6** | `stripe-webhook-handler.ts:97` | **`as any`** sur Stripe items.data[0] | Perte type safety, risque si API Stripe change | Medium | Typer correctement |
| **7** | `app/api/health/route.ts` | **console.error** dans health check | Pas de monitoring Sentry sur échec health | Low | Remplacer par Sentry `captureException` |

### 🔒 Sécurité (mis à jour)

| Vulnérabilité | OWASP ref | Criticité | Statut |
|---|---|---|---|
| XSS dans PDF export | A03:2021 | Critical | ✅ **Corrigé** (escapeHtml) |
| Modulo bias clés API | A02:2021 | High | ✅ **Corrigé** |
| CSRF absent routes auth | A01:2021 | Medium | ✅ **Corrigé** |
| Rate limiting auth absent | A04:2021 | Low->Medium | ✅ **Corrigé** (Redis INCR + EXPIRE) |
| CSP 'unsafe-eval' en dev exposé | A05:2021 | Medium | ❌ **Non corrigé** |
| Magic link token dans URL | A04:2021 | Medium | ❌ **Non corrigé** |
| `GOOGLE_SHEETS_PRIVATE_KEY` multi-lignes corrompu | A05:2021 | High | ❌ **Non corrigé** |

### ⚡ Performance

| Problème | Impact estimé | Statut |
|---|---|---|
| DB query dans session callback auth.ts | +3ms par requête HTTP authentifiée | ❌ Non corrigé |
| PostgreSQL rate limiting → Redis | Contention >100 req/s | ✅ Corrigé (Redis fallback) |
| BullMQ eager connection | Crash startup si Redis down | ✅ Corrigé (lazy init) |
| Puppeteer PDF (~200MB/process) | Scale limité à ~5 instances | ❌ Non corrigé |
| Aucun batch dans parsers CSV/XLSX | RAM OOM sur fichiers >100k rows | ❌ Non corrigé |

### Score global Back-End (mis à jour)

| Catégorie | Score | Δ vs baseline |
|---|---|---|
| **Architecture** | 7.5/10 | -0.5 (compat.ts toujours là) |
| **Sécurité** | 8/10 | +1 (XSS, auth rate limiting, CSRF, retry) |
| **Performance** | 6.5/10 | +0.5 (Redis rate limit, lazy init) |
| **Maintenabilité** | 7/10 | = |
| **Scalabilité** | 5.5/10 | +0.5 |
| **Observabilité** | 6.5/10 | +0.5 (health check) |

---

## 🏢 ÉTAPE 3 — Couche Métier (Mise à jour post-sprints)

### Statut des correctifs

| Problème | Statut | Note |
|---|---|---|
| FREE plan maxSlides=8 vs default slideCount=10 | ❌ **Non corrigé** | Toujours pas de validation avant génération |
| Aucune vérification format d'export côté plan | ❌ **Non corrigé** | `consume('exportsPerMonth')` non implémenté |
| Double source de vérité plans (compat.ts vs DB) | ❌ **Non corrigé** | Toujours présent (compat.ts existe encore) |
| Downgrade PRO→FREE non détecté | ✅ **Corrigé** | `isDowngrade` check présent |
| Exports non limités (aucun quota) | ❌ **Non corrigé** | Pas de `consume()` dans export.worker |
| Agency sans price Stripe | ❌ **Non corrigé** | Pas de STRIPE_PRICE_AGENCY |
| Race condition consumeUsage (P2002 catch) | ❌ **Non corrigé** | Toujours vulnérable |
| Race condition version increment generate.worker | ❌ **Non corrigé** | Toujours `findFirst` + `create` non atomique |

### Problèmes métier persistants

| # | Problème | Impact Business | Exemple concret | Suggestion |
|---|---|---|---|---|
| 1 | **FREE plan maxSlides=8 vs default slideCount=10** | Nouveau FREE génère 10 slides → rejet | User FREE clique Générer sans changer slideCount | Valider avant génération : `maxSlides = getLimit(orgId, 'maxSlides')` |
| 2 | **Exports non limités (aucun quota)** | Coût R2 qui explose, FREE peut exporter 1 000 PPTX | Script automatique exporte en boucle | Ajouter `exportPerMonth` feature + `consume()` dans export.worker |
| 3 | **Double source de vérité : compat.ts ≠ PlanFeature (DB)** | Features divergentes entre UI et backend | `canConsume()` lit DB, `planHasFeature()` lit compat.ts | Supprimer compat.ts après avoir migré tous les callers |
| 4 | **Race condition consumeUsage sous charge** | Perte de quota, faux LIMIT_REACHED | 2 requêtes simultanées → P2002 | `INSERT ... ON CONFLICT DO UPDATE` atomique |
| 5 | **Race condition version increment generate.worker** | Unique constraint violation, perte génération | 2 jobs simultanés sur même report | `UPDATE "version" = "version" + 1 ... RETURNING` |
| 6 | **Agency sans price Stripe** | Aucun moyen d'acheter Agency via Stripe | Client enterprise clique "Upgrade to Agency" → erreur | Ajouter price ID ou documenter "contact us" |

---

## 💾 ÉTAPE 4 — Couche Data Access (Mise à jour)

### Problèmes persistants

| Repository | Méthode | Problème | Suggestion |
|---|---|---|---|
| `PrismaEntitlementRepository` | `getAllPlanFeatures` | Retourne TOUS les features sans pagination | `findMany` avec pagination si x100 |
| `PrismaEntitlementRepository` | `consumeUsage` | Logique complexe (37 lignes) avec double UPDATE | Extraire dans méthode privée |
| `PrismaEntitlementRepository` | `getUsage` | `findFirst` au lieu de `findUnique` (contrainte unique existe) | Remplacer par `findUnique` |
| `IEntitlementRepository` | Toutes | Fuite ORM : expose types Prisma dans l'interface | Définir types métier dans `types.ts` + mapper |
| `FeatureGateService` | `resolveFeature` | Appelle `getAllOverrides` + `getActiveSubscription` à chaque résolution | Précharger tous les contextes en 1 appel |

### Query Performance (mis à jour)

| Niveau | Fichier/méthode | Problème | Solution | Statut |
|---|---|---|---|---|
| 🔴 | `auth.ts:106` session callback | `findUnique` sur CHAQUE requête HTTP | Stocker `isVerified` dans le JWT | ❌ |
| 🔴 | `feature-gate.ts` getAllEntitlements | 4 queries avant boucle | Fusionner en raw SQL avec JOIN | ❌ |
| 🟠 | `admin/plans/route.ts` | Boucle sur 4 plans → N+1 | `findMany` + groupBy | ❌ |
| 🟡 | `downgrade.ts:207` | Index manquant | Index composite `(status, plan, currentPeriodEnd)` | ❌ |
| 🟢 | `rate-limit.ts` | UPSERT PostgreSQL ok mais mieux avec Redis | Déjà fait | ✅ |

---

## 🗄️ ÉTAPE 5 — Couche Database (Mise à jour)

### DBA — Problèmes persistants

| Table | Colonne/index | Problème | Recommandation SQL |
|---|---|---|---|
| `User` | `email` | Optionnel (`String?`) mais clé de lookup | NOT NULL pour email/password |
| `Subscription` | `status` | Pas d'index sur status | `CREATE INDEX "idx_subscription_status"` |
| `Account` | `userId` | Pas d'index explicite FK | `CREATE INDEX "idx_account_user_id"` |
| `Session` | `userId` | Idem | `CREATE INDEX "idx_session_user_id"` |
| `RateLimit` | `expires` | Pas d'index sur expires | `CREATE INDEX "idx_rate_limit_expires"` |
| `WebhookEvent` | `processedAt` | Pas d'index seul | `CREATE INDEX "idx_webhook_processed_at"` |
| `MagicLinkToken` | `used` | Pas d'index `used` | `@@index([used])` + cleanup job |

### Database Scalability — Problèmes persistants

| Risque | Impact à x10 | Impact à x100 | Mitigation |
|---|---|---|---|
| RateLimit table non nettoyée | ~1M lignes | ~100M lignes | CRON nettoyage + partitionnement temporel |
| MagicLinkToken/PRT accumulation | ~500K used=true | ~50M | TTL + DELETE WHERE used=true |
| WebhookEvent accumulation | ~100K lignes | ~10M lignes | Archive mensuelle |
| UsageTracking contention | OK | Deadlocks possibles | Advisory lock PostgreSQL |
| getAllEntitlements cache miss | ~50ms (4 queries) | ~500ms (100+ features) | Redis cache ou table matérialisée |
| Pool connexions | OK | Contention pool | PgBouncer |

---

## 🏗️ ÉTAPE 6 — Couche Infrastructure (Mise à jour)

### 🔧 Reliability

| Point de risque | Type de panne | Probabilité | Statut |
|---|---|---|---|
| BullMQ connection non-lazy | SPOF démarrage | H | ✅ Corrigé |
| Pas de circuit breaker Redis | Cascade | M | ❌ Non corrigé |
| generateWorker + exportWorker sans dédup | Non-idempotence | M | ❌ Non corrigé |
| Stripe webhook TOCTOU | Double traitement | L | ✅ Corrigé (idempotency + INSERT ON CONFLICT) |
| Email sans retry/fallback | Erreur transitoire | M | ❌ Non corrigé |
| R2 sans retry S3 | Erreur transitoire | M | ❌ Non corrigé |
| `cache.ts` utilise `unstable_cache` Next.js | Stabilité API | H | ❌ Non corrigé |

### 🔒 Security — Post-sprints

| OWASP | Criticité | Description | Statut |
|---|---|---|---|
| A03:2021 | Haut | XSS PDF export | ✅ Corrigé |
| A07:2021 | Haut | Magic Link dans URL (interception) | ❌ Non corrigé |
| A05:2021 | Haut | `GOOGLE_SHEETS_PRIVATE_KEY` multi-lignes | ❌ Non corrigé |
| A01:2021 | Moyen | CSRF auth routes | ✅ Corrigé |
| A04:2021 | Moyen | Rate limiting auth | ✅ Corrigé |
| A06:2021 | Moyen | CSP 'unsafe-eval' en dev | ❌ Non corrigé |
| A05:2021 | Moyen | Pas de Dependabot weekly | ✅ Corrigé (présent dans .github) |
| A10:2021 | Bas | SSRF risque via signedUrl R2 | ❌ Non corrigé |

### 📊 Observability — Post-sprints

| Zone aveugle | Impact | Statut |
|---|---|---|
| Aucun log structuré (console.log) | Impossible filtrer/corréler | ❌ Non corrigé |
| Pas de health check endpoint | Monitoring impossible | ✅ Corrigé |
| Performance workers invisible | Jobs lents non alertés | ❌ Non corrigé |
| Cache hit/miss ratio inconnu | Cache inefficace | ❌ Non corrigé |
| Aucune trace distribuée | Impossible tracer requête → erreur | ❌ Non corrigé |
| Pas de métriques business | Impossible mesurer conversion | ❌ Non corrigé |
| Pas de log aggregation | Logs Vercel éphémères | ❌ Non corrigé |

### ☁️ Cloud & Ops — Post-sprints

| Risque opérationnel | Impact | Statut |
|---|---|---|
| Workers BullMQ non supportés par Vercel (timeout) | Jobs non exécutés | ❌ Non corrigé (Phase 1 Workers démarrée) |
| Redis SPOF (pas de sentinel/cluster) | File d'attente bloquée | ❌ Non corrigé |
| Aucune stratégie DR documentée (RTO/RPO) | Perte données | ❌ Non corrigé |
| CI pipeline | Déploiement manuel | ✅ Corrigé (GitHub Actions) |
| Aucun monitoring uptime externe | Pannes invisibles | ❌ Non corrigé |
| Coût Anthropic API non tracké | Facture surprise | ❌ Non corrigé |
| Aucun environnement staging | Config testée en prod | ❌ Non corrigé |

### Scores Infrastructure (mis à jour)

| Catégorie | Score | Δ vs baseline |
|---|---|---|
| **Reliability** | 5/10 | +1 (lazy init, retry webhook) |
| **Security** | 8/10 | +1 (XSS, CSRF, rate limit, Dependabot) |
| **Observability** | 4/10 | +1 (health check) |
| **Cloud & Ops** | 4/10 | +1 (CI pipeline) |

---

## 🏛️ ÉTAPE 7 — Synthèse Architecte (Mise à jour post-sprints)

### Bilan des correctifs appliqués

| Sprint | Taux complétion | Correctifs majeurs |
|---|---|---|
| Sprint 1 — Correctifs critiques | ~90% | XSS PDF ✅, BullMQ lazy init ✅, JWT needsRefresh ✅, modulo bias ✅ |
| Sprint 1.5 — Sécurité & Tests | ~80% | 103 tests ✅, CSRF auth ✅, rate limiting auth ✅, Dependabot ✅ |
| Sprint 2 — Stabilisation | ~70% | Health checks ✅, polling reports ✅, chart colors ✅, downgrade detection ✅ |
| Sprint 3 — Workers & CI | ~60% | CI pipeline ✅, Workers Phase 1 ✅, integration tests ✅ |
| **Reste à faire (Sprint 4+)** | **~50 items** | Voir plan ci-dessous |

### Top 20 Problèmes (état actuel)

| Rang | Domaine | Problème | Impact | Effort | Statut |
|---|---|---|---|---|---|
| 1 | **Métier** | Exports non limités (FREE peut exporter à l'infini) | Coût R2 qui explose | S | ❌ |
| 2 | **Métier** | Double source de vérité plans (compat.ts vs DB PlanFeature) | Bugs feature flags | M | ❌ |
| 3 | **Back-End** | DB query dans session callback auth.ts (isVerified) | +3ms/req, pas de cache | XS | ❌ |
| 4 | **Front-End** | Dashboard non-responsive (sidebar fixe, pas de breakpoint) | 30%+ trafic mobile perdu | L | ❌ |
| 5 | **Data/DB** | Index manquants : `used` sur tokens, `status` sur Subscription | Perf dégradée | S | ❌ |
| 6 | **Métier** | FREE plan maxSlides=8 vs default slideCount=10 | Crash silencieux | S | ❌ |
| 7 | **Infra** | Workers BullMQ incompatibles Vercel serverless (timeout) | Jobs de fond non exécutés | L | ❌ |
| 8 | **Métier** | Race condition consumeUsage sous charge (P2002 catch) | Perte de quota | M | ❌ |
| 9 | **Métier** | Race condition version increment generate.worker (non atomique) | Perte génération | M | ❌ |
| 10 | **Data/DB** | RateLimit table non nettoyée | Accumulation, perf | S | ❌ |
| 11 | **Front-End** | Upload progression indicator absent | Mauvaise UX | M | ❌ |
| 12 | **Infra** | Aucun log structuré (console.log) | Debugging impossible | S | ❌ |
| 13 | **Infra** | Magic link dans URL (interception possible) | Sécurité auth | M | ❌ |
| 14 | **Infra** | Pas de circuit breaker Redis | Cascade panne | M | ❌ |
| 15 | **Infra** | Aucun monitoring uptime externe | Pannes invisibles | S | ❌ |
| 16 | **Infra** | Aucune trace distribuée (request ID) | Debugging impossible | M | ❌ |
| 17 | **Back-End** | `as any` dans stripe-webhook-handler | Perte type safety | XS | ❌ |
| 18 | **Infra** | Aucun environnement staging | Config testée en prod | L | ❌ |
| 19 | **Front-End** | CSS landing dans globals.css | Bundle inutile | M | ❌ |
| 20 | **Back-End** | GOOGLE_SHEETS_PRIVATE_KEY multi-lignes corrompu | Auth Google Sheets cassé | XS | ❌ |

### 🧨 Dette technique critique

1. **Deux systèmes de plans** (`compat.ts` statique + `PlanFeature` en DB) — déjà documenté comme "à migrer" mais pas fait. Chaque nouvelle feature doit être ajoutée aux deux endroits.
2. **Console.log** au lieu de logging structuré — avec la croissance, l'absence de logs corrélables rendra chaque incident une enquête de 2h+.
3. **Absence de versioning API** — dès qu'un client externe (API keys, embed) consomme les APIs, un breaking change force une migration douloureuse.
4. **CSS landing dans globals.css** — plus la landing s'enrichit, plus le bundle CSS grossit pour RIEN sur les pages connectées.

### ⚠️ Risques à 6 mois

| Risque | Pourquoi devient bloquant |
|---|---|
| **Workers Vercel incompatibles** | Premier client enterprise → timeout sur génération |
| **Coûts R2/Anthropic non trackés** | Premier mois à 1000 exports → facture surprise |
| **FREE export illimité** | Détournement du FREE plan comme API gratuite |
| **Dashboard non-responsive** | Trafic mobile croissant → taux de rebond ×2 |
| **Pas de staging** | Prochain déploiement cassé en prod sans détection |

---

### 📅 Plan d'action priorisé (Sprint 4+)

#### Sprint 4 — Correctifs résiduels (semaine 1-2)

| # | Priorité | Action | Effort |
|---|---|---|---|
| 1 | 🔴 **CRITIQUE** | Ajouter `consume('exportsPerMonth')` dans export.worker | S |
| 2 | 🔴 **CRITIQUE** | Valider slideCount ≤ plan.maxSlides avant génération | S |
| 3 | 🔴 **HAUT** | Stoker `isVerified` dans JWT token (supprimer query DB session callback) | XS |
| 4 | 🔴 **HAUT** | Ajouter index `used` sur tokens + cleanup job | S |
| 5 | 🔴 **HAUT** | Fix race condition consumeUsage (INSERT ON CONFLICT atomique) | M |
| 6 | 🔴 **HAUT** | Fix race condition version increment (atomic UPDATE RETURNING) | M |

#### Sprint 5 — Stabilisation (semaine 3-6)

| # | Priorité | Action | Effort |
|---|---|---|---|
| 7 | 🟠 HAUT | Rendre dashboard responsive (hamburger < 768px) | L |
| 8 | 🟠 HAUT | Ajouter pagination dashboard reports | S |
| 9 | 🟠 HAUT | Ajouter upload progression indicator | M |
| 10 | 🟠 HAUT | Supprimer compat.ts statique, migrer vers DB uniquement | M |
| 11 | 🟠 HAUT | Ajouter logging structuré (pino/winston + JSON) | M |
| 12 | 🟠 MOYEN | Remplacer magic link URL par POST body callback | M |
| 13 | 🟠 MOYEN | Ajouter request ID + Sentry traces | M |
| 14 | 🟠 MOYEN | Extraire CSS landing de globals.css | M |
| 15 | 🟠 MOYEN | Corriger `as any` dans stripe-webhook-handler | XS |

#### Sprint 6 — Amélioration (mois 2-3)

| # | Priorité | Action | Effort |
|---|---|---|---|
| 16 | 🟡 MOYEN | Ajouter circuit breaker Redis (opossum) + retry S3 | M |
| 17 | 🟡 MOYEN | Ajouter monitoring uptime externe (Checkly/Better Uptime) | S |
| 18 | 🟡 MOYEN | Ajouter stockage GOOGLE_SHEETS_PRIVATE_KEY (PEM multiline) | XS |
| 19 | 🟡 MOYEN | Ajouter DTO/mapper pour entités ORM → API responses | M |
| 20 | 🟡 MOYEN | Ajouter pagination dans getAllPlanFeatures | S |
| 21 | 🟡 FAIBLE | Remplacer SVG landing par Lucide icons | S |
| 22 | 🟡 FAIBLE | Alternativement textuelle graphiques (aria-label) | S |
| 23 | 🟡 FAIBLE | Ajouter `loading="lazy"` sur images landing | XS |

#### Horizon 6 mois — Évolution

| # | Priorité | Action | Effort |
|---|---|---|---|
| 24 | 🔵 ARCHI | Déployer workers BullMQ sur service dédié (Railway/Fly.io) | XL |
| 25 | 🔵 ARCHI | Documenter stratégie DR (RTO≤1h/RPO≤5min) + tester | M |
| 26 | 🔵 ARCHI | Ajouter environnement staging avec DB/Redis/R2 dédiés | L |
| 27 | 🔵 ARCHI | Remplacer Puppeteer par service PDF dédié | XL |
| 28 | 🔵 ARCHI | Ajouter versioning API (/api/v1/) | M |
| 29 | 🔵 ARCHI | Dockerfile pour worker + documentation déploiement | S |
| 30 | 🔵 ARCHI | Métriques business (reports/min, exports, conversions) dans Sentry | S |

---

### Score d'architecture global (mis à jour)

| Catégorie | Score | Δ vs baseline |
|---|---|---|
| **Architecture** | 7/10 | = |
| **Sécurité** | 8/10 | **+1** |
| **Performance** | 5.5/10 | +0.5 |
| **Maintenabilité** | 6/10 | = |
| **Scalabilité** | 4.5/10 | +0.5 |
| **Observabilité** | 4/10 | +1 |
| **Score global** | **5.8/10** | **+0.5** |

### Verdict

**DataPresent a significativement progressé depuis la baseline.** Les Sprints 1-3 ont corrigé les vulnérabilités critiques (XSS, CSRF, rate limiting), amélioré la fiabilité (health checks, lazy init, retry webhook) et posé les bases CI (GitHub Actions, 100+ tests).

**Il reste ~50 items techniques à adresser**, dont 6 critiques (exports non limités, session callback DB, race conditions, responsive dashboard, dual plan system). La plupart sont des correctifs rapides (XS/S) qui ne devraient pas prendre plus de 2 semaines.

**La trajectoire recommandée** est : 2 semaines pour les correctifs résiduels (Sprint 4) → 1 mois de stabilisation (Sprint 5) → 1 mois d'amélioration (Sprint 6) → puis planifier l'évolution architecturale (workers dédiés, staging, monitoring, versioning API) avant de viser x10 de charge.

Le projet a une base technique saine (TypeScript strict, Argon2, Zod, CSP, architecture modulaire) et les bonnes pratiques sont suivies. La priorité immédiate est de sécuriser le modèle économique (limiter les exports FREE) et de garantir la scalabilité du dashboard (responsive + pagination).
