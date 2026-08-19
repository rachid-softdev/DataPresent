#!/usr/bin/env bash
set -euo pipefail

# Routine VPS pour l'agent de prospection DataPresent (voir README.md).
#
# Usage (crontab -e) :
#   30 1 * * 1-5 /opt/DataPresent/datapresent-prospecting/scripts/vps-prospecting.sh >> /var/log/prospecting.log 2>&1
#
# Prérequis : pnpm install effectué, .env.local présent (copié depuis
# .env.local.example avec les secrets remplis), Chromium installé (CHROME_PATH).

cd "$(dirname "$0")/.."

# Charge les variables d'environnement. `source` (plutôt qu'export $(grep|xargs))
# gère correctement les valeurs avec espaces comme PROSPECTING_SENDER.
set -a
# shellcheck disable=SC1091
source .env.local
set +a

# Data indépendante du repo git : jamais de conflit avec les commits de GitHub
# Actions. Créer le répertoire avant le premier run.
export PROSPECTING_DATA_DIR="${PROSPECTING_DATA_DIR:-/var/lib/datapresent-prospecting/data}"
# Hôte runner VPS : le RunnerLock ne bloque pas les runs GitHub Actions.
export RUNNER_HOST=vps

exec pnpm --filter datapresent-prospecting start -- --stage all --batch 10