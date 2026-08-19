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
| 3 | `analyze` | Qualification IA Groq (LLaMA) : score 0-100, adéquation ICP, langue, besoins, angle |
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

# Qualification + rédaction (nécessite GROQ_API_KEY)
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
- **Recherche** : scraping Google SERP avec session navigateur unique (portage
  de la stratégie CommuneScraper : UA standard, `navigator.webdriver` masqué,
  délais humains, gestion du consentement RGPD, retry sur page anti-bot).
  Les paramètres régionaux (`gl`/`cr`) sont forcés depuis le pays du marché
  ICP pour neutraliser le biais de géolocalisation IP. Si l'IPv6 de votre
  opérateur est flaggée par Google ("trafic exceptionnel"), activez
  `PROSPECTING_FORCE_IPV4=true` (proxy local en IPv4).
- **Environnement** : copier `.env.example` → `.env.local` (chargé via
  dotenv-cli ou export). Variables clés : `GROQ_API_KEY`,
  `RESEND_API_KEY`, `PROSPECTING_SENDER` (domaine vérifié
  Resend), `PROSPECTING_OPTOUT_URL`, `CHROME_PATH` (dev Windows), `NODE_ENV`,
  `PROSPECTING_FORCE_IPV4` (IP IPv6 flaggée par Google).

## Données

`data/output/store.json` — store unique (prospects, emails, campagnes),
écritures atomiques, commité en git (pattern `data/blog-posts.json`).
`data/output/suppressions.json` — liste de suppression RGPD (opt-out,
rebonds, plaintes) : les prospects supprimés ne sont plus jamais contactés.

## Automatisation

`.github/workflows/prospecting.yml` — cron quotidien (8h UTC, jours ouvrés) :
pipeline complet puis commit des données. Secrets requis :
`GROQ_API_KEY`, `RESEND_API_KEY`, `PROSPECTING_SENDER`,
`PROSPECTING_OPTOUT_URL`.

## Déploiement VPS (routine cron)

Le pipeline peut aussi tourner sur un VPS en parallèle de GitHub Actions, avec
un **store indépendant** (`PROSPECTING_DATA_DIR` hors du repo) : aucun conflit
git possible entre les deux environnements. `RUNNER_HOST=vps` évite en outre
que le RunnerLock de l'un bloque l'autre.

### Prérequis (Ubuntu/Debian)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - && apt install -y nodejs
npm i -g pnpm@9
apt install -y chromium
```

### Installation

```bash
git clone https://github.com/rachid-softdev/DataPresent /opt/DataPresent
cd /opt/DataPresent && pnpm install --frozen-lockfile --ignore-scripts

# Répertoire de données (hors du repo)
mkdir -p /var/lib/datapresent-prospecting/data

# Config : copier le modèle puis remplir les secrets
cp datapresent-prospecting/.env.local.example datapresent-prospecting/.env.local
```

`.env.local` contient : `NODE_ENV=production`, `RUNNER_HOST=vps`,
`PROSPECTING_DATA_DIR=/var/lib/datapresent-prospecting/data`, `GROQ_API_KEY`,
`RESEND_API_KEY`, `PROSPECTING_SENDER`, `PROSPECTING_OPTOUT_URL`,
`CHROME_PATH=/usr/bin/chromium` (optionnel : `PROSPECTING_FORCE_IPV4=true` si
l'IP du VPS est flaggée par Google).

### Test à froid

```bash
pnpm --filter datapresent-prospecting start -- --stage status --list
# Puis un premier run sans envoi réel :
pnpm --filter datapresent-prospecting start -- --stage all --dry-run
```

### Routine (cron)

```bash
crontab -e
# Décalé du cron GitHub (8h UTC) pour éviter le RunnerLock :
30 1 * * 1-5 /opt/DataPresent/datapresent-prospecting/scripts/vps-prospecting.sh >> /var/log/prospecting.log 2>&1
```

Le script wrapper (`scripts/vps-prospecting.sh`) charge `.env.local`, fixe
`PROSPECTING_DATA_DIR` et `RUNNER_HOST=vps`, puis lance le pipeline complet
(`--stage all --batch 10`). Logs : `tail -f /var/log/prospecting.log`.

### Mises à jour du code

Après un `git pull` dans `/opt/DataPresent`, relancer
`pnpm install --frozen-lockfile --ignore-scripts` si les dépendances ont changé.

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
