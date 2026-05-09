# DataPresent

Transformez vos données en présentations professionnelles grâce à l'IA.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Prisma (PostgreSQL) + NextAuth.js v5
- **AI**: Claude API (Anthropic) pour l'analyse et la génération de slides
- **Queue**: BullMQ + Redis pour les jobs asynchrones
- **Stockage**: Cloudflare R2 (S3-compatible)
- **Billing**: Stripe (abonnements Free/Pro/Team)
- **Email**: Nodemailer (dev) / Resend (prod)
- **i18n**: next-intl (Français + Anglais)
- **Tests**: Playwright (E2E)

## Prérequis

- Node.js 22+
- PostgreSQL
- Redis
- Compte Stripe (pour les abonnements)
- Compte Cloudflare R2 (pour le stockage)
- Clé API Anthropic

## Installation

```bash
cp .env.example .env.local
# Remplir les variables d'environnement (.env.example)
npm install
npm run db:push
npm run dev
```

## Scripts

| Commande | Description |
|---|---|
| `npm run dev` | Lancer le serveur Next.js |
| `npm run dev:complete` | Lancer avec tous les services (Redis, Stripe CLI, MailHog) |
| `npm run db:push` | Synchroniser le schéma Prisma |
| `npm run db:studio` | Ouvrir Prisma Studio |
| `npm run worker:dev` | Lancer les workers BullMQ |
| `npm run stripe:setup` | Configurer les produits Stripe |
| `npm run test` | Lancer les tests E2E Playwright |

## Architecture

```
src/
├── app/           # Pages et API routes (App Router)
├── components/    # Composants React (UI, slides, upload, etc.)
├── lib/           # Logique métier
│   ├── ai/        # Claude API (analyse + prompts)
│   ├── parsers/   # Parseurs de fichiers (XLSX, CSV, PDF, GSHEET)
│   ├── exporters/ # Générateurs de sortie (PPTX, PDF, DOCX)
│   └── queue/     # BullMQ (workers generate + export)
└── messages/      # Traductions i18n (en.json, fr.json)
```

## Flux Principal

1. Upload de fichier (Excel, CSV, PDF, Google Sheets)
2. Parcage et extraction des données
3. Mise en file d'attente (BullMQ)
4. Analyse par Claude AI → génération de slides structurées
5. Visualisation interactive dans le dashboard
6. Export (PPTX, PDF, DOCX) ou partage public

## Licence

Propriétaire — Tous droits réservés
