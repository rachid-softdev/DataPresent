# Analyse des scénarios de test E2E Playwright manquants — Extension POPUP UI

> **Projet :** DataPresent  
> **Feature :** Extension navigateur — Interface POPUP  
> **Statut du code source :** SQUELETTE (package.json + .env* — aucun composant implémenté)  
> **Périmètre d'analyse :** Inférence basée sur le produit DataPresent (SaaS conversion données → présentations), les patterns d'extensions companion, et les feature flags présents dans les fichiers `.env*`  
> **Cibles de test :** `chrome-extension://<id>/popup.html` (POPUP UI), communication `chrome.runtime`, stockage `chrome.storage`, content scripts

---

## Table des matières

1. [Contexte & Infrastucture de test](#1-contexte--infrastructure-de-test)
2. [Popup Entry & Loading — PL](#2-popup-entry--loading)
3. [Auth State UI — AU](#3-auth-state-ui)
4. [Dashboard / Recent Reports — DB](#4-dashboard--recent-reports)
5. [Quick Capture — QC](#5-quick-capture)
6. [Notifications — NT](#6-notifications)
7. [Settings — ST](#7-settings)
8. [Bottom Navigation — BN](#8-bottom-navigation)
9. [Error States — ER](#9-error-states)
10. [Responsive & Accessibility — RA](#10-responsive--accessibility)
11. [Race Conditions & Concurrence — RC](#11-race-conditions--concurrence)
12. [Context Menu Integration — CM](#12-context-menu-integration)
13. [Content Script / Page Interaction — CS](#13-content-script--page-interaction)
14. [Récapitulatif & Priorisation](#14-récapitulatif--priorisation)

---

## 1. Contexte & Infrastructure de test

### 1.1 Fonctionnalités inférées de l'extension

Basé sur l'analyse du produit DataPresent, des fichiers `.env*`, et des patterns d'extensions companion SaaS :

| Feature | Inférence | Source |
|---------|-----------|--------|
| OAuth Google | Login depuis la popup via fenêtre OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` dans `.env*` |
| API REST | Communication avec le backend DataPresent | `API_BASE_URL`, `API_SECRET` dans `.env*` |
| Dashboard mini | Liste des rapports récents avec statuts | Feature logique pour une extension companion |
| Quick Capture | Détection de tableaux/CSV sur la page courante | Valeur clé du produit (données → présentations) |
| Notifications | Badge sur l'icône, notification de rapports prêts | `NEXT_PUBLIC_ENABLE_NOTIFICATIONS=true` |
| Analytics | Tracking d'usage via Mixpanel | `NEXT_PUBLIC_MIXPANEL_TOKEN` |
| Context Menu | Menu contextuel sur pages avec données | `NEXT_PUBLIC_ENABLE_CONTEXT_MENU=true` |
| Chrome Storage | Cache local chiffré des tokens et préférences | `CHROME_STORAGE_KEY` |
| Thème dark/light | Bascule avec persistance | Feature standard extensions modernes |
| i18n FR/EN | Support bilingue | `next-intl` dans le web, logique pour l'extension |
| Debug mode | Mode développeur avec logs | `NEXT_PUBLIC_LOG_LEVEL=debug`, `NEXT_PUBLIC_DEBUG_MODE=true` |

### 1.2 Architecture supposée de la POPUP

```
popup/
├── index.html                # Entry point (chrome-extension://<id>/popup.html)
├── App.tsx                   # Root component + routing tabs
├── components/
│   ├── Header.tsx            # Logo DataPresent, titre, icône settings
│   ├── AuthGate.tsx          # État connecté/déconnecté, user info, login/logout
│   ├── Dashboard.tsx         # Mini-liste des rapports récents
│   ├── QuickCapture.tsx      # Détection et capture de données de la page
│   ├── ReportCard.tsx        # Carte individuelle de rapport
│   ├── NotificationBadge.tsx # Badge de notifications non lues
│   ├── Settings.tsx          # Configuration utilisateur
│   ├── BottomNav.tsx         # Navigation par onglets (Dashboard, Capture, Settings)
│   ├── EmptyState.tsx        # État vide (pas de rapports, pas de données)
│   ├── LoadingSkeleton.tsx   # Squelette de chargement
│   └── ErrorBanner.tsx       # Bannière d'erreur (réseau, API, auth)
├── hooks/
│   ├── useAuth.ts            # Gestion session (chrome.storage + API)
│   ├── useReports.ts         # Récupération rapports (API)
│   ├── usePageData.ts        # Détection données sur page courante
│   └── useNotifications.ts   # Badge + notifications
├── services/
│   ├── api.ts                # Client API (fetch avec token)
│   ├── storage.ts            # Wrapper chrome.storage
│   └── messaging.ts          # Communication background <-> popup
└── store/
    └── app-store.ts          # État global (Zustand ou React Context)
```

### 1.3 Configuration Playwright requise pour tester les extensions

```typescript
// playwright.config.ts — Extension testing setup
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false, // Les extensions nécessitent un contexte unique
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Une seule extension chargée à la fois
  reporter: "html",
  use: {
    headless: false, // Les extensions Chromium nécessitent headed mode
    channel: "chromium",
    launchOptions: {
      args: [
        `--disable-extensions-except=${__dirname}/dist`,
        `--load-extension=${__dirname}/dist`,
      ],
    },
  },
  projects: [
    {
      name: "chromium-extension",
      use: {
        ...devices["Desktop Chrome"],
        // Service worker context pour tests d'extension
        contextOptions: {
          permissions: ["clipboard-read", "clipboard-write", "storage"],
        },
      },
    },
  ],
});
```

> **Note importante :** Les tests d'extension Chrome avec Playwright nécessitent :
> - `headless: false` (ou `headless: 'shell'` en Chrome 127+) car les extensions ne chargent pas en headless pur
> - Le chemin absolu vers le dossier `dist/` buildé de l'extension
> - Un `serviceWorker` dans le contexte de test pour intercepter les messages `chrome.runtime`

### 1.4 Helpers de test nécessaires

```typescript
// helpers/extension.ts
import { test as base, chromium, BrowserContext, Page } from "@playwright/test";

// Fixture pour obtenir l'URL de la popup
export const test = base.extend<{
  extensionId: string;
  popupPage: Page;
  backgroundServiceWorker: ServiceWorker;
}>({
  extensionId: async ({ context }, use) => {
    const [background] = context.serviceWorkers;
    const extensionId = background.url.split("/")[2];
    await use(extensionId);
  },

  popupPage: async ({ context, extensionId }, use) => {
    const page = await context.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    await use(page);
  },
});
```

---

## 2. Popup Entry & Loading

### 2.1 Success paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| PL-01 | Popup s'ouvre au clic sur l'icône | Success | Cliquer sur l'icône DataPresent dans la barre d'extension → popup affichée | Extension installée et activée, icône visible dans la toolbar | La popup s'ouvre avec les dimensions attendues (400×600px par défaut). Le DOM contient `#root` avec l'application React montée |
| PL-02 | Popup se charge avec skeleton | Success | Pendant le chargement (récupération session + rapports), un skeleton animé est affiché | Extension installée, 1ère ouverture ou cache vidé | `LoadingSkeleton` visible avec 3 blocs animés (Soft Fern bg, pulse) |
| PL-03 | Popup passe du skeleton au contenu | Success | Après chargement réussi, le skeleton est remplacé par le contenu réel | API répond en < 1s | Skeleton disparaît (classe `animate-out`), contenu de l'onglet actif visible |
| PL-04 | Dimensions de la popup : 400×600 par défaut | Success | La popup s'ouvre avec `width: 400px, height: 600px` | Ouverture standard | `document.body.clientWidth === 400`, `document.body.clientHeight === 600` |
| PL-05 | Popup non redimensionnable | Success | La popup n'a pas de handle de redimensionnement | Popup ouverte | `resizable: false` sur la fenêtre, pas de pointeur resize |
| PL-06 | Titre de la popup = "DataPresent" | Success | Le `document.title` de la popup est "DataPresent" | Popup chargée | `document.title === "DataPresent"` |
| PL-07 | Logo DataPresent visible dans le header | Success | Le logo (SVG ou texte stylisé) est affiché en haut à gauche | Popup chargée | Élément avec `alt="DataPresent"` ou texte "DataPresent" en Fraunces dans le `Header` |

### 2.2 Loading states

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| PL-08 | Skeleton de chargement auth | Loading | Le skeleton initial affiche un bloc pour l'avatar utilisateur et un pour le nom | Session pas encore chargée | 2 squelettes : cercle (avatar) + rectangle (nom) avec animation pulse |
| PL-09 | Skeleton de chargement dashboard | Loading | Le skeleton du dashboard affiche 3 blocs type report card | Rapports pas encore chargés | 3 cartes squelettes avec titre, badge, date — tous animés |
| PL-10 | Delai minimum du skeleton (flash prevention) | Loading | Même si l'API répond en < 100ms, le skeleton s'affiche au moins 200ms pour éviter le flash | API très rapide | `isMinimumLoadingTime` respecté, pas de flash blanc entre skeleton et contenu |
| PL-11 | Skeleton disparaît avec transition fade | Loading | La transition skeleton → contenu utilise `opacity` avec `transition: opacity 200ms` | Données chargées | Skeleton `opacity: 0` → `display: none`, contenu `opacity: 0` → `opacity: 1` |

### 2.3 Performance

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| PL-12 | Rendu de la popup < 500ms | Performance | De l'ouverture de la popup à l'affichage du skeleton : < 500ms | Cache chrome.storage chaud (session persistée) | Temps mesuré entre `navigationStart` et `DOMContentLoaded` < 500ms |
| PL-13 | Chargement total < 2s (skeleton → contenu) | Performance | Du skeleton au contenu final avec rapports : < 2s | API rapide, réseau ok | Temps mesuré entre l'ouverture et le contenu stable < 2000ms |
| PL-14 | Aucun layout shift (CLS = 0) | Performance | Pendant le chargement, aucun décalage de mise en page visible | Ouverture standard | `cumulativeLayoutShift` = 0 entre skeleton et contenu final |

### 2.4 Edge cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| PL-15 | Popup ouverte deux fois rapidement | Edge | L'utilisateur clique deux fois sur l'icône très vite | Extension active | Une seule popup s'ouvre (Chrome gère nativement) : pas de popup dupliquée |
| PL-16 | Popup dans un onglet incognito | Edge | L'extension est activée en navigation privée | Mode incognito activé dans les permissions extension | La popup s'ouvre normalement (skeleton puis contenu). Si session absente, afficher AuthGate comme non-auth |
| PL-17 | Extension fraîchement installée (première ouverture) | Edge | 1ère ouverture après installation, aucun cache | Extension fraîchement installée | Écran de bienvenue / onboarding visible avec bouton "Commencer" ou "Se connecter" |
| PL-18 | Popup ouverte sur une page chrome:// | Edge | La popup est ouverte alors que l'onglet actif est `chrome://settings` | Onglet actif = chrome://... | La popup se charge normalement. QuickCapture affiche "Aucune page web détectée" |
| PL-19 | Popup ouverte sur une page d'extension | Edge | La popup est ouverte alors que l'onglet actif est une autre extension | Onglet actif = chrome-extension://... | Comportement normal, QuickCapture indique page non compatible |

---

## 3. Auth State UI

### 3.1 Unauthenticated state

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| AU-01 | État non connecté : écran de login affiché | Unauthenticated | La popup affiche l'écran de connexion invitant à se connecter | Utilisateur non authentifié, aucun token valide dans chrome.storage | `AuthGate` affiché avec logo DataPresent, titre "Connectez-vous à DataPresent", description, bouton "Se connecter avec Google", lien vers la page web DataPresent |
| AU-02 | Bouton "Se connecter avec Google" visible | Unauthenticated | Le bouton principal de connexion Google est affiché | Non auth | Bouton avec `aria-label="Se connecter avec Google"`, icône Google, texte "Se connecter avec Google" |
| AU-03 | Lien "Créer un compte" présent | Unauthenticated | Un lien secondaire permet de créer un compte | Non auth | Lien avec texte "Créer un compte" → ouvre `https://datapresent.com/signup` dans un nouvel onglet |
| AU-04 | Dashboard et QuickCapture masqués sans auth | Unauthenticated | Les onglets Dashboard et QuickCapture ne sont pas accessibles | Non auth | `BottomNav` peut être visible mais les onglets protégés redirigent vers AuthGate. Ou AuthGate est le seul écran affiché |
| AU-05 | Page web DataPresent ouverte depuis la popup | Unauthenticated | Cliquer sur "Créer un compte" ouvre un nouvel onglet vers le web | Non auth | `chrome.tabs.create({ url: "https://datapresent.com/signup" })` ou `window.open()` |
| AU-06 | Icône de l'extension sans badge en non-auth | Unauthenticated | L'icône extension n'affiche pas de badge | Non auth | `chrome.action.setBadgeText({ text: "" })` |

### 3.2 Authenticated state

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| AU-07 | État connecté : avatar + email affichés | Authenticated | Le header de la popup montre l'avatar, le nom et l'email de l'utilisateur | Utilisateur authentifié, API `/me` répond | Avatar (img circulaire 32×32), nom complet, email en sous-texte. Menu dropdown accessible |
| AU-08 | Session persistée après fermeture/ouverture | Authenticated | Fermer et rouvrir la popup conserve la session | Auth avec token stocké dans chrome.storage | Token restauré depuis `chrome.storage.session`, popup affiche Dashboard directement (sans AuthGate) |
| AU-09 | Bouton "Ouvrir DataPresent" dans header | Authenticated | Un lien "Open in web" ouvre l'app web DataPresent | Auth | Clic → `chrome.tabs.create({ url: APP_URL })` |
| AU-10 | Dropdown utilisateur accessible | Authenticated | Clic sur avatar → menu déroulant avec Profil, Paramètres, Déconnexion | Auth | Menu dropdown avec 3 items : "Mon profil", "Paramètres", "Déconnexion" |

### 3.3 Login flow

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| AU-11 | Clic "Se connecter avec Google" → popup OAuth | Login | Cliquer sur le bouton Google ouvre une popup OAuth | Non auth, fenêtre popup autorisée | `chrome.identity.launchWebAuthFlow()` appelé, popup OAuth Google affichée |
| AU-12 | Connexion réussie → popup se met à jour | Login | Après OAuth réussi, le token est reçu et la popup passe en mode connecté | OAuth réussi, token reçu | Token stocké dans `chrome.storage.session`, AuthGate disparaît, Dashboard affiché. Notification toast "Connecté" |
| AU-13 | Connexion échouée → message d'erreur | Login | OAuth échoué (utilisateur ferme la popup, erreur API) | OAuth annulé ou erreur | AuthGate reste affiché, message d'erreur "La connexion a échoué. Veuillez réessayer." avec bouton "Réessayer" |
| AU-14 | Token stocké dans chrome.storage.session | Login | Après login, le token est stocké dans le storage session | Login réussi | `chrome.storage.session.get("authToken")` retourne le token. `chrome.storage.local.get("refreshToken")` contient le refresh token |
| AU-15 | Tentative de connexion sans réseau | Login | L'utilisateur clique "Se connecter" sans connexion internet | Réseau indisponible | Message d'erreur "Aucune connexion internet. Vérifiez votre réseau et réessayez." |

### 3.4 Logout flow

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| AU-16 | Déconnexion depuis le dropdown | Logout | Cliquer "Déconnexion" → confirmation → logout | Utilisateur connecté | `ConfirmDialog` : "Êtes-vous sûr de vouloir vous déconnecter ?" |
| AU-17 | Déconnexion confirmée → retour écran login | Logout | Confirmer la déconnexion → token effacé → AuthGate affiché | Confirmation | `chrome.storage.session.remove("authToken")`, `chrome.storage.local.remove("refreshToken")`, AuthGate visible, toast "Déconnecté" |
| AU-18 | Déconnexion annulée → reste connecté | Logout | Cliquer "Annuler" dans le ConfirmDialog → aucune action | ConfirmDialog ouvert | ConfirmDialog fermé, utilisateur toujours connecté, Dashboard visible |
| AU-19 | Déconnexion avec API call | Logout | Appel API `POST /auth/logout` pour invalider le token côté serveur | Confirmation | API appelée, puis cleanup local. Si API 500, cleanup local quand même + toast "Déconnecté" |
| AU-20 | Badge icône effacé après logout | Logout | Après déconnexion, le badge de l'icône est effacé | Auth avec badge actif | `chrome.action.setBadgeText({ text: "" })` |

### 3.5 Session expiry

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| AU-21 | Token expiré → refresh token utilisé | Session | API retourne 401, le refresh token est utilisé pour obtenir un nouveau token | Token expiré, refresh token valide | Appel transparent à `/auth/refresh`, nouveau token stocké, requête API retentée. Aucune interruption pour l'utilisateur |
| AU-22 | Refresh token expiré → redirection login | Session | Le refresh token est également expiré | Refresh token expiré (session > 30 jours) | Retour à AuthGate avec message "Votre session a expiré. Veuillez vous reconnecter." |
| AU-23 | Session expire pendant navigation dans la popup | Session | L'utilisateur est sur l'onglet Settings et sa session expire | Token expire en cours d'utilisation | Dashboard/Settings → AuthGate avec transition. Bannière "Session expirée" |
| AU-24 | API retourne 401 sur chaque endpoint | Session | Tous les appels API retournent 401 | Token invalide | `api.ts` intercepte les 401, tente refresh, si échec → AuthGate. Pas d'erreur non gérée dans l'UI |

---

## 4. Dashboard / Recent Reports

### 4.1 Success paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DB-01 | Dashboard affiche les 5 derniers rapports | Success | L'onglet Dashboard montre les 5 rapports les plus récents | Utilisateur connecté, 5+ rapports existants | 5 `ReportCard` visibles, triées par date décroissante (plus récent en premier) |
| DB-02 | Titre du rapport tronqué à 2 lignes | Success | Un titre long est tronqué avec CSS `line-clamp-2` | Rapport avec titre long (> 50 caractères) | Titre affiché sur max 2 lignes avec ellipsis CSS, `overflow: hidden` |
| DB-03 | Badge de statut sur chaque ReportCard | Success | Chaque carte affiche un badge coloré selon le statut | Rapports avec statuts mixtes | Badge `Terminé` (vert), `En cours` (orange), `Erreur` (rouge), `En attente` (gris) |
| DB-04 | Secteur affiché sur la carte | Success | Le secteur (Finance, Marketing, etc.) est affiché sur chaque carte | Rapport avec secteur défini | Label ou badge avec le nom du secteur |
| DB-05 | Date relative affichée | Success | "il y a 5 min", "hier", "il y a 3 jours" | Rapport avec date | Texte relatif (via date-fns) visible, mis à jour dynamiquement |
| DB-06 | Clic sur ReportCard → ouvre le web app | Success | Cliquer sur un rapport → l'URL du rapport détail s'ouvre dans un nouvel onglet | Rapport existant | `chrome.tabs.create({ url: APP_URL + "/reports/" + id })` ou `window.open()` |
| DB-07 | Bouton "Nouveau rapport" en haut | Success | Un FAB ou bouton "Nouveau rapport" est présent | Dashboard visible | Bouton avec `aria-label="Nouveau rapport"`, icône Plus, → ouvre `/reports/new` dans le web |
| DB-08 | Indicateur "Rapports récents" titre | Success | Le titre de la section "Rapports récents" est affiché | Dashboard | Titre Fraunces "Rapports récents" ou "Mes rapports" |
| DB-09 | Header dashboard avec icône et titre | Success | L'onglet actif "Dashboard" est mis en évidence dans BottomNav | Dashboard actif | Icône `LayoutDashboard` et texte "Dashboard" actifs |

### 4.2 Status badges

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DB-10 | Badge "Terminé" vert pour DONE | Badge | Rapport avec status DONE → badge vert avec coche | Rapport DONE | Badge `success` (bg Soft Sage / text Deep Forest), texte "Terminé" |
| DB-11 | Badge "En cours" orange pour PROCESSING | Badge | Rapport avec status PROCESSING → badge orange avec spinner | Rapport PROCESSING | Badge `warning` (bg jaune 8%), texte "En cours", icône `Loader2` animée |
| DB-12 | Badge "En attente" gris pour PENDING | Badge | Rapport avec status PENDING → badge gris | Rapport PENDING | Badge `outline` (gris), texte "En attente" |
| DB-13 | Badge "Erreur" rouge pour ERROR | Badge | Rapport avec status ERROR → badge rouge | Rapport ERROR | Badge `error` (bg rouge 8%), texte "Erreur", icône `AlertCircle` |
| DB-14 | Transition PROCESSING → DONE : mise à jour live du badge | Badge | Le badge passe de "En cours" à "Terminé" sans rechargement | Rapport en cours qui passe DONE | Polling détecte le changement, badge mis à jour en temps réel |

### 4.3 Empty state

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DB-15 | État vide : aucun rapport | Empty | L'utilisateur connecté n'a aucun rapport | 0 rapports | `EmptyState` centré : icône `FileSpreadsheet` dans boîte, titre "Aucun rapport", description "Importez vos données pour créer votre premier rapport", CTA "Importer des données" |
| DB-16 | CTA "Importer des données" → QuickCapture | Empty | Cliquer sur le CTA dans l'empty state → bascule vers l'onglet QuickCapture | Onglet Dashboard vide | `BottomNav` sélectionne l'onglet QuickCapture |
| DB-17 | CTA "Créer sur DataPresent" secondaire | Empty | Un lien "Créer un rapport sur DataPresent" ouvre l'app web | 0 rapports | `chrome.tabs.create({ url: APP_URL + "/new" })` |

### 4.4 Polling & refresh

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DB-18 | Polling automatique des statuts | Polling | Toutes les 10s, les statuts des rapports sont rafraîchis | Rapports PROCESSING ou PENDING | `setInterval` actif, `GET /api/reports?status=PROCESSING,PENDING` appelé toutes les 10s |
| DB-19 | Arrêt du polling quand tous DONE/ERROR | Polling | Si plus aucun rapport en cours, le polling s'arrête | Tous les rapports sont DONE ou ERROR | `clearInterval` appelé, plus d'appels API polling |
| DB-20 | Pas de polling si 0 rapports | Polling | Aucun polling si utilisateur n'a pas de rapports | 0 rapports | Aucun intervalle créé (vérifier via `chrome.runtime` API calls) |
| DB-21 | Pull-to-refresh manuel (tirer vers le bas) | Polling | Swipe vers le bas dans le dashboard → refresh | Dashboard visible | Indicateur de refresh animé, `GET /api/reports` appelé, liste mise à jour |
| DB-22 | Pull-to-refresh avec feedback haptique | Polling | Un petit toast "Rapports mis à jour" apparaît après refresh | Refresh réussi | Toast sonner (Sonner toast) "Rapports mis à jour" pendant 2s |

### 4.5 Edge cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| DB-23 | Plus de 5 rapports : lien "Voir tout" | Edge | Quand l'utilisateur a > 5 rapports, un lien "Voir tout (12)" est affiché en bas | 12 rapports | Lien `→ Voir tout (12)` → ouvre `/reports` dans le web |
| DB-24 | Exactement 5 rapports : pas de lien "Voir tout" | Edge | À exactement 5 rapports, pas besoin de lien supplémentaire | 5 rapports | Lien "Voir tout" absent du DOM |
| DB-25 | Titre de rapport vide/null | Edge | Un rapport sans titre est affiché sans erreur | Rapport avec titre null | Affiche "Sans titre" en gris, pas d'erreur JS, pas de crash |
| DB-26 | Rapport sans secteur | Edge | Un rapport avec secteur null/undefined | Rapport sans secteur | "Non défini" ou affichage élégant sans crash |
| DB-27 | Image avatar manquante | Edge | L'utilisateur n'a pas d'image de profil | Auth sans image | Fallback avec initiales (première lettre du nom/prénom) dans un cercle de couleur |
| DB-28 | Nom d'utilisateur très long | Edge | Nom > 50 caractères | Utilisateur avec nom long | Tronqué avec ellipsis dans le header, pas de débordement |
| DB-29 | Email très long | Edge | Email > 50 caractères | Utilisateur avec email long | Tronqué, pas de débordement horizontal |

---

## 5. Quick Capture

### 5.1 Data detection

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| QC-01 | Tableau HTML détecté sur la page | Detection | La page courante contient une table `<table>` avec des données structurées | Onglet actif = page avec tableau HTML visible | QuickCapture badge "1 tableau détecté" visible dans BottomNav. Onglet QC montre preview du tableau |
| QC-02 | CSV visible dans le texte de la page | Detection | La page contient du texte au format CSV (lignes avec virgules) | Page avec données CSV affichées | Détection via regex, "Données CSV détectées" affiché |
| QC-03 | Données structurées JSON-LD détectées | Detection | La page contient des microdonnées ou JSON-LD structuré | Page avec schema.org/json-ld | "Données structurées détectées" |
| QC-04 | Google Sheets ouvert détecté | Detection | L'onglet actif est `docs.google.com/spreadsheets` | Onglet Google Sheets ouvert | Détection via URL pattern + content script pour extraire les données |
| QC-05 | Aucune donnée détectée → message clair | Detection | La page courante ne contient aucune donnée exploitable | Page sans tableaux, CSV, ou données structurées | État "Aucune donnée détectée sur cette page" avec illustration, CTA "Importer un fichier" |
| QC-06 | Détection silencieuse (pas de notification intrusive) | Detection | La détection se fait sans popup intempestive | Page avec données | Aucun `window.alert()` ni notification chrome. Juste un badge dans l'icône extension ou dans la popup |
| QC-07 | Plusieurs tableaux : choix proposé | Detection | La page contient 3 tableaux HTML | 3 tables distinctes | Liste des tableaux détectés avec preview tronquée, radio button pour sélectionner |

### 5.2 Capture flow

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| QC-08 | Preview des données capturées | Capture | Les données détectées sont affichées en preview dans la popup | Données détectées (ex: tableau HTML) | Tableau preview scrollable avec les X premières lignes, "Tableau de X lignes × Y colonnes" |
| QC-09 | Sélection des lignes à capturer | Capture | L'utilisateur peut sélectionner/déselectionner des lignes | Tableau détecté avec 15 lignes | Checkbox sur chaque ligne, "Tout sélectionner" en header |
| QC-10 | Bouton "Envoyer à DataPresent" | Capture | Un CTA "Créer une présentation" envoie les données sélectionnées | Données sélectionnées | Bouton primaire avec `aria-label="Créer une présentation avec ces données"` |
| QC-11 | Envoi des données → confirmation | Capture | Les données sont envoyées à l'API DataPresent | Clic sur "Créer une présentation" | `POST /api/reports` avec les données JSON. Loading spinner sur le bouton. Toast "Données envoyées ! Rapport en cours de création" |
| QC-12 | Données envoyées → redirection vers le web | Capture | Après envoi réussi, la popup propose d'ouvrir le rapport dans le web | Envoi réussi | Bouton "Voir le rapport" → `chrome.tabs.create({ url: APP_URL + "/reports/" + id })` |
| QC-13 | Annulation de la capture | Capture | L'utilisateur clique "Annuler" / "Retour" pendant la preview | Preview affichée | Retour à l'état "Aucune donnée détectée" ou à l'onglet précédent |

### 5.3 Processing feedback

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| QC-14 | Progrès de la génération dans la popup | Processing | Après envoi, la popup affiche la progression (PENDING → PROCESSING → DONE/ERROR) | Rapport créé, statut PROCESSING | Indicateur de progression avec statuts, "Analyse des données..." → "Génération des slides..." → "Prêt !" |
| QC-15 | Barre de progression animée | Processing | Une progress bar indique l'avancement estimé | En cours | Barre `div[role="progressbar"]` avec `aria-valuenow` croissant, animation fluide |
| QC-16 | Échec de génération → message d'erreur | Processing | La génération échoue (status ERROR) | API retourne erreur | Badge rouge "Erreur", message "La génération a échoué : [raison]", bouton "Réessayer" |
| QC-17 | Temps estimé affiché | Processing | "Temps estimé : ~30 secondes" | Rapport en PROCESSING | Texte avec estimation (basée sur la complexité des données) |
| QC-18 | Notification push quand prêt (même si popup fermée) | Processing | L'utilisateur ferme la popup pendant le processing → notification reçue | Popup fermée, rapport passe DONE | `chrome.notifications.create()` avec titre "Rapport prêt !", clic → ouvre le rapport |

### 5.4 Edge cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| QC-19 | Tableau avec en-têtes manquants | Edge | Le tableau HTML n'a pas de `<thead>` ni de `<th>` | Table sans en-têtes | Les premières lignes sont traitées comme en-têtes potentielles, l'utilisateur peut confirmer/éditer |
| QC-20 | Tableau avec cellules fusionnées (colspan/rowspan) | Edge | Le tableau utilise colspan/rowspan | Tableau complexe | Fusion détectée, données normalisées en tableau plat. Preview montre l'aplatissement |
| QC-21 | Tableau très grand (1000+ lignes) | Edge | Le tableau détecté contient 1500 lignes | Grand tableau | Preview limitée à 50 lignes avec message "Affichage de 50 lignes sur 1500. Toutes les données seront envoyées." |
| QC-22 | Tableau vide (< 2 lignes) | Edge | Le tableau a 0 ou 1 ligne de données | Tableau vide | "Tableau vide détecté" → pas de capture possible, message explicatif |
| QC-23 | Google Sheets sans données | Edge | Google Sheets ouvert mais feuille vide | Sheets vide | "Cette feuille est vide" |
| QC-24 | Données non tabulaires | Edge | La page contient du JSON-LD non tabulaire (ex: Article, Recipe) | Données structurées non tabulaires | "Données structurées détectées mais non tabulaires. Voulez-vous les importer ?" + preview texte |

---

## 6. Notifications

### 6.1 Badge icon

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| NT-01 | Badge affiché sans notification non lue | Badge | L'icône de l'extension a un badge avec le nombre de notifications non lues | 0 notifications | `chrome.action.setBadgeText({ text: "" })` — pas de badge |
| NT-02 | Badge avec nombre de notifications | Badge | L'icône affiche le nombre de notifications non lues | 3 notifications non lues | `chrome.action.setBadgeText({ text: "3" })`, badge rouge avec texte blanc |
| NT-03 | Badge limité à 99+ | Badge | Si > 99 notifications, badge affiche "99+" | 150 notifications non lues | `chrome.action.setBadgeText({ text: "99+" })` |
| NT-04 | Badge disparaît quand toutes lues | Badge | Après avoir lu toutes les notifications | Toutes les notifications marquées read | `chrome.action.setBadgeText({ text: "" })` |

### 6.2 Notification list

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| NT-05 | Onglet Notifications pas de notifications | List | Aucune notification → EmptyState | 0 notifications | `EmptyState` : icône `Bell`, titre "Aucune notification", description "Les notifications de vos rapports apparaîtront ici" |
| NT-06 | Liste des notifications avec avatars | List | Les notifications sont listées dans l'onglet dédié | 5 notifications | Liste verticale avec chaque item : icône/avatar, titre, description, timestamp relatif |
| NT-07 | Notification "Rapport prêt" avec lien | List | Notification de type REPORT_READY → lien vers le rapport | Rapport DONE | Item avec icône `CheckCircle2` verte, titre "Rapport terminé", description "[Nom du rapport] est prêt", clic → ouvre rapport |
| NT-08 | Notification "Erreur" avec détails | List | Notification de type REPORT_ERROR → lien vers le rapport | Rapport ERROR | Item avec icône `AlertCircle` rouge, titre "Échec de génération", description "[Nom] a échoué : [raison]" |
| NT-09 | Notification "Invitation" au workspace | List | Notification de type INVITE | Invitation team | Icône `Users`, titre "Invitation", description "[Nom] vous a invité(e) dans [Organisation]", clic → ouvre settings/team |
| NT-10 | Notification de mise à jour extension | List | Nouvelle version de l'extension disponible | Mise à jour dispo | Icône `Package`, titre "Mise à jour disponible", description "v2.0.0 → v2.1.0" |
| NT-11 | Notification non lue : fond légèrement grisé | List | Les notifications non lues ont un fond différent | Mix de lues/non lues | Non lue : bg `Soft Fern` (légèrement vert). Lue : bg `White` |

### 6.3 Actions sur notifications

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| NT-12 | Clic notification → marquée comme lue | Actions | Cliquer sur une notification non lue → devient lue | Notification non lue | Fond devient blanc, `readAt` timestamp stocké. Si lien, ouvre le rapport |
| NT-13 | Bouton "Tout marquer comme lu" | Actions | Cliquer "Tout marquer comme lu" en haut de la liste | Au moins 1 notification non lue | Toutes les notifications passent en lu, badge effacé, fonds blancs |
| NT-14 | Suppression individuelle d'une notification | Actions | Swipe vers la gauche (ou clic X) → suppression | Notification existante | Notification disparaît avec animation fade-out. `chrome.storage.local` mis à jour |
| NT-15 | Suppression du groupe "Effacer tout" | Actions | Cliquer "Effacer tout" → toutes les notifications supprimées | 5+ notifications | Toutes disparaissent, EmptyState affiché, badge effacé |

### 6.4 Notification preferences

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| NT-16 | Préférences : notifications push chrome | Preferences | L'utilisateur peut activer/désactiver les notifications Chrome | Extension a permission notifications | Toggle "Notifications de bureau" → si ON, `chrome.notifications.create()` est appelé lors des événements |
| NT-17 | Préférences : notification sonore | Preferences | L'utilisateur peut activer/désactiver un son | Onglet Settings | Toggle "Son de notification" |
| NT-18 | Préférences : notifications par type | Preferences | L'utilisateur choisit quels types de notifs recevoir | Settings | 3 toggles : "Rapports terminés", "Erreurs", "Invitations" |

---

## 7. Settings

### 7.1 Theme

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ST-01 | Theme toggle bascule light/dark | Theme | Cliquer sur le toggle de thème → bascule entre light et dark | Thème initial = light | `data-theme="dark"` sur `<html>`, couleurs dark mode appliquées, icône Sun/Moon changée |
| ST-02 | Persistance du thème (fermeture popup) | Theme | Fermer et rouvrir la popup → thème conservé | Thème dark sélectionné | `chrome.storage.local.get("theme")` renvoie "dark", theme dark appliqué |
| ST-03 | Thème suit le système par défaut | Theme | À l'installation, le thème suit `prefers-color-scheme` | Aucune préférence stockée | `window.matchMedia("(prefers-color-scheme: dark)").matches` décide du thème par défaut |
| ST-04 | Toggle animé avec transition douce | Theme | La transition light → dark est fluide | Changement de thème | `transition: background-color 0.3s, color 0.3s;` — pas de flash |
| ST-05 | Toutes les couleurs du design system respectées | Theme | Le thème dark utilise les tokens définis dans DESIGN.md | Mode dark | Vérifier bg `#0a1505`, surface `#162309`, ink `#e8f5df`, primary `#7ac94a` |

### 7.2 Language

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ST-06 | Sélecteur de langue FR/EN | Language | Dropdown avec FR et EN | Settings > Langue | Select avec options "Français" et "English" |
| ST-07 | Changement de langue immédiat | Language | Passer de FR à EN → UI se met à jour instantanément | Langue FR active | Tous les textes passent en anglais sans recharger la popup |
| ST-08 | Persistance de la langue | Language | Fermer et rouvrir → langue conservée | Langue EN | `chrome.storage.local.get("locale")` → "en" |
| ST-09 | Tous les textes traduits | Language | Vérifier que 100% des textes UI sont traduits en FR/EN | Mode EN | Aucun texte FR résiduel visible. Vérifier : header, dashboard, quick capture, settings, notifications, empty states, erreurs |
| ST-10 | Format date adapté à la locale | Language | Les dates relatives s'affichent en anglais quand locale EN | EN | "3 minutes ago" au lieu de "il y a 3 minutes" |

### 7.3 Feature toggles

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ST-11 | Auto-capture toggle | Toggles | Activer/désactiver la détection automatique de données | Settings | Toggle "Détection automatique", stocké dans `chrome.storage.local.get("autoCapture")`. Quand OFF, content script ne détecte plus |
| ST-12 | Notifications chrome toggle | Toggles | Activer/désactiver les notifications push chrome | Settings | Toggle "Notifications de bureau" |
| ST-13 | Analytics toggle | Toggles | Activer/désactiver le tracking Mixpanel | Settings | Toggle "Partager des données d'utilisation". Quand OFF, pas d'appel à Mixpanel |
| ST-14 | Context menu toggle | Toggles | Activer/désactiver le menu contextuel | Settings | Toggle "Menu contextuel". Quand OFF, `chrome.contextMenus.removeAll()` |

### 7.4 Connected sites & cache

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ST-15 | Sites connectés (Google Sheets) | Sites | Liste des sites pour lesquels l'utilisateur a authorisé l'accès | Google Sheets connecté | Liste : "Google Sheets - [email@gmail.com]" avec icône `Trash2` pour révoquer |
| ST-16 | Révocation d'un site connecté | Sites | Cliquer sur la poubelle → confirmation → accès révoqué | Site connecté | `chrome.permissions.remove()` ou API de déconnexion OAuth. Site disparaît de la liste |
| ST-17 | Aucun site connecté : message vide | Sites | Aucun site authorisé | 0 sites | Texte "Aucun site connecté" avec description |
| ST-18 | Vider le cache local | Cache | Cliquer "Vider le cache" → confirmation → cache effacé | Données en cache | `chrome.storage.local.clear()` sauf tokens. Toast "Cache vidé". Page data re-fetched |
| ST-19 | Vider le cache : confirmation requise | Cache | ConfirmDialog avant effacement | Cache non vide | ConfirmDialog "Vider le cache ? Cela supprimera les données locales." |

### 7.5 Version & info

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ST-20 | Version de l'extension affichée | Info | Numéro de version visible dans Settings > About | Settings | Texte "Version 1.0.0" lu depuis `chrome.runtime.getManifest().version` |
| ST-21 | Lien "Politique de confidentialité" | Info | Lien cliquable vers la privacy policy | Settings | Ouvre `https://datapresent.com/privacy` |
| ST-22 | Lien "Conditions d'utilisation" | Info | Lien cliquable vers les ToS | Settings | Ouvre `https://datapresent.com/terms` |
| ST-23 | Lien "Nous contacter" / Support | Info | Lien vers le support ou email | Settings | Ouvre `mailto:support@datapresent.com` ou `https://datapresent.com/contact` |
| ST-24 | Page "Quoi de neuf" / Changelog | Info | Lien vers les release notes | Settings | Ouvre `https://datapresent.com/changelog` ou page intégrée |

---

## 8. Bottom Navigation

### 8.1 Tab navigation

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| BN-01 | 4 tabs visibles dans BottomNav | Navigation | La barre de navigation du bas affiche 4 icônes | Popup ouverte, auth | Dashboard (icône LayoutDashboard), Quick Capture (icône Scan), Notifications (icône Bell avec badge), Settings (icône Settings) |
| BN-02 | Tab active : Dashboard par défaut | Navigation | À l'ouverture de la popup, l'onglet Dashboard est actif | Auth réussi | Dashboard visible, icône active (Deep Forest + bg tint), les autres en Olive |
| BN-03 | Navigation entre les tabs | Navigation | Cliquer sur chaque tab → contenu correspondant affiché | Tabs visibles | Clic Settings → vue Settings. Clic Dashboard → vue Dashboard. Animation de transition (slide ou fade) |
| BN-04 | Pas de re-render inutile entre tabs | Navigation | Changer de tab ne re-fetch pas les données déjà chargées | Dashboard chargé | Aller Settings puis revenir Dashboard : pas de skeleton, pas d'appel API supplémentaire |

### 8.2 Tab behavior

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| BN-05 | Badge de notification sur le tab Notifications | Badge | Le tab Notifications affiche un badge rouge avec le nombre | 3 notifications non lues | Badge circulaire rouge (w-2 h-2 ou texte) sur l'icône Bell, "3" |
| BN-06 | Badge Quick Capture si données détectées | Badge | Le tab Quick Capture montre un indicateur quand des données sont trouvées | Données détectées sur la page | Petit point vert ou pulsation sur l'icône Scan |
| BN-07 | Tab Notifications désactivé si offline | State | Si l'utilisateur est hors-ligne, le tab Notifications est grisé | Réseau indisponible | `opacity: 0.5`, `cursor: not-allowed` |
| BN-08 | Tab actif persistant après mise à jour | State | Si un polling update survient, le tab actif reste actif | Dashboard actif, polling de données | Le contenu du dashboard se met à jour sans perdre le focus du tab |

---

## 9. Error States

### 9.1 Network errors

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ER-01 | Pas de connexion internet → message | Network | La popup s'ouvre sans connexion internet | Réseau coupé | Bannère "Aucune connexion internet" avec icône `WifiOff`, contenu caché ou auth mis en cache |
| ER-02 | Perte de connexion pendant utilisation | Network | L'utilisateur navigue dans la popup et perd la connexion | Réseau initial OK puis coupé | Bannère persistante "Connexion perdue. Tentative de reconnexion..." avec bouton "Réessayer" |
| ER-03 | Reconnexion réussie après perte | Network | Le réseau revient → bannière disparaît | Réseau rétabli | Bannière disparaît après `navigator.onLine = true`, données re-fetchées silencieusement |
| ER-04 | Timeout API (> 10s) | Network | L'API DataPresent ne répond pas dans les 10 secondes | API lente | Bannière "Le service met plus de temps que prévu" avec spinner, pas de blocage UI |

### 9.2 API errors

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ER-05 | API 401 → refresh token attempt | API | API retourne 401 Unauthorized | Token expiré | Interception par le client API, refresh tenté, si OK → retry, si fail → AuthGate |
| ER-06 | API 403 → message "Abonnement expiré" | API | API retourne 403 Forbidden | Plan FREE dépassé | Bannière "Vous avez atteint la limite de votre plan" avec lien vers pricing. Pas de blocage total |
| ER-07 | API 429 → message "Trop de requêtes" | API | API retourne 429 Too Many Requests | Rate limit atteint | Bannière "Trop de requêtes. Veuillez patienter." avec compte à rebours "Réessayer dans 30s" |
| ER-08 | API 500 → message générique | API | API retourne 500 Internal Server Error | Erreur serveur | Bannière "Une erreur est survenue. Veuillez réessayer plus tard." avec bouton "Réessayer" |
| ER-09 | API 503 → message "Service en maintenance" | API | API retourne 503 Service Unavailable | Maintenance | Bannière "DataPresent est en maintenance. Revenez dans quelques instants." avec illustration |
| ER-10 | Erreur réseau générique (fetch failed) | API | `fetch()` rejette pour raison réseau (DNS, CORS) | Réseau instable | Bannière "Erreur de connexion" avec bouton "Réessayer". Pas de crash |

### 9.3 Storage errors

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ER-11 | Quota chrome.storage dépassé | Storage | `chrome.storage.local` atteint sa limite (10 Mo) | Cache important | Erreur catchée, menu Settings recommandé, bouton "Vider le cache". Pas de crash |
| ER-12 | chrome.storage.session inaccessible | Storage | Tentative d'accès à `chrome.storage.session` sans permission | Permission manquante | Fallback vers `chrome.storage.local`, log d'erreur en debug mode |
| ER-13 | Corruption des données stockées | Storage | Les données dans chrome.storage sont corrompues (JSON invalide) | Stockage corrompu | `JSON.parse()` catch l'erreur, données remises à zéro, toast "Données locales réinitialisées" |

### 9.4 Extension lifecycle

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| ER-14 | Service worker (background) arrêté | Lifecycle | Le background worker a été terminé par Chrome (idle) | Inactivité > 30s | La popup reactive le worker via `chrome.runtime.connect()` ou `chrome.runtime.sendMessage()` avec réveil |
| ER-15 | Contexte de la popup invalidé | Lifecycle | La popup est restée ouverte trop longtemps (> 5 min) et Chrome l'a invalidée | Popup idle | `chrome.runtime.lastError` géré, pas de crash. Au prochain clic icône, popup fraîche |
| ER-16 | Extension mise à jour en arrière-plan | Lifecycle | L'extension est mise à jour alors que la popup est ouverte | Mise à jour Chrome Web Store | `chrome.runtime.onUpdateAvailable` → bannière "Une mise à jour est disponible. Veuillez redémarrer l'extension." |

---

## 10. Responsive & Accessibility

### 10.1 Popup sizing

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RA-01 | Largeur minimale : 320px | Responsive | La popup ne peut pas être plus étroite que 320px | Popup ouverte | `min-width: 320px` sur le body ou conteneur principal |
| RA-02 | Hauteur minimale : 400px | Responsive | La popup ne peut pas être plus courte que 400px | Popup ouverte | `min-height: 400px` |
| RA-03 | Contenu scrollable si dépasse 600px | Responsive | Si le contenu excède la hauteur de la popup, scroll vertical | Dashboard avec 5 rapports | `overflow-y: auto` sur `#root`, scrollbar visible au besoin |
| RA-04 | QuickCapture preview scrollable | Responsive | La preview des données (tableau) a son propre scroll horizontal+vertical | Tableau large avec 20+ lignes | Scroll horizontal ET vertical dans le conteneur de preview |

### 10.2 Keyboard navigation

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RA-05 | Tab navigation dans la popup | Keyboard | `Tab` se déplace entre tous les éléments interactifs dans l'ordre logique | Popup ouverte | Ordre logique : tabs → contenu → actions. `Tab` ne sort pas de la popup. Focus visible |
| RA-06 | Tab navigation dans le dashboard | Keyboard | `Tab` parcourt les ReportCards et les boutons d'action | Dashboard actif | Focus se déplace: Header → Dashboard list → chaque ReportCard → bouton "Nouveau rapport" |
| RA-07 | Tab navigation dans les tabs BottomNav | Keyboard | Flèches gauche/droite naviguent entre les tabs | BottomNav focusé | `ArrowLeft` / `ArrowRight` changent de tab actif |
| RA-08 | Escape ferme la popup | Keyboard | `Escape` dans la popup → popup fermée | Popup ouverte | `window.close()` appelé. Pas de perte de données |
| RA-09 | Escape ferme les modales/confirm | Keyboard | `Escape` dans un ConfirmDialog → dialogue fermé | ConfirmDialog ouvert | Dialog fermé (annulation), focus retourné à l'élément déclencheur |
| RA-10 | Focus trap dans les modales | Keyboard | Le focus reste piégé dans le dialog ouvert | ConfirmDialog | `Tab` cycle dans le dialog, `Shift+Tab` cycle en arrière. Ne sort pas du dialog |

### 10.3 ARIA & a11y

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RA-11 | ARIA label sur le header | ARIA | Le header a `role="banner"` ou `aria-label` | Popup ouverte | `header` avec `role="banner"` ou `<nav>` avec `aria-label="Navigation principale"` |
| RA-12 | ARIA label sur BottomNav | ARIA | La barre de navigation a `role="tablist"` | Popup ouverte | `nav[role="tablist"]` avec `aria-label="Onglets"` |
| RA-13 | ARIA attributes sur les tabs | ARIA | Chaque tab a `role="tab"`, `aria-selected`, `aria-controls` | Tabs dans BottomNav | `button[role="tab"]` avec `aria-selected="true/false"` et `aria-controls="panel-{id}"` |
| RA-14 | ARIA live region pour les notifications | ARIA | Les notifications utilisent `aria-live="polite"` | Nouvelle notification | `div[aria-live="polite"]` mis à jour quand notification arrive |
| RA-15 | ARIA label sur les ReportCards | ARIA | Chaque ReportCard a un `aria-label` descriptif | Dashboard | `aria-label="Rapport [titre], statut [statut], [date]"` |
| RA-16 | Status badge accessible | ARIA | Les badges de statut ont un texte caché pour screen readers | Badge visible | `span.sr-only` avec texte ou `aria-label` complétant l'icône |
| RA-17 | Images (avatar) ont `alt` text | ARIA | L'avatar utilisateur a `alt="Photo de profil de [nom]"` | Auth | `img` avec `alt` non vide |
| RA-18 | Alertes et bannières ont `role="alert"` | ARIA | Les bannières d'erreur ont `role="alert"` | Erreur affichée | `div[role="alert"]` pour les messages d'erreur |

### 10.4 Color contrast

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RA-19 | Contraste texte normal ≥ 4.5:1 | Accessibilité | Texte body (DM Sans 15.6px) sur fond white #ffffff | Popup en light mode | Ratio de contraste ≥ 4.5:1 entre Ink `#111b09` et White `#ffffff` |
| RA-20 | Contraste texte large ≥ 3:1 | Accessibilité | Titres Fraunces ≥ 18px sur fond | Popup en light mode | Ratio ≥ 3:1 |
| RA-21 | Contraste en dark mode valide | Accessibilité | Tous les contrastes sont valides en dark mode | Mode dark | Pale Leaf `#e8f5df` sur Dark Bg `#0a1505` ≥ 4.5:1 |
| RA-22 | Pas d'information uniquement par la couleur | Accessibilité | Les statuts ne reposent pas que sur la couleur | Badges de statut | Chaque badge a une icône ET un texte, pas seulement une couleur |
| RA-23 | Focus visible (outline) sur tous les éléments | Accessibilité | Tous les éléments interactifs ont un style focus visible | Tab navigation | `:focus-visible` avec ring Deep Forest 3px @ 15% opacity |

---

## 11. Race Conditions & Concurrence

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| RC-01 | Double-clic sur "Créer une présentation" | Race | L'utilisateur clique deux fois rapidement sur le bouton d'envoi | QuickCapture avec données | Le clic est ignoré après le premier (bouton `disabled` avec spinner). Un seul `POST /api/reports` |
| RC-02 | Changement de tab rapide pendant envoi | Race | L'utilisateur clique sur Dashboard pendant que QuickCapture envoie des données | Envoi en cours | L'envoi continue en arrière-plan. Au retour sur QuickCapture, l'état est conservé |
| RC-03 | Polling + navigation simultanés | Race | Polling dashboard actif quand l'utilisateur navigue vers Settings | Polling en cours | `clearInterval` au unmount du Dashboard. Pas de setState sur composant démonté |
| RC-04 | Popup fermée pendant envoi API | Race | L'utilisateur ferme la popup pendant que `POST /api/reports` est en vol | Requête en cours | La requête complète s'exécute (le fetch continue même si popup fermée). Background worker gère le résultat |
| RC-05 | Login + fetch simultanés | Race | L'utilisateur se connecte et les données commencent à charger avant que la session soit persistée | Login récent | Les requêtes API attendent que le token soit disponible. Pas de 401 race condition |
| RC-06 | Refresh token + requête API simultanés | Race | Une requête API est en cours pendant que le refresh token s'exécute | Token expirant | Les requêtes en file d'attente (queue) utilisent le nouveau token après refresh |
| RC-07 | Mise à jour badge + popup ouverte | Race | Le background met à jour le badge en même temps que la popup est ouverte | Notification arrive pendant ouverture | Pas de conflit de badge. L'affichage du badge et le contenu de la popup sont cohérents |
| RC-08 | Changement de thème rapide (light→dark→light) | Race | L'utilisateur bascule le thème 3 fois rapidement | Thème en cours de changement | Le dernier thème sélectionné est appliqué. Pas de rendu intermédiaire bloqué |

---

## 12. Context Menu Integration

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| CM-01 | Menu contextuel visible sur sélection de texte | Context Menu | L'utilisateur sélectionne du texte sur une page → clic droit → option "Envoyer à DataPresent" | `NEXT_PUBLIC_ENABLE_CONTEXT_MENU=true`, auth | `chrome.contextMenus.create()` appelé avec id "datapresent-send-selection". Menu "Envoyer la sélection à DataPresent" visible |
| CM-02 | Menu contextuel visible sur tableau | Context Menu | L'utilisateur fait clic droit dans un tableau HTML | Tableau détecté | "Envoyer ce tableau à DataPresent" dans le menu contextuel |
| CM-03 | Clic menu contextuel → ouvre popup avec données | Context Menu | Cliquer "Envoyer à DataPresent" → la popup s'ouvre avec les données pré-remplies | Menu cliqué | Popup ouverte (si fermée) ou focusée (si ouverte), onglet QuickCapture actif avec données |
| CM-04 | Menu contextuel masqué sans auth | Context Menu | Utilisateur non connecté → menu contextuel absent | Non auth | `chrome.contextMenus.removeAll()` ou création avec condition `auth` |
| CM-05 | Menu contextuel désactivé dans les settings | Context Menu | Toggle Context Menu OFF → menu disparaît | Settings > Context Menu OFF | `chrome.contextMenus.removeAll()` |
| CM-06 | Menu contextuel avec sous-menu (type d'envoi) | Context Menu | Sous-menu : "Nouveau rapport" / "Ajouter au rapport existant" | Données sélectionnées | Menu > "DataPresent" > sous-menu avec 2 options |

---

## 13. Content Script / Page Interaction

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|:---|:---------|:----------|:------------|:--------------|:-----------------|
| CS-01 | Content script injecté sur les pages web | Content Script | Le content script est injecté sur `http://` et `https://` URL | Navigation vers site web | `chrome.scripting.executeScript()` ou manifest `content_scripts` match pattern, script injecté |
| CS-02 | Content script inactif sur chrome:// URLs | Content Script | Le content script n'est pas injecté sur les pages chrome:// | Navigation vers chrome:// | Aucune injection, pas d'erreur console |
| CS-03 | Content script détecte les tableaux | Content Script | Le content script analyse le DOM pour trouver des `<table>` | Page avec tableaux | `document.querySelectorAll("table").length > 0`, message envoyé à la popup |
| CS-04 | Communication content script ↔ popup | Content Script | Les données détectées sont envoyées à la popup via `chrome.runtime.sendMessage` | Tableau détecté | `chrome.runtime.sendMessage({ type: "DATA_DETECTED", payload: {...} })` reçu par la popup |
| CS-05 | Content script limité en temps (max 5s analyse) | Content Script | L'analyse DOM ne bloque pas le thread principal plus de 5s | Page complexe | `requestIdleCallback` ou `setTimeout` pour analyse non-bloquante. Pas de jank |
| CS-06 | Content script désactivé si auto-capture OFF | Content Script | L'utilisateur a désactivé l'auto-capture dans les Settings | Settings > Auto-capture OFF | Content script injecté mais n'analyse pas le DOM. Message `ANALYSIS_DISABLED` |
| CS-07 | Highlight visuel des données détectées | Content Script | Les tableaux détectés sont entourés d'un contour vert (1px dashed) | Tableau détecté | `<table>` a une bordure `outline: 2px dashed #5cb82a` avec tooltip "DataPresent" |

---

## 14. Récapitulatif & Priorisation

### Total des scénarios : **198 scénarios**

| Catégorie | Nb scénarios | Priorité | Justification |
|:----------|:------------:|:--------:|:--------------|
| Popup Entry & Loading | 19 | P0 | Fonctionnement de base de la popup, première impression |
| Auth State UI | 24 | P0 | Cœur sécurité : login, logout, session, refresh token |
| Dashboard / Recent Reports | 29 | P0 | Vitrine principale de la popup pour utilisateur connecté |
| Quick Capture | 24 | P0 | Valeur différenciante clé de l'extension companion |
| Notifications | 18 | P1 | Engagement utilisateur, badge, rapports prêts |
| Settings | 24 | P1 | Configuration (thème, langue, préférences, cache) |
| Bottom Navigation | 8 | P1 | Navigation entre les onglets, badge tabs |
| Error States | 16 | P0 | Robustesse : réseau, API, stockage, cycle de vie extension |
| Responsive & Accessibilité | 23 | P1 | Qualité, WCAG AA, navigation clavier |
| Race Conditions & Concurrence | 8 | P2 | Robustesse avancée |
| Context Menu Integration | 6 | P1 | Intégration native Chrome |
| Content Script / Page Interaction | 7 | P1 | Détection de données, injection, performance |

### Priorisation d'implémentation

| Phase | Catégories | Nb tests | Effort estimé |
|:------|:-----------|:--------:|:--------------|
| **Phase 1 (P0)** — Fondation | Popup Entry & Loading + Auth State UI + Dashboard + Quick Capture + Error States | 112 | Élevé (infrastructure extension + mock API) |
| **Phase 2 (P1)** — Complétude | Settings + Bottom Navigation + Notifications + Content Script + Context Menu | 63 | Moyen (interaction content script complexe) |
| **Phase 3 (P2)** — Robustesse | Responsive/Accessibility + Race Conditions | 31 | Faible (ajouts progressifs) |

### Recommandations d'infrastructure

1. **Mock du background worker** : Créer un service worker de test factice qui répond aux messages `chrome.runtime` avec des fixtures. Utiliser `page.evaluate()` pour injecter les mocks.

2. **Fixture Playwright custom** :
   ```typescript
   // Fixture popup avec mock API Chrome
   export const test = base.extend<{
     mockBackground: void;
     storageMock: Record<string, unknown>;
   }>({
     storageMock: {
       authToken: "test-token-123",
       refreshToken: "test-refresh-456",
       theme: "light",
       locale: "fr",
       reports: [],
     },
     mockBackground: [
       async ({ context, storageMock }, use) => {
         await context.addInitScript(() => {
           // Mock chrome.storage
           chrome.storage = {
             local: { get: () => storageMock, set: () => {} },
             session: { get: () => ({ authToken: "test" }), set: () => {} },
           };
           // Mock chrome.runtime
           chrome.runtime.sendMessage = () => Promise.resolve({ reports: [] });
         });
         await use();
       },
       { auto: true },
     ],
   });
   ```

3. **Interception des appels API** : Utiliser `page.route()` pour intercepter tous les appels vers `API_BASE_URL` et retourner des fixtures. Exemple :
   ```typescript
   await page.route("**/api/reports", async (route) => {
     await route.fulfill({ json: mockReports });
   });
   ```

4. **Environnement de test** : Variables `.env.test` spécifiques pour l'extension avec `NEXT_PUBLIC_LOG_LEVEL=error` (pas de logs en test) et une `API_BASE_URL` pointant vers un mock serveur.

5. **Snapshot testing** : Utiliser `await expect(page).toHaveScreenshot()` pour les états visuels clés (AuthGate, Dashboard, QuickCapture preview, Settings) afin de détecter les régressions visuelles. Stocker les snapshots dans `tests/e2e/__snapshots__/`.

### Architecture de test recommandée

```
datapresent-extension/
├── playwright.config.ts               # Config extension Chrome
├── tests/
│   ├── e2e/
│   │   ├── .env.test                  # Variables de test
│   │   ├── fixtures/
│   │   │   └── extension.ts           # Fixtures custom (popup, background mock)
│   │   ├── mocks/
│   │   │   ├── api.ts                 # Route handlers pour l'API
│   │   │   └── storage.ts             # Chrome storage mock
│   │   ├── popup/
│   │   │   ├── popup-entry.spec.ts    # PL-01 à PL-19
│   │   │   ├── auth-ui.spec.ts        # AU-01 à AU-24
│   │   │   ├── dashboard.spec.ts      # DB-01 à DB-29
│   │   │   ├── quick-capture.spec.ts  # QC-01 à QC-24
│   │   │   ├── notifications.spec.ts  # NT-01 à NT-18
│   │   │   ├── settings.spec.ts       # ST-01 à ST-24
│   │   │   ├── bottom-nav.spec.ts     # BN-01 à BN-08
│   │   │   ├── error-states.spec.ts   # ER-01 à ER-16
│   │   │   ├── responsive-a11y.spec.ts # RA-01 à RA-23
│   │   │   └── race-conditions.spec.ts # RC-01 à RC-08
│   │   ├── context-menu.spec.ts       # CM-01 à CM-06
│   │   └── content-script.spec.ts     # CS-01 à CS-07
│   └── helpers/
│       └── extension.ts               # Helpers de test
```

---

**Document généré le 2026-06-21** par analyse statique du code source existant (squelette extension), du plan produit (PLAN.md), du design system (DESIGN.md), des fichiers de configuration (.env*), et des patterns d'extensions navigateur companion SaaS.

**198 scénarios de test E2E identifiés** pour le POPUP UI de l'extension DataPresent.
