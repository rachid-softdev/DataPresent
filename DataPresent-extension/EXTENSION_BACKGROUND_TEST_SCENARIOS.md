# Extension Navigateur DataPresent — Scénarios de Test E2E Playwright Manquants

> **Projet :** DataPresent  
> **Feature :** Extension Navigateur — API Client & Background Services  
> **Périmètre :** `datapresent-extension/background/`  
> **Date :** 2026-06-21  
> **Status :** Analyse exhaustive — squelette existant, aucune implémentation, 100% des scénarios à couvrir

---

## Table des matières

1. [Introduction & Architecture Inférée](#1-introduction--architecture-inférée)
2. [Résumé de la couverture existante](#2-résumé-de-la-couverture-existante)
3. [Légende des catégories](#3-légende-des-catégories)
4. [API Client — `api-client.ts` (45 scénarios)](#4-api-client)
5. [Authentication Service — `auth.ts` (35 scénarios)](#5-authentication-service)
6. [Reports Sync — `reports-sync.ts` (25 scénarios)](#6-reports-sync)
7. [Notifications Service — `notifications.ts` (25 scénarios)](#7-notifications-service)
8. [Message Passing — `messaging.ts` (30 scénarios)](#8-message-passing)
9. [Context Menu — `context-menu.ts` (15 scénarios)](#9-context-menu)
10. [Storage Service — `storage.ts` (20 scénarios)](#10-storage-service)
11. [Service Worker — `service-worker.ts` (20 scénarios)](#11-service-worker)
12. [Cross-cutting Error Handling (30 scénarios)](#12-cross-cutting-error-handling)
13. [Performance & Resource Management (20 scénarios)](#13-performance--resource-management)
14. [Scénarios d'Intégration E2E (30 scénarios)](#14-scénarios-dintégration-e2e)
15. [Récapitulatif & Priorisation](#15-récapitulatif--priorisation)
16. [Recommandations d'Infrastructure de Test](#16-recommandations-dinfrastructure-de-test)

---

## 1. Introduction & Architecture Inférée

### 1.1 Que fait l'extension DataPresent ?

L'extension navigateur DataPresent est un **companion Chrome** du SaaS DataPresent, permettant aux utilisateurs de :

- **Capturer des données** depuis n'importe quelle page web (tableaux, textes sélectionnés)
- **Déclencher la génération de rapports** via le menu contextuel
- **Recevoir des notifications** quand un rapport est prêt (même en dehors de l'app web)
- **Synchroniser l'état des rapports** en arrière-plan
- **S'authentifier** via OAuth (Google) ou magic link, avec persistance des tokens

### 1.2 Architecture inférée des services background

```
chrome.extension                                          Service Worker
    │                                                         │
    ├── Context Menu  ◄──────────────────┐                    │
    │   (clic droit)                      │                    │
    │                                     │                    │
    ├── Popup  ──────►  messaging.ts  ◄──┼──► service-worker.ts  ──► api-client.ts  ──► API DataPresent
    │   (browser_action)                  │    │                    │                    │
    │                                     │    │                    │                    ├── Auth (JWT)
    │                                     │    │                    │                    ├── Reports
    │                                     │    │                    │                    ├── Upload
    │                                     │    │                    │                    └── Share
    │                                     │    │                    │
    ├── Content Script                    │    ├── auth.ts          │
    │   (page injection)  ────────────────┘    │   (tokens OAuth)   │
    │                                          │                    │
    ├── chrome.storage.local ◄─────────────────┼── storage.ts       │
    │                                          │                    │
    │                                          ├── reports-sync.ts  │
    │                                          │   (polling 60s)    │
    │                                          │                    │
    │                                          ├── notifications.ts │
    │                                          │   (chrome.notifications API)
    │                                          │
    │                                          └── logger.ts  (via @datapresent/worker-common)
    │
    └── chrome.alarms / chrome.idle
```

### 1.3 API DataPresent consommée par l'extension

| Méthode | Route | Usage extension |
|---------|-------|-----------------|
| POST | `/api/auth/signup` | Inscription depuis popup |
| POST | `/api/auth/magic-link` | Envoi magic link |
| GET | `/api/auth/callback` | Callback OAuth (popup window) |
| POST | `/api/auth/forgot-password` | Mot de passe oublié |
| POST | `/api/auth/reset-password` | Réinitialisation mot de passe |
| DELETE | `/api/auth/session` | Logout (invalidation session) |
| GET | `/api/v1/reports` | Sync liste rapports (paginated cursor) |
| GET | `/api/reports/[id]` | Détail rapport pour notification |
| DELETE | `/api/reports/[id]` | Suppression depuis context menu |
| POST | `/api/reports/batch` | Opérations batch |
| POST | `/api/upload` | Upload fichier (drag depuis l'OS) |
| POST | `/api/reports/[id]/regenerate` | Regénération |
| GET | `/api/user/profile` | Profil utilisateur |
| GET | `/api/user/usage` | Statistiques/quotas |
| GET | `/api/v1/me` | Utilisateur courant |
| GET | `/api/me/entitlements` | Feature gates (limites plan) |
| GET | `/api/share/meta` | Metadata partage |
| POST | `/api/share/verify-password` | Vérification mot de passe partage |

### 1.4 Configuration extraite des fichiers `.env`

| Variable | Dev | Prod | Usage |
|----------|-----|------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api` | `https://datapresent.com/api` | Base URL API |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | `https://datapresent.com` | Web app URL |
| `NEXT_PUBLIC_ENABLE_NOTIFICATIONS` | `true` | `true` | Feature flag notifications |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `true` | `true` | Feature flag analytics |
| `NEXT_PUBLIC_ENABLE_CONTEXT_MENU` | `true` | `true` | Feature flag context menu |
| `NEXT_PUBLIC_LOG_LEVEL` | `debug` | `error` | Niveau de log |
| `NEXT_PUBLIC_HOT_RELOAD` | `true` | `false` | Hot reload dev |
| `NEXT_PUBLIC_EXTENSION_ID` | `your-extension-id` | `auto` | ID extension |
| `API_SECRET` | `your-api-secret` | `...` | Secret API backend |
| `CHROME_STORAGE_KEY` | `...` | `...` | Encryption key storage |

### 1.5 Prérequis techniques

- **Runtime :** Chrome Extension Manifest V3 (Service Worker)
- **Storage :** `chrome.storage.local` + `chrome.storage.sync` pour settings
- **Auth :** OAuth 2.0 via `chrome.identity` ou popup window
- **Notifications :** `chrome.notifications` API
- **Context Menu :** `chrome.contextMenus` API
- **Alarms :** `chrome.alarms` API pour polling scheduling
- **Idle :** `chrome.idle` API pour gestion veille
- **Persistence :** Service worker peut être arrêté par Chrome — doit se réinitialiser

---

## 2. Résumé de la couverture existante

| Fichier | Status | Ce qui est testé |
|---------|--------|------------------|
| `datapresent-extension/` | ❌ SQUELETTE | Aucun fichier source — seulement `package.json` + fichiers `.env` |
| `tests/e2e/` (web app) | ⚠️ Partiel | Tests web app uniquement (auth, share, landing, pricing, navigation) |
| Extension background tests | ❌ ABSENT | **Zéro test** — aucun fichier de test pour l'extension |
| **Total** | **0% couverture** | **Tout est à écrire** |

> **Constats clés :**
> - L'extension est un squelette vide (aucun fichier `.ts` dans `background/`)
> - Aucun test E2E Playwright n'existe pour l'extension
> - Les tests web app existants (`auth.spec.ts`, `share.spec.ts`) ne couvrent pas l'extension
> - Le pattern Playwright pour les extensions Chrome nécessite `chromium.launchPersistentContext` avec un `args` spécifique

---

## 3. Légende des catégories

| Icône | Catégorie | Description |
|-------|-----------|-------------|
| ✅ **Success** | Parcours nominal — tout fonctionne |
| ❌ **Error** | Gestion d'erreurs — API, réseau, timeout |
| ⚡ **Edge** | Cas limites — valeurs extrêmes, races |
| 🧪 **State** | États UI — loading, empty, error, disabled |
| 🛡️ **Auth** | Authentification, autorisation, tokens |
| 🏎️ **Perf** | Performance, mémoire, temps de réponse |
| 🔄 **Retry** | Retry, backoff, circuit breaker |
| 🌐 **Offline** | Mode déconnecté, reconnection |
| 🔌 **Extension** | Spécifique Chrome API (MV3, service worker) |
| 🔐 **Security** | Sécurité, XSS, CSRF, injection |
| ♿ **A11y** | Accessibilité (notifications, messages) |

---

## 4. API Client

> **Fichier :** `background/api-client.ts`  
> **Rôle :** HTTP client avec auth injection, retry, timeout, cache. Point d'entrée unique vers l'API DataPresent.

### 4.1 Requêtes HTTP (GET/POST/PUT/DELETE)

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-001 | GET request réussie avec données | ✅ Success | Appel GET `/api/v1/me` retourne 200 avec body JSON utilisateur | Token valide, utilisateur existe | Response parsée en objet JS, status 200 |
| API-002 | POST request avec body JSON | ✅ Success | Appel POST `/api/upload` avec FormData (fichier) | Token valide, fichier < 10MB | Response 201, body contient `{ reportId }` |
| API-003 | PUT request avec body JSON | ✅ Success | Appel PUT pour update profil | Token valide | Status 200, body mis à jour |
| API-004 | DELETE request sans body | ✅ Success | Appel DELETE `/api/reports/[id]` | Rapport existe, token valide | Status 204, pas de body |
| API-005 | Requête avec query params | ✅ Success | GET `/api/v1/reports?cursor=abc&limit=20` | Token valide | Query params envoyés, réponse paginée |
| API-006 | Headers personnalisés (X-Request-Id) | ✅ Success | Vérifier que chaque requête a un `X-Request-Id` unique | Toute requête | Header `X-Request-Id` présent, valeur UUID |
| API-007 | User-Agent extension | ✅ Success | Vérifier que le header `User-Agent` identifie l'extension | Toute requête | Header contient `DataPresent-Extension/1.0.0` |

### 4.2 Base URL Configuration

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-010 | Base URL = développement (localhost) | ✅ Success | Extension en mode dev, `NEXT_PUBLIC_API_URL=http://localhost:3000/api` | Mode dev | Toutes les requêtes vont vers `http://localhost:3000/api/...` |
| API-011 | Base URL = production | ✅ Success | Extension en mode production, `NEXT_PUBLIC_API_URL=https://datapresent.com/api` | Mode prod | Toutes les requêtes vont vers `https://datapresent.com/api/...` |
| API-012 | Base URL avec trailing slash | ⚡ Edge | `API_BASE_URL=http://localhost:3000/api/` (slash final) | Configuration avec `/` | URL construite sans double slash : `http://localhost:3000/api/v1/reports` |
| API-013 | Base URL sans trailing slash | ⚡ Edge | `API_BASE_URL=http://localhost:3000/api` | Configuration sans `/` | URL correcte : `http://localhost:3000/api/v1/reports` |
| API-014 | Base URL invalide (non-URL) | ❌ Error | `API_BASE_URL=not-a-url` | Mauvaise configuration | Erreur levée au init, fallback ou crash explicite |
| API-015 | Changement dynamique de base URL | ⚡ Edge | Changer la base URL via les settings de l'extension | Settings mis à jour | Les requêtes suivantes utilisent la nouvelle URL |

### 4.3 Auth Headers Injection

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-020 | Bearer token injecté dans headers | ✅ Success | Token valide présent dans `chrome.storage.local` | Token stocké, auth state = authenticated | Header `Authorization: Bearer <token>` présent sur chaque requête |
| API-021 | Token absent → requête sans header | 🛡️ Auth | Aucun token stocké (guest mode) | Non authentifié | Pas de header Authorization, requête envoyée (API retournera 401) |
| API-022 | Token vide (chaîne vide) | ⚡ Edge | `token = ""` après logout | Auth state = logged out | Header Authorization absent ou "Bearer " (vérifier comportement) |
| API-023 | Token null/undefined → pas de header | 🛡️ Auth | Token corrompu dans le storage | Token invalide | Graceful handling — pas de crash, requête sans auth |
| API-024 | Token avec caractères spéciaux | ⚡ Edge | Token JWT avec caractères non-ASCII | Token valide JWT | Header présent, API accepte le token |

### 4.4 Request Timeout

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-030 | Timeout par défaut 30s respecté | ✅ Success | Appel API qui prend 35s | Serveur lent (>30s) | Requête annulée après 30s, erreur `TIMEOUT` retournée |
| API-031 | Timeout personnalisé 10s | ✅ Success | Config option `timeout: 10000` | Requête lente >10s | Annulée après 10s |
| API-032 | Timeout pas déclenché si réponse rapide | ✅ Success | Réponse API en 500ms | API rapide | Requête réussie, pas de timeout |
| API-033 | Timeout exactement à la limite | ⚡ Edge | Réponse arrive à 29.9s pour timeout 30s | API juste dans les temps | Requête réussie (pas de race condition) |
| API-034 | AbortController signal pendant timeout | 🔌 Extension | Vérifier que AbortController.abort() est appelé au timeout | Requête lente | `signal.aborted === true` après timeout |

### 4.5 Retry Logic

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-040 | Retry sur 5xx — max 3 tentatives | 🔄 Retry | API retourne 500, l'api-client retente | 3 tentatives, toutes 500 | 3 appels effectués, dernière erreur retournée |
| API-041 | Retry sur 429 (rate limit) | 🔄 Retry | API retourne 429 avec `Retry-After: 2` | Rate limit atteint | Attend `Retry-After` secondes, puis retente |
| API-042 | Retry pas de 4xx (sauf 429) | 🔄 Retry | API retourne 400, 401, 403, 404 | Erreur client | Pas de retry, erreur immédiate |
| API-043 | Retry sur réseau (fetch échoue) | 🔄 Retry | `fetch()` throw `TypeError: Failed to fetch` | Réseau instable | 3 tentatives avec backoff exponentiel |
| API-044 | Retry pas sur timeout | 🔄 Retry | Timeout atteint après 30s | Réseau lent | Pas de retry — erreur `TIMEOUT` immédiate |
| API-045 | Exponential backoff vérifié | 🔄 Retry | Délai entre retries : 1s, 2s, 4s | 3 retries consécutifs | Timestamps entre tentatives vérifiés |
| API-046 | Retry avec jitter | ⚡ Edge | Délai avec randomisation (±500ms) | Retry en cours | Délais pas exactement identiques |
| API-047 | Succès au 2ème retry | 🔄 Retry | 1er appel = 500, 2ème = 200 | API intermittente | 2 appels, résultat retourné, pas de 3ème appel |
| API-048 | Limite de retry configurable | ⚡ Edge | Option `maxRetries: 5` | Config extension | Jusqu'à 5 tentatives |
| API-049 | Retry désactivé (maxRetries: 0) | ⚡ Edge | Option `maxRetries: 0` | Config utilisateur | Pas de retry, erreur immédiate |

### 4.6 Network Error Handling

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-050 | Fetch échoue (TypeError) | ❌ Error | Perte réseau soudaine pendant fetch | Navigateur offline | Erreur `NETWORK_ERROR` retournée, pas de crash |
| API-051 | DNS resolution failure | ❌ Error | `getaddrinfo ENOTFOUND` | URL API inaccessible | Erreur réseau propre, message explicite |
| API-052 | Connexion refusée (ECONNREFUSED) | ❌ Error | Serveur API down | API arrêtée | Erreur réseau, retry logic activé |
| API-053 | AbortError (utilisateur annule) | ❌ Error | `AbortController.abort()` appelé manuellement | Demande d'annulation | `ABORT_ERROR` retourné, pas de retry |
| API-054 | Erreur SSL/TLS | ❌ Error | `ERR_CERT_AUTHORITY_INVALID` en prod | Certificat invalide | Erreur réseau, pas de retry (sécurité) |

### 4.7 Non-JSON Response Handling

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-060 | Response 204 sans body | ⚡ Edge | DELETE `/api/reports/[id]` retourne 204 | Suppression réussie | `response = null`, pas d'erreur |
| API-061 | Response 200 avec body JSON valide | ✅ Success | GET retourne `{"id": "abc"}` | API OK | Parsing JSON réussi, objet retourné |
| API-062 | Response 200 avec body non-JSON (texte) | ❌ Error | API bug — retourne "OK" sans Content-Type JSON | API défectueuse | Erreur `PARSE_ERROR`, pas de crash |
| API-063 | Response 200 avec body vide | ⚡ Edge | API retourne 200 avec body vide | API OK | Retourne `null` ou `{}` (décision implémentation) |
| API-064 | Response 500 avec body HTML | ❌ Error | Serveur retourne page HTML d'erreur | Server error | Erreur `SERVER_ERROR` avec status code, pas de crash JSON |
| API-065 | Content-Type manquant | ⚡ Edge | API retourne JSON mais sans header Content-Type | API configuration | Tentative de parsing JSON, fallback texte |

### 4.8 Response Validation

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-070 | Response status 200-299 OK | ✅ Success | Tous les status 2xx sont traités comme succès | Réponse API | Callback success appelé |
| API-071 | Response status 301 redirect | ❌ Error | API redirect (ne devrait pas arriver mais couvert) | Mauvaise URL | Suivi du redirect ou erreur explicite |
| API-072 | Response status 304 Not Modified | ✅ Success | GET avec `If-None-Match` | Cache hit | `304` traité comme succès, body vide ou depuis cache |

### 4.9 AbortController Support

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-080 | Annulation manuelle d'une requête | ✅ Success | Appel `cancel()` sur une requête en cours | Requête API lente (pas encore response) | `signal.aborted === true`, fetch rejette avec `AbortError` |
| API-081 | Annulation après réponse reçue | ⚡ Edge | Appel `cancel()` après que la réponse est déjà reçue | Réponse API déjà reçue | Aucun effet (déjà résolue) |
| API-082 | Annulation multiples requêtes | ✅ Success | Lancer 3 requêtes, annuler les 3 | 3 requêtes en vol | Les 3 sont annulées proprement |
| API-083 | Pas d'appel à cancel() après timeout | ⚡ Edge | Timeout déclenché, vérifier que cancel() pas appelé deux fois | Timeout | `AbortError` une seule fois, pas de double appel |
| API-084 | AbortController proprement nettoyé | 🏎️ Perf | Vérifier pas de memory leak sur les signaux | Requêtes multiples | Les AbortController sont GC'd après usage |

### 4.10 Cache Headers

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| API-090 | Cache-Control respecté | ✅ Success | API retourne `Cache-Control: private, max-age=300` | GET /api/v1/me | Réponse mise en cache locale pour 5 min |
| API-091 | ETag envoyé au serveur | ✅ Success | Première réponse a `ETag: "abc123"` | Ressource avec ETag | Requête suivante envoie `If-None-Match: "abc123"` |
| API-092 | 304 utilise cache local | ✅ Success | API retourne 304 → réponse précédente utilisée | ETag match | Pas de nouvelle donnée, cache hit |
| API-093 | Pas de cache pour POST/PUT/DELETE | ⚡ Edge | Requêtes mutantes | Requête non-GET | Aucun cache, `Cache-Control: no-cache` |
| API-094 | Invalidation cache après mutation | ✅ Success | POST report → GET list reports | Mutation récente | Cache invalidé pour la liste reports |
| API-095 | Expiration cache après TTL | 🧪 State | Cache expiré après max-age | TTL dépassé | Nouvelle requête vers l'API, pas de hit cache |

---

## 5. Authentication Service

> **Fichier :** `background/auth.ts`  
> **Rôle :** Gestion des tokens JWT, refresh token, OAuth flow, session management.

### 5.1 Token Storage

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-001 | Token stocké dans chrome.storage.local | ✅ Success | Login réussi → token sauvegardé | Auth API valide | `chrome.storage.local.get('auth_token')` retourne le token |
| AUTH-002 | Refresh token stocké séparément | ✅ Success | Login réussi → refresh token aussi stocké | Auth API valide | Deux clés distinctes : `auth_token` et `refresh_token` |
| AUTH-003 | Token encrypté au repos | 🔐 Security | Vérifier que `CHROME_STORAGE_KEY` est utilisé pour encrypt | Encryption activée | Token stocké sous forme chiffrée (pas en clair) |
| AUTH-004 | Token persiste après fermeture navigateur | ✅ Success | Storage persisté après restart Chrome | Token valide | `chrome.storage.local` est synchrone, token toujours présent |
| AUTH-005 | Token supprimé au logout | ✅ Success | Logout → clés supprimées | Utilisateur connecté | `chrome.storage.local.get('auth_token')` = undefined |
| AUTH-006 | Nettoyage tokens orphelins au init | 🧪 State | Storage contient token invalide/expiré | Extension reload | Token détecté invalide, nettoyé, auth state = guest |

### 5.2 Token Refresh Flow

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-010 | Refresh token valide → nouveau token | ✅ Success | Appel API retourne 401, refresh token valide | Token access expiré, refresh token valide | Nouveau token obtenu, requête originale retentée avec nouveau token |
| AUTH-011 | Refresh token expiré → logout | ❌ Error | Refresh token aussi expiré | Les deux tokens expirés | Session terminée, auth state = guest |
| AUTH-012 | Refresh token manquant → logout | ❌ Error | 401 mais pas de refresh token stocké | Guest mode ou token corrompu | Logout immédiat, auth state = guest |
| AUTH-013 | Refresh concurrent (plusieurs tabs) | ⚡ Edge | 3 tabs lancent refresh token simultanément | Token expiré | Un seul refresh API call, les 3 tabs utilisent le nouveau token |
| AUTH-014 | Refresh échoue (réseau) → retry | 🔄 Retry | API refresh retourne 500 | Serveur API down | Retry jusqu'à 3 fois, puis logout |
| AUTH-015 | Race condition refresh + requests | ⚡ Edge | 5 requêtes en vol, token expire, refresh déclenché | Token expire pendant requêtes | Les 5 requêtes sont mises en queue, refresh fait, toutes retentées |
| AUTH-016 | Queue de requêtes pendant refresh | ✅ Success | Pendant refresh, les requêtes sont mises en attente | Token en cours de refresh | Les requêtes sont bufferisées, pas d'appels individuels |
| AUTH-017 | Debounce refresh (pas 2x en 5s) | ⚡ Edge | Deux 401 reçus à 1s d'intervalle | Token expiré | Un seul refresh déclenché, pas deux |

### 5.3 OAuth Login Flow (Popup Window)

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-020 | OAuth popup s'ouvre correctement | ✅ Success | Clic "Se connecter avec Google" dans popup | Popup extension ouverte | Nouvelle fenêtre popup vers `NEXT_PUBLIC_APP_URL/api/auth/signin/google` |
| AUTH-021 | OAuth popup dimensions correctes | ✅ Success | Vérifier width/height de la popup | Authentification initiée | Fenêtre 600x700 centrée |
| AUTH-022 | OAuth callback reçu par l'extension | ✅ Success | Après login OAuth, l'URL callback est interceptée | Auth réussie | Extension lit le token depuis l'URL callback |
| AUTH-023 | Fermeture popup → annulation login | ❌ Error | Utilisateur ferme la popup sans login | Popup ouverte | Auth state inchangé, pas de token |
| AUTH-024 | Erreur OAuth (utilisateur refuse) | ❌ Error | Utilisateur refuse les permissions Google | Consent screen | Erreur propagée, message "Connexion annulée" |
| AUTH-025 | OAuth popup bloquée par navigateur | ❌ Error | Popup blocker empêche l'ouverture | Bloqueur popup actif | Message "Veuillez autoriser les popups pour DataPresent" |
| AUTH-026 | Magic link reçu dans l'extension | ✅ Success | Utilisateur clique magic link → redirected to extension | Magic link email reçu | Extension intercepte l'URL, token extrait, session établie |

### 5.4 Session Check (isAuthenticated)

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-030 | isAuthenticated = true avec token valide | ✅ Success | Token présent et non expiré | Token valide | `isAuthenticated()` retourne `true` |
| AUTH-031 | isAuthenticated = false sans token | ✅ Success | Aucun token stocké | Guest | `isAuthenticated()` retourne `false` |
| AUTH-032 | isAuthenticated = false token expiré | ✅ Success | Token présent mais expiré (JWT decoded) | Token expiré | `isAuthenticated()` retourne `false` |
| AUTH-033 | Vérification décode JWT sans API call | ✅ Success | Token décodé côté client pour vérifier exp | Token valide | Pas d'appel API, juste vérification locale |
| AUTH-034 | Token avec exp dans le futur (marge 30s) | ⚡ Edge | Token expire dans 15s, marge de sécurité 30s | Token bientôt expiré | Considéré comme expiré (marge de sécurité) |
| AUTH-035 | isAuthenticated avec refresh disponible | ✅ Success | Token expiré mais refresh token valide | Refresh disponible | `isAuthenticated()` retourne `true` (refresh possible) |

### 5.5 Logout

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-040 | Logout supprime les tokens | ✅ Success | Appel logout → tokens nettoyés | Utilisateur connecté | `chrome.storage.local` ne contient plus auth_token |
| AUTH-041 | Logout envoie DELETE /api/auth/session | ✅ Success | Session invalidée côté serveur | Logout explicite | Appel API DELETE session, status 204 |
| AUTH-042 | Logout notifie web app (other tabs) | ✅ Success | Autres tabs de l'app web sont notifiés | 2 tabs app web ouverts | Message broadcast via `chrome.tabs.sendMessage` ou storage event |
| AUTH-043 | Logout with network error (API down) | ❌ Error | API logout échoue (réseau) | Serveur down | Tokens nettoyés localement, pas de blocage |
| AUTH-044 | Logout from multiple contexts | ⚡ Edge | Popup + content script + web app logout simultané | 3 contexts ouverts | Un seul logout exécuté, pas de race condition |

### 5.6 Guest Mode

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-050 | Guest mode actif par défaut | ✅ Success | Première installation, pas de token | Extension fraîchement installée | Auth state = guest, pas d'appel API |
| AUTH-051 | Guest mode UI limité | ✅ Success | Fonctionnalités réduites | Guest mode | Upload désactivé, context menu limité, "Connectez-vous" visible |
| AUTH-052 | Guest → Login → Full access | ✅ Success | Connexion réussie depuis guest | OAuth complété | Toutes les fonctionnalités débloquées |
| AUTH-053 | Guest mode persiste après restart | ✅ Success | Extension relancée, toujours guest | Pas de login précédent | Toujours guest, pas d'erreur |

### 5.7 Auth State Persistence

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-060 | Restauration session après browser restart | ✅ Success | Chrome fermé/réouvert, token valide | Token non expiré | Service worker restauré, auth state = authenticated |
| AUTH-061 | Restauration session après extension update | ⚡ Edge | Extension mise à jour, service worker restarté | Token valide | Session restaurée, pas de perte de token |
| AUTH-062 | Restauration session après crash Chrome | ⚡ Edge | Chrome crash → redémarrage | Token valide | `chrome.storage.local` persiste, session récupérée |
| AUTH-063 | Pas de persistance en navigation privée | 🔌 Extension | Mode incognito, storage isolé | Incognito | Pas de token persistant (chrome.storage est isolé) |

### 5.8 Concurrent Auth from Multiple Tabs

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| AUTH-070 | Login depuis Tab A → Tab B notifié | ✅ Success | Tab A se connecte | Tab B ouverte | Tab B reçoit message `AUTH_STATE_CHANGED: authenticated` |
| AUTH-071 | Login depuis Popup → Web app notifié | ✅ Success | Connexion via popup extension | App web ouverte dans un tab | App web reçoit notification et met à jour UI |
| AUTH-072 | Logout depuis web app → Extension notifié | ✅ Success | Déconnexion depuis app web | Extension active | Extension reçoit event et passe en guest mode |
| AUTH-073 | Deux tabs connectent simultanément | ⚡ Edge | Login rapide depuis 2 tabs différents | Aucune session active | Race condition gérée — un seul auth flow complet |
| AUTH-074 | Storage event listener fonctionne | ✅ Success | Changement dans `chrome.storage.local` | Storage modifié | Listener `chrome.storage.onChanged` déclenché, état mis à jour |

---

## 6. Reports Sync

> **Fichier :** `background/reports-sync.ts`  
> **Rôle :** Synchronisation périodique des rapports depuis l'API, cache local, détection de changements.

### 6.1 Background Sync from API

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SYNC-001 | Sync initiale au démarrage | ✅ Success | Service worker init → premier sync | Authentifié, réseau OK | GET `/api/v1/reports` appelé, résultats stockés dans storage |
| SYNC-002 | Sync avec rapports paginés | ✅ Success | Plus de 20 rapports → pagination gérée | 45 rapports | API appelée 3 fois (cursor pagination), tous les rapports stockés |
| SYNC-003 | Sync sans rapports (liste vide) | ✅ Success | Aucun rapport pour cet utilisateur | Nouveau compte | Synced, storage `reports: []`, pas d'erreur |
| SYNC-004 | Sync updates les rapports existants | ✅ Success | 3 rapports existants en cache, API en retourne 5 | Sync | Cache mis à jour avec les 5 rapports (pas de doublons) |
| SYNC-005 | Sync avec erreur API (500) | ❌ Error | API reports down | Erreur serveur | Cache inchangé, erreur loggée, pas de perte de données |
| SYNC-006 | Sync sans auth (guest) | ❌ Error | Guest mode tente de sync | Non authentifié | Sync ignorée, pas d'appel API |

### 6.2 Polling Interval

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SYNC-010 | Polling interval = 60s | ✅ Success | Sync planifié toutes les 60s | Service worker actif | `chrome.alarms.create('sync-reports', { periodInMinutes: 1 })` |
| SYNC-011 | Polling pas en guest mode | 🛡️ Auth | Non authentifié → pas de polling | Guest | Alarme pas créée, pas de sync périodique |
| SYNC-012 | Polling s'arrête après logout | ✅ Success | Logout → alarme supprimée | Utilisateur connecté | `chrome.alarms.clear('sync-reports')` appelé |
| SYNC-013 | Polling reprend après login | ✅ Success | Login → alarme créée | Guest → Authentifié | Alarme créée avec interval 60s |
| SYNC-014 | Polling interval configurable | ⚡ Edge | Settings utilisateur = 120s | Config modifiée | Alarme mise à jour avec nouveau interval |
| SYNC-015 | Alarme Chrome MV3 persiste | 🔌 Extension | Vérifier que l'alarme survit au service worker idle | Service worker réveillé | Alarme toujours active au wake-up |

### 6.3 Cached Reports in Local Storage

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SYNC-020 | Rapports stockés dans chrome.storage.local | ✅ Success | Sync terminée → données persistées | Rapports reçus | Clé `cached_reports` avec tableau JSON |
| SYNC-021 | Timestamp du dernier sync stocké | ✅ Success | `last_sync_at` mis à jour | Sync réussi | `Date.now()` stocké dans storage `last_sync_at` |
| SYNC-022 | Cache limité en taille (max 100 reports) | ⚡ Edge | 150 rapports côté API | Beaucoup de rapports | Seuls les 100 plus récents sont stockés |
| SYNC-023 | Compression des données en cache | 🏎️ Perf | Rapports comprimés avant stockage | Sync avec 50 rapports | Taille storage < 5MB (limite chrome.storage) |
| SYNC-024 | Fallback au cache si offline | 🌐 Offline | Sync échoué (réseau), cache disponible | Offline | Données du cache utilisées, pas d'erreur affichée |

### 6.4 Detect New & Changed Reports

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SYNC-030 | Nouveau rapport détecté (diff) | ✅ Success | Sync trouve un rapport absent du cache | Rapport créé depuis dernier sync | Rapport marqué comme NEW, notification programmée |
| SYNC-031 | Rapport changé (PENDING → DONE) | ✅ Success | Rapport PROCESSING devient DONE | Statut changé | Statut mis à jour dans le cache, notification "Rapport prêt" |
| SYNC-032 | Rapport changé (PENDING → ERROR) | ✅ Success | Rapport PROCESSING devient ERROR | Génération échouée | Statut mis à jour, notification "Échec de génération" |
| SYNC-033 | Pas de changement (aucun diff) | ✅ Success | Sync ne trouve aucune différence | Aucun changement | Cache pas modifié, `updated_at` pas mis à jour |
| SYNC-034 | Rapport supprimé (disparu de l'API) | ⚡ Edge | Rapport supprimé depuis web app | DELETE API appelé | Rapport supprimé du cache local |
| SYNC-035 | Changement de titre ou secteur | ✅ Success | Metadata du rapport modifié | Édition depuis web app | Cache mis à jour avec nouveau titre/secteur |

### 6.5 Rate Limit Respect

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SYNC-040 | Pas de sync si une sync est déjà en cours | ✅ Success | Sync lente (>60s), nouvelle alarme déclenchée | Sync précédente pas terminée | Deuxième sync ignorée (lock) |
| SYNC-041 | Sync pas plus fréquent que 30s | ⚡ Edge | Multiple alarmes déclenchées rapidement | Alarms overlap | Throttle : minimum 30s entre deux sync |
| SYNC-042 | Backoff si rate limit (429) | 🔄 Retry | API retourne 429 | Trop de requêtes | Sync attend `Retry-After`, puis retente avec backoff |

### 6.6 Manual Refresh

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SYNC-050 | Pull-to-refresh depuis popup | ✅ Success | Utilisateur clique "Rafraîchir" dans popup | Popup ouverte | Message envoyé au background, sync immédiat déclenché |
| SYNC-051 | Refresh forcé ignore cache | ✅ Success | `force: true` → skip cache | Sync manuelle | API appelée, cache remplacé |
| SYNC-052 | Refresh notification au popup | ✅ Success | Sync déclenchée manuellement terminée | Sync complétée | Message `SYNC_COMPLETED` envoyé au popup |

### 6.7 Online/Offline Awareness

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SYNC-060 | Sync seulement quand online | 🌐 Offline | `navigator.onLine = false` | Réseau coupé | Sync pas déclenchée, remise à plus tard |
| SYNC-061 | Sync rattrapée après retour online | 🌐 Offline | Online → déclenche sync immédiat | Revenu en ligne | Sync forcée dès la détection du retour online |
| SYNC-062 | Offline → cache utilisé pour popup | 🌐 Offline | Popup ouverte hors-ligne | Pas de réseau | Données du cache affichées, badge "Hors ligne" |
| SYNC-063 | Online/offline listener chrome | ✅ Success | `chrome.idle.onStateChanged` ou `window.onLine` | Changement état | Listener réagit, sync adaptée |

---

## 7. Notifications Service

> **Fichier :** `background/notifications.ts`  
> **Rôle :** Notifications Chrome via `chrome.notifications` API pour les événements reports.

### 7.1 Chrome Notifications API Usage

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| NOTIF-001 | Notification créée avec titre + message | ✅ Success | Report DONE → notification | Sync détecte changement | `chrome.notifications.create()` appelé avec id, title, message, iconUrl |
| NOTIF-002 | Notification avec icône DataPresent | ✅ Success | Icône 128x128 de l'extension utilisée | Extension installée | `iconUrl = "icons/icon-128.png"` |
| NOTIF-003 | Notification avec bouton d'action | ✅ Success | Bouton "Voir le rapport" dans la notification | Report DONE | `buttons: [{ title: "Voir le rapport" }]` |
| NOTIF-004 | Notification priority = HIGH | ✅ Success | Notifications importantes (DONE/ERROR) | Report prêt | `priority: 2` |
| NOTIF-005 | Notification priority = LOW | ⚡ Edge | Notifications info (report supprimé) | Événement mineur | `priority: 0` |

### 7.2 Notification on Report DONE

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| NOTIF-010 | Notification "Rapport prêt" pour DONE | ✅ Success | Sync détecte PENDING → DONE | Génération terminée | Notification avec titre "Rapport prêt !", nom du rapport |
| NOTIF-011 | Click notification → ouvre app web | ✅ Success | Clic sur la notification | Notification visible | `chrome.tabs.create({ url: APP_URL + '/reports/' + reportId })` |
| NOTIF-012 | Notification disparaît après click | ✅ Success | Clic → notification.clear() | Notification active | `chrome.notifications.clear(notifId)` |
| NOTIF-013 | Notification "Rapport prêt" avec résumé | ✅ Success | Détails : secteur, nombre de slides | Rapport généré | Message "Votre rapport Marketing (12 slides) est prêt" |

### 7.3 Notification on Report ERROR

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| NOTIF-020 | Notification "Échec de génération" | ❌ Error | Sync détecte PENDING → ERROR | Génération échouée | Notification rouge/alerte avec message d'erreur |
| NOTIF-021 | Click notification → voir erreur | ✅ Success | Clic notification erreur | Report ERROR | Ouvre `/reports/[id]` avec détail de l'erreur |
| NOTIF-022 | Notification avec suggestion "Réessayer" | ✅ Success | Bouton "Réessayer" dans notif erreur | Échec | Bouton déclenche `POST /api/reports/[id]/regenerate` |

### 7.4 Notification Grouping

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| NOTIF-030 | Plusieurs reports DONE → notifications groupées | ✅ Success | 3 reports prêts en même temps | 3 DONE dans un sync | Une seule notification "3 rapports prêts" (pas 3 notifs séparées) |
| NOTIF-031 | Notification individuelle pour 1 report | ✅ Success | 1 seul DONE | Sync normal | Notification unique, pas de grouping |
| NOTIF-032 | Notification groupée avec liste | ✅ Success | Grouped notification détaille les rapports | 3 rapports | Message "Rapport Marketing, Rapport Finance, Rapport SaaS sont prêts" |

### 7.5 Do Not Disturb Mode

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| NOTIF-040 | DND activé → pas de notification | ✅ Success | Setting `dnd: true` | DND activé | `chrome.notifications.create()` PAS appelé |
| NOTIF-041 | DND heures silencieuses (22h-7h) | ✅ Success | Notification générée à 23h, DND hours | Heure silencieuse | Notification silencieuse (pas de son/badge) ou ignorée |
| NOTIF-042 | DND désactivé → notifications normales | ✅ Success | DND: false | Utilisateur connecté | Notifications s'affichent normalement |
| NOTIF-043 | DND permissif (certains types seulement) | ⚡ Edge | DND pour erreurs seulement | DND partiel | Notifications DONE ignorées, ERROR affichées |
| NOTIF-044 | DND settings persistés dans storage | ✅ Success | Setting sauvegardé | Changement DND | `chrome.storage.sync.get('dnd')` retourne la valeur |

### 7.6 Notification Permission Handling

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| NOTIF-050 | Permission notifications accordée | ✅ Success | Permission déjà donnée | Première notification | Notification créée normalement |
| NOTIF-051 | Permission notifications refusée | ❌ Error | Utilisateur a bloqué les notifications | Permission = denied | Pas de notification, log warning, pas d'erreur |
| NOTIF-052 | Permission non encore demandée | ⚡ Edge | Permission = default (pas encore demandée) | Première notification | Tentative de créer notification (Chrome demandera la permission) |
| NOTIF-053 | Permission perdue après mise à jour | ⚡ Edge | Extension update → permission reset | Mise à jour | Vérifier permission avant chaque notification |

### 7.7 Clear Notifications on Read

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| NOTIF-060 | Notification clear après click | ✅ Success | Clic notification → disparaît | Notification active | `chrome.notifications.clear()` |
| NOTIF-061 | Notification clear quand report vu | ✅ Success | Utilisateur ouvre le rapport dans popup → notif clear | Popup affiche le rapport | Notification associée supprimée |
| NOTIF-062 | "Tout marquer comme lu" | ✅ Success | Action popup "Tout marquer comme lu" | 5 notifications actives | Les 5 notifications.clear() |
| NOTIF-063 | Clear automatique après 1h | ⚡ Edge | Notification non lue après 1h | Notification oubliée | Auto-clear, plus de notification périmée |

---

## 8. Message Passing

> **Fichier :** `background/messaging.ts`  
> **Rôle :** Communication entre content scripts, popup, et background service worker.

### 8.1 Content Script → Background

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-001 | Content script envoie données tableau | ✅ Success | Utilisateur sélectionne un tableau HTML → extrait → envoie | Tableau présent dans la page | Background reçoit message `EXTRACT_TABLE_DATA`, tableau parsé |
| MSG-002 | Content script envoie texte sélectionné | ✅ Success | Texte sélectionné sur la page | Texte sélectionné | Message `EXTRACT_SELECTION` avec contenu texte |
| MSG-003 | Content script envoie URL page courante | ✅ Success | Contexte de page partagé | Page ouverte | Message include `{ url, title, favicon }` de la page |
| MSG-004 | Content script sur page non-tableau | ❌ Error | Pas de tableau détecté dans la page | Page sans tableau | Message `NO_TABLE_FOUND`, pas de crash |
| MSG-005 | Content script sur page protégée (chrome://) | ❌ Error | Script injecté mais page chrome:// | Page interne | Pas d'erreur, message approprié |
| MSG-006 | Content script frame vs top | ⚡ Edge | Tableau dans un iframe | Page avec iframe | Données extraites du iframe ou message "tableau dans iframe" |

### 8.2 Popup → Background

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-010 | Popup demande auth state | ✅ Success | Popup ouverte → requiert `GET_AUTH_STATE` | Service worker actif | Background retourne `{ authenticated: true/false, user: {...} }` |
| MSG-011 | Popup demande liste reports | ✅ Success | Popup demande `GET_REPORTS` | Sync a des données | Retourne `{ reports: [...], lastSync: timestamp }` |
| MSG-012 | Popup demande synchro manuelle | ✅ Success | Popup envoie `SYNC_NOW` | Authentifié | Background déclenche sync, réponse `{ synced: true, count: 5 }` |
| MSG-013 | Popup demande logout | ✅ Success | Popup envoie `LOGOUT` | Utilisateur connecté | Background exécute logout, réponse `{ success: true }` |
| MSG-014 | Popup demande ouverture report | ✅ Success | Popup clique sur report → `OPEN_REPORT` | Report ID | Background ouvre tab avec URL app web |

### 8.3 Background → Popup

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-020 | Background notifie popup de sync complété | ✅ Success | Sync terminée → popup reçoit update | Popup ouverte, sync finie | Message `REPORTS_UPDATED` avec nouvelle data |
| MSG-021 | Background notifie changement auth | ✅ Success | Login/logout → popup notifié | Auth state change | Message `AUTH_STATE_CHANGED` |
| MSG-022 | Background notifie nouveau report | ✅ Success | Nouveau report détecté par sync | Popup ouverte | Message `NEW_REPORT_AVAILABLE` avec ID du report |
| MSG-023 | Background notifie erreur réseau | ❌ Error | API inaccessible | Network down | Message `NETWORK_ERROR` dans popup |

### 8.4 Response Message Format Consistency

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-030 | Format succès standard | ✅ Success | Toute opération réussie | Opération OK | Réponse format `{ success: true, data: {...} }` |
| MSG-031 | Format erreur standard | ❌ Error | Toute opération échouée | Opération KO | Réponse format `{ success: false, error: { code: "...", message: "..." } }` |
| MSG-032 | Codes d'erreur cohérents | ✅ Success | Même code pour même type d'erreur | Plusieurs erreurs | `UNAUTHORIZED`, `NOT_FOUND`, `NETWORK_ERROR`, `TIMEOUT`, `UNKNOWN` |
| MSG-033 | Message non reconnu | ❌ Error | Type de message inconnu | Message `UNKNOWN_TYPE` | Réponse `{ success: false, error: { code: "UNKNOWN_MESSAGE" } }` |
| MSG-034 | Payload manquant | ❌ Error | Message sans body attendu | Message vide | Erreur `INVALID_PAYLOAD` |
| MSG-035 | Payload avec champs inattendus | ⚡ Edge | Champs supplémentaires ignorés | Message extra fields | Traité normalement, champs extra ignorés |

### 8.5 Error Response Format

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-040 | Erreur avec message lisible | ✅ Success | Erreur avec message utilisateur | Erreur métier | `error.message` en français/anglais selon locale |
| MSG-041 | Erreur technique (stack trace) en debug | ✅ Success | Mode dev → stack trace incluse | `NEXT_PUBLIC_LOG_LEVEL=debug` | `error.stack` présent dans la réponse |
| MSG-042 | Erreur sans stack en production | 🛡️ Security | Mode prod → pas de stack trace | `NEXT_PUBLIC_LOG_LEVEL=error` | `error.stack` pas inclus |
| MSG-043 | Erreur avec code HTTP | ✅ Success | Erreur API avec status | API error | `error.httpStatus: 429` |
| MSG-044 | Erreur avec retryAfter | ✅ Success | Rate limit → info retry | 429 Retry-After | `error.retryAfter: 5` (secondes) |

### 8.6 Timeout Handling

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-050 | Message port disconnect (popup fermé) | ❌ Error | Popup fermé avant réponse du background | Popup éphémère | Erreur `PORT_DISCONNECTED`, pas de crash |
| MSG-051 | Background répond après disconnect | ⚡ Edge | Réponse envoyée mais port déconnecté | Async response | `chrome.runtime.lastError` géré, pas d'exception |
| MSG-052 | Timeout message 30s | ✅ Success | Background busy > 30s | Opération longue | Timeout, message d'erreur |
| MSG-053 | Timeout personnalisable | ⚡ Edge | Option `timeout: 5000` dans le message | Message avec config | Timeout après 5s |

### 8.7 Multiple Concurrent Messages

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-060 | 10 messages envoyés simultanément | ✅ Success | Popup + content script + web app envoient en même temps | Forte concurrency | Tous traités, pas de perte, pas de crash |
| MSG-061 | Même type de message 2x en parallèle | ⚡ Edge | Deux `SYNC_NOW` en même temps | Double requête | Un seul sync déclenché (debounce/dedup) |
| MSG-062 | FIFO ordering | ✅ Success | Message A puis B | Ordre chronologique | A traité avant B |
| MSG-063 | Message queue overflow (100+) | ⚡ Edge | Trop de messages en rafale | Spam de messages | Throttle, les derniers rejetés ou mis en attente |

### 8.8 Port Disconnection Handling

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| MSG-070 | Port disconnect normal (popup fermé) | ✅ Success | Popup se ferme | Port ouvert | `onDisconnect` nettoyé, pas de memory leak |
| MSG-071 | Port disconnect service worker idle | 🔌 Extension | Service worker s'endort avec port ouvert | Idle | Port fermé, reconnect au réveil |
| MSG-072 | Tentative d'envoi sur port mort | ❌ Error | Envoyer message sur port déconnecté | Port already closed | `chrome.runtime.lastError` géré |
| MSG-073 | Réouverture de port après reconnect | ✅ Success | Service worker se réveille → ports re-ouverts | Wake-up | Content scripts se reconnectent |

---

## 9. Context Menu

> **Fichier :** `background/context-menu.ts`  
> **Rôle :** Gestion du menu contextuel (clic droit) pour capturer des données.

### 9.1 Menu Items Creation

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| CTX-001 | Menu créé à l'installation | ✅ Success | Extension installée → `chrome.runtime.onInstalled` | Première installation | `chrome.contextMenus.create` appelé avec 3 items |
| CTX-002 | Items du menu visibles | ✅ Success | Clic droit → menu DataPresent visible | Extension activée | "Créer un rapport depuis ce tableau", "Créer un rapport depuis cette sélection", "DataPresent - Ouvrir l'extension" |
| CTX-003 | Sous-menu organisé | ✅ Success | Items sous un parent "DataPresent" | Context menu | 3 items sous un parent title "📊 DataPresent" |
| CTX-004 | Icône dans le menu | ✅ Success | Check présence icône | Menu visible | `icons/icon-16.png` utilisé comme icône de menu |
| CTX-005 | Menu pas créé en guest mode | 🛡️ Auth | NON authentifié | Guest mode | Menu pas créé, ou items désactivés |

### 9.2 Click Context Menu → Trigger Action

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| CTX-010 | Clic "Créer depuis ce tableau" | ✅ Success | Clic sur item tableau | Tableau détecté sur la page | Background reçoit l'event, extraction du tableau, ouvre popup upload |
| CTX-011 | Clic "Créer depuis cette sélection" | ✅ Success | Texte sélectionné | Sélection active | Texte envoyé au background, ouvre popup avec données |
| CTX-012 | Clic "Ouvrir l'extension" | ✅ Success | Menu → ouvre popup | Extension installée | `chrome.browserAction.openPopup()` (MV3) |
| CTX-013 | Clic sur page sans tableau | ❌ Error | "Créer depuis ce tableau" sur page sans tableau | Pas de tableau | Notification "Aucun tableau trouvé sur cette page" |
| CTX-014 | Clic sans sélection de texte | ❌ Error | "Créer depuis cette sélection" sans texte sélectionné | Pas de sélection | Message "Veuillez sélectionner du texte" |

### 9.3 Menu Update on Auth State Change

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| CTX-020 | Menu activé après login | ✅ Success | Guest → Login | Auth state change | `chrome.contextMenus.update` pour activer les items |
| CTX-021 | Menu désactivé après logout | ✅ Success | Login → Logout | Auth state change | Items désactivés ou cachés |
| CTX-022 | Menu visible sur textes sélectionnables seulement | ⚡ Edge | Clic droit sur image → pas de menu "tableau" | Image | Seuls les items pertinents au contexte |
| CTX-023 | Menu visible sur tableaux seulement | ⚡ Edge | Clic droit sur div → pas d'item "tableau" | Élément non-tableau | Item "tableau" caché, les autres visibles |

### 9.4 Menu Removal on Uninstall

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| CTX-030 | Menu supprimé à la désinstallation | ✅ Success | Extension désinstallée | Uninstall | `chrome.contextMenus.removeAll()` appelé via `onUninstalled` |
| CTX-031 | Menu supprimé à la mise à jour | ✅ Success | Extension mise à jour | Update | Menu recréé, pas de doublons |

### 9.5 Context Menu on Editable Elements

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| CTX-040 | Menu sur champ input/textarea | ✅ Success | Clic droit dans un champ texte | Zone editable | Item "Envoyer à DataPresent" visible |
| CTX-041 | Menu sur champ avec données CSV | ✅ Success | Données CSV collées dans textarea | Texte format CSV | Context menu "Créer un rapport depuis ces données CSV" |
| CTX-042 | Menu sur champ vide | ⚡ Edge | Input vide | Pas de contenu | Item désactivé "Sélectionnez ou collez des données" |

---

## 10. Storage Service

> **Fichier :** `background/storage.ts`  
> **Rôle :** Abstraction autour de `chrome.storage` avec encryption, migration, quotas.

### 10.1 Read/Write Operations

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| STO-001 | Write data to chrome.storage.local | ✅ Success | Écriture clé-valeur | Storage disponible | `chrome.storage.local.set({ key: value })` réussi |
| STO-002 | Read data from chrome.storage.local | ✅ Success | Lecture clé existante | Clé présente | Valeur retournée correctement |
| STO-003 | Read clé inexistante | ✅ Success | Lecture clé qui n'existe pas | Clé absente | `undefined` retourné, pas d'erreur |
| STO-004 | Delete data from storage | ✅ Success | Suppression clé | Clé existante | `chrome.storage.local.remove('key')` |
| STO-005 | Clear all extension data | ✅ Success | Reset complet (logout) | Plusieurs clés | `chrome.storage.local.clear()` |
| STO-006 | Batch read/write | ✅ Success | `storage.get(['a', 'b', 'c'])` | Plusieurs clés | Toutes les valeurs retournées en un appel |

### 10.2 Storage Quotas

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| STO-010 | Storage quota chrome.local = 10MB | 🔌 Extension | Vérifier limite | Extension | `QUOTA_BYTES_PER_ITEM` respecté (max 8MB par item) |
| STO-011 | Approaching quota (8MB / 10MB) | ⚡ Edge | Cache + tokens + settings approche la limite | Beaucoup de données | Warning loggé, cleanup automatique des vieux caches |
| STO-012 | Quota exceeded → error | ❌ Error | Dépassement quota storage | Trop de données | Erreur `QUOTA_BYTES_PER_ITEM` ou `QUOTA_BYTES`, cleanup forcé |
| STO-013 | Storage cleanup quand plein | ✅ Success | Dépassement → purge des vieux reports | Quota > 80% | Les reports les plus vieux supprimés du cache |

### 10.3 Storage Encryption

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| STO-020 | Token encrypté avant stockage | 🔐 Security | Token auth crypté avec `CHROME_STORAGE_KEY` | Token reçu | Data dans storage est chiffrée, pas en clair |
| STO-021 | Token déchiffré à la lecture | ✅ Success | Lecture token → déchiffré | Token stocké | Token en clair en mémoire, pas dans storage |
| STO-022 | Clé de chiffrement absente | ❌ Error | `CHROME_STORAGE_KEY` pas défini | Configuration manquante | Fallback : stockage sans encryption, warning log |
| STO-023 | Clé de chiffrement invalide | ❌ Error | Mauvaise clé → déchiffrement échoué | Clé changée | Token considéré invalide, refresh ou logout |

### 10.4 Storage Migration

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| STO-030 | Migration v1 → v2 schema | ✅ Success | Ancien format de stockage détecté | Mise à jour extension | Données migrées vers nouveau format automatiquement |
| STO-031 | Version storage enregistrée | ✅ Success | `storage_version` dans storage | Première migration | Version tracking : `storage_version: 2` |
| STO-032 | Migration échouée → rollback | ❌ Error | Erreur pendant migration | Corruption | Rollback à l'état précédent, pas de perte de données |

### 10.5 Sync Storage

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| STO-040 | Settings stored in chrome.storage.sync | ✅ Success | Préférences utilisateur synchronisées | Plusieurs devices | Settings accessibles sur tous les Chrome connectés |
| STO-041 | Sync quota = 100KB | 🔌 Extension | Limite chrome.storage.sync | Settings | Respect `QUOTA_BYTES` = 102400 |
| STO-042 | Sync conflict résolution | ⚡ Edge | Même setting modifié sur 2 devices | Conflict | Last-write-wins (comportement natif Chrome) |

---

## 11. Service Worker

> **Fichier :** `background/service-worker.ts`  
> **Rôle :** Point d'entrée du service worker MV3, routing des messages, initialisation.

### 11.1 Initialization

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SW-001 | Service worker initialisé au install | ✅ Success | Extension installée | `chrome.runtime.onInstalled` | Initialisation complète : menus, alarmes, auth check |
| SW-002 | Service worker initialisé au wake-up | ✅ Success | Chrome réveille le service worker | Idle → Active | Restauration state, reconnection storage |
| SW-003 | Service worker vérifie auth state au réveil | ✅ Success | Wake-up → isAuthenticated check | Token présent | Auth state restauré, sync déclenché |
| SW-004 | Service worker enregistre les listeners | ✅ Success | Listeners chrome.* enregistrés au startup | Extension active | `onMessage`, `onInstalled`, `onAlarm`, `onConnect` enregistrés |

### 11.2 Message Router

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SW-010 | Message routé vers le bon handler | ✅ Success | Message `type: "GET_REPORTS"` | Service worker actif | Routé vers `handlers.reports.getReports()` |
| SW-011 | Type inconnu → réponse erreur | ❌ Error | Message type inexistant | `type: "FOO_BAR"` | Erreur `UNKNOWN_MESSAGE_TYPE` |
| SW-012 | Handler asynchrone | ✅ Success | Handler qui fait appel API | Appel asynchrone | Promise gérée, réponse envoyée après résolution |
| SW-013 | Handler throw → erreur propagée | ❌ Error | Handler lève une exception | Bug dans handler | Erreur catchée, réponse `{ success: false, error }` |
| SW-014 | Try/catch global sur message | ✅ Success | Erreur non catchée dans handler | Exception | Pas de crash service worker, erreur renvoyée |

### 11.3 Service Worker Lifecycle

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SW-020 | Service worker s'endort après 30s inactif | 🔌 Extension | Pas de messages ni d'alarmes | Idle | Chrome met le SW en veille (terminated) |
| SW-021 | Service worker se réveille sur message | 🔌 Extension | Message reçu quand SW dormant | Message entrant | SW réveillé, message traité (légère latence) |
| SW-022 | Service worker se réveille sur alarme | 🔌 Extension | Alarme `sync-reports` déclenchée | SW dormant | SW réveillé, sync exécuté |
| SW-023 | Service worker se réveille sur notification click | 🔌 Extension | Clic sur notification | SW dormant | SW réveillé, action exécutée |
| SW-024 | Service worker state persistant entre wakes | ✅ Success | Variables globales restaurées | Wake-up | Données rechargées depuis chrome.storage |
| SW-025 | Service worker pas de state memory entre wakes | ⚡ Edge | Variables globales perdues | Wake-up | Code conçu pour ne pas dépendre de state mémoire |

### 11.4 Registration and Update

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SW-030 | Enregistrement SW à l'install | ✅ Success | `chrome.runtime.onInstalled` | Nouvelle install | SW enregistré, listeners actifs |
| SW-031 | SW mis à jour en background | ✅ Success | Extension update → nouveau SW | Mise à jour | Ancien SW remplacé, state migré |
| SW-032 | SW update pending (2 tabs ouverts) | ⚡ Edge | Extension update avec tabs actifs | Update | SW attend que tous les tabs soient fermés pour update |
| SW-033 | SW échoue à s'enregistrer | ❌ Error | Corruption du manifest | Manifest invalide | Erreur d'installation, extension désactivée |

---

## 12. Cross-cutting Error Handling

### 12.1 Network Offline Detection

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| ERR-001 | Offline détecté avant API call | 🌐 Offline | `navigator.onLine === false` | Réseau coupé | Appel API pas envoyé, erreur `OFFLINE` immédiate |
| ERR-002 | Offline pendant API call (fetch fail) | 🌐 Offline | Perte réseau pendant requête | Fetch en cours | Erreur `NETWORK_ERROR`, pas de retry après 3 |
| ERR-003 | Offline → pas de crash UI | 🌐 Offline | Popup ouverte offline | Pas de réseau | UI affiche "Vous êtes hors ligne", données cache |
| ERR-004 | Online → reprise normale | 🌐 Offline | Retour en ligne | Connexion rétablie | Requêtes normales, sync forcé |
| ERR-005 | Online/Offline listener chrome.idle | ✅ Success | `chrome.idle.onStateChanged` | Changement état | État propagé, actions adaptées |
| ERR-006 | Offline queue (requêtes mise en attente) | 🌐 Offline | Upload déclenché offline | Pas de réseau | Requête mise en file, exécutée au retour online |

### 12.2 API 401 → Refresh Token → Retry

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| ERR-010 | 401 intercepté → refresh token | 🔄 Retry | API retourne 401, refresh token valide | Token expiré | Refresh tenté, requête originale retentée |
| ERR-011 | 401 + refresh échoué → logout | ❌ Error | 401 puis refresh token invalide | Session expirée | Logout automatique, notification "Session expirée" |
| ERR-012 | 401 sur endpoint de refresh | ❌ Error | Appel refresh retourne aussi 401 | Token refresh expiré | Logout, pas de boucle infinie |
| ERR-013 | Multiple 401 en même temps | ⚡ Edge | 3 requêtes reçoivent 401 simultanément | Token expire | Un seul refresh, les 3 requêtes retentées |
| ERR-014 | 401 après refresh raté → pas de retry | ❌ Error | Refresh OK, requête retentée, encore 401 | Token révoqué entre temps | Pas de deuxième refresh, erreur retournée |

### 12.3 API 429 → Backoff → Retry

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| ERR-020 | 429 avec Retry-After | 🔄 Retry | API retourne 429 + `Retry-After: 5` | Rate limit | Attend 5s, puis retente |
| ERR-021 | 429 sans Retry-After | 🔄 Retry | API retourne 429 sans header | Rate limit | Backoff par défaut : 2s exponentiel |
| ERR-022 | 429 après plusieurs retry → abandon | ❌ Error | 3ème tentative aussi 429 | Trop de requêtes | Abandon, erreur `RATE_LIMITED` |
| ERR-023 | 429 sur requête critique (refresh) | ❌ Error | Requête refresh token rate limitée | Refresh hit 429 | Attendre, retenter (pas abandon : critique) |

### 12.4 API 5xx → Show Error Notification

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| ERR-030 | 500 → notification "Erreur serveur" | ❌ Error | API retourne 500 | Serveur bug | Notification "DataPresent est momentanément indisponible" |
| ERR-031 | 502 Bad Gateway | ❌ Error | Proxy API down | Infrastructure | Même notification que 500 |
| ERR-032 | 503 Service Unavailable | ❌ Error | Maintenance | Maintenance programmée | Notification "DataPresent est en maintenance" |
| ERR-033 | 504 Gateway Timeout | ❌ Error | Proxy timeout | Réseau | Notification "Délai d'attente dépassé" |
| ERR-034 | 5xx silencieux (pas de notif si > 3 par heure) | ⚡ Edge | Trop d'erreurs 5xx | API instable | Pas de spam notification, log seulement |

### 12.5 Storage Write Error → Fallback

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| ERR-040 | Storage write échoue (quota) | ❌ Error | `chrome.storage.local.set()` throw | Quota exceeded | Catch, cleanup vieux data, retry write |
| ERR-041 | Storage write échoue (corruption) | ❌ Error | Storage corrompu | Disk error | Fallback in-memory, avertissement utilisateur |
| ERR-042 | Storage read échoue | ❌ Error | `chrome.storage.local.get()` throw | Corruption | Valeur par défaut utilisée, pas de crash |
| ERR-043 | Storage partiellement écrit | ⚡ Edge | Quota atteint pendant batch write | Écriture partielle | Rollback ou retry de l'écriture complète |

### 12.6 Extension Context Invalidated

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| ERR-050 | Extension context invalidated (update) | 🔌 Extension | Extension mise à jour pendant que popup ouverte | Update | `chrome.runtime.lastError` géré, popup fermé |
| ERR-051 | Extension context invalidated (reload) | 🔌 Extension | `chrome.runtime.reload()` appelé | Développement | Popup/background déconnectés, rechargement |
| ERR-052 | Ré-initialisation après invalidation | ✅ Success | Context invalidated → nouvel init | Chrome recovery | Ré-enregistrement listeners, restoration state |
| ERR-053 | Tentative d'appel API après invalidation | ❌ Error | Appel `chrome.storage` après invalidation | Context mort | Erreur gérée, pas de crash global |

---

## 13. Performance & Resource Management

### 13.1 Service Worker Wake-up Time

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| PERF-001 | Wake-up time < 50ms | 🏎️ Perf | Temps de réveil du service worker | SW dormant | Initialisation rapide, pas de latence perceptible |
| PERF-002 | Wake-up time avec restoration state | 🏎️ Perf | Temps lecture storage au réveil | SW dormant | < 100ms pour restaurer auth state |
| PERF-003 | Réveil multiple (10x en 1s) | 🏎️ Perf | Messages rapides | 10 messages consécutifs | Pas de overhead de re-init à chaque message |

### 13.2 Memory Usage

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| PERF-010 | Memory footprint < 10MB | 🏎️ Perf | Usage mémoire du service worker | Extension active | SW utilise < 10MB heap |
| PERF-011 | Memory avec 100 reports en cache | 🏎️ Perf | 100 reports chargés en mémoire | Sync fait | Mémoire stable, pas de fuite |
| PERF-012 | Pas de memory leak sur messages répétés | 🏎️ Perf | 1000 messages échangés | Communication intense | Heap stable, pas de growth |
| PERF-013 | Garbage collection des vieux messages | 🏎️ Perf | Messages traités → libérés | Queue messages | Pas d'accumulation de références |

### 13.3 Storage Read/Write Performance

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| PERF-020 | Storage read < 10ms | 🏎️ Perf | Lecture clé unique | Storage normal | Temps de lecture rapide |
| PERF-021 | Storage batch read < 20ms | 🏎️ Perf | Lecture 10 clés en une opération | Storage normal | Performance batch |
| PERF-022 | Storage write 50 reports < 100ms | 🏎️ Perf | Sync écrit 50 rapports | Sync complet | Écriture rapide |
| PERF-023 | Storage large value (1MB) | 🏎️ Perf | Écriture d'un gros volume | Données volumineuses | Sous le quota, temps acceptable |

### 13.4 Message Passing Latency

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| PERF-030 | Message popup→background < 5ms | 🏎️ Perf | Latence message simple | SW actif | Round-trip rapide |
| PERF-031 | Message background→popup (update) | 🏎️ Perf | Notification état aux popups | Sync terminé | < 10ms propagation |
| PERF-032 | Message avec payload large (1MB) | 🏎️ Perf | Données tableau volumineuses | Extraction données | Message pass-through, pas de timeout |
| PERF-033 | Message avec content script | 🏎️ Perf | Content script → background | Page web | Latence acceptable |
| PERF-034 | StructureMessage port-based | 🏎️ Perf | Connection port (long-lived) vs one-shot | Message multiple | Port plus performant pour messages multiples |

### 13.5 Idle/Unload Behavior

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| PERF-040 | SW unload après 30s inactif | 🔌 Extension | Pas d'activité | Inactif | Chrome met fin au SW (terminated) |
| PERF-041 | Cleanup avant unload | ✅ Success | Listeners retirés, timers cleared | SW va s'endormir | `beforeunload` ou cleanup approprié |
| PERF-042 | Pas d'opérations async non résolues | ✅ Success | Promesses résolues avant unload | SW idle | Pas de perte de données, pas de promises en suspens |
| PERF-043 | Idle detection chrome.idle | 🔌 Extension | `chrome.idle.setDetectionInterval(60)` | Configuration | Détection idle après 60s d'inactivité |
| PERF-044 | Comportement sur verrouillage écran | 🔌 Extension | Écran verrouillé | Système idle | SW reste actif (les alarmes passent) |

---

## 14. Scénarios d'Intégration E2E

Scénarios de bout en bout connectant plusieurs services background.

### 14.1 Complete Auth Flow

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| E2E-001 | Installation → Guest → Login → Full usage | ✅ Success | Extension installée, aucun compte | Première utilisation | Guest mode → popup OAuth → login → sync → notifications actives |
| E2E-002 | Login → Sync → Notification | ✅ Success | Utilisateur se connecte, rapports en cours | Reports en PROCESSING | Sync détecte, notification au DONE |
| E2E-003 | Full cycle : context menu → upload → notification | ✅ Success | Clic droit tableau → upload → génération → notification | Tableau sur page web | Extraction → ouvre popup → upload → polling → notification DONE |
| E2E-004 | Logout → Guest → Login (different account) | ✅ Success | Déconnexion, reconnexion autre compte | Multi-comptes | Ancien token effacé, nouveau token, nouveau sync |
| E2E-005 | Session expire pendant utilisation | ❌ Error | Utilisateur actif, token expire | Token expiré | Silent refresh, utilisateur ne remarque rien |

### 14.2 Background Sync Flows

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| E2E-010 | Sync → detection DONE → notification → click → open tab | ✅ Success | Report PENDING → DONE pendant sync | Sync actif | Notification → click → tab ouvert avec rapport |
| E2E-011 | Sync offline → cache → back online → re-sync | 🌐 Offline | Sync échoue → cache → online → sync forcé | Offline puis online | Cache utilisé pendant offline, rattrapage online |
| E2E-012 | Sync + UI popup mis à jour | ✅ Success | Sync pendant que popup ouverte | Sync background | Popup reçoit event update, UI mise à jour sans refresh |

### 14.3 Context Menu + Upload + Notification

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| E2E-020 | Clic droit tableau → popup → upload | ✅ Success | Tableau HTML détecté sur page web | Tableau valide | Données extraites, envoyées au popup, upload lancé |
| E2E-021 | Clic droit texte sélectionné → upload | ✅ Success | Texte sélectionné → DataPresent | Texte valide | Données text extraites, popup upload |
| E2E-022 | Clic droit sur page sans données | ❌ Error | Clic droit sur image | Pas de données | Notification "Aucune donnée trouvée" |
| E2E-023 | Upload fichier depuis l'OS via drag | ✅ Success | Drag & drop fichier depuis l'OS vers popup | Fichier XLSX valide | Fichier uploadé via POST /api/upload |

### 14.4 Multiple Profiles / Tabs

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| E2E-030 | 3 tabs Chrome connectés simultanément | ✅ Success | Plusieurs sessions extension actives | 3 tabs | Auth state cohérent, sync pas dupliqué |
| E2E-031 | Popup + Web app ouverts → état synchrone | ✅ Success | Extension popup + app web tab | Les deux ouverts | Mêmes données, état auth synchronisé |
| E2E-032 | 2 extensions (multi-comptes impossible) | 🔌 Extension | Chrome multi-profile | Profiles différents | Chaque profil a son propre storage, pas de conflit |
| E2E-033 | Incognito mode → session isolée | 🔌 Extension | Navigation privée | Incognito | Pas de token partagé, guest mode en incognito |

### 14.5 Error Recovery Chains

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| E2E-040 | Network down → API call fail → retry → timeout → offline UI | 🌐 Offline | Perte réseau complète | Offline | Dégradation gracieuse : cache, offline message |
| E2E-041 | API 401 → refresh → 401 again → logout → guest UI | ❌ Error | Session expirée irrémédiablement | Token invalide | Logout auto, guest UI affiché |
| E2E-042 | Storage full → write error → cleanup → retry → success | ❌ Error | Quota storage atteint | Beaucoup de données | Cleanup auto, retry réussi, pas de perte |
| E2E-043 | Extension update pendant que notifications en attente | 🔌 Extension | Mise à jour pendant usage | Update | Migration state, pas de perte notifications |
| E2E-044 | Crash SW → recovery → state restored | 🔌 Extension | Chrome tue le SW brutalement | Crash | Au réveil, restoration complète |

### 14.6 Rate Limiting & Abuse Prevention

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| E2E-050 | Sync toutes les 60s normal | ✅ Success | Sync interval normal | Auth OK | 1 requête API / minute |
| E2E-051 | Upload > 10MB rejeté par extension | ✅ Success | Fichier de 15MB | Fichier trop gros | Erreur avant upload, pas d'appel API |
| E2E-052 | 10 uploads en 1 minute → rate limit | ❌ Error | Upload trop fréquents | Utilisateur actif | Extension gère 429 sans crash |
| E2E-053 | Refresh token 5x en 1 minute | 🔄 Retry | Token expire rapidement | Mauvaise config serveur | Rate limit sur refresh géré |

### 14.7 Notification Action Chains

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| E2E-060 | Notification DONE → click → open tab → report visible | ✅ Success | Notification cliquée | Report DONE | Tab ouvert, `/reports/[id]` chargé, slides visibles |
| E2E-061 | Notification ERROR → click → open tab → error visible | ✅ Success | Notification erreur cliquée | Report ERROR | Tab ouvert, message d'erreur visible |
| E2E-062 | Notification + app web déjà ouverte → focus tab | ✅ Success | App web déjà ouverte sur le rapport | Tab existant | Focus sur le tab existant (pas de nouveau tab) |
| E2E-063 | Notification group multiple → click → liste ouverte | ✅ Success | Notification groupée "3 rapports prêts" | 3 DONE | Tab ouvert vers liste reports avec filtre |

---

## 15. Récapitulatif & Priorisation

### Total des scénarios manquants : **295 scénarios**

| Catégorie | Nb scénarios | Priorité | Justification |
|:----------|:------------:|:--------:|:--------------|
| **API Client** | 45 | **P0** | Fondation de toute communication avec le backend |
| **Authentication Service** | 35 | **P0** | Cœur de la sécurité et de l'accès |
| **Reports Sync** | 25 | **P0** | Fonctionnalité principale de l'extension |
| **Notifications Service** | 25 | **P1** | Engagement utilisateur, retention |
| **Message Passing** | 30 | **P0** | Communication entre tous les composants |
| **Context Menu** | 15 | **P1** | Découverte et facilité d'utilisation |
| **Storage Service** | 20 | **P1** | Persistance et fiabilité des données |
| **Service Worker** | 20 | **P0** | Cycle de vie MV3, fondamental |
| **Error Handling** | 30 | **P0** | Robustesse et résilience |
| **Performance** | 20 | **P2** | Qualité mais pas bloquant |
| **E2E Intégration** | 30 | **P0** | Validation de bout en bout |

### Priorisation par phase

| Phase | Nb tests | Catégories | Dépendances |
|:------|:--------:|:------------|:------------|
| **Phase 1 — Fondations** (~120 tests) | API Client, Auth, Message Passing, Service Worker | Aucune — infrastructure de test nécessaire |
| **Phase 2 — Fonctionnalités** (~90 tests) | Reports Sync, Notifications, Context Menu, Storage | Phase 1 |
| **Phase 3 — Robustesse** (~55 tests) | Error Handling, Cross-cutting, E2E Intégration | Phase 1 + 2 |
| **Phase 4 — Performance** (~30 tests) | Performance, Edge cases avancés | Phase 1 + 2 + 3 |

---

## 16. Recommandations d'Infrastructure de Test

### 16.1 Playwright pour Extension Chrome

Pour tester l'extension avec Playwright, utiliser `chromium.launchPersistentContext()` :

```typescript
import { test as base, chromium, type BrowserContext } from "@playwright/test";

const EXTENSION_PATH = path.resolve(__dirname, "../../datapresent-extension");

// Fixture pour le contexte d'extension
export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const userDataDir = path.resolve(__dirname, ".chrome-profile");
    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // MV3 requiert non-headless
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent("serviceworker");
    }
    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});
```

### 16.2 Mock API Server

Créer un mock server Playwright pour intercepter toutes les requêtes API :

```typescript
// Dans le setup de test
await context.route("**/api/**", async (route) => {
  const url = route.request().url();
  
  if (url.includes("/api/v1/me") && route.request().method() === "GET") {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-user-1",
        email: "test@datapresent.com",
        name: "Test User",
      }),
    });
  }
  
  if (url.includes("/api/v1/reports") && route.request().method() === "GET") {
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        reports: [
          { id: "report-1", title: "Test Report", status: "DONE", ... },
        ],
        cursor: null,
      }),
    });
  }
  
  // Fallback pour les routes non mockées
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ ok: true }),
  });
});
```

### 16.3 Scénarios de test automatisés vs manuels

| Type | Nombre | Automatisable | Outil recommandé |
|:-----|:------:|:-------------|:-----------------|
| Unitaires (API Client, Auth) | ~100 | ✅ Oui | Vitest + chrome-storage mock |
| Intégration (Sync, Notifications) | ~90 | ✅ Oui | Playwright + mocked API |
| E2E (Context menu → Upload → Notif) | ~80 | ⚠️ Partiel | Playwright + headless Chrome |
| Performance (Memory, Latency) | ~15 | ⚠️ Partiel | Playwright + Chrome DevTools Protocol |
| Extension lifecycle (Update, Crash) | ~10 | ❌ Manuel | Tests d'acceptance manuels |

### 16.4 Fichiers de test recommandés

| Fichier | Contenu | Tests |
|:--------|:--------|:-----:|
| `tests/e2e/extension/api-client.spec.ts` | API Client | 45 |
| `tests/e2e/extension/auth.spec.ts` | Authentification | 35 |
| `tests/e2e/extension/reports-sync.spec.ts` | Reports Sync | 25 |
| `tests/e2e/extension/notifications.spec.ts` | Notifications | 25 |
| `tests/e2e/extension/messaging.spec.ts` | Message Passing | 30 |
| `tests/e2e/extension/context-menu.spec.ts` | Context Menu | 15 |
| `tests/e2e/extension/storage.spec.ts` | Storage Service | 20 |
| `tests/e2e/extension/service-worker.spec.ts` | Service Worker | 20 |
| `tests/e2e/extension/error-handling.spec.ts` | Error Handling | 30 |
| `tests/e2e/extension/performance.spec.ts` | Performance | 20 |
| `tests/e2e/extension/e2e-flows.spec.ts` | Intégration E2E | 30 |
| `tests/e2e/extension/helpers.ts` | Fixtures, mocks, utils | — |
| **Total** | | **295** |

### 16.5 Commandes recommandées

```json
// Dans datapresent-extension/package.json
{
  "scripts": {
    "test:e2e": "playwright test --config=playwright.config.ts",
    "test:e2e:extension": "playwright test tests/e2e/extension/",
    "test:e2e:extension:headed": "playwright test tests/e2e/extension/ --headed",
    "test:e2e:extension:api": "playwright test tests/e2e/extension/api-client.spec.ts",
    "test:e2e:extension:auth": "playwright test tests/e2e/extension/auth.spec.ts",
    "test:e2e:extension:debug": "playwright test --debug",
    "test:e2e:extension:report": "playwright test --reporter=html"
  }
}
```

### 16.6 Fichier playwright.config.ts pour l'extension

```typescript
import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./tests/e2e/extension",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    headless: false, // MV3 extension requires non-headless for full testing
    contextOptions: {
      permissions: ["notifications"],
    },
  },
  projects: [
    {
      name: "chromium-extension",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          args: [
            `--disable-extensions-except=${path.resolve(__dirname, "../../datapresent-extension")}`,
            `--load-extension=${path.resolve(__dirname, "../../datapresent-extension")}`,
          ],
        },
      },
    },
  ],
});
```

---

> **Document généré le 2026-06-21** par analyse statique du code source (env files, API routes web app, packages partagés) et inférence des fonctionnalités de l'extension navigateur DataPresent.
>
> **Prochaine étape :** Implémenter l'infrastructure de test (fixtures, mocks, helpers) puis les tests classés Phase 1.
