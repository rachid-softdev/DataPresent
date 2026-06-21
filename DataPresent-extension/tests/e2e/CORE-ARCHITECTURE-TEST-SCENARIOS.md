# DataPresent Extension — Core Architecture & Setup : E2E Playwright Test Scenarios

> **Projet :** DataPresent Extension (Manifest V3, Chrome/Edge/Firefox)
> **Framework :** Playwright + `@playwright/test`
> **Cible :** Couverture exhaustive de l'architecture noyau — manifest, permissions, SW, storage, messaging, auth, lifecycle
> **Statut :** SQUELETTE — code source non écrit ; scénarios inférés du produit SaaS + patterns d'extension standard

---

## Sommaire

| Section | Catégorie | Nb scénarios |
|---|---|---|
| 1 | Manifest & Permissions | 14 |
| 2 | Background Service Worker | 18 |
| 3 | Chrome Storage | 18 |
| 4 | Messaging Protocol | 20 |
| 5 | Auth Synchronization | 16 |
| 6 | Extension Lifecycle | 14 |
| 7 | Cross-cutting Concerns | 12 |
| **Total** | | **112** |

---

## 1. Manifest & Permissions

Vérifie la déclaration, l'intégrité et les permissions du fichier `manifest.json` (Manifest V3).

| ID | Scenario | Catégorie | Description | Preconditions | Résultat attendu |
|---|---|---|---|---|---|
| **MANIF-001** | Structure minimale du manifest | Manifest | Vérifier que `manifest.json` existe et respecte le schéma Manifest V3 | Extension buildée/déployée | Fichier `manifest.json` présent ; `manifest_version: 3` ; clés obligatoires : `name`, `version`, `description`, `icons` |
| **MANIF-002** | Permissions storage | Manifest | Vérifier la déclaration de `storage` dans `permissions[]` | Extension installée | Permission `"storage"` présente ; le SW peut accéder à `chrome.storage.local` et `chrome.storage.sync` sans erreur |
| **MANIF-003** | Permissions identity | Manifest | Vérifier la déclaration de `identity` dans `permissions[]` | Extension installée | Permission `"identity"` présente ; l'extension peut appeler `chrome.identity.getAuthToken` ou `chrome.identity.getProfileUserInfo` sans erreur |
| **MANIF-004** | Permissions tabs & activeTab | Manifest | Vérifier `tabs` et `activeTab` pour l'injection de contenu et la détection de page | Extension installée | Permissions `"tabs"` et/ou `"activeTab"` présentes ; l'extension peut lire l'URL / le titre de l'onglet actif sans alerte |
| **MANIF-005** | Permissions scripting | Manifest | Vérifier `"scripting"` dans `permissions[]` pour l'injection de content scripts dynamiques | Extension installée | Permission `"scripting"` présente ; `chrome.scripting.executeScript()` fonctionne sans permission denied |
| **MANIF-006** | Host permissions — domaine api | Manifest | Vérifier les `host_permissions` incluent le domaine API de DataPresent | Extension installée | `host_permissions` contient le pattern du backend (ex: `"https://datapresent.com/*"` ou `"http://localhost:3000/*"`) ; requêtes fetch vers l'API passent |
| **MANIF-007** | Host permissions — sites cibles | Manifest | Vérifier les permissions pour injecter le content script sur les sites supportés (Google Sheets, etc.) | Extension installée | `host_permissions` contient `"https://docs.google.com/spreadsheets/*"` ; le content script s'injecte sans erreur |
| **MANIF-008** | Content Security Policy | Manifest | Vérifier la `content_security_policy` du manifest pour les scripts et connexions autorisées | Extension installée | CSP déclarée ou absente (valeur par défaut V3) ; pas de violation CSP dans la console du SW ni des content scripts |
| **MANIF-009** | Icons — toutes les tailles | Manifest | Vérifier que les icônes 16×16, 48×48 et 128×128 sont définies et présentes | Extension buildée | `icons` contient les clés 16, 48, 128 ; chaque fichier existe dans le build/dist ; les icônes s'affichent dans chrome://extensions et la barre d'outils |
| **MANIF-010** | Version sémantique | Manifest | Vérifier le format du champ `version` (semver strict) | Extension buildée | `version` suit le format `MAJOR.MINOR.PATCH` (ex: `1.0.0`) ; la version est lisible dans `chrome://extensions` |
| **MANIF-011** | Background service worker déclaré | Manifest | Vérifier que `background.service_worker` pointe vers le bon fichier | Extension buildée | Clé `"background": { "service_worker": "background/service-worker.js" }` présente ; le SW est enregistré et visible dans `chrome://inspect/#service-workers` |
| **MANIF-012** | Action popup déclarée | Manifest | Vérifier que `action.default_popup` pointe vers la popup HTML | Extension buildée | `"action": { "default_popup": "popup/index.html" }` présent ; le clic sur l'icône ouvre la popup |
| **MANIF-013** | Web accessible resources | Manifest | Vérifier la déclaration des `web_accessible_resources` pour les assets chargés par les pages web | Extension installée | Les ressources partagées (images, fonts, etc.) sont listées dans `web_accessible_resources` avec leurs `matches` ; les pages autorisées peuvent les charger sans erreur CORS |
| **MANIF-014** | Commands / shortcuts | Manifest | Vérifier la déclaration des `commands` (raccourcis clavier) | Extension installée | Section `"commands"` présente avec au moins un raccourci (ex: `_execute_action` pour ouvrir la popup) ; le raccourci est configurable dans `chrome://extensions/shortcuts` |

---

## 2. Background Service Worker

Le SW est le cœur de l'extension — registration, cycle de vie, message passing, API client, auth.

| ID | Scenario | Catégorie | Description | Preconditions | Résultat attendu |
|---|---|---|---|---|---|
| **SW-001** | Registration automatique | SW Lifecycle | Vérifier que le service worker s'enregistre automatiquement à l'installation | Extension installée | Le SW apparaît dans `chrome://inspect/#service-workers` avec le statut "running" ; `navigator.serviceWorker.ready` résout dans le contexte popup |
| **SW-002** | SW actif après inactivité (délai) | SW Lifecycle | Vérifier que le SW reste actif au moins 30s après la dernière requête (délai V3) | Extension installée, SW actif | Après 30s sans message, le SW s'arrête (statut "stopped") ; un nouveau message ou un clic popup le réveille |
| **SW-003** | Wake-up sur message entrant | SW Lifecycle | Vérifier que le SW se réveille à la réception d'un `chrome.runtime.onMessage` | SW arrêté | Envoyer un message depuis popup ou content script ; le SW s'active et traite le message ; réponse retournée dans le callback |
| **SW-004** | Wake-up sur clic icône | SW Lifecycle | Vérifier que le clic sur l'icône extension réveille le SW et ouvre la popup | SW arrêté | Clic sur l'icône → popup s'ouvre ; les logs du SW (via `chrome.runtime.sendMessage`) ne montrent pas d'erreur |
| **SW-005** | Message passing — ping/pong | SW Messaging | Vérifier que le SW répond à un message de type "ping" avec un "pong" | SW actif | Envoyer `{ type: "PING" }` depuis la popup → réponse `{ type: "PONG" }` reçue dans un délai < 100ms |
| **SW-006** | Message passing — routage par type | SW Messaging | Vérifier que le SW route correctement les messages vers les handlers appropriés | SW actif | Envoyer un message `{ type: "GET_REPORTS" }` → handler `handleGetReports` appelé ; message `{ type: "AUTH_LOGIN" }` → handler `handleAuthLogin` appelé |
| **SW-007** | API client — base URL correcte | SW API Client | Vérifier que l'API client utilise la base URL configurée | Extension installée, `NEXT_PUBLIC_API_URL` définie | L'API client construit les URLs en utilisant `NEXT_PUBLIC_API_URL` (ex: `https://datapresent.com/api`) ; requête GET vers `{base}/health` retourne 200 |
| **SW-008** | API client — headers d'auth | SW API Client | Vérifier que les requêtes API incluent le token d'authentification dans le header | Extension authée, token stocké | Chaque requête sortante contient `Authorization: Bearer <token>` et `X-Extension-Id: <id>` dans les headers |
| **SW-009** | API client — timeout | SW API Client | Vérifier qu'un timeout est appliqué aux requêtes API (défaut 30s) | SW actif, API backend simulée lente | Requête vers un endpoint qui ne répond pas → timeout après 30s → erreur `NETWORK_TIMEOUT` retournée au caller |
| **SW-010** | Token refresh — 401 handling | SW Auth | Vérifier que le SW intercepte un 401 et tente un refresh token | Extension authée, token expiré | Requête API → réponse 401 → SW appelle `/auth/refresh` → nouveau token stocké → requête originale rejouée avec le nouveau token |
| **SW-011** | Token refresh — échec définitif | SW Auth | Vérifier le comportement quand le refresh token échoue (refresh token aussi expiré) | Extension authée, refresh token expiré | Requête API → 401 → refresh → 401 → SW émet `AUTH_EXPIRED` vers tous les listeners ; popup affiche écran "Session expirée" ; storage vidé du token |
| **SW-012** | Rate limiting — 429 handling | SW Error Handling | Vérifier que le SW gère un 429 Too Many Requests avec backoff | Extension authée | Requête API → 429 avec `Retry-After: 5` → SW attend 5s puis retente ; si nouveau 429 → backoff exponentiel (max 3 retries) ; après 3 échecs → erreur `RATE_LIMITED` retournée |
| **SW-013** | Erreur réseau — 500 | SW Error Handling | Vérifier la gestion des erreurs 500 Internal Server Error | SW actif | Requête API → 500 → SW retente 2 fois (avec délai) ; si persistant → erreur `SERVER_ERROR` retournée ; pas de crash du SW |
| **SW-014** | Erreur réseau — offline | SW Error Handling | Vérifier le comportement en mode hors-ligne (navigator.onLine = false) | Navigateur offline | SW détecte l'état offline via `navigator.onLine` ou un ping échoué ; les requêtes API sont mises en file d'attente ; pas d'exception non gérée |
| **SW-015** | Erreur réseau — DNS failure | SW Error Handling | Vérifier la gestion d'une erreur TypeError (DNS/network failure) | API backend injoignable | Erreur `TypeError: Failed to fetch` → SW retourne `{ error: "NETWORK_ERROR", code: "DNS_FAILURE" }` ; pas de crash |
| **SW-016** | Keepalive — alarme périodique | SW Lifecycle | Vérifier que le SW utilise `chrome.alarms` pour un keepalive périodique (toutes les 5 min) | Extension installée | Alarme `DATAPRESENT_KEEPALIVE` créée avec `periodInMinutes: 5` ; le handler `onAlarm` est appelé ; pas de "Stopped" avant 5 min d'inactivité |
| **SW-017** | Logs — format structuré | SW Logging | Vérifier que les logs du SW sont au format structuré (niveau, timestamp, module) | Extension debug mode activé | Logs visibles via la console DevTools du SW ; format : `[DATAPRESENT][{LEVEL}] {timestamp} {module}: {message}` ; niveaux >= `NEXT_PUBLIC_LOG_LEVEL` filtrés |
| **SW-018** | Pas de fuite mémoire | SW Performance | Vérifier l'absence de fuite mémoire après opérations répétées | SW actif | Après 100 cycles de sendMessage + réponse, la heap du SW n'augmente pas de plus de 5% ; pas d'écouteurs multiples attachés au même event |

---

## 3. Chrome Storage

L'extension utilise `chrome.storage.local` (données volumineuses/privées) et `chrome.storage.sync` (préferences utilisateur).

| ID | Scenario | Catégorie | Description | Preconditions | Résultat attendu |
|---|---|---|---|---|---|
| **STORAGE-001** | Storage — set/get primitive | Storage Basic | Vérifier qu'on peut écrire une valeur string dans le storage et la relire | Extension installée | `chrome.storage.local.set({ key: "value" })` → `chrome.storage.local.get("key")` retourne `{ key: "value" }` |
| **STORAGE-002** | Storage — set/get objet complexe | Storage Basic | Vérifier qu'on peut stocker et récupérer un objet JSON imbriqué | Extension installée | `set({ user: { id: "u1", email: "test@test.com", orgs: ["org1"] } })` → `get("user")` retourne l'objet intact |
| **STORAGE-003** | Storage — remove | Storage Basic | Vérifier que `remove()` efface une clé et que le get retourne `undefined` | Extension installée, clé "temp" stockée | `remove("temp")` → `get("temp")` retourne `{}` (clé absente) |
| **STORAGE-004** | Storage — clear | Storage Basic | Vérifier que `clear()` vide tout le storage | Extension installée, données stockées | `clear()` → `get(null)` retourne `{}` |
| **STORAGE-005** | Storage — getBytesInUse | Storage Basic | Vérifier que `getBytesInUse()` retourne la taille correcte des données stockées | Extension installée, données stockées | Après `set({ a: "12345" })` → `getBytesInUse(null)` retourne le nombre d'octets exact (>= 5) |
| **STORAGE-006** | Storage sync vs local — isolation | Storage Sync | Vérifier que les données sync et local sont isolées | Extension installée | `storage.local.set({ sameKey: "local" })` ; `storage.sync.set({ sameKey: "sync" })` ; `get("sameKey")` de chaque espace retourne sa propre valeur |
| **STORAGE-007** | Storage sync — quota limit | Storage Sync | Vérifier le respect du quota sync (QUOTA_BYTES_PER_ITEM = 8 192 octets) | Extension installée | Tentative de stockage d'une valeur > 8KB dans sync → erreur `QUOTA_BYTES_PER_ITEM` ; la valeur n'est pas persistée |
| **STORAGE-008** | Storage local — quota limit | Storage Local | Vérifier la gestion du quota local (QUOTA_BYTES = ~10MB) | Extension installée | Remplissage progressif du storage local → au dépassement, erreur `QUOTA_BYTES` ; l'extension affiche un message "Stockage saturé" dans la popup |
| **STORAGE-009** | Storage — WRITE_TO_DISK operation | Storage Performance | Vérifier que les écritures sont persistées sur disque (défaut : ~1s de délai) | Extension installée | `set({ critical: "data" })` → couper l'alimentation → relancer le navigateur → `get("critical")` retourne "data" |
| **STORAGE-010** | Storage — onChanged event local | Storage Events | Vérifier que `onChanged` est déclenché pour une modification du storage local | Extension installée, listener attaché | `set({ key: "new" })` dans un contexte → le callback `onChanged` est appelé avec `changes = { key: { oldValue, newValue } }` |
| **STORAGE-011** | Storage — onChanged event sync | Storage Events | Vérifier que `onChanged` est déclenché pour une modification du storage sync | Extension installée, listener attaché (SW et popup) | `storage.sync.set({ pref: "dark" })` dans la popup → SW reçoit l'event `onChanged` avec `areaName: "sync"` |
| **STORAGE-012** | Storage — onChanged propagation vers popup | Storage Events | Vérifier que la popup réagit aux changements de storage même si elle est ouverte | Popup ouverte, SW modifie le storage | SW fait `set({ reportStatus: "DONE" })` → la popup reçoit l'event ; l'UI se met à jour (badge, liste, etc.) sans rechargement |
| **STORAGE-013** | Data migration — version check | Storage Migration | Vérifier que l'extension migre les données de storage en cas de maj version | Extension mise à jour de v1.0.0 à v1.1.0, storage au format v1 | Au démarrage du SW post-update, détection de `storageVersion` ≠ version courante → exécution de la migration → `storageVersion` mise à jour ; données converties sans perte |
| **STORAGE-014** | Data migration — rollback safe | Storage Migration | Vérifier qu'une migration échouée ne corrompt pas les données | Extension mise à jour, migration qui échoue | Migration interrompue → le storage conserve les données de l'ancien format ; l'extension retente à la prochaine activation ; pas de perte de données |
| **STORAGE-015** | Cache management — expiration | Storage Cache | Vérifier que les caches token/API ont une date d'expiration et sont purgés | Extension installée, token stocké avec TTL | Token stocké avec `expiresAt: Date.now() + 3600000` → après 1h, le token est considéré expiré ; le SW le supprime et en demande un nouveau |
| **STORAGE-016** | Cache management — LRU eviction | Storage Cache | Vérifier l'éviction LRU pour le cache des rapports récents | Extension installée, cache plein (max 50 rapports) | L'ajout d'un nouveau rapport → le plus ancien (ou moins utilisé) est évincé ; le storage ne dépasse pas la taille max configurée |
| **STORAGE-017** | Storage — set/get avec callback vs promise | Storage API | Vérifier que les APIs storage fonctionnent en Promise (MV3) et en callback | Extension installée | `chrome.storage.local.set({ a: 1 }).then(() => ...)` résout ; `chrome.storage.local.get("a", (result) => ...)` callback fonctionne |
| **STORAGE-018** | Storage — reset usine (factory reset) | Storage Reset | Vérifier qu'un reset d'usine vide TOUT le storage (local + sync) et remet les valeurs par défaut | Extension installée avec données accumulées | Action "Réinitialiser l'extension" → `storage.clear()` pour les deux espaces ; `storage.get("defaults")` retourne les valeurs par défaut de l'application ; les clés non-standard disparaissent |

---

## 4. Messaging Protocol

L'extension repose sur `chrome.runtime.sendMessage` et `chrome.tabs.sendMessage` pour la communication entre les contextes.

| ID | Scenario | Catégorie | Description | Preconditions | Résultat attendu |
|---|---|---|---|---|---|
| **MSG-001** | Content script → Background — message simple | Messaging | Vérifier qu'un content script peut envoyer un message au SW et recevoir une réponse | Content script injecté, SW actif | CS envoie `{ type: "PAGE_DATA", payload: { url, title, tables } }` → SW répond avec `{ type: "PAGE_DATA_ACK", status: "ok" }` |
| **MSG-002** | Content script → Background — sans réponse | Messaging | Vérifier le cas d'un message "fire and forget" | Content script injecté, SW actif | CS envoie `{ type: "PAGE_UNLOAD", fireAndForget: true }` → SW traite sans réponse ; pas d'erreur de timeout dans le CS |
| **MSG-003** | Popup → Background — requête données | Messaging | Vérifier que la popup peut demander les rapports récents au SW | Popup ouverte, SW actif | Popup envoie `{ type: "GET_RECENT_REPORTS" }` → SW répond avec `{ reports: [...], total: N }` dans le format attendu |
| **MSG-004** | Popup → Background — action utilisateur | Messaging | Vérifier qu'une action dans la popup (quick capture) est transmise au SW | Popup ouverte, données capturées | Popup envoie `{ type: "CAPTURE_DATA", payload: { data, source } }` → SW répond avec `{ status: "queued", jobId: "j_xxx" }` ; la popup affiche "Envoi en cours..." |
| **MSG-005** | Format de réponse standardisé | Messaging | Vérifier que tous les messages de réponse suivent le même format dans les 3 contextes | SW, popup, CS actifs | Toute réponse = `{ success: boolean, data?: any, error?: { code: string, message: string } }` ; respecté pour GET_RECENT_REPORTS, CAPTURE_DATA, PING, etc. |
| **MSG-006** | Message invalide — type manquant | Messaging | Vérifier la gestion d'un message sans champ `type` | SW actif | Envoyer `{ foo: "bar" }` → SW retourne `{ success: false, error: { code: "INVALID_MESSAGE", message: "Field 'type' is required" } }` |
| **MSG-007** | Message invalide — type inconnu | Messaging | Vérifier la gestion d'un type de message non supporté | SW actif | Envoyer `{ type: "UNKNOWN_TYPE" }` → SW retourne `{ success: false, error: { code: "UNKNOWN_MESSAGE_TYPE", message: "No handler for type UNKNOWN_TYPE" } }` |
| **MSG-008** | Message invalide — payload manquant | Messaging | Vérifier la validation du payload pour les messages qui en exigent un | SW actif | Envoyer `{ type: "CAPTURE_DATA" }` sans `payload` → SW retourne `{ success: false, error: { code: "MISSING_PAYLOAD", message: "Field 'payload' is required for CAPTURE_DATA" } }` |
| **MSG-009** | Timeout — réponse trop lente | Messaging | Vérifier le comportement quand le SW ne répond pas dans le délai imparti | SW occupé (boucle infinie simulée) | Popup envoie un message → timeout de 10s (configurable) → callback de timeout appelé ; pas de crash ; l'utilisateur voit "Le service est occupé" |
| **MSG-010** | Timeout — SW arrêté au moment du message | Messaging | Vérifier que le wake-up du SW arrêté n'impacte pas le timeout | SW arrêté | Envoyer un message → SW se réveille (100-300ms) → traite la requête → réponse ; le timeout est adapté pour inclure le wake-up overhead |
| **MSG-011** | Port ouvert — connect() longue durée | Messaging | Vérifier qu'un port `chrome.runtime.connect()` peut être établi pour des messages durables | Popup ouverte | `port = chrome.runtime.connect({ name: "popup-channel" })` → `onConnect` déclenché dans le SW ; le port est dans `chrome.runtime.onConnect` |
| **MSG-012** | Port — déconnexion propre | Messaging | Vérifier que la fermeture de la popup déconnecte proprement le port | Port popup ouvert | Popup fermée → `port.onDisconnect` déclenché dans le SW ; SW nettoie le port ; pas de tentative d'envoi sur le port fermé |
| **MSG-013** | Port — messages multiples | Messaging | Vérifier qu'un port peut transporter plusieurs messages dans une session | Port ouvert | Envoyer 10 messages séquentiellement via `postMessage()` → les 10 sont reçus dans l'ordre par le SW ; les réponses sont dans le même ordre |
| **MSG-014** | Erreur propagée — exception SW | Messaging | Vérifier qu'une exception non gérée dans le SW est propagée au caller | SW actif | Message qui déclenche une exception → le catch global du handler envoie `{ success: false, error: { code: "INTERNAL_ERROR", message: "..." } }` ; pas de crash |
| **MSG-015** | Erreur propagée — async/await rejection | Messaging | Vérifier qu'une Promise rejetée est correctement propagée | SW actif | Handler async qui rejette → le rejet est capturé et retourné comme erreur formatée ; pas d'Unhandled Promise Rejection |
| **MSG-016** | Message vers content script depuis popup | Messaging | Vérifier que la popup peut envoyer un message à un content script (via onglet actif) | Content script injecté dans l'onglet actif | Popup → `chrome.tabs.sendMessage(tabId, { type: "GET_PAGE_INFO" })` → CS répond avec les données de la page |
| **MSG-017** | Message vers content script si pas injecté | Messaging | Vérifier le cas où le content script n'est pas injecté dans l'onglet cible | Onglet non supporté | `tabs.sendMessage` → callback d'erreur (pas de port) ; le message retourne `{ success: false, error: { code: "NO_CONTENT_SCRIPT" } }` |
| **MSG-018** | Sérialisation — types complexes | Messaging | Vérifier que les données complexes (Date, Map, Buffer) sont correctement sérialisées avant envoi | SW actif | Payload contenant une date → convertie en ISO string avant transfert ; payload contenant un Map → converti en object ; pas de perte de structure |
| **MSG-019** | Taille max message — 64KB | Messaging | Vérifier la limite de taille des messages (Chrome limite à 65 536 octets) | SW actif | Envoi d'un message de 70KB → erreur ` chrome.runtime.lastError: Message too large` ; l'extension doit découper ou compresser les gros payloads |
| **MSG-020** | Cross-context — multiple onglets | Messaging | Vérifier que les messages envoyés depuis plusieurs onglets sont traités indépendamment | 3 onglets avec CS injecté | Chaque CS envoie `{ type: "PING" }` → chaque réponse est reçue par l'expéditeur correct ; pas de mélange de réponses entre onglets |

---

## 5. Auth Synchronization

L'extension partage la session avec l'application web DataPresent. Gère le login/logout, token exchange, guest mode.

| ID | Scenario | Catégorie | Description | Preconditions | Résultat attendu |
|---|---|---|---|---|---|
| **AUTH-001** | Session cookie partagé — même domaine | Auth Sync | Vérifier que l'extension peut lire le cookie de session depuis l'app web (même domaine) | Extension installée, utilisateur connecté sur datapresent.com | Cookie `__session` ou `next-auth.session-token` accessible via `chrome.cookies.get({ url: "https://datapresent.com", name: "__session" })` |
| **AUTH-002** | Token stocké dans storage après login | Auth Sync | Vérifier qu'après login réussi, le token JWT est stocké dans `storage.local` | Utilisateur connecté depuis l'extension | `storage.local.get("authToken")` retourne `{ token: "jwt...", refreshToken: "rt...", expiresAt: 1234567890 }` |
| **AUTH-003** | Login depuis extension — popup | Auth Sync | Vérifier le flux de connexion complet depuis la popup | Popup ouverte, utilisateur non connecté | Clic "Se connecter" → ouverture d'un nouvel onglet vers `/login` ; après login → message vers SW ; popup affiche "Connecté en tant que user@email.com" |
| **AUTH-004** | Login — redirection vers l'app | Auth Sync | Vérifier la redirection OAuth depuis l'extension | Extension non authée, `identity` permission présente | Appel `chrome.identity.launchWebAuthFlow` ou ouverture de popup → URL d'authentification Google/Github → callback avec code d'authentification |
| **AUTH-005** | Logout depuis extension — popup | Auth Sync | Vérifier que le logout depuis l'extension supprime le token local ET invalide la session web | Popup ouverte, utilisateur connecté | Clic "Se déconnecter" → token supprimé du storage → appel API de logout → cookie de session supprimé → popup rafraîchie affiche "Non connecté" |
| **AUTH-006** | Logout — session web persistante | Auth Sync | Vérifier qu'un logout depuis l'extension ne déconnecte pas la session web dans un autre onglet | Utilisateur connecté sur l'app web et l'extension | Logout depuis extension → l'onglet web DataPresent toujours ouvert : soit reste connecté (déconnexion isolée), soit est déconnecté avec un message "Session fermée sur un autre appareil" (comportement à définir) |
| **AUTH-007** | Logout depuis web → extension notifiée | Auth Sync | Vérifier que l'extension détecte un logout effectué depuis le web | Utilisateur connecté sur web + extension | Logout sur datapresent.com → soit via cookie expiration détectée au prochain ping, soit via `BroadcastChannel` ou storage event → extension passe en mode non-auth |
| **AUTH-008** | Token expiry — refresh automatique | Auth Sync | Vérifier que le token est refreshé automatiquement avant expiration | Token stocké, expiresAt < 5 min | SW détecte `expiresAt - Date.now() < 300s` → appelle `/auth/refresh` → nouveau token stocké ; aucune interruption pour l'utilisateur |
| **AUTH-009** | Token expiry — refresh en échec | Auth Sync | Vérifier le cas où le refresh échoue (token révoqué) | Token expiré, refresh invalide | Tentative de refresh → 401 → SW supprime tous les tokens → `AUTH_EXPIRED` broadcasté → popup affiche "Session expirée, reconnectez-vous" |
| **AUTH-010** | Guest mode — accès sans auth | Auth Sync | Vérifier que l'extension fonctionne en mode invité (fonctionnalités limitées) | Extension installée, pas de token | Quick capture bloqué : "Connectez-vous pour capturer des données" ; icône grisée ; les rapports stockés localement sont accessibles en read-only |
| **AUTH-011** | Guest → Auth — upgrade seamless | Auth Sync | Vérifier qu'un utilisateur guest peut se connecter sans perdre ses données locales | Extension en mode guest, rapports locaux stockés | Login → fusion des données locales avec le compte cloud ; pas de perte de rapports existants ; popup affiche les rapports fusionnés |
| **AUTH-012** | Changement de compte — data isolation | Auth Sync | Vérifier que le changement de compte utilisateur isole correctement les données | Utilisateur A connecté, données A stockées | Logout → login en tant qu'utilisateur B → storage affiche les données de B ; les données de A restent chiffrées/isolées (pas visibles) |
| **AUTH-013** | Auth persist — redémarrage navigateur | Auth Sync | Vérifier que l'authentification persiste après un redémarrage du navigateur | Extension authée | Token stocké dans `storage.local` → redémarrage navigateur → SW se réveille → `get("authToken")` retourne le token → utilisateur toujours considéré connecté |
| **AUTH-014** | Auth — plan API feature gates | Auth Sync | Vérifier que l'extension expose les feature gates basés sur le plan Stripe de l'utilisateur | Utilisateur connecté, plan FREE | `getUserPlan()` retourne `{ plan: "FREE", limits: { reportsPerMonth: 3, maxSlides: 8 } }` ; la popup désactive les fonctionnalités non disponibles (ex: export DOCX) |
| **AUTH-015** | Auth — multi-org / org switch | Auth Sync | Vérifier que le changement d'organisation dans l'extension met à jour les données et les limites | Utilisateur connecté, 2 organisations | Switch d'org → nouvelle API call avec `X-Org-Id` header → storage mis à jour avec les rapports et limites de la nouvelle organisation |
| **AUTH-016** | Auth — sync entre fenêtres | Auth Sync | Vérifier que la connexion/déconnexion dans une fenêtre est répercutée dans une autre fenêtre | 2 fenêtres de navigateur avec popup ouverte | Login dans fenêtre A → fenêtre B reçoit un event de sync (storage event ou message) → popup de B se met à jour sans rechargement manuel |

---

## 6. Extension Lifecycle

Gère les événements du cycle de vie : installation, mise à jour, désinstallation, démarrage navigateur.

| ID | Scenario | Catégorie | Description | Preconditions | Résultat attendu |
|---|---|---|---|---|---|
| **LIFE-001** | Installation — onInstalled event | Lifecycle | Vérifier que l'event `chrome.runtime.onInstalled` est déclenché avec `reason: "install"` | Extension jamais installée, première installation | `onInstalled` appelé avec `{ reason: "install", previousVersion: undefined }` ; le handler exécute les tâches d'initialisation (setup storage, alarmes, etc.) |
| **LIFE-002** | Installation — page de bienvenue | Lifecycle | Vérifier qu'une page de bienvenue / onboarding s'ouvre à la première installation | Extension installée | `chrome.tabs.create({ url: "https://datapresent.com/extension/welcome" })` appelé ; l'onglet s'ouvre avec la page de bienvenue ; un flag `welcomeShown: true` est stocké |
| **LIFE-003** | Installation — valeurs par défaut | Lifecycle | Vérifier que le storage est initialisé avec les valeurs par défaut à l'installation | Extension installée | `storage.local.get("defaults")` retourne les valeurs par défaut : `theme: "system"`, `locale: navigator.language`, `notifications: true`, `autoDetect: true`, etc. |
| **LIFE-004** | Installation — alarmes créées | Lifecycle | Vérifier que les alarmes périodiques sont créées à l'installation | Extension installée | `chrome.alarms.getAll()` retourne les alarmes : `DATAPRESENT_KEEPALIVE`, `DATAPRESENT_TOKEN_REFRESH`, `DATAPRESENT_SYNC` |
| **LIFE-005** | Update — onInstalled reason "update" | Lifecycle | Vérifier que l'event `onInstalled` est déclenché avec `reason: "update"` lors d'une mise à jour | Extension mise à jour de v1.0.0 à v1.1.0 | `onInstalled` appelé avec `{ reason: "update", previousVersion: "1.0.0" }` ; le handler exécute les tâches de migration nécessaires |
| **LIFE-006** | Update — changelog ouvert | Lifecycle | Vérifier qu'une page "what's new" s'ouvre après une mise à jour | Extension mise à jour | `chrome.tabs.create({ url: "https://datapresent.com/extension/changelog" })` OU notification in-app affichée dans la popup ; un flag `changelogShown: "1.1.0"` stocké |
| **LIFE-007** | Update — migration de storage | Lifecycle | Vérifier que les données sont migrées lors d'une mise à jour entre versions majeures | Extension v1.0.0 → v2.0.0, format de storage changé | `storageVersion` detecté comme 1.0.0 → script de migration exécuté → données converties → `storageVersion` mis à jour à 2.0.0 ; logs de migration visibles |
| **LIFE-008** | Update — permissions supplémentaires | Lifecycle | Vérifier que l'utilisateur est informé si de nouvelles permissions sont requises | Extension mise à jour avec nouvelles permissions | Chrome affiche automatiquement la bannière "Nouvelles permissions requises" ; après acceptation, les nouvelles fonctionnalités sont disponibles |
| **LIFE-009** | Uninstall — survey URL | Lifecycle | Vérifier que l'URL de survey est définie pour `chrome.runtime.setUninstallURL` | Extension installée | `chrome.runtime.setUninstallURL("https://datapresent.com/extension/uninstall-survey")` appelé lors du setup ; la redirection fonctionne après désinstallation |
| **LIFE-010** | Uninstall — cleanup local data | Lifecycle | Vérifier que les données utilisateur sont supprimées à la désinstallation | Extension installée, données stockées | À la désinstallation, Chrome supprime automatiquement `storage.local` et `storage.sync` ; pas de résidu de données utilisateur |
| **LIFE-011** | Browser startup — extension chargée | Lifecycle | Vérifier que l'extension est chargée au démarrage du navigateur | Extension installée, navigateur redémarré | Au démarrage, le SW se réveille et les alarmes sont rétablies (Chrome MV3 les recharge automatiquement) ; pas d'erreur au chargement |
| **LIFE-012** | Browser startup — session restaurée | Lifecycle | Vérifier que l'état d'authentification est restauré après démarrage | Extension authée, navigateur redémarré | SW se réveille → `get("authToken")` → token valide → utilisateur connecté ; si token expiré → tentative de refresh automatique |
| **LIFE-013** | Context menu — création à l'install | Lifecycle | Vérifier que les menus contextuels sont créés à l'installation (si feature flag activé) | `NEXT_PUBLIC_ENABLE_CONTEXT_MENU=true` | `chrome.contextMenus.create` appelé avec les items : "Capturer les données", "Envoyer à DataPresent" ; les menus apparaissent dans le clic droit |
| **LIFE-014** | Context menu — cleanup à l'update | Lifecycle | Vérifier que les menus contextuels sont recréés lors d'une mise à jour (évite les doublons) | Extension mise à jour | `chrome.contextMenus.removeAll()` appelé puis les menus sont recréés ; pas d'items en double dans le menu contextuel |

---

## 7. Cross-cutting Concerns

Performance, compatibilité, sécurité, internationalisation, accessibilité.

| ID | Scenario | Catégorie | Description | Preconditions | Résultat attendu |
|---|---|---|---|---|---|
| **CROSS-001** | Performance — temps de démarrage SW | Performance | Vérifier que le temps de démarrage du SW est dans les limites acceptables | Extension installée | `performance.now()` mesuré depuis `runtime.onInstalled` / `runtime.onStartup` jusqu'à la fin du setup < 500ms après le premier wake-up |
| **CROSS-002** | Performance — mémoire popup | Performance | Vérifier que la popup n'utilise pas trop de mémoire | Popup ouverte avec 50 rapports récents | Heap de la popup < 50 MB ; pas de fuite mémoire détectée après 5 ouvertures/fermetures |
| **CROSS-003** | Performance — temps de réponse messagerie | Performance | Vérifier les temps de latence de la messagerie | SW actif, popup ouverte | Ping → réponse < 50ms ; `getRecentReports` avec 20 rapports < 200ms ; `captureData` avec 100KB de données < 500ms |
| **CROSS-004** | CSP — pas de violation | Security | Vérifier qu'aucune violation CSP n'est émise par le SW, la popup ou le content script | Extension chargée, toutes les pages testées | Console du navigateur : 0 violation CSP ; tous les fetch, websocket, eval, inline scripts sont conformes à la CSP déclarée |
| **CROSS-005** | Multi-browser — Chrome | Compatibility | Vérifier que l'extension fonctionne sur Chrome (MV3 natif) | Chrome 120+ | Tous les tests passent ; les APIs chrome.* sont disponibles ; pas d'erreur chrome.runtime.lastError non gérée |
| **CROSS-006** | Multi-browser — Edge (Chromium) | Compatibility | Vérifier que l'extension fonctionne sur Edge (même base Chromium) | Edge 120+ | Mêmes tests que Chrome ; l'ID de l'extension est différent mais les APIs sont identiques ; les icônes et la popup s'affichent correctement dans l'UI Edge |
| **CROSS-007** | Multi-browser — Firefox (Manifest V3 partiel) | Compatibility | Vérifier que l'extension fonctionne sur Firefox (support MV3 partiel) | Firefox 120+ | Les APIs supportées fonctionnent ; les différences (ex: `runtime.onMessage` sans `sendResponse` synchrone) sont gérées via compat layer ; pas d'erreur bloquante |
| **CROSS-008** | i18n — fichiers de traduction | i18n | Vérifier que les fichiers `_locales/fr/messages.json` et `_locales/en/messages.json` sont présents et valides | Extension buildée | Les deux fichiers existent dans le build ; `chrome.i18n.getMessage()` retourne la bonne traduction pour chaque clé ; pas de clé manquante |
| **CROSS-009** | i18n — fallback anglais | i18n | Vérifier que les clés non traduites en français utilisent l'anglais comme fallback | Extension buildée, locale FR | Si `_locales/fr/messages.json` manque une clé → le message anglais de `_locales/en/messages.json` est utilisé ; pas d'affichage de "??messageKey??" |
| **CROSS-010** | i18n — popup bilingue | i18n | Vérifier que la popup s'affiche dans la bonne langue selon le navigateur | Navigateur configuré en FR / EN | Navigateur en français → popup en français ; navigateur en anglais → popup en anglais ; changement de langue navigateur (après redémarrage) → popup adaptée |
| **CROSS-011** | Erreur fatale — crash SW | Resilience | Vérifier le comportement si le SW crash (exception fatale non rattrapée) | SW actif | SW crash → Chrome redémarre automatiquement le SW dans les secondes qui suivent ; pas de perte de fonctionnalité > 30s ; l'utilisateur voit juste un délai si la popup est ouverte |
| **CROSS-012** | Feature flag — désactivation notifications | Feature Flags | Vérifier que le feature flag `NEXT_PUBLIC_ENABLE_NOTIFICATIONS=false` désactive les notifications | Feature flag à false | `chrome.notifications.create()` n'est pas appelé ; l'UI de la popup n'affiche pas le toggle notifications ; les événements de notification sont ignorés |

---

## Zones non couvertes (scope hors Core Architecture)

Les scénarios suivants ne sont PAS inclus dans ce document car ils concernent les **features métier** de l'extension (à couvrir dans des spec files séparés) :

| Feature | Justification |
|---|---|
| Quick Capture de données (tableaux, CSV) | Feature métier → `quick-capture.spec.ts` |
| Bookmarklet / sauvegarde d'URL | Feature métier → `bookmarklet.spec.ts` |
| Site-specific detection (Google Sheets, etc.) | Feature métier → `site-detection.spec.ts` |
| Notifications push de statut rapport | Feature métier → `notifications.spec.ts` |
| Dashboard / liste des rapports dans la popup | Feature métier → `popup-dashboard.spec.ts` |
| Upload depuis l'extension | Feature métier → `upload.spec.ts` |
| Export/Share depuis l'extension | Feature métier → `export-share.spec.ts` |

---

## Configuration Playwright recommandée

```typescript
// playwright.config.ts (datapresent-extension/)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report" }], ["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Extension testing requires Chromium
        launchOptions: {
          args: [
            `--disable-extensions-except=${__dirname}/dist`,
            `--load-extension=${__dirname}/dist`,
          ],
        },
      },
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        launchOptions: {
          args: ["--load-extension=${__dirname}/dist"],
        },
      },
    },
  ],
});
```

### Fixtures Playwright pour tests d'extension

```typescript
// tests/e2e/fixtures/extension.ts
import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

const EXTENSION_PATH = path.resolve(__dirname, "../../dist");

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const browser = await chromium.launch({
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    const context = await browser.newContext();
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    let [background] = context.serviceWorkers;
    if (!background) background = await context.waitForEvent("serviceworker");
    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});

export { expect } from "@playwright/test";
```

---

## Structure de test recommandée

```
datapresent-extension/tests/e2e/
├── playwright.config.ts
├── fixtures/
│   ├── extension.ts            # Extension-specific test fixtures
│   ├── mock-api.ts             # API mocking utilities
│   └── storage.ts              # Chrome storage helpers
├── suites/
│   ├── manifest.spec.ts        # MANIF-001 to MANIF-014
│   ├── background.spec.ts      # SW-001 to SW-018
│   ├── storage.spec.ts         # STORAGE-001 to STORAGE-018
│   ├── messaging.spec.ts       # MSG-001 to MSG-020
│   ├── auth.spec.ts            # AUTH-001 to AUTH-016
│   └── lifecycle.spec.ts       # LIFE-001 to LIFE-014 / CROSS-001 to CROSS-012
├── mock-api/
│   └── server.ts               # Stub API server for tests
└── .env.test                   # Test environment variables
```

---

## Récapitulatif

| Catégorie | Nb scénarios | Priorité |
|---|---|---|
| Manifest & Permissions | 14 | 🔴 Critique |
| Background Service Worker | 18 | 🔴 Critique |
| Chrome Storage | 18 | 🔴 Critique |
| Messaging Protocol | 20 | 🔴 Critique |
| Auth Synchronization | 16 | 🟡 Haute |
| Extension Lifecycle | 14 | 🟡 Haute |
| Cross-cutting Concerns | 12 | 🟢 Moyenne |
| **Total** | **112** | |

> **Légende Priorité :** 🔴 Critique = blocant pour le fonctionnement de base ; 🟡 Haute = important pour l'expérience utilisateur ; 🟢 Moyenne = tests de qualité/robustesse

---

*Document généré le 2026-06-21 — à mettre à jour quand le code source de l'extension sera implémenté.*
