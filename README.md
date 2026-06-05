# DataPresent

> Transformez vos données en présentations professionnelles grâce à l'IA.

[![CI Pipeline](https://github.com/rachid-softdev/DataPresent/actions/workflows/ci.yml/badge.svg)](https://github.com/rachid-softdev/DataPresent/actions/workflows/ci.yml)

Monorepo pnpm contenant l'application DataPresent — un SaaS qui convertit vos fichiers de données (Excel, CSV, PDF, Google Sheets) en présentations professionnelles générées par IA.

---

## Stack Technique

- **Framework** : Next.js 14 (App Router), React 18
- **Base de données** : PostgreSQL (Prisma ORM)
- **Auth** : NextAuth.js
- **Paiements** : Stripe
- **Email** : Resend
- **Monorepo** : pnpm workspaces + Turbo

---

## Prérequis

- Node.js v20+
- pnpm v9+
- PostgreSQL (optionnel pour développement local)

---

## Installation

```bash
# Installer les dépendances
pnpm install

# Lancer en développement
pnpm start-dev-complete

# Ou uniquement Next.js
pnpm dev
```

---

## Configuration

Copier le fichier d'environnement :

```bash
cp datapresent-web/.env.example datapresent-web/.env.local
```

Puis compléter les variables dans `.env.local` :
- `DATABASE_URL` - Connexion PostgreSQL
- `NEXTAUTH_SECRET` - Clé secrète pour NextAuth (générer avec : `openssl rand -base64 32`)

---

## Commandes

### Commandes principales

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Lancer Next.js en mode développement |
| `pnpm start-dev-complete` | Mode dev complet (Next.js + Redis + MailHog + Stripe CLI) |
| `pnpm build` | Build de production |
| `pnpm start` | Démarrer en production |
| `pnpm test` | Lancer les tests |
| `pnpm db:generate` | Générer le client Prisma |
| `pnpm db:push` | Synchroniser la base de données |
| `pnpm format` | Formater le code |

### Commandes préfixées (par application)

```bash
# Application web
pnpm web:dev       # Lancer le serveur de développement
pnpm web:build     # Build de production
pnpm web:start     # Démarrer en production
pnpm web:test      # Lancer les tests
pnpm web:lint      # Linter le code
pnpm web:typecheck # Vérifier les types

# Environment
pnpm check-env     # Valider les variables d'environnement
pnpm push-env      # Pousser les variables vers Vercel
```

---

## Structure

```
datapresent/
├── packages/
│   └── datapresent-ui/     # Composants UI partagés (shadcn/ui)
├── datapresent-web/         # Application Next.js principale
├── datapresent-mobile/      # Application mobile (Expo)
├── datapresent-desktop/     # Application desktop (Tauri)
├── datapresent-extension/   # Extension navigateur
└── package.json             # Scripts racine (pnpm workspace)
```

Pour les scripts additionnels (workers, Stripe, MailHog...), voir `datapresent-web/package.json`.

---

## Services

- **Web** : http://localhost:3000
- **MailHog** : http://localhost:8025 (dev only)
- **PostgreSQL** : localhost:5432

---

## Documentation

- **Stack complète** : voir `datapresent-web/README.md`
- **Variables d'environnement** : voir `datapresent-web/README.md`
- **Architecture** : voir `datapresent-web/README.md`

---

## Licence

MIT License - Copyright (c) 2026 DataPresent