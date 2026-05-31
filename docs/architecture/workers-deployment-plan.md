# Workers Deployment Plan — BullMQ sur Railway/Fly.io

**Date**: 31 mai 2026
**Statut**: Architecture validée

## Architecture cible

```text
Vercel (Next.js)                    Railway / Fly.io (Docker)
┌──────────────────────┐           ┌──────────────────────────┐
│ API Route → enqueue   │           │  Worker Service           │
│   BullMQ Queue Client │────┐      │  ┌────────────────────┐  │
│   (lib/queue/client)  │    │      │  │ Generate Worker    │  │
└──────────────────────┘    │      │  │ Export Worker      │  │
                            │      │  │ Health :8080       │  │
                            ▼      │  └────────────────────┘  │
                     ┌──────────┐   └──────────────────────────┘
                     │  Redis   │            │
                     │ (Upstash)│◄───────────┘
                     └──────────┘
                          │
                     ┌────┴────┐
                     │ Neon DB │
                     └─────────┘
```

## Décisions clés

1. **Répertoire `workers/`** à la racine du monorepo — partage le schéma Prisma, pas de package séparé
2. **Docker** multi-stage — image légère avec Chromium pour PDF
3. **Railway par défaut** — Redis natif intégré, déploiement simple, $5/mo
4. **`@sentry/node`** au lieu de `@sentry/nextjs` pour les workers
5. **Code dupliqué** dans `workers/src/` — pas de package partagé pour l'instant (dette technique acceptée)

## Phases de migration

### Phase 1 : Extraction (3-5 jours)
- Créer `workers/` avec package.json, tsconfig, Dockerfile
- Copier les fichiers dépendances (redis.ts, prisma.ts, crypto.ts, r2.ts, sentry.ts, ai/, parsers/, exporters/)
- Réécrire les imports `@/` en chemins relatifs
- Vérifier : `cd workers && npx tsx src/index.ts`

### Phase 2 : Containerisation (2-3 jours)
- Dockerfile multi-stage
- Déploiement Railway staging
- Mode dual : workers Vercel + Railway en parallèle
- Variable d'environnement `WORKER_DEPLOYMENT=railway`

### Phase 3 : Cutover (1-2 jours)
- Désactiver `start-workers.ts` sur Vercel
- Nettoyer `lib/queue/workers/`
- Monitorer 48h

## Estimation coûts

| Poste | Coût |
|---|---|
| Railway compute (512MB) | $5/mo |
| Railway Redis (256MB) | $5/mo |
| Anthropic API (variable) | $50-400/mo |
| Neon Postgres (inchangé) | $19/mo |
| **Total** | **$79-429/mo** (Anthropic = variable) |

## Comparaison Railway vs Fly.io

| Critère | Railway | Fly.io |
|---------|---------|--------|
| Complexité | Faible | Moyenne |
| Redis natif | ✅ Oui ($5/mo) | ❌ Non (BYO) |
| Régions | 3 | 30+ |
| Scaling | Manuel | Auto |
| Prix (compute) | $5/mo base | Gratuit 3 VMs |
| Idéal pour | Simplicité, shipping rapide | Multi-région, scaling avancé |

**Recommandation : Railway par défaut, Fly.io si besoin de scaling/régions.**

## Fichiers à créer

```
workers/
├── package.json
├── tsconfig.json
├── Dockerfile
├── .dockerignore
├── src/
│   ├── index.ts              ← Entry point (workers + health :8080)
│   ├── env.ts                ← Zod validation (sous-ensemble)
│   ├── redis.ts              ← ioredis connection
│   ├── prisma.ts             ← Prisma client
│   ├── sentry.ts             ← @sentry/node wrapper
│   ├── crypto.ts             ← Job signing
│   ├── r2.ts                 ← S3 client
│   ├── ai/                   ← Analyse IA
│   ├── parsers/              ← Parsers fichiers
│   ├── exporters/            ← Export PPTX/PDF/DOCX
│   └── workers/
│       ├── generate.worker.ts
│       └── export.worker.ts
└── scripts/
    └── build.sh
```
