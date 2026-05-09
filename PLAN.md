
---

## 🚀 Ton SaaS : "DataPresent" (nom de travail)

### 🎯 Positionnement différenciant vs Slaid

| Feature | Slaid | Ton SaaS |
|---|---|---|
| Formats d'entrée | Excel uniquement | Excel, CSV, PDF, Google Sheets |
| Sorties | PPTX | PPTX + PDF + Word + lien partageable |
| Templates | Générique | Par secteur (Finance, Marketing, RH, SaaS...) |
| Collaboration | ❌ | Commentaires, partage par lien, workspace équipe |
| White label | ❌ | Oui (iframe embed pour agences) |
| Modèle pricing | Crédits | Abonnements Stripe (Free / Pro / Team) |

---

## 🏗️ Stack technique (Next.js + Anthropic)

**Frontend**
- Next.js 14 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- React Query (TanStack) pour les états serveur
- `@dnd-kit` pour le drag-and-drop de slides

**Backend / API**
- Next.js API Routes + tRPC pour la type-safety end-to-end
- Clerk ou NextAuth pour l'authentification
- BullMQ + Redis pour la file d'attente des générations (jobs longs)
- Supabase (Postgres + Storage) ou PlanetScale

**Parsing des fichiers**
- `xlsx` (SheetJS) pour Excel/CSV
- `pdf-parse` ou `pdfjs-dist` pour les PDFs
- Google Sheets API v4 pour l'intégration native

**AI**
- Claude API (`claude-sonnet-4-20250514`) pour l'analyse + narration
- Prompt engineering structuré : tu envoies le JSON des données + le secteur sélectionné → Claude retourne un JSON de slides

**Output**
- `pptxgenjs` pour générer le PPTX côté serveur
- `docx` pour Word
- `puppeteer` ou `@react-pdf/renderer` pour PDF

**Infra & Billing**
- Vercel (deploy) + Cloudflare R2 (stockage fichiers)
- Stripe avec `stripe-js` + webhooks pour les subscriptions
- Postmark pour les emails transactionnels
- Sentry pour le monitoring

---

## 💰 Modèle Stripe recommandé

```
Free        → 3 rapports/mois, watermark, formats basiques
Pro (19€/m) → 30 rapports, tous formats, templates sectoriels
Team (49€/m)→ utilisateurs illimités, collaboration, white label lite
Agency (custom) → white label complet, API access
```

Pas de crédits — les abonnements récurrents convertissent mieux et simplifient la comptabilité.

---

## 📁 Structure du projet

```
/app
  /(auth)         → login, signup
  /(dashboard)
    /upload        → drag & drop + sélection format + secteur
    /reports/[id]  → viewer de slides interactif
    /reports/[id]/share → lien public + commentaires
    /templates     → galerie par secteur
    /billing       → plans Stripe
  /api
    /upload        → parsing fichier → job queue
    /generate      → appel Claude → JSON slides
    /export        → PPTX / PDF / DOCX
    /stripe        → webhooks
/lib
  /parsers         → xlsx, csv, pdf, gsheets
  /ai              → prompts Claude + schemas
  /exporters       → pptxgenjs, docx, pdf
  /queue           → BullMQ workers
```

---

## 🧠 Prompt Claude — cœur du produit

Le secret est dans le prompt. Structure recommandée :

```
System: Tu es un analyste expert en [SECTEUR].
Analyse ces données et génère une présentation JSON structurée.

Format de retour STRICT:
{
  "title": string,
  "insights": [{ "type": "trend|anomaly|kpi", "text": string }],
  "slides": [{
    "title": string,
    "layout": "kpi_grid|chart|text_summary|comparison",
    "content": { ... },
    "speaker_notes": string
  }]
}

User: Données: [JSON_DONNÉES]
Secteur: [Finance / Marketing / RH / SaaS]
Nombre de slides: [5-15]
Langue: [FR/EN]
```


---

## ⚡ Quick wins pour se différencier dès le MVP

1. **"Analyse en 30 secondes"** — afficher un compteur + preview partielle pendant la génération (streaming)
2. **Secteur dès l'upload** — dropdown Finance / Marketing / RH / SaaS qui adapte le tone + les KPIs mis en avant
3. **Speaker notes auto** — Claude génère les notes de présentation pour chaque slide, Slaid ne fait pas ça
4. **Rapport Word inclus** — résumé exécutif en Word en plus des slides, valeur perçue immédiate pour les consultants

---



# DataPresent — Plan de développement complet

## Stack technique

- **Framework** : Next.js 14 (App Router) + TypeScript
- **UI** : Tailwind CSS + shadcn/ui
- **Auth** : NextAuth.js v5
- **ORM** : Prisma + PostgreSQL (Supabase)
- **AI** : Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Queue** : BullMQ + Redis (Upstash)
- **Storage** : Cloudflare R2 (fichiers uploadés + exports)
- **Billing** : Stripe (subscriptions)
- **Email** : Postmark
- **Deploy** : Vercel
- **Monitoring** : Sentry

---

## Schéma Prisma

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// --- Auth (NextAuth.js) ---

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// --- Users & Orgs ---

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts   Account[]
  sessions   Session[]
  membership Membership[]
  comments   Comment[]
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  members     Membership[]
  reports     Report[]
  subscription Subscription?
}

model Membership {
  id     String           @id @default(cuid())
  role   MembershipRole   @default(MEMBER)
  userId String
  orgId  String

  user User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  org  Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  @@unique([userId, orgId])
}

enum MembershipRole {
  OWNER
  ADMIN
  MEMBER
}

// --- Billing ---

model Subscription {
  id                   String             @id @default(cuid())
  orgId                String             @unique
  stripeCustomerId     String             @unique
  stripeSubscriptionId String?            @unique
  stripePriceId        String?
  plan                 Plan               @default(FREE)
  status               SubscriptionStatus @default(ACTIVE)
  currentPeriodEnd     DateTime?
  createdAt            DateTime           @default(now())
  updatedAt            DateTime           @updatedAt

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
}

enum Plan {
  FREE
  PRO
  TEAM
}

enum SubscriptionStatus {
  ACTIVE
  PAST_DUE
  CANCELED
  TRIALING
}

// --- Reports ---

model Report {
  id          String       @id @default(cuid())
  title       String
  sector      Sector
  status      ReportStatus @default(PENDING)
  orgId       String
  shareToken  String?      @unique @default(cuid())
  isPublic    Boolean      @default(false)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  sourceFile SourceFile?
  slides    Slide[]
  exports   Export[]
  comments  Comment[]
}

enum ReportStatus {
  PENDING
  PROCESSING
  DONE
  ERROR
}

enum Sector {
  FINANCE
  MARKETING
  HR
  SAAS
  GENERIC
}

model SourceFile {
  id        String   @id @default(cuid())
  reportId  String   @unique
  filename  String
  fileType  FileType
  r2Key     String
  sizeBytes Int
  createdAt DateTime @default(now())

  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
}

enum FileType {
  XLSX
  CSV
  PDF
  GSHEET
}

model Slide {
  id           String     @id @default(cuid())
  reportId     String
  position     Int
  title        String
  layout       SlideLayout
  contentJson  Json
  speakerNotes String?
  createdAt    DateTime   @default(now())

  report   Report    @relation(fields: [reportId], references: [id], onDelete: Cascade)
  comments Comment[]
}

enum SlideLayout {
  KPI_GRID
  BAR_CHART
  LINE_CHART
  PIE_CHART
  TEXT_SUMMARY
  COMPARISON
  TITLE_SLIDE
}

model Export {
  id         String       @id @default(cuid())
  reportId   String
  format     ExportFormat
  r2Key      String?
  status     ExportStatus @default(PENDING)
  createdAt  DateTime     @default(now())

  report Report @relation(fields: [reportId], references: [id], onDelete: Cascade)
}

enum ExportFormat {
  PPTX
  PDF
  DOCX
}

enum ExportStatus {
  PENDING
  DONE
  ERROR
}

// --- Collaboration ---

model Comment {
  id        String   @id @default(cuid())
  body      String   @db.Text
  reportId  String
  slideId   String?
  authorId  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  report Report  @relation(fields: [reportId], references: [id], onDelete: Cascade)
  slide  Slide?  @relation(fields: [slideId], references: [id], onDelete: SetNull)
  author User    @relation(fields: [authorId], references: [id], onDelete: Cascade)
}
```

---

## Structure des dossiers

```
/app
  /(auth)
    /login/page.tsx
    /signup/page.tsx
  /(dashboard)
    /layout.tsx                  ← sidebar + org switcher
    /page.tsx                    ← liste des reports
    /new/page.tsx                ← upload + choix secteur
    /reports/[id]/page.tsx       ← viewer slides
    /reports/[id]/share/page.tsx ← gestion partage public
    /templates/page.tsx          ← galerie templates par secteur
    /settings/
      /billing/page.tsx
      /team/page.tsx
  /share/[shareToken]/page.tsx   ← vue publique (sans auth)
  /api
    /auth/[...nextauth]/route.ts
    /upload/route.ts             ← reçoit fichier → parse → enqueue job
    /reports/[id]/generate/route.ts ← déclenche génération IA
    /reports/[id]/export/route.ts   ← déclenche export PPTX/PDF/DOCX
    /stripe/webhook/route.ts
    /stripe/checkout/route.ts
    /stripe/portal/route.ts

/lib
  /auth.ts                  ← config NextAuth.js
  /prisma.ts                ← singleton PrismaClient
  /stripe.ts                ← singleton Stripe
  /r2.ts                    ← client Cloudflare R2 (S3-compatible)
  /parsers/
    xlsx.ts                 ← SheetJS → JSON normalisé
    csv.ts
    pdf.ts                  ← pdf-parse → texte brut
    gsheets.ts              ← Google Sheets API v4
  /ai/
    analyze.ts              ← appel Claude → JSON slides
    prompts.ts              ← prompts par secteur
    schemas.ts              ← zod schemas pour la réponse Claude
  /exporters/
    pptx.ts                 ← pptxgenjs → Buffer
    pdf.ts                  ← puppeteer → Buffer
    docx.ts                 ← docx lib → Buffer
  /queue/
    client.ts               ← BullMQ connection
    workers/
      generate.worker.ts    ← parse → Claude → save slides
      export.worker.ts      ← génère fichier → upload R2

/components
  /slides/
    SlideViewer.tsx          ← carrousel slides côté client
    SlideCard.tsx
    layouts/                 ← un composant par SlideLayout
      KpiGrid.tsx
      BarChart.tsx
      LindeChart.tsx
      TextSummary.tsx
      Comparison.tsx
  /upload/
    DropZone.tsx
    SectorSelector.tsx
    SlideCountSlider.tsx
  /comments/
    CommentThread.tsx
    CommentInput.tsx
  /billing/
    PricingTable.tsx
    PlanBadge.tsx

/prisma
  /schema.prisma
  /migrations/
```

---

## Config NextAuth.js (`/lib/auth.ts`)

```ts
import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import GithubProvider from "next-auth/providers/github"
import ResendProvider from "next-auth/providers/resend"
import { prisma } from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GithubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    ResendProvider({
      from: "noreply@yourdomain.com",
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
```

---

## Plans Stripe & limites (`/lib/plans.ts`)

```ts
export const PLANS = {
  FREE: {
    name: "Free",
    price: 0,
    reportsPerMonth: 3,
    maxSlides: 8,
    formats: ["PPTX"] as const,
    collaboration: false,
    watermark: true,
    stripePriceId: null,
  },
  PRO: {
    name: "Pro",
    price: 19,
    reportsPerMonth: 30,
    maxSlides: 20,
    formats: ["PPTX", "PDF", "DOCX"] as const,
    collaboration: false,
    watermark: false,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID!,
  },
  TEAM: {
    name: "Team",
    price: 49,
    reportsPerMonth: -1, // illimité
    maxSlides: 30,
    formats: ["PPTX", "PDF", "DOCX"] as const,
    collaboration: true,
    watermark: false,
    stripePriceId: process.env.STRIPE_TEAM_PRICE_ID!,
  },
} as const
```

---

## Pipeline IA — Prompt Claude (`/lib/ai/prompts.ts`)

```ts
export function buildAnalysisPrompt(params: {
  dataJson: string
  sector: string
  slideCount: number
  language: "fr" | "en"
}): string {
  return `You are a senior data analyst specialized in ${params.sector}.
Analyze the following dataset and generate a structured presentation.

STRICT JSON output only. No markdown. No preamble.

Response schema:
{
  "title": string,
  "insights": [
    { "type": "trend" | "anomaly" | "kpi", "text": string }
  ],
  "slides": [
    {
      "position": number,
      "title": string,
      "layout": "KPI_GRID" | "BAR_CHART" | "LINE_CHART" | "PIE_CHART" | "TEXT_SUMMARY" | "COMPARISON" | "TITLE_SLIDE",
      "content": object,
      "speakerNotes": string
    }
  ]
}

Rules:
- Generate exactly ${params.slideCount} slides
- First slide must be layout TITLE_SLIDE
- Last slide must be layout TEXT_SUMMARY (key takeaways)
- Language: ${params.language === "fr" ? "French" : "English"}
- Focus on: trends, anomalies, top performers, actionable insights
- Sector context: ${getSectorContext(params.sector)}

Data:
${params.dataJson}`
}

function getSectorContext(sector: string): string {
  const contexts: Record<string, string> = {
    FINANCE: "Focus on revenue, margins, cash flow, budget variance, YoY growth",
    MARKETING: "Focus on CAC, conversion rates, channel performance, ROI, funnel metrics",
    HR: "Focus on headcount, attrition, hiring velocity, compensation bands, engagement",
    SAAS: "Focus on MRR, churn, LTV, NPS, activation rate, expansion revenue",
    GENERIC: "Focus on key metrics, trends, outliers, and actionable recommendations",
  }
  return contexts[sector] ?? contexts.GENERIC
}
```

---

## Worker BullMQ — génération (`/lib/queue/workers/generate.worker.ts`)

```ts
import { Worker } from "bullmq"
import { prisma } from "@/lib/prisma"
import { parseFile } from "@/lib/parsers"
import { analyzeWithClaude } from "@/lib/ai/analyze"
import { connection } from "@/lib/queue/client"

export const generateWorker = new Worker(
  "generate",
  async (job) => {
    const { reportId } = job.data

    await prisma.report.update({
      where: { id: reportId },
      data: { status: "PROCESSING" },
    })

    try {
      // 1. Récupérer le fichier source
      const report = await prisma.report.findUniqueOrThrow({
        where: { id: reportId },
        include: { sourceFile: true },
      })

      // 2. Parser le fichier depuis R2
      const parsedData = await parseFile(report.sourceFile!)

      // 3. Appel Claude
      const result = await analyzeWithClaude({
        dataJson: JSON.stringify(parsedData),
        sector: report.sector,
        slideCount: 10,
        language: "fr",
      })

      // 4. Sauvegarder les slides
      await prisma.$transaction([
        prisma.slide.deleteMany({ where: { reportId } }),
        prisma.slide.createMany({
          data: result.slides.map((s) => ({
            reportId,
            position: s.position,
            title: s.title,
            layout: s.layout,
            contentJson: s.content,
            speakerNotes: s.speakerNotes,
          })),
        }),
        prisma.report.update({
          where: { id: reportId },
          data: { title: result.title, status: "DONE" },
        }),
      ])
    } catch (error) {
      await prisma.report.update({
        where: { id: reportId },
        data: { status: "ERROR" },
      })
      throw error
    }
  },
  { connection }
)
```

---

## Variables d'environnement (`.env.example`)

```bash
# Database
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="..."

# OAuth
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
GITHUB_ID="..."
GITHUB_SECRET="..."

# Anthropic
ANTHROPIC_API_KEY="..."

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_TEAM_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_..."

# Cloudflare R2
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="datapresent"
R2_PUBLIC_URL="https://..."

# Redis (Upstash)
REDIS_URL="redis://..."

# Email
RESEND_API_KEY="re_..."

# Google Sheets (optionnel)
GOOGLE_SHEETS_CLIENT_EMAIL="..."
GOOGLE_SHEETS_PRIVATE_KEY="..."
```

---

## Packages à installer

```bash
# Core
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client

# AI
npm install @anthropic-ai/sdk

# Parsing
npm install xlsx pdf-parse googleapis

# Export
npm install pptxgenjs docx

# Queue
npm install bullmq ioredis

# Storage (R2 = S3-compatible)
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner

# Billing
npm install stripe @stripe/stripe-js

# Validation
npm install zod

# UI
npm install tailwindcss shadcn-ui lucide-react

# Dev
npm install -D @types/node typescript ts-node
```

---

## Roadmap MVP (8 semaines)

### Semaines 1–2 — Core pipeline
- Setup Next.js + Prisma + NextAuth (Google + email magic link)
- Upload Excel/CSV → parsing SheetJS → JSON normalisé
- Appel Claude → JSON slides → save en base
- Viewer slides basique (liste de SlideCard)

### Semaines 3–4 — Monétisation & exports
- Intégration Stripe : checkout, webhooks, portail client
- Limites par plan (middleware qui vérifie subscription)
- Export PPTX avec pptxgenjs
- Export PDF + Word

### Semaines 5–6 — Formats & templates
- Support PDF input (pdf-parse)
- Support Google Sheets (OAuth + API v4)
- Templates sectoriels : Finance, Marketing, HR, SaaS
- Speaker notes affichées dans le viewer

### Semaines 7–8 — Collaboration & polish
- Commentaires par slide (modèle Comment)
- Partage par lien public (shareToken)
- Onboarding utilisateur (tour guidé)
- Tests E2E critiques (Playwright)

---

## Points d'attention pour l'IA de coding

1. **NextAuth v5** — utiliser `auth()` et non `getServerSession()`, API changed
2. **Prisma singleton** — exporter depuis `/lib/prisma.ts` avec le pattern `globalThis.__prisma`
3. **BullMQ workers** — lancer dans un process séparé (pas dans Vercel serverless), utiliser Vercel Cron ou un petit serveur dédié (Railway/Fly.io)
4. **Stripe webhooks** — désactiver le body parser Next.js sur la route webhook (`export const config = { api: { bodyParser: false } }`)
5. **R2** — utiliser le SDK AWS S3 v3 avec l'endpoint Cloudflare, pas le SDK R2 natif
6. **Claude streaming** — pour l'UX, utiliser `stream: true` et envoyer les slides au fur et à mesure via Server-Sent Events
7. **Zod** — valider la réponse Claude avec un schema strict avant d'insérer en base, relancer si invalide (max 2 retry)
