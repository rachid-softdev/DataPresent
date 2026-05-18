# DataPresent

> Transformez vos données en présentations professionnelles grâce à l'IA.

Monorepo pnpm contenant l'application DataPresent — un SaaS qui convertit vos fichiers de données (Excel, CSV, PDF, Google Sheets) en présentations professionnelles générées par IA.

---

## Structure

```
datapresent/
├── packages/
│   └── datapresent-ui/     # Composants UI partagés (shadcn/ui)
├── datapresent-web/         # Application Next.js principale
└── package.json            # Scripts racine (pnpm workspace)
```

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

## Scripts racine

| Commande | Description |
|---|---|
| `pnpm dev` | Lancer Next.js |
| `pnpm start-dev-complete` | Mode dev complet (Next.js + Redis + MailHog + Stripe CLI + Workers) |
| `pnpm build` | Build de production |
| `pnpm start` | Démarrer en production |
| `pnpm test` | Lancer les tests E2E |
| `pnpm db:push` | Synchroniser la base de données |
| `pnpm format` | Formater le code |

Pour les scripts additionnels (workers, Stripe, MailHog...), voir `datapresent-web/package.json`.

---

## Documentation

- **Stack complète** : voir `datapresent-web/README.md`
- **Variables d'environnement** : voir `datapresent-web/README.md`
- **Architecture** : voir `datapresent-web/README.md`

---

## Licence

Propriétaire — Tous droits réservés © 2025-2026 Rachid SoftDev