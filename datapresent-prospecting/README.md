# datapresent-prospecting

Agent de prospection B2B pour **DataPresent** (SaaS de transformation de fichiers
de données en présentations IA). Pipeline automatisé : découverte Google
(FR + EN), enrichissement emails, qualification IA, rédaction d'emails
personnalisés, envoi automatisé (Resend) et relances J+3 / J+6.

Inspiré de [CommuneScraper](https://github.com/nawak/CommuneScraper) (stratégies
de recherche Google, validation d'emails, RunnerLock, écritures atomiques),
réécrit en TypeScript dans le monorepo DataPresent.

## Pipeline

| Étage | Commande | Rôle |
|-------|----------|------|
| 1 | `discover` | Recherche Google par marché (FR/EN) → sociétés candidates (dédoublonnage par domaine) |
| 2 | `enrich` | Emails de contact (Google Search → Website Search) + contenu du site |
| 3 | `analyze` | Qualification IA Claude : score 0-100, adéquation ICP, langue, besoins, angle |
| 4 | `generate` | Rédaction d'un email personnalisé par prospect (langue du prospect) |
| 5 | `send` | Envoi automatisé (Resend) avec footer légal + opt-out RGPD |
| 6 | `followup` | Relances dues J+3 puis J+6 (max 2), stoppées si réponse/rebond/plainte |
| 7 | `status` | Résumé par statut / forçage manuel (`--mark`) |
| — | `webhook` | Serveur HTTP des events Resend (bounced, complained, replied) |

## Usage

```bash
# Découverte + enrichissement (nécessite Chrome/Edge ou CHROME_PATH en local)
pnpm --filter datapresent-prospecting start -- --stage discover --batch 10
pnpm --filter datapresent-prospecting start -- --stage enrich --batch 10

# Qualification + rédaction (nécessite ANTHROPIC_API_KEY)
pnpm --filter datapresent-prospecting start -- --stage analyze --batch 10
pnpm --filter datapresent-prospecting start -- --stage generate --batch 10

# Envoi (Resend en prod ; SMTP/MailHog ou log console en dev ; --dry-run)
pnpm --filter datapresent-prospecting start -- --stage send --dry-run
pnpm --filter datapresent-prospecting start -- --stage send --batch 10

# Relances dues
pnpm --filter datapresent-prospecting start -- --stage followup --dry-run

# Webhook Resend (long-running)
pnpm --filter datapresent-prospecting start -- --stage webhook

# Résumé / forçage manuel
pnpm --filter datapresent-prospecting start -- --stage status --list
pnpm --filter datapresent-prospecting start -- --stage status --mark <id> --mark-status replied
```

## Configuration

- **ICP** : `config/icp.json` — marchés (FR : France ; EN : GB/US/IE/CA),
  secteurs, tailles, rôles, requêtes de recherche, exclusions.
- **Prompts** : `config/prompts/prospect-analysis.md`, `email-writer.md`.
- **Recherche** : scraping SERP Google → Bing → DuckDuckGo (contextes
  navigateur isolés, bascule automatique sur anti-bot). Les paramètres
  régionaux des moteurs (`gl`/`cr`, `cc`, `kl`) sont forcés depuis le pays
  du marché ICP pour neutraliser le biais de géolocalisation IP.
- **Environnement** : copier `.env.example` → `.env.local` (chargé via
  dotenv-cli ou export). Variables clés : `ANTHROPIC_API_KEY`,
  `RESEND_API_KEY`, `PROSPECTING_SENDER` (domaine vérifié
  Resend), `PROSPECTING_OPTOUT_URL`, `CHROME_PATH` (dev Windows), `NODE_ENV`.

## Données

`data/output/store.json` — store unique (prospects, emails, campagnes),
écritures atomiques, commité en git (pattern `data/blog-posts.json`).
`data/output/suppressions.json` — liste de suppression RGPD (opt-out,
rebonds, plaintes) : les prospects supprimés ne sont plus jamais contactés.

## Automatisation

`.github/workflows/prospecting.yml` — cron quotidien (8h UTC, jours ouvrés) :
pipeline complet puis commit des données. Secrets requis :
`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `PROSPECTING_SENDER`,
`PROSPECTING_OPTOUT_URL`.

## Webhook Resend (réponses / rebonds)

1. Activer le domaine entrant chez Resend (inbound).
2. Pointer le webhook Resend vers `https://<hote>/resend-webhook`
   (events : `email.bounced`, `email.complained`, `email.replied`).
3. Le serveur met à jour les statuts et alimente `suppressions.json`.

## Conformité (RGPD / CAN-SPAM)

- Footer légal ajouté à chaque email : identification de l'expéditeur,
  opt-out (lien `?email=`).
- Rebonds et plaintes → suppression immédiate et définitive.
- Réponse → arrêt immédiat des relances.

## Tests

```bash
pnpm --filter datapresent-prospecting test
pnpm --filter datapresent-prospecting typecheck
```
