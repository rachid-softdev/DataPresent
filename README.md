# DataPresent

> Transformez vos données en présentations professionnelles grâce à l'IA.

[![CI](https://github.com/rachid-softdev/DataPresent/actions/workflows/ci.yml/badge.svg)](https://github.com/rachid-softdev/DataPresent/actions/workflows/ci.yml)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)

DataPresent est une application SaaS qui converts vos fichiers de données (Excel, CSV, PDF, Google Sheets) en présentations professionnels générées par IA. Sélectionnez un secteur, configurez le nombre de slides, et recevez un deck complet avec graphiques et insights.

**Cas d'usage :**
- Rapports financiers mensuels
- Analyses marketing et KPIs
- Présentations RH et tableaux de bord
- Reviews SaaS et métriques produit

---

## Stack

| Catégorie | Technologies |
|---|---|
| **Frontend** | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 + shadcn/ui + Framer Motion |
| **Backend** | Next.js API Routes + Prisma (PostgreSQL) + NextAuth.js v5 |
| **AI** | Claude API (Anthropic) — analyse et génération de slides |
| **Queue** | BullMQ + Redis — jobs asynchrones de génération et export |
| **Stockage** | Cloudflare R2 (S3-compatible) — fichiers et exports |
| **Billing** | Stripe — abonnements Free / Pro (19€/mois) / Team (49€/mois) |
| **Email** | Nodemailer (dev) / Resend (prod) |
| **i18n** | next-intl — Français + Anglais |
| **Tests** | Playwright (E2E) |

---

## Prérequis

- **Node.js 22+**
- **PostgreSQL** (Neon recommandé pour production)
- **Redis** (Redis Cloud recommandé pour production)
- Compte Stripe (abonnements)
- Compte Cloudflare R2 (stockage)
- Clé API Anthropic
- (Optionnel) Google OAuth credentials

---

## Installation

```bash
# 1. Cloner et installer les dépendances
git clone https://github.com/rachid-softdev/DataPresent.git
cd DataPresent
npm install

# 2. Configurer l'environnement
cp .env.example .env.local
# Éditer .env.local avec vos credentials (voir section Variables d'environnement)

# 3. Valider la configuration
npm run check:env

# 4. Initialiser la base de données
npm run db:push

# 5. Lancer en développement (mode complet)
npm run dev:complete
# OU lancer uniquement Next.js
npm run dev
```

Pour un setup dev complet avec MailHog, Stripe CLI et Redis :
```bash
npm run dev:complete
# Services: Next.js (3000) + MailHog SMTP (1025) + Stripe CLI webhook proxy
```

---

## Variables d'environnement

| Variable | Description | Exemple |
|---|---|---|
| `DATABASE_URL` | Connection string PostgreSQL | `postgresql://user:pass@host:5432` |
| `DATABASE_URL_LOCAL` | Connection dev locale | `postgresql://dev:azerty123@localhost:5432/dev` |
| `REDIS_URL` | Connection Redis Cloud | `redis://user:pass@host:port` |
| `REDIS_URL_LOCAL` | Connection dev locale | `redis://localhost:6379` |
| `NEXTAUTH_URL` | URL de l'app (prod) | `https://datapresent.com` |
| `NEXTAUTH_SECRET` | Secret JWT (générer: `openssl rand -base64 32`) | `xxx...` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | `xxx` |
| `RESEND_API_KEY` | Clé API Resend (prod) | `re_...` |
| `SMTP_*` | Config SMTP dev (MailHog) | localhost:1025 |
| `STRIPE_SECRET_KEY` | Clé secrète Stripe | `sk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Secret webhook Stripe | `whsec_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Clé publique Stripe | `pk_test_...` |
| `STRIPE_PRO_PRICE_ID` | Price ID plan Pro | `price_...` |
| `STRIPE_TEAM_PRICE_ID` | Price ID plan Team | `price_...` |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | `xxx` |
| `R2_ACCESS_KEY_ID` | R2 Access Key | `xxx` |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key | `xxx` |
| `R2_BUCKET_NAME` | Nom du bucket | `datapresent` |
| `R2_PUBLIC_URL` | URL publique R2 | `https://pub-r2.datapresent.com` |
| `ANTHROPIC_API_KEY` | Clé API Anthropic | `sk-ant-api03-...` |
| `CSRF_SECRET` | Secret CSRF (min 32 chars) | `xxx...` |
| `ALLOWED_ORIGINS` | Origines autorisées (virgule) | `https://datapresent.com` |
| `NEXT_PUBLIC_BASE_URL` | Base URL publique | `https://datapresent.com` |
| `GOOGLE_SHEETS_CLIENT_EMAIL` | Service account Google Sheets | `xxx@xxx.iam.gserviceaccount.com` |
| `GOOGLE_SHEETS_PRIVATE_KEY` | Clé privée Google Sheets | `-----BEGIN PRIVATE KEY-----...` |

---

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Lancer le serveur Next.js |
| `npm run dev:complete` | Lancer avec Redis, Stripe CLI, MailHog |
| `npm run build` | Build de production |
| `npm run start` | Démarrer en production |
| `npm run lint` | Linter ESLint |
| `npm run db:push` | Synchroniser le schéma Prisma |
| `npm run db:generate` | Générer les types Prisma |
| `npm run db:studio` | Ouvrir Prisma Studio |
| `npm run db:reset` | Reset + push du schéma |
| `npm run worker:dev` | Lancer les workers BullMQ |
| `npm run stripe:setup` | Configurer les produits Stripe |
| `npm run stripe:test-webhooks` | Tester les webhooks Stripe |
| `npm run mailhog:setup` | Setup MailHog |
| `npm run check:env` | Valider les variables d'environnement |
| `npm run test` | Lancer les tests E2E Playwright |
| `npm run test:ui` | Lancer Playwright avec UI |
| `npm run test:headed` | Lancer Playwright headed |
| `npm run blog:generate` | Générer les articles de blog |

---

## Architecture

```
src/
├── app/                    # Pages et API routes (Next.js App Router)
│   ├── layout.tsx          # Root layout
│   ├── page.tsx           # Landing page
│   ├── [locale]/          # Routes localisées (FR/EN)
│   │   ├── (auth)/        # Login / Signup
│   │   ├── (dashboard)/   # Dashboard protégé
│   │   │   ├── new/       # Création de rapport
│   │   │   ├── reports/   # Liste et vue des rapports
│   │   │   └── settings/ # Profil, compte, org, billing, team
│   │   ├── share/         # Partage public
│   │   ├── embed/         # Embed iframe
│   │   ├── blog/          # Blog SEO
│   │   └── api/           # API routes (upload, auth, stripe, reports…)
│   └── api/               # API non-localisées (OG images)
├── components/
│   ├── ui/                # Composants shadcn/ui
│   ├── slides/            # SlideViewer, SlideCard, layouts (charts, KPIs…)
│   ├── upload/            # DropZone, SectorSelector, SlideCountSlider
│   ├── billing/           # PricingTable, PlanBadge
│   ├── comments/         # CommentThread, CommentItem, CommentInput
│   ├── share/             # ShareModal
│   ├── org/               # DashboardNav, OrgSwitcher
│   ├── onboarding/        # OnboardingWrapper, OnboardingTour
│   ├── blog/              # BlogCard, BlogRenderer
│   └── watermark/         # Watermark (FREE plans)
├── lib/
│   ├── ai/                # Claude API (analyze + prompts + schemas Zod)
│   ├── parsers/           # Parseurs XLSX, CSV, PDF, Google Sheets
│   ├── exporters/         # Générateurs PPTX, PDF, DOCX
│   ├── queue/             # BullMQ (client + workers generate/export)
│   └── security/          # CSRF, job signing, rate limiting
├── i18n/                   # Configuration next-intl
├── messages/               # Traductions (en.json, fr.json)
└── types/                  # Types TypeScript
```

---

## Flux Principal

```
[Upload] → [Parse] → [Queue] → [Claude AI] → [Slides DB] → [Viewer] → [Export/Share]
   1          2          3           4             5            6           7
```

1. **Upload** — Fichier (XLSX, CSV, PDF, Google Sheets) via drag & drop
2. **Parse** — Extraction et structuration des données
3. **File d'attente** — Job async dans BullMQ (rate limited: 20 uploads/h, 10 générations/h)
4. **Analyse IA** — Claude Sonnet 4 analyse les données selon le secteur sélectionné
5. **Génération slides** — 7 layouts : Title, KPI Grid, Bar/LIne/Pie Chart, Text Summary, Comparison
6. **Visualisation** — Slide viewer interactif avec commentaires par slide
7. **Export / Partage** — PPTX, PDF, DOCX ou partage public avec embed

---

## Plans & Fonctionnalités

| Fonctionnalité | Free | Pro | Team |
|---|---|---|---|
| Rapports/mois | 3 | Illimité | Illimité |
| Slides max/rapport | 8 | 20 | 20 |
| Formats d'export | PPTX | PPTX, PDF, DOCX | PPTX, PDF, DOCX |
| Organisations | 1 | 1 | Illimité |
| Watermark | Oui | Non | Non |
| Support | - | Email | Prioritaire |

---

## API (aperçu)

### Auth
- `POST /api/auth/magic-link` — Envoyer magic link
- `GET /api/auth/callback/email` — Callback email
- `POST /api/auth/signup` — Inscription
- `POST /api/auth/forgot-password` — Mot de passe oublié
- `POST /api/auth/reset-password` — Réinitialiser mot de passe
- `POST /api/auth/accept-invite` — Accepter invitation

### Rapports
- `POST /api/upload` — Upload de fichier
- `POST /api/reports/[id]/generate` — Lancer génération
- `POST /api/reports/[id]/regenerate` — Régénérer
- `POST /api/reports/[id]/export` — Exporter (PPTX/PDF/DOCX)
- `POST /api/reports/[id]/share` — Activer partage
- `GET/POST /api/reports/[id]/comments` — Commentaires

### Billing
- `POST /api/stripe/checkout` — Checkout Stripe
- `POST /api/stripe/portal` — Customer Portal
- `POST /api/stripe/webhook` — Webhook Stripe

---

## Déploiement

### Vercel (recommandé)

```bash
# Build sur Vercel automatique via GitHub Actions (CI/CD déjà configuré)
# Variables d'environnement à configurer dans Vercel Dashboard
npm run build
```

### Docker

```bash
docker build -t datapresent .
docker run -p 3000:3000 --env-file .env.local datapresent
```

> Note : En production, workers BullMQ doivent tourner dans un process séparé (`npm run worker:start`).

---

## Roadmap — v1.1

### Fonctionnalités planifiées

- [ ] **Partage protégé par mot de passe** — Vérification dans la page `/share/[shareToken]`
- [ ] **Emails d'invitation team** — Envoi d'emails lors d'invitations org
- [ ] **Flux réinitialisation mot de passe** — Pages + logique complète
- [ ] **Page accept-invite** — Composant UI pour accepter les invitations
- [ ] **Dashboard d'usage** — Affichage quota mensuel avec progress bar
- [ ] **Notifications limites** — Email quand接近 du quota
- [ ] **Retry génération** — Retry automatique si l'API Claude échoue
- [ ] **Aperçu données** — Validation et preview avant génération
- [ ] **Reordering slides** — Drag & drop via dnd-kit
- [ ] **Tests unitaires** — Couverture avec Vitest
- [ ] **Mock services** — Mocks pour Stripe/Claude en dev
- [ ] **Pagination rapports** — Liste avec pagination
- [ ] **Recherche/filtres** — Dashboard search + filtres
- [ ] **Code splitting** — Lazy loading pour libs lourdes
- [ ] **Prettier** — Formatage automatique
- [ ] **Storybook** — Documentation composants

---

## Développement

### Conventions

- **Nommage** : `camelCase` pour fichiers/props, `PascalCase` pour composants React
- **API responses** : Structure `{ data, error, status }` via `lib/errors.ts`
- **Validation** : Zod schemas côté API, react-hook-form + zod côté UI
- **Plan gating** : `lib/plan-utils.ts` — vérifier les permissions avant chaque action
- **Job security** : `lib/queue/job-security.ts` — HMAC-SHA256 signing de la job data

### Arborescence des branches

```
main              → Production
├── docs/         → Documentation
├── feat/         → Nouvelles fonctionnalités
├── fix/          → Corrections
├── perf/         → Optimisations
└── refactor/     → Refactoring
```

### Tests

```bash
# Lancer les E2E
npm run test

# Mode interactif
npm run test:ui

# headed (avec navigateur visible)
npm run test:headed
```

---

## Dépannage

### "Connection refused" sur Redis
```bash
# Vérifier que Redis tourne
redis-cli ping
# OU lancer Redis local
redis-server
```

### "No database" sur Prisma
```bash
npm run db:push
```

### Webhooks Stripe qui ne marchent pas
```bash
# Lancer Stripe CLI en mode proxy
npm run stripe:setup
```

### Erreur 401 sur upload
Vérifier `NEXTAUTH_SECRET` et que la session est valide.

---

## Licence

Propriétaire — Tous droits réservés © 2025-2026 Rachid SoftDev