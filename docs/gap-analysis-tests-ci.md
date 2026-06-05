# Analyse des Gaps — Tests & CI

> **Date** : 05/06/2026
> **Projet** : DataPresent
> **Contexte** : Audit de la qualité des tests et de l'intégration continue

---

## Table des matières

1. [Gap 1 — Pas de tests d'intégration](#gap-1--pas-de-tests-dintégration)
2. [Gap 2 — CI rouge (Pipeline en échec sur main)](#gap-2--ci-rouge-pipeline-en-échec-sur-main)
3. [Gap 3 — Tests unitaires non lancés en CI](#gap-3--tests-unitaires-non-lancés-en-ci)
4. [Gap 4 — Couverture jamais mesurée](#gap-4--couverture-jamais-mesurée)
5. [Gap 5 — E2E dépendante de secrets non mockés](#gap-5--e2e-dépendante-de-secrets-non-mockés)
6. [Récapitulatif & Correctifs Prioritaires](#récapitulatif--correctifs-prioritaires)

---

## Gap 1 — Pas de tests d'intégration

### Constat

| Métrique | Valeur |
|---|---|
| Fichiers de test d'intégration | **0** |
| Dossier `tests/integration/` | **Inexistant** |
| Config Vitest pour l'intégration | **Absente** |

Aucun test ne vérifie le comportement combiné des couches (API → Base de données, Files d'attente → Export, Stripe Webhook → Entitlements, etc.).

### État actuel des tests existants

```
datapresent-web/
├── tests/
│   ├── unit/          ← 93 fichiers — couvre lib/, components/, hooks/, api/, middleware/
│   ├── e2e/           ← 6 fichiers (Playwright) — parcours utilisateur basiques
│   └── setup.ts       ← Mock d'env variables pour les tests unitaires
│
packages/
└── datapresent-ui/
    └── (src/)         ← 0 test

workers/
└── src/__tests__/
    └── index.test.ts  ← 1 fichier
```

### Plan d'implémentation

#### Phase 1 — Infrastructure

1. **Créer le dossier `tests/integration/`** à la racine de `datapresent-web/`

2. **Ajouter une config Vitest dédiée** — `vitest.integration.config.ts`

```typescript
// datapresent-web/vitest.integration.config.ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    name: "integration",
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["./tests/setup.integration.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
```

3. **Créer le `tests/setup.integration.ts`** avec :
   - Connexion à une base de données de test (PostgreSQL via Testcontainers ou base dédiée)
   - Configuration Redis de test
   - Stripe en mode test
   - Nettoyage entre les tests (truncate tables)

4. **Ajouter les scripts dans `package.json`** :

```json
{
  "test:integration": "vitest run --config vitest.integration.config.ts",
  "test:integration:watch": "vitest --config vitest.integration.config.ts"
}
```

#### Phase 2 — Premiers scénarios d'intégration

**Priorité haute — tests critiques pour le métier :**

| # | Scénario | Fichier | Description |
|---|---|---|---|
| 1 | **Création de rapport → Export PPTX** | `reports/creation-export.test.ts` | API `/api/reports` → queue Bull → worker export → vérifier fichier généré |
| 2 | **Webhook Stripe → Mise à jour entitlements** | `billing/stripe-webhook-flow.test.ts` | Simuler webhook `checkout.session.completed` → vérifier upgrade du plan en base |
| 3 | **Upload fichier → Parsing → Validation** | `upload/parse-validate.test.ts` | Upload XLSX/CSV → parsing → validation schéma → stockage |
| 4 | **Auth → JWT Rotation → Refresh** | `auth/jwt-rotation-flow.test.ts` | Login → obtenir tokens → rotation → vérifier ancien token invalidé |
| 5 | **Rate limiting → Blocage IP** | `security/rate-limit-flow.test.ts` | Requêtes répétées → atteindre limite → vérifier 429 |
| 6 | **CSRF → Protection des mutations** | `security/csrf-flow.test.ts` | GET token CSRF → POST avec token valide/invalide |

**Détail d'un test type — création de rapport :**

```typescript
// tests/integration/reports/creation-export.test.ts
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestUser, getTestDb, cleanupDb } from "../helpers";

describe("Création de rapport → Export", () => {
  let db: Awaited<ReturnType<typeof getTestDb>>;
  let user: Awaited<ReturnType<typeof createTestUser>>;

  beforeAll(async () => {
    db = await getTestDb();
    user = await createTestUser(db, { plan: "PRO" });
  });

  afterAll(async () => {
    await cleanupDb(db);
  });

  it("devrait créer un rapport et générer un export PPTX", async () => {
    // 1. Upload d'un fichier XLSX
    const uploadRes = await fetch("http://localhost:3000/api/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${user.token}` },
      body: new FormData().append("file", testFile),
    });
    expect(uploadRes.status).toBe(200);

    // 2. Création du rapport
    const reportRes = await fetch("http://localhost:3000/api/reports", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${user.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ dataSourceId: uploadRes.id }),
    });
    expect(reportRes.status).toBe(201);

    // 3. Vérifier que le job d'export a été créé
    const jobRes = await fetch(
      `http://localhost:3000/api/reports/${reportRes.id}/export?format=pptx`,
      { headers: { Authorization: `Bearer ${user.token}` } }
    );
    expect(jobRes.status).toBe(202); // Accepted

    // 4. Attendre la complétion du job (polling)
    const finalRes = await waitForJobCompletion(jobRes.jobId);
    expect(finalRes.status).toBe(200);
    expect(finalRes.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
  }, 60_000);
});
```

#### Phase 3 — CI Integration

Ajouter le job dans `.github/workflows/ci.yml` :

```yaml
test-integration:
  name: Integration Tests
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: datapresent
        POSTGRES_PASSWORD: test
        POSTGRES_DB: datapresent_test
      ports:
        - 5432:5432
    redis:
      image: redis:7
      ports:
        - 6379:6379
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: "20"
        cache: "npm"
    - run: npm ci
    - run: npm run db:generate
    - run: npm run test:integration
      env:
        DATABASE_URL: postgresql://datapresent:test@localhost:5432/datapresent_test
        REDIS_URL: redis://localhost:6379
```

---

## Gap 2 — CI rouge (Pipeline en échec sur main)

### Constat

| Métrique | Valeur |
|---|---|
| Badge CI Pipeline | 🔴 **FAILING** |
| Durée des runs sur `main` | **~14–15 secondes** (échec quasi immédiat) |
| Runs Dependabot | Tous échouent en < 20s |

### Causes probables

D'après l'analyse du workflow `ci.yml` :

1. **Job `lint`** : `npm run lint` — ESLint peut échouer sur des erreurs de lint non résolues sur `main`
2. **Job `typecheck`** : `npx tsc --noEmit` — TypeScript 6 peut avoir des breaking changes avec les dépendances
3. **Job `test-e2e`** : `npm run test` (Playwright) — Échoue car :
   - Le serveur Next.js ne démarre pas (manque de variables d'environnement)
   - Les pages `/login`, `/signup` n'existent pas ou ont des titres différents
   - Les tests attendent des textes qui ne correspondent pas à la version actuelle
4. **Job `build`** : Dépend de `lint` et `typecheck` — bloqué si ceux-ci échouent

### Plan d'implémentation

#### Étape 1 — Diagnostic

```bash
# En local (CI simulé)
npm run lint
npx tsc --noEmit
npm run build
```

Identifier exactement quelle étape échoue et pourquoi.

#### Étape 2 — Corrections immédiates

| Job | Problème probable | Correctif |
|---|---|---|
| `lint` | Règle ESLint non respectée | `npm run lint -- --fix` + commiter les corrections |
| `typecheck` | TypeScript 6 breaking | Mettre à jour les types ou fixer la version TS |
| `test-e2e` | Pages introuvables | Vérifier les routes, synchroniser les sélecteurs |
| `build` | Secrets manquants | Ajouter `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` placeholder |

#### Étape 3 — Renforcement de la CI

```yaml
# Modifications dans ci.yml

# 1. Ajouter --quiet pour ESLint (plus strict mais lisible)
- name: Run ESLint
  run: npm run lint -- --quiet

# 2. Séparer typecheck du build
- name: Run TypeScript Check
  run: npx tsc --noEmit

# 3. Ajouter fail-fast: false pour voir tous les échecs
strategy:
  fail-fast: false

# 4. Ajouter un job "status" final qui résume tout
ci-status:
  name: CI Status
  if: always()
  needs: [lint, typecheck, test-e2e, build, test-unit, test-integration]
  runs-on: ubuntu-latest
  steps:
    - run: |
        echo "## Résultat CI" >> $GITHUB_STEP_SUMMARY
        echo "- Lint: ${{ needs.lint.result }}" >> $GITHUB_STEP_SUMMARY
        echo "- TypeCheck: ${{ needs.typecheck.result }}" >> $GITHUB_STEP_SUMMARY
        echo "- E2E: ${{ needs.test-e2e.result }}" >> $GITHUB_STEP_SUMMARY
        echo "- Build: ${{ needs.build.result }}" >> $GITHUB_STEP_SUMMARY
        echo "- Unit: ${{ needs.test-unit.result }}" >> $GITHUB_STEP_SUMMARY
        echo "- Integration: ${{ needs.test-integration.result }}" >> $GITHUB_STEP_SUMMARY
```

#### Étape 4 — Badge et notification

- Ajouter le badge CI dans `README.md` :

```markdown
![CI Pipeline](https://github.com/rachid-softdev/DataPresent/actions/workflows/ci.yml/badge.svg)
```

- Configurer les notifications Slack/e-mail sur échec (optionnel)

---

## Gap 3 — Tests unitaires non lancés en CI

### Constat

| Métrique | Valeur |
|---|---|
| Tests unitaires existants | **93 fichiers** |
| Job `test-unit` dans la CI | ❌ **Absent** |
| Commande `npm run test:unit` | ✅ Existe (`vitest run`) |
| Exécution actuelle en CI | **Jamais** |

**Conséquence** : On peut casser n'importe quel test unitaire sans s'en rendre compte jusqu'au déploiement.

### Plan d'implémentation

#### Ajout du job dans `ci.yml`

```yaml
test-unit:
  name: Unit Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"
    - run: npm ci
    - name: Run Unit Tests
      run: npm run test:unit -- --reporter=junit --outputFile=test-results-unit.xml
    - name: Upload Unit Test Results
      if: always()
      uses: actions/upload-artifact@v4
      with:
        name: unit-test-results
        path: test-results-unit.xml
```

#### Amélioration du rapport

Pour les PRs, ajouter un commentaire automatique avec le résumé des tests :

```yaml
- name: Publish Unit Test Results
  if: always()
  uses: dorny/test-reporter@v1
  with:
    name: Unit Tests
    path: test-results-unit.xml
    reporter: java-junit
```

#### Dépendances entre jobs

Mettre à jour le job `build` pour dépendre aussi des tests unitaires :

```yaml
build:
  name: Build
  needs: [lint, typecheck, test-unit]  # ← Ajout de test-unit
```

---

## Gap 4 — Couverture jamais mesurée

### Constat

| Métrique | Valeur |
|---|---|
| Config `coverage` dans `vitest.config.ts` | ✅ Présente |
| Provider | `v8` |
| Périmètre couvert | `lib/**`, `hooks/**`, `i18n/**` |
| Exécution en CI de `npm run test:coverage` | ❌ **Absente** |
| Badge de couverture | ❌ **Absent** |
| Seuil minimum de couverture | ❌ **Non configuré** |

**Conséquence** : La couverture réelle est inconnue. Impossible de savoir si une PR dégrade la couverture.

### Plan d'implémentation

#### Phase 1 — Ajout du job coverage en CI

```yaml
coverage:
  name: Coverage
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"
    - run: npm ci
    - name: Generate Coverage Report
      run: npm run test:coverage
    - name: Upload Coverage Report
      uses: actions/upload-artifact@v4
      with:
        name: coverage-report
        path: coverage/
    - name: Check Coverage Threshold
      run: |
        # Extraire le % de couverture du rapport JSON
        $coverage = Get-Content coverage/coverage-final.json | ConvertFrom-Json
        $total = $coverage.total.lines.pct
        if ($total -lt 60) {
          Write-Error "Coverage $total% is below threshold 60%"
          exit 1
        }
```

#### Phase 2 — Seuil minimum configuré dans Vitest

```typescript
// datapresent-web/vitest.config.ts — ajout du seuil
coverage: {
  provider: "v8",
  reporter: ["text", "json", "html", "lcov"],
  include: ["lib/**/*.ts", "lib/**/*.tsx", "hooks/**/*.ts", "hooks/**/*.tsx", "i18n/**/*.ts"],
  exclude: ["**/*.d.ts", "**/index.ts", "lib/prisma.ts", "lib/r2.ts", "lib/queue/client.ts"],
  thresholds: {
    lines: 60,
    functions: 50,
    branches: 40,
    statements: 60,
  },
},
```

#### Phase 3 — Badge de couverture

Option A — **Codecov** (gratuit pour open-source) :

```yaml
- name: Upload to Codecov
  uses: codecov/codecov-action@v5
  with:
    files: ./coverage/lcov.info
    flags: unittests
    name: codecov-datapresent
```

Badge : `[![codecov](https://codecov.io/gh/rachid-softdev/DataPresent/branch/main/graph/badge.svg)](https://codecov.io/gh/rachid-softdev/DataPresent)`

Option B — **Coveralls** :

```yaml
- name: Coveralls
  uses: coverallsapp/github-action@v2
```

Option C — **Badge auto-hébergé** via GitHub Pages + `coverage-badge-action`.

#### Phase 4 — Étendre le périmètre de couverture

Ajouter les dossiers manquants :

```typescript
include: [
  "lib/**/*.ts",
  "lib/**/*.tsx",
  "hooks/**/*.ts",
  "hooks/**/*.tsx",
  "i18n/**/*.ts",
  "components/**/*.tsx",   // ← NOUVEAU
  "api/**/*.ts",           // ← NOUVEAU
  "middleware/**/*.ts",    // ← NOUVEAU
  "scripts/**/*.ts",       // ← NOUVEAU
],
```

---

## Gap 5 — E2E dépendante de secrets non mockés

### Constat

```yaml
# Dans ci.yml — job test-e2e
env:
  CI: true
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
  NEXTAUTH_URL: http://localhost:3000
  REDIS_URL: ${{ secrets.REDIS_URL }}
```

| Problème | Impact |
|---|---|
| `DATABASE_URL` = secret GitHub | ❌ Échec si secret absent (fork, dry-run) |
| `REDIS_URL` = secret GitHub | ❌ Échec si secret absent |
| `NEXTAUTH_SECRET` = secret GitHub | ❌ Échec si secret absent |
| Aucune valeur par défaut / fallback | ❌ Bloque toute PR externe |

### Analyse des E2E Tests existants

```typescript
// 6 fichiers — 19 tests au total

// auth.spec.ts      — Vérifie que /login et /signup existent
// home.spec.ts      — Vérifie la page d'accueil, FAQ, navigation
// navigation.spec.ts — Navigation, templates, blog, pricing
// pages.spec.ts     — Dashboard, share, pricing, SEO
// report-creation.spec.ts — Redirection /new → /login
// share.spec.ts     — Page de partage invalide → 404
```

**Aucun test E2E actuel ne nécessite réellement une base de données PostgreSQL ou Redis.** Ce sont tous des tests de présence de page et de navigation.

### Plan d'implémentation

#### Solution immédiate — Fallback avec services containers

Remplacer les secrets par des services GitHub Actions :

```yaml
test-e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  services:
    postgres:
      image: postgres:16
      env:
        POSTGRES_USER: datapresent
        POSTGRES_PASSWORD: test
        POSTGRES_DB: datapresent_test
      ports:
        - 5432:5432
      options: >-
        --health-cmd pg_isready
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
    redis:
      image: redis:7
      ports:
        - 6379:6379
      options: >-
        --health-cmd "redis-cli ping"
        --health-interval 10s
        --health-timeout 5s
        --health-retries 5
  steps:
    - uses: actions/checkout@v6
    - uses: actions/setup-node@v6
      with:
        node-version: ${{ env.NODE_VERSION }}
        cache: "npm"
    - run: npm ci
    - run: npm run db:generate
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run E2E Tests
      run: npm run test
      env:
        CI: true
        DATABASE_URL: postgresql://datapresent:test@localhost:5432/datapresent_test
        NEXTAUTH_SECRET: test-nextauth-secret-abcdef123456
        NEXTAUTH_URL: http://localhost:3000
        REDIS_URL: redis://localhost:6379
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_placeholder
        CSRF_SECRET: test-csrf-secret-12345678
        JOB_SIGNING_SECRET: test-job-signing-secret-12345678
        ANTHROPIC_API_KEY: sk-ant-test-placeholder
```

#### Solution robuste — Mocking pour E2E

1. **Créer un fichier `tests/e2e/.env.test`** avec toutes les variables mockées :

```env
DATABASE_URL=postgresql://datapresent:test@localhost:5432/datapresent_test
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=test-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
CSRF_SECRET=test-csrf-secret
JOB_SIGNING_SECRET=test-job-signing
ANTHROPIC_API_KEY=sk-ant-test
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
```

2. **Charger `.env.test` dans `playwright.config.ts`** :

```typescript
import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: "./tests/e2e/.env.test" });

export default defineConfig({
  // ... reste de la config
});
```

Cette approche permet aux forks et PRs externes d'exécuter les tests E2E sans secrets GitHub.

#### Amélioration des tests E2E

Ajouter un test de smoke qui valide que les variables sont présentes :

```typescript
// tests/e2e/setup.test.ts
import { test, expect } from "@playwright/test";

test("les variables d'environnement essentielles sont définies", () => {
  expect(process.env.DATABASE_URL).toBeDefined();
  expect(process.env.NEXTAUTH_SECRET).toBeDefined();
  expect(process.env.NEXTAUTH_URL).toBeDefined();
});
```

#### Plan d'extension E2E

Ajouter des tests plus complets pour les parcours critiques :

| Priorité | Parcours | Statut |
|---|---|---|
| P0 | Landing page, navigation, pricing | ✅ Existant |
| P0 | Login, inscription | ✅ Existant |
| P1 | Upload fichier → Création rapport | ❌ À ajouter |
| P1 | Dashboard (vues, filtres) | ❌ À ajouter |
| P2 | Export PPTX/PDF | ❌ À ajouter |
| P2 | Partage de rapport | ⚠️ Partiel |
| P2 | Stripe checkout | ❌ À ajouter |
| P3 | Paramètres utilisateur | ❌ À ajouter |
| P3 | Gestion d'équipe | ❌ À ajouter |

---

## Récapitulatif & Correctifs Prioritaires

### Matrice des gaps

| # | Gap | Sévérité | Effort | Dépendances | Correctif prioritaire |
|---|---|---|---|---|---|
| **G2** | CI Rouge | 🔴 Critique | 1 jour | Diagnostic | **P0 — Réparer la CI** |
| **G3** | Units non lancés en CI | 🔴 Critique | 0.5 jour | G2 (CI fonctionnelle) | **P0 — Ajouter `test-unit`** |
| **G5** | E2E dépend de secrets | 🟡 Élevé | 0.5 jour | G2 | **P1 — Services containers** |
| **G4** | Couverture jamais mesurée | 🟡 Élevé | 1 jour | G3 | **P1 — Coverage en CI** |
| **G1** | Pas de tests d'intégration | 🟢 Moyen | 3-5 jours | G2, G5 | **P2 — Intégration** |

### Dépendances entre correctifs

```mermaid
graph TD
    G2[CI Rouge] --> G3[Unit Tests en CI]
    G2 --> G5[E2E Secrets]
    G3 --> G4[Coverage]
    G2 --> G1[Tests Intégration]
    G5 --> G1
```

### Ordre d'exécution recommandé

1. **Sprint P0 (Jour 1)** : Diagnostic et correction de la CI (G2) + ajout des tests unitaires (G3)
   - `git checkout -b fix/ci-pipeline`
   - Corriger lint, typecheck, build
   - Ajouter le job `test-unit`
   - Vérifier que le badge devient vert

2. **Sprint P1 (Jour 2-3)** : Déplacer les E2E vers des services containers (G5) + Coverage (G4)
   - Remplacer les secrets GitHub par des services dans le workflow
   - Ajouter le job `coverage` avec seuil
   - Intégrer Codecov (ou alternatif)
   - Ajouter les dossiers manquants au périmètre de couverture

3. **Sprint P2 (Semaine 2-3)** : Tests d'intégration (G1)
   - Infrastructure : config Vitest dédiée, setup, helpers
   - 6 premiers scénarios critiques
   - Job CI dédié

### Métriques cibles après correctifs

| Métrique | Avant | Après (cible) |
|---|---|---|
| **CI** | 🔴 Failing | 🟢 Passing |
| **Tests unitaires en CI** | ❌ Non exécutés | ✅ Exécutés à chaque push/PR |
| **Couverture** | Inconnue | 📊 Badge visible, seuil ≥ 60% |
| **Tests d'intégration** | 0 | ≥ 6 scénarios critiques |
| **Tests E2E** | 6 fichiers / 19 tests | ≥ 12 fichiers / 40+ tests |
| **Dépendance aux secrets** | Totale | Aucune (services/mocks) |

---

*Document généré le 05/06/2026 suite à l'audit des gaps tests & CI du projet DataPresent.*
