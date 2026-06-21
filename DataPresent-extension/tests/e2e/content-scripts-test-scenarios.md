# DataPresent Extension — Content Scripts : Scénarios de test E2E Playwright manquants

> **Projet :** DataPresent  
> **Feature :** Extension navigateur — Content Scripts (site detection, data extraction, DOM injection, iframe handling)  
> **Date :** 2026-06-21  
> **Status :** Analyse exhaustive des scénarios de test pour l'extension (squelette, code source à implémenter)

---

## Préambule — Architecture inférée de l'extension

L'extension DataPresent est un squelette sans code source. Les scénarios ci-dessous sont basés sur l'analyse du produit DataPresent (SaaS de conversion de données en présentations) et sur les patterns standards des extensions Chrome/Edge/Firefox de type "Web Clipper" (Evernote Web Clipper, Notion Web Clipper, Table Capture, Data Miner).

### Structure inférée des content scripts

```
datapresent-extension/src/content/
├── manifest.json              # permissions, content_scripts, host_permissions
├── content-script.ts          # Entry point : injected sur les sites matchés
├── site-detector.ts           # Détection du type de site (Google Sheets, Airtable, etc.)
├── table-detector.ts          # Détection des tableaux HTML dans le DOM
├── data-extractor.ts          # Extraction des données structurées (JSON, CSV)
├── ui-injector.ts             # Injection des boutons/floating indicators
├── context-menu.ts            # Gestion du menu contextuel
├── messaging.ts               # Communication avec le background script
└── utils/
    ├── dom.ts                 # Helpers DOM (highlight, positionnement)
    ├── parser.ts              # Parsing CSV inline, JSON blobs
    └── sanitizer.ts           # Nettoyage et validation des données extraites
```

### Permissions inférées du manifest.json

```json
{
  "manifest_version": 3,
  "name": "DataPresent",
  "permissions": [
    "activeTab",
    "contextMenus",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "https://docs.google.com/*",
    "https://*.airtable.com/*",
    "https://*.notion.so/*",
    "https://*.coda.io/*",
    "https://github.com/*",
    "https://*.data.gov/*",
    "<all_urls>"
  ],
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content/content-script.js"],
      "run_at": "document_idle"
    }
  ]
}
```

---

## Légende

| Icône | Catégorie |
|-------|-----------|
| ✅ | Success Path — Parcours nominal |
| ❌ | Error Path — Gestion d'erreur |
| ⚡ | Edge Case — Cas limite |
| 🔒 | Security — Sécurité et vie privée |
| 🧩 | SPA — Dynamic content / Single Page Apps |
| ♿ | Accessibility — Accessibilité |
| 📱 | Responsive — Comportement adaptatif |

---

## 1. Content Script Injection

Le content script doit être injecté au bon moment, sur les bons sites, sans fuite mémoire entre les tabs.

### 1.1 Injection Conditionnelle

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| INJ-001 | Script injecté sur URL avec tableaux HTML | ✅ | Page quelconque contenant un tableau HTML (`<table>`) | 1. Naviguer vers une page contenant un tableau<br>2. Inspecter le contexte d'exécution | `content-script.js` est exécuté, le DOM est accessible, les tableaux sont détectés |
| INJ-002 | Script injecté sur Google Sheets | ✅ | Session Google ouverte | 1. Naviguer vers `https://docs.google.com/spreadsheets/d/...` | Le script détecte l'URL Google Sheets et active le mode Sheets |
| INJ-003 | Script NON injecté sur pages sensibles (banque) | 🔒 | Configuration des pages exclues dans `manifest.json` ou vérification runtime | 1. Naviguer vers une URL de banque en ligne (ex: `https://banque.example.com/accounts`)<br>2. Vérifier l'absence du script | Aucun élément DataPresent n'apparaît, le script n'est pas exécuté |
| INJ-004 | Script NON injecté sur pages email (Gmail, Outlook) | 🔒 |  | 1. Naviguer vers `https://mail.google.com`<br>2. Vérifier | Aucune détection de tableau, aucun bouton injecté |
| INJ-005 | Script injecté sur pages d'administration (admin) | ✅ |  | 1. Naviguer vers une page admin avec tableaux | Script exécuté normalement, détection active |
| INJ-006 | Injection sur pages sécurisées (HTTPS) | ✅ |  | 1. Naviguer vers n'importe quelle page HTTPS avec tableaux | Fonctionne normalement |
| INJ-007 | Injection sur pages non-sécurisées (HTTP) | ✅ |  | 1. Naviguer vers une page HTTP avec tableaux | Fonctionne normalement (si autorisé) |

### 1.2 Injection Timing & Cycle de Vie

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| INJ-008 | Injection à `document_idle` — wait for full DOM | ✅ | Page avec chargement lent (images, scripts tiers) | 1. Naviguer vers page lente<br>2. Vérifier que le script attend le DOM complet | Tous les tableaux sont détectés, le script s'exécute après le rendu initial |
| INJ-009 | Injection à `document_end` — détection partielle | ✅ | Utilisation de `document_end` au lieu de `document_idle` | 1. Naviguer vers page avec tableaux chargés dynamiquement | Tableaux présents dans le HTML initial sont détectés |
| INJ-010 | Script injecté une seule fois par page | ⚡ | Navigation standard | 1. Naviguer vers une page<br>2. Vérifier le compteur d'exécution via une variable globale ou un console.log | Le script s'exécute exactement 1 fois par page |
| INJ-011 | Script non injecté dans les iframes cross-origin | 🔒 | Page tierce avec iframe cross-origin | 1. Naviguer vers page contenant un iframe cross-origin<br>2. Vérifier l'intérieur de l'iframe | Le content script n'est PAS injecté dans les iframes cross-origin |

### 1.3 Multi-Tabs

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| INJ-012 | Script isolé par tab — pas de fuite mémoire | ⚡ | 2 onglets ouverts avec tableaux | 1. Ouvrir Tab A (tableau 1)<br>2. Ouvrir Tab B (tableau 2)<br>3. Interagir avec le bouton DataPresent dans Tab A<br>4. Revenir à Tab B | Les états sont indépendants. Tab B n'a pas changé suite à l'interaction dans Tab A. |
| INJ-013 | Script nettoyé lors de la fermeture du tab | ⚡ |  | 1. Ouvrir page avec tableau<br>2. Injecter un highlight<br>3. Fermer le tab<br>4. Rouvrir la même page | Aucun résidu visuel, le script repart de zéro |
| INJ-014 | Script nettoyé lors de la navigation interne (SPA) | 🧩 | Page SPA (React) avec tables | 1. Naviguer vers page A de la SPA (avec tableau)<br>2. Naviguer vers page B de la SPA (sans tableau)<br>3. Naviguer vers page C (avec tableau) | Les highlights et boutons de la page A sont nettoyés. La page C est détectée proprement. |

---

## 2. Table Detection (HTML `<table>`)

Le cœur de l'extension : détecter les tableaux HTML et en extraire les données structurées.

### 2.1 Tableaux Standards

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| TBL-001 | Tableau HTML standard avec `<thead>` et `<tbody>` | ✅ | Page contenant `<table><thead><tr><th>Nom<th>Valeur</th></tr></thead><tbody><tr><td>A<td>1</td></tr></tbody></table>` | 1. Naviguer vers page<br>2. Vérifier détection | Le tableau est détecté. 2 colonnes (Nom, Valeur), 1 ligne de données. |
| TBL-002 | Tableau avec `<thead>` uniquement, pas de `<tbody>` | ✅ | `<table><thead>...` mais `<tr>` directement dans `<table>` | 1. Naviguer<br>2. Vérifier | Détecté correctement, les en-têtes sont dans `<thead>`, les données dans `<tr>` directs |
| TBL-003 | Tableau sans `<thead>` ni `<tbody>` | ✅ | `<table><tr><th>Nom<th>Valeur</th></tr><tr><td>A<td>1</td></tr></table>` | 1. Naviguer<br>2. Vérifier | Détecté, la première ligne est traitée comme en-tête |
| TBL-004 | Tableau avec `<caption>` | ✅ | `<table><caption>Ventes 2026</caption>...` | 1. Naviguer<br>2. Vérifier | Tableau détecté, le caption est extrait comme titre/méta-donnée |
| TBL-005 | Tableau avec `<colgroup>` et `<col>` | ✅ | Tableau avec largeurs de colonnes définies via `<colgroup>` | 1. Naviguer<br>2. Vérifier | Tableau détecté, les infos de colgroup ne perturbent pas l'extraction |
| TBL-006 | Tableau responsive (`overflow-x: auto`) | ✅ | Tableau dans un conteneur à scroll horizontal | 1. Naviguer<br>2. Vérifier | Tableau détecté malgré le wrapper |
| TBL-007 | Tableau avec `role="table"` ARIA | ♿ | `<div role="table"><div role="rowgroup"><div role="row">...` | 1. Naviguer<br>2. Vérifier | Détecté via rôles ARIA (fallback si pas de `<table>` natif) |
| TBL-008 | Tableau avec `role="grid"` ARIA | ♿ | `<div role="grid">...` (DataGrid pattern) | 1. Naviguer<br>2. Vérifier | Détecté via rôles ARIA grid pattern |

### 2.2 Tableaux Complexes

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| TBL-009 | Tableau avec cellules fusionnées (`colspan`) | ⚡ | `<td colspan="2">valeur étendue</td>` | 1. Naviguer<br>2. Extraire | `colspan` est traité : soit duplication de la valeur sur les colonnes étendues, soit marquage spécial (ex: `valeur_étendue \t (colspan:2)`) |
| TBL-010 | Tableau avec cellules fusionnées (`rowspan`) | ⚡ | `<td rowspan="3">valeur verticale</td>` | 1. Naviguer<br>2. Extraire | `rowspan` est traité : la valeur est propagée sur les lignes fusionnées |
| TBL-011 | Tableau avec `colspan` ET `rowspan` combinés | ⚡ | Complexe : cellules fusionnées dans les deux directions | 1. Naviguer<br>2. Extraire | La grille résultante est cohérente (pas de décalage de colonnes) |
| TBL-012 | Tableaux imbriqués (table dans une cellule) | ⚡ | `<table id="parent"><tr><td><table id="nested">...</table></td></tr></table>` | 1. Naviguer<br>2. Vérifier détection | Deux tableaux détectés : parent et nested. Pas de confusion entre les deux. |
| TBL-013 | Tableau avec `<th>` dans `<tbody>` (en-têtes intermédiaires) | ⚡ | `<tbody><tr><th>Section A<th>Total<tr><td>A<td>1` | 1. Naviguer<br>2. Extraire | Les `<th>` dans `<tbody>` sont détectés comme des en-têtes de section ou ignorés proprement |
| TBL-014 | Tableau avec cellules vides (`<td></td>`) | ⚡ | `<tr><td>Nom<td><td>Valeur</td></tr>` (cellule du milieu vide) | 1. Naviguer<br>2. Extraire | La cellule vide est extraite comme chaîne vide `""` ou `null` — pas de décalage |
| TBL-015 | Tableau avec cellules contenant des espaces insécables (`&nbsp;`) | ⚡ | `<td>&nbsp;</td>` | 1. Naviguer<br>2. Extraire | Traité comme cellule vide, pas comme chaîne "&nbsp;" ou espace |
| TBL-016 | Tableau avec `<br>` dans les cellules (multi-lignes) | ⚡ | `<td>Ligne 1<br>Ligne 2</td>` | 1. Naviguer<br>2. Extraire | Le contenu multi-ligne est conservé (ex: "Ligne 1\nLigne 2") |
| TBL-017 | Tableau avec éléments inline dans les cellules (`<span>`, `<strong>`, `<em>`) | ⚡ | `<td><strong>Important</strong> <span class="text-muted">note</span></td>` | 1. Naviguer<br>2. Extraire | Le `textContent` ou `innerText` est extrait (ex: "Important note"), pas le HTML brut |
| TBL-018 | Tableau avec liens `<a href>` dans les cellules | ⚡ | `<td><a href="/detail">Voir plus</a></td>` | 1. Naviguer<br>2. Extraire | Texte du lien extrait ("Voir plus") OU option de garder l'URL en métadonnée |
| TBL-019 | Tableau avec images `<img>` dans les cellules | ⚡ | `<td><img src="icon.png" alt="Check mark"></td>` | 1. Naviguer<br>2. Extraire | L'attribut `alt` est extrait comme valeur textuelle ("Check mark") |
| TBL-020 | Tableau avec `input` / `select` / `checkbox` dans les cellules | ⚡ | `<td><input type="checkbox" checked></td>` | 1. Naviguer<br>2. Extraire | La valeur de l'input est extraite (ex: "✓" pour checkbox cochée, valeur du select) |

### 2.3 Cas Limites

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| TBL-021 | Tableau vide (0 lignes de données) | ⚡ | `<table><thead><tr><th>Nom<th>Valeur</th></tr></thead><tbody></tbody></table>` | 1. Naviguer<br>2. Vérifier | Le tableau est détecté (en-têtes visibles) mais signale "0 lignes de données" |
| TBL-022 | Tableau sans en-têtes (0 `<th>`) | ⚡ | `<table><tr><td>A<td>1</td></tr><tr><td>B<td>2</td></tr></table>` | 1. Naviguer<br>2. Extraire | Les colonnes sont nommées automatiquement (`Colonne 1`, `Colonne 2` ou `A`, `B`, `C`) |
| TBL-023 | Tableau avec une seule ligne de données | ⚡ | `1 ligne <tr>` dans `<tbody>` | 1. Naviguer<br>2. Extraire | Extrait correctement 1 ligne |
| TBL-024 | Tableau avec une seule colonne | ⚡ | 1 colonne uniquement | 1. Naviguer<br>2. Extraire | Extrait correctement |
| TBL-025 | Tableau très grand (10 000+ lignes) | ⚡ | Générer une page avec 10 000 `<tr>` | 1. Naviguer<br>2. Attendre détection<br>3. Mesurer le temps | Le tableau est détecté en < 2 secondes. Pas de freeze du tab. |
| TBL-026 | Tableau très large (100+ colonnes) | ⚡ | 100 colonnes, 10 lignes | 1. Naviguer<br>2. Extraire | Extraction réussie, pas de dépassement de mémoire |
| TBL-027 | Tableau avec classe CSS `display: none` | ⚡ | `<table style="display:none">...</table>` | 1. Naviguer<br>2. Vérifier | Le tableau caché n'est PAS détecté (ou détecté mais signalé comme caché) |
| TBL-028 | Tableau avec `visibility: hidden` | ⚡ | `<table style="visibility:hidden">...</table>` | 1. Naviguer<br>2. Vérifier | Non détecté (ou signalé caché) |
| TBL-029 | Tableau avec `opacity: 0` | ⚡ | `<table style="opacity:0">...</table>` | 1. Naviguer<br>2. Vérifier | Comportement à définir : soit ignoré (invisible), soit détecté (dans le layout) |
| TBL-030 | Tableau dans une section `aria-hidden="true"` | ♿🔒 | `<div aria-hidden="true"><table>...</table></div>` | 1. Naviguer<br>2. Vérifier | Le tableau doit être ignoré (contenu non destiné aux utilisateurs) |
| TBL-031 | Tableau dans un conteneur avec `overflow: hidden` et scroll | ⚡ | Tableau tronqué visuellement mais présent dans le DOM | 1. Naviguer<br>2. Extraire | Le tableau complet (y compris partie cachée par scroll) est extrait depuis le DOM |
| TBL-032 | Tableau avec `data-*` attributes portant des informations structurées | ⚡ | `<td data-value="1234">1 234 €</td>` | 1. Naviguer<br>2. Extraire | L'attribut `data-value` peut être utilisé comme valeur normalisée (optionnel) |
| TBL-033 | Tableau avec 0 `<table>` dans le DOM (pas de tableau) | ⚡ | Page de texte sans aucun tableau | 1. Naviguer<br>2. Vérifier | Aucun tableau détecté, message "Aucune donnée trouvée" |

---

## 3. Google Sheets Detection

L'intégration Google Sheets est un cas d'usage majeur pour DataPresent.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| GSH-001 | URL Google Sheets valide détectée | ✅ | Navigateur connecté à Google | 1. Naviguer vers `https://docs.google.com/spreadsheets/d/(id)/edit`<br>2. Vérifier | Le détecteur reconnaît le pattern URL et active le mode Google Sheets |
| GSH-002 | URL Google Sheets avec `/export?format=csv` | ✅ |  | 1. Naviguer vers l'URL d'export CSV | Détecté comme page de données, extraction possible |
| GSH-003 | Sheets avec données chargées (feuille non vide) | ✅ | Sheets contenant données (A1:Z100) | 1. Naviguer vers le Sheets<br>2. Attendre chargement complet<br>3. Vérifier détection | Le script détecte la présence de cellules remplies et propose l'import |
| GSH-004 | Sheets vide (feuille vierge) | ⚡ | Nouveau Google Sheets sans données | 1. Naviguer<br>2. Vérifier | Détecté comme Sheets, mais signalé "Aucune donnée" |
| GSH-005 | Sheets avec cellules fusionnées | ⚡ | Sheets avec `mergeCells` | 1. Naviguer<br>2. Extraire | Les cellules fusionnées sont traitées (valeur propagée) |
| GSH-006 | Sheets avec plusieurs onglets (feuilles) | ⚡ | Sheets avec 3 onglets : "Ventes 2025", "Ventes 2026", "Résumé" | 1. Naviguer<br>2. Vérifier | Le script détecte les onglets et propose l'extraction de l'onglet actif OU la sélection d'onglet |
| GSH-007 | Sheets avec formules (affichage des valeurs calculées) | ⚡ | Cellules contenant `=SUM(A1:A10)`, `=VLOOKUP(...)` | 1. Naviguer<br>2. Extraire | Les valeurs calculées (affichées) sont extraites, pas les formules brutes |
| GSH-008 | Sheets protégé/privé (pas d'accès en lecture) | ❌ | Sheets avec accès restreint (l'utilisateur n'a pas les droits) | 1. Naviguer vers un Sheets privé<br>2. Vérifier | Le script détecte le Sheets mais ne peut pas lire les données. Message : "Données non accessibles — vérifiez vos permissions" |
| GSH-009 | Sheets non connecté à Google (pas de session) | ❌ | Navigateur non connecté au compte Google | 1. Naviguer vers `docs.google.com/spreadsheets/...`<br>2. Vérifier | La page Google Sheets peut ne pas charger (redirect vers login). Le script gère l'absence de données. |
| GSH-010 | Sheets avec formatage conditionnel (couleurs, barres de données) | ⚡ | Sheets avec mise en forme conditionnelle active | 1. Naviguer<br>2. Extraire | Les valeurs sont extraites, le formatage visuel n'affecte pas les données textuelles |
| GSH-011 | Sheets avec graphiques intégrés | ⚡ | Sheets contenant des charts | 1. Naviguer<br>2. Vérifier | Les graphiques ne sont pas extraits comme données tabulaires (ou bien extraits séparément comme métadonnées) |
| GSH-012 | Extraction via API Google Sheets (OAuth) | 🔒 | Extension avec token OAuth Google Sheets API | 1. Naviguer vers Sheets<br>2. Autoriser l'extension<br>3. Extraire via API | Les données sont extraites via l'API v4, avec gestion du quota et des refresh tokens |
| GSH-013 | Extraction depuis un Google Sheets public (lié en lecture) | ✅ | Sheets public (partagé avec "Toute personne disposant du lien") | 1. Naviguer sans être connecté (new window)<br>2. Vérifier | Données extraites via le HTML rendu (fallback si pas d'API) |

---

## 4. Other Site Detection

L'extension peut détecter et s'intégrer à d'autres plateformes de données.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| SIT-001 | Airtable — détection de la base | ✅ | URL `https://airtable.com/appXXXX/tblYYYY/...` | 1. Naviguer vers une base Airtable<br>2. Vérifier | Détection du pattern Airtable, proposition "Envoyer à DataPresent" |
| SIT-002 | Airtable — vue en grille avec données | ✅ |  | 1. Naviguer<br>2. Attendre chargement des données<br>3. Extraire | Les données de la vue active sont extraites |
| SIT-003 | Notion — détection d'une base de données Notion | ✅ | URL `https://notion.so/workspace/...` avec une base (database) | 1. Naviguer vers une page Notion contenant une database<br>2. Vérifier | Détection du pattern Notion database |
| SIT-004 | Notion — extraction des données d'une table Notion | ✅ |  | 1. Naviguer<br>2. Extraire | Les lignes et colonnes de la base Notion sont extraites |
| SIT-005 | Coda — détection d'un doc Coda avec table | ✅ | URL `https://coda.io/d/...` contenant une table | 1. Naviguer<br>2. Vérifier | Détection du pattern Coda |
| SIT-006 | Bloc `<pre>` contenant du CSV inline | ✅ | Page avec `<pre>nom,age,ville\nAlice,30,Paris\nBob,25,Lyon</pre>` | 1. Naviguer<br>2. Vérifier | Détection du bloc CSV inline, proposition d'extraction |
| SIT-007 | Bloc `<code>` contenant du JSON structuré | ✅ | `<code>[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]</code>` | 1. Naviguer<br>2. Vérifier | Détection du JSON array, proposition d'extraction |
| SIT-008 | Bloc `<pre>` contenant du JSON (code block) | ✅ | `<pre class="language-json">[{"id":1}]</pre>` | 1. Naviguer<br>2. Vérifier | Détection via highlight.js / Prism.js class |
| SIT-009 | Bloc CSV sur GitHub (`https://github.com/*/blob/*.csv`) | ✅ | Repository GitHub contenant un fichier CSV | 1. Naviguer vers un CSV sur GitHub (vue "Raw" ou "Preview")<br>2. Vérifier | Détection du tableau rendu par GitHub ou du contenu brut |
| SIT-010 | GitHub — fichier CSV en vue "Raw" | ✅ | URL `https://raw.githubusercontent.com/.../file.csv` | 1. Naviguer<br>2. Vérifier | Détection du contenu texte, parsing CSV |
| SIT-011 | Data.gov / portail open data | ✅ | `https://data.gov/...` avec tableau de données | 1. Naviguer vers un portail open data<br>2. Vérifier | Détection des tableaux HTML standards sur ces portails |
| SIT-012 | PDF viewer natif du navigateur | ⚡ | URL se terminant par `.pdf` | 1. Naviguer vers un fichier PDF<br>2. Vérifier | Détection du viewer PDF natif. Extraction non possible directement (nécessite backend). Le bouton propose "Analyser ce PDF avec DataPresent" |
| SIT-013 | PDF.js viewer (Mozilla) | ⚡ | Page utilisant PDF.js (`https://mozilla.github.io/pdf.js/web/viewer.html`) | 1. Naviguer<br>2. Vérifier | Détection du canvas ou du texte extrait |
| SIT-014 | Wikipedia — tableaux d'infobox | ✅ | `https://en.wikipedia.org/wiki/Example` avec infobox table | 1. Naviguer vers n'importe quelle page Wikipedia<br>2. Vérifier | Les tableaux d'infobox et les tableaux de données Wikipedia sont détectés |
| SIT-015 | Wikipedia — tableaux de classement (rankings) | ✅ | Page Wikipedia avec tableau de classement (ex: "List of countries by GDP") | 1. Naviguer<br>2. Extraire | Le tableau de classement est correctement extrait avec ses en-têtes |
| SIT-016 | Site avec multiples tableaux (10+) sur la même page | ⚡ | Page contenant 15 tableaux HTML différents | 1. Naviguer<br>2. Vérifier détection | Tous les tableaux sont détectés et listés. |

---

## 5. UI Injection — Bouton "Créer un rapport DataPresent"

L'extension injecte des éléments UI pour permettre à l'utilisateur d'interagir avec les données détectées.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| UI-001 | Injection du bouton "Créer un rapport" à côté d'un tableau détecté | ✅ | Page avec 1 tableau | 1. Naviguer<br>2. Observer | Un bouton DataPresent (icône + texte) apparaît à droite ou au-dessus du tableau |
| UI-002 | Bouton visible et clickable | ✅ |  | 1. Naviguer<br>2. Cliquer sur le bouton | Le bouton répond au clic : une popup/overlay s'ouvre ou l'utilisateur est redirigé vers DataPresent web |
| UI-003 | Bouton ne chevauche pas le contenu existant | ⚡ |  | 1. Naviguer<br>2. Vérifier le positionnement du bouton | Le bouton est positionné avec un `position: absolute` ou un margin suffisant. Pas de superposition avec le tableau ou les éléments voisins |
| UI-004 | Bouton pour tableau en haut de page | ⚡ | Tableau positionné tout en haut du viewport | 1. Naviguer<br>2. Vérifier | Le bouton ne sort pas de l'écran, il est accessible |
| UI-005 | Bouton pour tableau en bas de page (scroll nécessaire) | ⚡ | Tableau après 3 écrans de contenu | 1. Naviguer<br>2. Scroller jusqu'au tableau<br>3. Vérifier | Le bouton est visible uniquement quand le tableau est dans le viewport (ou fixe) |
| UI-006 | Plusieurs tableaux → plusieurs boutons | ⚡ | Page avec 5 tableaux | 1. Naviguer<br>2. Vérifier | 5 boutons injectés, un par tableau |
| UI-007 | Identifiants uniques pour chaque bouton | ⚡ | 5 tableaux | 1. Inspecter les attributs | Chaque bouton a un `id` ou `data-table-id` unique |
| UI-008 | Bouton stylé cohérent avec le thème DataPresent | ✅ |  | 1. Vérifier le CSS injecté | Couleur primaire DataPresent (`#1e4d0f` ou `#5cb82a`), typographie DM Sans, coins arrondis |
| UI-009 | Bouton adapté au thème sombre de la page | ⚡ | Page avec `prefers-color-scheme: dark` ou classe `.dark` | 1. Naviguer vers page dark mode<br>2. Vérifier | Le bouton s'adapte (fond sombre, texte clair) ou utilise une version light |
| UI-010 | Bouton avec texte en français | 🌐 |  | 1. Naviguer<br>2. Vérifier | Texte : "Créer un rapport" (pas "Create report") |
| UI-011 | Bouton avec icône DataPresent (logo) | ✅ |  | 1. Inspecter | L'icône DataPresent (logo vert) ou un SVG inline est présent |
| UI-012 | Bouton accessible au clavier (Tab, Enter) | ♿ |  | 1. Tab jusqu'au bouton<br>2. Enter | Le bouton reçoit le focus, Enter déclenche l'action |
| UI-013 | Bouton avec `aria-label` descriptif | ♿ |  | 1. Inspecter l'attribut | `aria-label="Créer un rapport DataPresent à partir de ce tableau"` |
| UI-014 | Bouton injecté après chargement AJAX (contenu dynamique) | 🧩 |  | 1. Naviguer<br>2. Déclencher chargement AJAX de nouveaux tableaux | Le bouton apparaît sur les nouveaux tableaux chargés |
| UI-015 | Bouton supprimé quand le tableau est retiré du DOM (SPA) | 🧩 | SPA avec navigation | 1. Naviguer vers page avec tableau<br>2. Naviguer vers autre page (le tableau disparaît) | Le bouton associé est aussi supprimé |
| UI-016 | Bouton overlay flottant (optionnel) | ⚡ | Mode "quick action" où le bouton flotte au-dessus du tableau | 1. Naviguer<br>2. Scroller | Le bouton suit le scroll ou reste ancré au tableau |
| UI-017 | Bouton injecté dans les shadow DOM | ⚡ | Tableau dans un web component avec shadow DOM (ex: DataTable component) | 1. Naviguer vers page avec web component<br>2. Vérifier | Le détecteur accède au shadow DOM (si `mode: 'open'`) et injecte le bouton |
| UI-018 | Click sur le bouton → ouvre popup avec aperçu des données | ✅ |  | 1. Cliquer sur le bouton<br>2. Observer | Une popup/overlay s'ouvre montrant un aperçu du tableau extrait + bouton "Envoyer à DataPresent" |
| UI-019 | Click sur le bouton → envoie les données au background script | ✅ |  | 1. Cliquer sur le bouton<br>2. Vérifier via `chrome.runtime.sendMessage` | Les données sont envoyées au background script dans un format structuré |
| UI-020 | Click sur le bouton → ouvre DataPresent web dans un nouvel onglet | ✅ |  | 1. Cliquer<br>2. Vérifier | Un nouvel onglet s'ouvre vers `https://datapresent.app/new?data=base64_encoded` |

---

## 6. Context Menu (Menu Clic Droit)

Le menu contextuel permet d'envoyer rapidement des données à DataPresent.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| CTX-001 | Clic droit sur un tableau → option "Envoyer à DataPresent" visible | ✅ | Page avec `<table>` | 1. Faire clic droit sur le tableau<br>2. Vérifier | L'option "Envoyer ce tableau à DataPresent" apparaît dans le menu contextuel |
| CTX-002 | Clic droit en dehors d'un tableau → option absente | ⚡ | Page avec tableau | 1. Faire clic droit sur un espace vide<br>2. Vérifier | L'option N'apparaît PAS |
| CTX-003 | Clic droit sur une sélection de texte → option "Envoyer la sélection" | ✅ | Texte sélectionné sur la page | 1. Sélectionner du texte<br>2. Clic droit sur la sélection | L'option "Envoyer la sélection à DataPresent" apparaît |
| CTX-004 | Clic droit sur tableau → clique sur l'option → extraction et envoi | ✅ |  | 1. Clic droit sur tableau<br>2. Cliquer sur "Envoyer ce tableau à DataPresent" | Les données du tableau sont extraites et envoyées au background script |
| CTX-005 | Menu contextuel sur page sans données | ⚡ | Page sans aucun tableau ni contenu structuré | 1. Clic droit n'importe où | L'option DataPresent n'apparaît PAS (ou uniquement "Envoyer la page à DataPresent" comme fallback) |
| CTX-006 | Menu contextuel sur Google Sheets | ✅ | Google Sheets ouvert | 1. Clic droit sur une cellule/plage<br>2. Vérifier | Option "Envoyer cette plage à DataPresent" |
| CTX-007 | Menu contextuel sur du texte sélectionné dans un tableau | ⚡ | | 1. Sélectionner 3 cellules dans un tableau<br>2. Clic droit sur la sélection | Priorité : extraction de la sélection (pas du tableau entier) |
| CTX-008 | Menu contextuel — vérification de l'icône/label | ♿ |  | 1. Inspecter l'entrée du menu | L'entrée a une icône (logo DataPresent 16x16) et un texte clair |
| CTX-009 | Menu contextuel désactivé quand l'utilisateur n'est pas connecté | 🔒 |  | 1. Ne pas être connecté à DataPresent<br>2. Clic droit | Message "Connectez-vous à DataPresent pour utiliser cette fonctionnalité" |
| CTX-010 | Menu contextuel — envoi vers une URL spécifique via `chrome.tabs.create` | ✅ |  | 1. Cliquer sur l'option du menu | Nouvel onglet DataPresent ouvert avec les données encodées dans l'URL |

---

## 7. Data Extraction

L'extraction des données depuis le DOM vers un format structuré est le cœur fonctionnel.

### 7.1 Formats d'Extraction

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| EXT-001 | Extraction d'un tableau en JSON (array d'objets) | ✅ | Tableau 3×3 | 1. Naviguer<br>2. Extraire | Résultat : `[{"Nom":"Alice","Âge":"30","Ville":"Paris"}, {"Nom":"Bob","Âge":"25","Ville":"Lyon"}]` |
| EXT-002 | Extraction d'un tableau en CSV | ✅ | Tableau 3×3 | 1. Naviguer<br>2. Extraire | Résultat : `Nom,Âge,Ville\nAlice,30,Paris\nBob,25,Lyon` |
| EXT-003 | Extraction avec délimiteur CSV personnalisé (point-virgule) | ⚡ |  | 1. Naviguer<br>2. Extraire avec option `delimiter: ";"` | Résultat : `Nom;Âge;Ville\nAlice;30;Paris` |
| EXT-004 | Extraction avec en-têtes personnalisables | ⚡ |  | 1. Naviguer<br>2. Extraire avec option `headers: false` | Colonnes nommées automatiquement `Colonne 1`, `Colonne 2`, etc. |

### 7.2 Types de Données & Encodage

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| EXT-005 | Cellules avec nombres (entiers, décimaux) | ✅ | `<td>1234</td><td>99.99</td>` | 1. Extraire | Les nombres sont extraits comme chaînes "1234", "99.99" (ou typés comme numbers selon config) |
| EXT-006 | Cellules avec dates | ✅ | `<td>2026-06-21</td><td>21/06/2026</td>` | 1. Extraire | Dates extraites comme chaînes, format préservé |
| EXT-007 | Cellules avec montants en devise (€, $, £) | ✅ | `<td>1 234,56 €</td><td>$1,234.56</td>` | 1. Extraire | Formats monétaires préservés comme chaînes |
| EXT-008 | Cellules avec pourcentages | ✅ | `<td>85%</td><td>12.5 %</td>` | 1. Extraire | Pourcentages extraits comme chaînes |
| EXT-009 | Encodage UTF-8 — caractères spéciaux français | ✅ | `<td>Réunion</td><td>déjà-vu</td><td>cœur</td><td>ça</td>` | 1. Extraire | Caractères accentués préservés : "Réunion", "déjà-vu", "cœur", "ça" |
| EXT-010 | Encodage UTF-8 — caractères internationaux | ✅ | `<td>日本語</td><td>中文</td><td>ру́сский</td><td>العربية</td>` | 1. Extraire | Tous les caractères Unicode sont préservés |
| EXT-011 | Encodage Latin-1 (ISO-8859-1) | ⚡ | Page en Latin-1 avec caractères spéciaux | 1. Naviguer vers page en Latin-1<br>2. Extraire | Les caractères Latin-1 sont correctement convertis en UTF-8 |
| EXT-012 | Cellules contenant des sauts de ligne (`\n`) | ⚡ | `<td>Ligne 1\nLigne 2\nLigne 3</td>` | 1. Extraire en CSV | Le CSV doit correctement échapper les sauts de ligne (`"Ligne 1\nLigne 2\nLigne 3"`) |
| EXT-013 | Cellules contenant des virgules (conflit avec délimiteur CSV) | ⚡ | `<td>Paris, France</td>` | 1. Extraire en CSV | La cellule est échappée avec des guillemets : `"Paris, France"` |
| EXT-014 | Cellules contenant des guillemets | ⚡ | `<td>Il a dit "bonjour"</td>` | 1. Extraire en CSV | Les guillemets sont échappés : `"Il a dit ""bonjour"""` |
| EXT-015 | Cellules vides au milieu d'une ligne | ⚡ | `<tr><td>A</td><td></td><td>C</td></tr>` | 1. Extraire JSON | `{"Col1":"A", "Col2":"", "Col3":"C"}` — pas de décalage |
| EXT-016 | Ligne entière vide dans le tableau | ⚡ | `<tr><td></td><td></td><td></td></tr>` | 1. Extraire | La ligne vide est incluse avec des chaînes vides, ou bien ignorée selon config |

### 7.3 Limites & Performance

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| EXT-017 | Limite de taille de données (ex: max 100 000 cellules) | ⚡ | Tableau géant (500×500 = 250 000 cellules) | 1. Naviguer<br>2. Extraire | L'extraction est tronquée à la limite (100 000 cellules) avec un message "Données tronquées — utilisez l'upload de fichier pour les jeux complets" |
| EXT-018 | Limite de lignes (ex: max 10 000 lignes) | ⚡ | 15 000 lignes | 1. Naviguer<br>2. Extraire | Seules les 10 000 premières lignes sont extraites |
| EXT-019 | Limite de temps d'extraction (timeout) | ⚡ | Tableau extrêmement complexe | 1. Naviguer<br>2. Extraire | Timeout après 30 secondes avec message "Extraction interrompue — tableau trop complexe" |
| EXT-020 | Extraction sélective (sélection utilisateur dans le tableau) | ✅ |  | 1. Sélectionner 5 cellules dans un tableau<br>2. Menu contextuel "Envoyer la sélection" | Seules les cellules sélectionnées sont extraites, pas le tableau entier |

### 7.4 Intégrité des Données

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| EXT-021 | Vérification de l'intégrité : colonnes cohérentes | ✅ | Tableau 5×7 | 1. Extraire JSON | Tous les objets ont exactement 7 clés. Pas de colonnes manquantes ni supplémentaires. |
| EXT-022 | Vérification : pas de données en doublon | ✅ |  | 1. Extraire<br>2. Comparer avec le DOM | Chaque `<td>` correspond exactement à une valeur dans l'extraction. Pas de duplication |
| EXT-023 | Vérification : pas de perte de données | ✅ | Tableau de référence connu | 1. Extraire<br>2. Comparer comptage cellules | `count(extracted_cells) === count(dom_cells)` |
| EXT-024 | Extraction de texte sélectionné (hors tableau) | ✅ | Paragraphe de texte sélectionné | 1. Sélectionner du texte<br>2. Menu contextuel | Le texte sélectionné est extrait comme une seule cellule, ou parsé comme CSV s'il en a le format |

---

## 8. Visual Feedback (Highlight des éléments détectés)

L'extension doit indiquer visuellement quels éléments de la page sont détectés comme données extractibles.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| VIS-001 | Highlight d'un tableau détecté | ✅ | Page avec tableau | 1. Naviguer<br>2. Observer | Le tableau a une bordure colorée (ex: vert DataPresent 2px) ou un overlay subtil |
| VIS-002 | Highlight de plusieurs tableaux | ✅ | Page avec 3 tableaux | 1. Naviguer<br>2. Observer | Les 3 tableaux sont highlightés |
| VIS-003 | Highlight visible uniquement au hover (ou permanent) | ⚡ |  | 1. Naviguer<br>2. Hover sur le bouton DataPresent | Le highlight peut s'activer au hover pour ne pas distraire |
| VIS-004 | Highlight retiré quand l'élément n'est plus dans le DOM | 🧩 | SPA | 1. Highlight actif<br>2. Navigation SPA (tableau supprimé du DOM) | Le highlight disparaît |
| VIS-005 | Highlight retiré quand l'utilisateur quitte la page | ✅ |  | 1. Highlight actif<br>2. Naviguer vers une autre page | Pas de résidu visuel |
| VIS-006 | Toggle highlight on/off (bouton dans l'UI) | ✅ |  | 1. Cliquer sur toggle "Afficher les données détectées"<br>2. Observer ON<br>3. Cliquer OFF | Mode ON : highlights visibles. Mode OFF : highlights cachés |
| VIS-007 | Highlight avec animation subtile | ✅ |  | 1. Naviguer<br>2. Observer | Le highlight apparaît avec une transition douce (pas de flash brusque) |
| VIS-008 | Highlight compatible `prefers-reduced-motion` | ♿ |  | 1. Activer `prefers-reduced-motion: reduce`<br>2. Naviguer | Pas d'animation, highlight instantané |
| VIS-009 | Highlight qui n'empêche pas l'interaction avec le tableau | ♿ |  | 1. Cliquer dans le tableau highlighté | Le highlight est purement visuel (pointer-events: none) — le tableau reste interactif |
| VIS-010 | Couleur de highlight adaptée au contraste (WCAG AA) | ♿ |  | 1. Naviguer<br>2. Vérifier le ratio de contraste | La couleur de highlight a un ratio de contraste ≥ 3:1 avec le fond de la page |
| VIS-011 | Badge "N données détectées" dans l'icône de l'extension (badge) | ✅ |  | 1. Naviguer vers page avec 5 tableaux<br>2. Observer l'icône extension | Badge "5" sur l'icône de l'extension dans la toolbar |
| VIS-012 | Badge mis à jour quand des tableaux sont ajoutés/retirés | 🧩 |  | 1. Page avec 2 tableaux → badge "2"<br>2. AJOUT dynamique d'un 3e tableau | Badge passe à "3" |
| VIS-013 | Highlight avec informations supplémentaires (hover tooltip) | ✅ |  | 1. Hover sur le highlight | Tooltip : "Tableau détecté : 15 lignes × 4 colonnes — Cliquer pour extraire" |
| VIS-014 | Highlight sur une page avec `position: fixed` elements | ⚡ | Tableau derrière un header fixe | 1. Naviguer<br>2. Vérifier | Le highlight est visible, pas masqué par le header fixe |

---

## 9. Security & Privacy

La sécurité est critique pour une extension navigateur qui lit le contenu des pages.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| SEC-001 | Aucune donnée exfiltrée sans action utilisateur explicite | 🔒 | Page avec données sensibles | 1. Naviguer vers page avec tableau<br>2. Ne rien cliquer<br>3. Vérifier le trafic réseau | Aucune requête réseau vers `*.datapresent.app` ou tout autre domaine |
| SEC-002 | Envoi de données uniquement après clic utilisateur | 🔒 |  | 1. Naviguer<br>2. Vérifier avant clic : pas de requête<br>3. Cliquer "Créer un rapport"<br>4. Vérifier après clic | Avant clic : pas de requête. Après clic : une requête POST avec les données est envoyée |
| SEC-003 | Content script en isolated world | 🔒 |  | 1. Naviguer<br>2. Vérifier que le script n'a pas accès aux variables JS de la page hôte | Le content script s'exécute dans son propre monde (Chrome MV3 isolated world). Pas de conflit avec les frameworks de la page. |
| SEC-004 | Non injection sur pages sensibles (banque, email, admin systèmes critiques) | 🔒 | Liste de patterns exclus | 1. Naviguer vers page bancaire<br>2. Vérifier | Le script n'est pas injecté (ou s'injecte mais ne lit rien) |
| SEC-005 | Gestion des Content Security Policy (CSP) | 🔒 | Page avec CSP restrictive | 1. Naviguer vers page avec `Content-Security-Policy: default-src 'self'`<br>2. Vérifier | L'extension ne viole pas la CSP. Les éléments injectés (bouton) utilisent des styles inline autorisés par MV3 |
| SEC-006 | CSP — pas de violation avec `style-src` | 🔒 | CSP `style-src 'self'` | 1. Naviguer<br>2. Vérifier la console du navigateur | Aucune erreur CSP dans la console |
| SEC-007 | Iframe cross-origin — pas d'accès au contenu | 🔒 | Page avec iframe pointant vers un domaine différent | 1. Naviguer<br>2. Tenter d'accéder au contenu de l'iframe | Erreur de sécurité (cross-origin). L'extension ne force pas l'accès. |
| SEC-008 | Iframe same-origin — accès au contenu si autorisé | 🔒 | Page avec iframe même domaine | 1. Naviguer<br>2. Vérifier | L'extension peut accéder au contenu de l'iframe same-origin |
| SEC-009 | Données extraites non stockées localement sans consentement | 🔒 |  | 1. Extraire des données<br>2. Vérifier `chrome.storage.local` | Aucune donnée d'extraction n'est persistée dans le storage local de l'extension |
| SEC-010 | Communication chiffrée avec le serveur DataPresent | 🔒 |  | 1. Extraire et envoyer<br>2. Vérifier le protocole | La requête utilise HTTPS (TLS 1.3). Pas de données en clair. |
| SEC-011 | Pas d'accès aux cookies ou sessions de la page hôte | 🔒 |  | 1. Vérifier les permissions | L'extension ne demande pas les permissions `cookies`, `webRequest`, ou `webRequestBlocking` |
| SEC-012 | Validation des entrées — injection XSS via noms de colonnes | 🔒 | Tableau avec `<td><script>alert('xss')</script></td>` | 1. Extraire<br>2. Afficher les données dans l'aperçu | Le HTML est échappé avant affichage. Pas d'exécution de script. |
| SEC-013 | Validation — titre de page contenant du HTML | 🔒 | Page avec `<title><img src=x onerror=alert(1)>` | 1. Naviguer<br>2. Lire le titre pour l'afficher | Titre échappé : `&lt;img src=x onerror=alert(1)&gt;` |
| SEC-014 | Rate limiting des envois vers l'API | 🔒 | 100 clics rapides sur "Créer un rapport" | 1. Cliquer 100 fois en 5 secondes<br>2. Vérifier le trafic | Seulement 1 requête envoyée (debounce ou blocage) |
| SEC-015 | Respect du `incognito` — pas de tracking en navigation privée | 🔒 | Fenêtre privée/incognito | 1. Ouvrir en navigation privée<br>2. Naviguer<br>3. Vérifier | L'extension fonctionne mais ne tracke pas l'activité (ou fonctionnalité limitée) |

---

## 10. SPA & Dynamic Content

Les applications modernes (React, Vue, Angular) chargent le contenu dynamiquement. L'extension doit s'adapter.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| SPA-001 | MutationObserver détecte l'ajout dynamique de tableaux | 🧩 | SPA React qui charge un tableau après un clic | 1. Naviguer vers SPA<br>2. Cliquer sur "Afficher les données"<br>3. Un tableau apparaît | Le MutationObserver détecte l'ajout du `<table>` et injecte le bouton |
| SPA-002 | Tableau chargé après appel API (infinite scroll) | 🧩 | Page avec infinite scroll : 20 lignes chargées, puis 20 supplémentaires au scroll | 1. Naviguer<br>2. Scroller vers le bas | Les nouveaux tableaux (ou lignes ajoutées au même tableau) sont détectés |
| SPA-003 | Pagination — tableau change lorsque l'utilisateur clique sur "Page 2" | 🧩 | Tableau paginé dans une SPA (React Table, TanStack Table) | 1. Naviguer (page 1 détectée)<br>2. Cliquer "Page 2"<br>3. Vérifier la détection | Le contenu du tableau a changé : la détection doit se mettre à jour (ou le bouton reste présent sur le conteneur) |
| SPA-004 | Tab-based content switching (Bootstrap tabs, shadcn/tabs) | 🧩 | Page avec 3 tabs : "Overview", "Data", "Charts". Tab "Data" contient un tableau. | 1. Naviguer (tab "Overview" actif)<br>2. Cliquer tab "Data"<br>3. Vérifier | Le tableau dans le tab "Data" est détecté après activation du tab |
| SPA-005 | Contenu chargé après interaction utilisateur (accordéon, expand) | 🧩 | Section accordéon "Voir les données" qui révèle un tableau au clic | 1. Naviguer<br>2. Cliquer "Voir les données"<br>3. Vérifier | Le tableau révélé est détecté |
| SPA-006 | Tableau dans un web component (Lit, Stencil, Svelte) | 🧩 | `<data-table rows="..." columns="...">` avec shadow DOM | 1. Naviguer<br>2. Vérifier | Détection via le contenu du shadow DOM (si accessible) ou via les attributs du web component |
| SPA-007 | React Virtual DOM — tableau rendu via React Data Grid | 🧩 | `react-data-grid` ou `ag-grid` avec virtualisation (seules les lignes visibles sont dans le DOM) | 1. Naviguer<br>2. Extraire | Attention : seules les lignes visibles sont extractibles. L'extension doit détecter la virtualisation et proposer l'export via l'API du composant |
| SPA-008 | Vue.js — tableaux conditionnels (`v-if` vs `v-show`) | 🧩 | `<table v-if="showTable">...</table>` | 1. Naviguer (tableau non affiché)<br>2. Déclencher `v-if`<br>3. Vérifier | Détecté quand `v-if` devient vrai. Si `v-show` (display:none), pas détecté ou signalé caché |
| SPA-009 | Angular — tableaux avec `*ngFor` | 🧩 | `<tr *ngFor="let row of data">` | 1. Naviguer<br>2. Vérifier | Le tableau Angular (balises `<table>` standards) est détecté normalement |
| SPA-010 | Alpine.js / htmx — contenu chargé via attributs | 🧩 | `<div x-data><table x-init="fetchData()">` ou `hx-get="/data"` | 1. Naviguer<br>2. Attendre le chargement htmx/Alpine<br>3. Vérifier | Détecté après que le contenu dynamique est injecté dans le DOM |
| SPA-011 | SPA avec routing client-side (React Router, Vue Router) | 🧩 |  | 1. Naviguer vers `/page-a` (tableau)<br>2. Naviguer vers `/page-b` (pas de tableau)<br>3. Naviguer vers `/page-c` (tableau) | Chaque navigation déclenche une nouvelle détection. Pas de stale data. |
| SPA-012 | SPA — pas de re-détection inutile sur navigation sans changement de contenu | 🧩 |  | 1. Naviguer page A → page B → page A | La détection sur page A se fait sans duplication de boutons |
| SPA-013 | Debounce du MutationObserver pour éviter les recalculs excessifs | 🧩 |  | 1. Mutation rapide (100 mutations en 100ms)<br>2. Vérifier | Le détecteur utilise un debounce (300ms) pour éviter de recalculer 100 fois |
| SPA-014 | Détection sur éléments rendus par des chart libraries (Chart.js, D3.js, ECharts) | 🧩 | Page avec un graphique Chart.js (`<canvas>`) | 1. Naviguer<br>2. Vérifier | Les données du chart peuvent être extraites via les datasets JS du composant (hors isolated world) ou pas du tout |

---

## 11. Communication & Messaging (Content Script ↔ Background)

La communication entre le content script et le background script est essentielle.

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| MSG-001 | Envoi des données extraites au background script | ✅ | Tableau extrait | 1. Extraire<br>2. `chrome.runtime.sendMessage({ type: 'DATA_EXTRACTED', payload: data })` | Le background script reçoit le message avec les données |
| MSG-002 | Réponse du background → confirmation ou ID de rapport | ✅ |  | 1. Envoyer données<br>2. Attendre réponse | Réponse : `{ success: true, reportId: 'rpt_xxxx' }` ou `{ success: false, error: '...' }` |
| MSG-003 | Message de type `PING` → réponse `PONG` pour vérifier que le script est vivant | ✅ |  | 1. Envoyer `{ type: 'PING' }`<br>2. Attendre | Réponse : `{ type: 'PONG' }` |
| MSG-004 | Gestion de timeout si le background ne répond pas | ❌ | Background script non chargé ou occupé | 1. Envoyer un message<br>2. Timeout après 5 secondes | Gestion de l'erreur : message "Service temporairement indisponible" |
| MSG-005 | Message de grande taille (500 KB de données JSON) | ⚡ | Tableau de 10 000 cellules | 1. Extraire<br>2. Envoyer via `chrome.runtime.sendMessage` | Les messages > 64 KB peuvent échouer. Solution : utiliser `chrome.storage.session` ou chunking |
| MSG-006 | Message vers le content script depuis la popup de l'extension | ✅ | Popup ouverte | 1. Cliquer dans la popup "Extraire cette page"<br>2. Vérifier | La popup envoie un message au content script du tab actif pour déclencher l'extraction |
| MSG-007 | Port de communication long (connect) pour messages multiples | ⚡ |  | 1. Établir `chrome.runtime.connect`<br>2. Envoyer plusieurs messages | Communication continue, pas de reconnexion à chaque message |

---

## 12. Cross-browser & Compatibilité

L'extension doit fonctionner sur Chrome, Edge, Firefox (et potentiellement Safari).

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| CRB-001 | Fonctionnement sur Chrome (MV3) | ✅ | Chrome 120+ | 1. Charger l'extension<br>2. Exécuter la suite de tests | Tous les scénarios passent |
| CRB-002 | Fonctionnement sur Edge (MV3) | ✅ | Edge 120+ | 1. Charger l'extension<br>2. Exécuter la suite | Même comportement que Chrome |
| CRB-003 | Fonctionnement sur Firefox (MV2 ou MV3) | ✅ | Firefox 120+ | 1. Charger l'extension<br>2. Exécuter la suite | API Firefox compatibles. Attention : `chrome.*` vs `browser.*` |
| CRB-004 | API `chrome.storage` vs `browser.storage` | ⚡ |  | 1. Vérifier l'implémentation | L'extension utilise un wrapper (webextension-polyfill) ou des détections de navigateur |
| CRB-005 | API `chrome.contextMenus` vs `browser.menus` | ⚡ |  | 1. Vérifier | Compatibilité cross-browser pour le menu contextuel |
| CRB-006 | API `chrome.runtime.sendMessage` — support cross-browser | ⚡ |  | 1. Vérifier | Compatible Chrome, Edge, Firefox |
| CRB-007 | Manifest V3 — service worker lifecycle | ⚡ |  | 1. Vérifier que le service worker ne se termine pas prématurément | Le service worker MV3 gère correctement son cycle de vie (ne se met pas en veille pendant une extraction longue) |

---

## 13. Error Handling & Resilience

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| ERR-001 | Réseau indisponible (envoi des données à l'API) | ❌ | Internet coupé | 1. Extraire les données<br>2. Cliquer "Envoyer" | Message : "Connexion perdue. Vos données seront envoyées dès que vous serez en ligne." (ou mise en cache local) |
| ERR-002 | API DataPresent indisponible (503) | ❌ | Serveur DataPresent en maintenance | 1. Extraire<br>2. Envoyer | Message : "Le service DataPresent est temporairement indisponible. Réessayez dans quelques minutes." |
| ERR-003 | Tableau non parsable (format de données inconnu) | ❌ | Tableau avec structure non standard | 1. Naviguer vers tableau complexe<br>2. Extraire | Message : "Ce tableau n'a pas pu être parsé. Vérifiez sa structure ou utilisez la capture d'écran." |
| ERR-004 | API Google Sheets échoue (rate limit) | ❌ | Trop de requêtes vers Google Sheets API | 1. Extraire depuis Sheets plusieurs fois rapidement | Message : "Limite de requêtes Google Sheets atteinte. Réessayez dans une minute." |
| ERR-005 | Erreur dans le content script (exception JS) | ❌ | Bug dans le code de détection | 1. Naviguer vers page qui déclenche le bug | L'erreur est capturée (try/catch), logguée, et un message d'erreur informatif est affiché. Pas de crash silencieux. |
| ERR-006 | Chrome OOM (out of memory) sur grand tableau | ❌ | Tableau 50 000 lignes × 50 colonnes | 1. Naviguer<br>2. Tenter d'extraire | L'extraction est interrompue avant l'OOM avec un message adapté |
| ERR-007 | Popup déjà ouverte — double clic | ⚡ |  | 1. Cliquer sur bouton 2 fois rapidement | La popup ne s'ouvre qu'une fois (debounce) |
| ERR-008 | Extension désactivée pour ce site | ⚡ |  | 1. Désactiver l'extension pour le site dans les paramètres<br>2. Naviguer | Aucun content script injecté, pas de fonctionnalité DataPresent |

---

## 14. Performance & Memory

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| PERF-001 | Détection initiale < 100ms pour une page normale | 🏎️ | Page avec 5 tableaux | 1. Naviguer<br>2. Mesurer le temps entre DOMContentLoaded et fin de détection | Temps de détection < 100ms |
| PERF-002 | MutationObserver n'impacte pas le scrolling | 🏎️ | Page longue avec infinite scroll | 1. Naviguer<br>2. Scroller rapidement<br>3. Vérifier FPS | Le scrolling reste fluide (60 fps). Le MutationObserver est optimisé avec debounce et throttle |
| PERF-003 | Extraction d'un tableau 100×100 < 500ms | 🏎️ | 10 000 cellules | 1. Naviguer<br>2. Extraire<br>3. Chronométrer | Extraction < 500ms |
| PERF-004 | Mémoire : pas de leak après 50 extractions | 🏎️ |  | 1. Ouvrir 50 pages différentes avec tableaux<br>2. Extraire chaque page<br>3. Mesurer la mémoire du service worker | La mémoire du service worker ne croît pas anormalement |
| PERF-005 | Pas de fuite DOM : les éléments injectés sont nettoyés | 🏎️ |  | 1. Ouvrir 100 pages (1 par 1)<br>2. Vérifier le DOM de chaque page après navigation | Aucun élément DataPresent résiduel dans le DOM après navigation |
| PERF-006 | Désactivation du MutationObserver après timeout (page idle) | 🏎️ |  | 1. Naviguer<br>2. Ne pas interagir pendant 60 secondes | Le MutationObserver se désactive pour économiser les ressources. Se réactive au scroll/click |
| PERF-007 | Performance sur mobile (Chrome Android) | 📱 | Appareil mobile de milieu de gamme | 1. Naviguer sur mobile<br>2. Extraire | Temps d'extraction < 2× le temps desktop |

---

## 15. Accessibility (A11y)

| ID | Scénario | Catégorie | Préconditions | Étapes | Résultat attendu |
|----|----------|-----------|---------------|--------|------------------|
| A11Y-001 | Navigation au clavier dans les éléments injectés | ♿ |  | 1. Naviguer avec Tab/Shift+Tab<br>2. Atteindre les boutons DataPresent | Les boutons sont dans l'ordre de tabulation naturel |
| A11Y-002 | Focus visible sur les éléments DataPresent | ♿ |  | 1. Tab jusqu'au bouton | Un outline visible (≥ 2px, contraste suffisant) entoure le bouton focusé |
| A11Y-003 | `aria-live` pour les annonces de détection | ♿ |  | 1. Naviguer vers page avec tableaux | Une région `aria-live="polite"` annonce "3 tableaux détectés sur cette page" |
| A11Y-004 | Message de détection pour lecteurs d'écran | ♿ |  | 1. Naviguer<br>2. Utiliser NVDA/JAWS | Les lecteurs d'écran annoncent "Bouton : Créer un rapport DataPresent. Tableau de 15 lignes et 4 colonnes." |
| A11Y-005 | Contraste du bouton (WCAG AA) | ♿ |  | 1. Inspecter les couleurs du bouton | Ratio de contraste ≥ 4.5:1 pour le texte, ≥ 3:1 pour les grands éléments |
| A11Y-006 | Texte alternatif pour l'icône du bouton | ♿ |  | 1. Inspecter l'icône SVG ou image | L'icône a `role="img"` et `aria-label="Logo DataPresent"` (ou `alt="DP"`) |
| A11Y-007 | Highlight visible mais non intrusif pour les lecteurs d'écran | ♿ |  | 1. Vérifier la bordure highlight | Le highlight est purement visuel (`outline` ou `box-shadow`). Pas de focus trapping. |
| A11Y-008 | Fermeture de la popup d'aperçu avec Escape | ♿ |  | 1. Ouvrir popup d'aperçu<br>2. Presser Escape | La popup se ferme |
| A11Y-009 | Popup d'aperçu : focus trap | ♿ |  | 1. Ouvrir popup<br>2. Tab cyclique dans la popup | Le focus ne sort pas de la popup tant qu'elle est ouverte (focus trap accessible) |
| A11Y-010 | Réduction de mouvement respectée | ♿ |  | 1. Activer `prefers-reduced-motion: reduce`<br>2. Naviguer | Toutes les animations sont désactivées (transitions, highlights, popup) |

---

## Résumé : Grille de couverture par catégorie

| # | Catégorie | Total scénarios | ✅ Success | ❌ Error | ⚡ Edge | 🔒 Security | 🧩 SPA | ♿ A11Y | 📱 Resp | 🏎️ Perf |
|---|-----------|----------------|-----------|----------|---------|-------------|--------|---------|---------|----------|
| 1 | Content Script Injection | 14 | 7 | 0 | 4 | 2 | 1 | 0 | 0 | 0 |
| 2 | Table Detection | 33 | 9 | 0 | 22 | 1 | 0 | 1 | 0 | 0 |
| 3 | Google Sheets Detection | 13 | 4 | 2 | 5 | 1 | 0 | 0 | 0 | 0 |
| 4 | Other Site Detection | 16 | 12 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| 5 | UI Injection | 20 | 11 | 0 | 6 | 0 | 2 | 1 | 0 | 0 |
| 6 | Context Menu | 10 | 5 | 0 | 2 | 1 | 0 | 1 | 0 | 0 |
| 7 | Data Extraction | 24 | 12 | 0 | 10 | 0 | 0 | 0 | 0 | 2 |
| 8 | Visual Feedback | 14 | 7 | 0 | 4 | 0 | 1 | 0 | 0 | 0 |
| 9 | Security & Privacy | 15 | 0 | 0 | 0 | 15 | 0 | 0 | 0 | 0 |
| 10 | SPA & Dynamic Content | 14 | 0 | 0 | 0 | 0 | 14 | 0 | 0 | 0 |
| 11 | Communication & Messaging | 7 | 3 | 1 | 2 | 0 | 0 | 0 | 0 | 0 |
| 12 | Cross-browser | 7 | 3 | 0 | 4 | 0 | 0 | 0 | 0 | 0 |
| 13 | Error Handling & Resilience | 8 | 0 | 6 | 2 | 0 | 0 | 0 | 0 | 0 |
| 14 | Performance & Memory | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 |
| 15 | Accessibility | 10 | 0 | 0 | 0 | 0 | 0 | 10 | 0 | 0 |
| | **TOTAL** | **212** | **73** | **9** | **65** | **20** | **18** | **13** | **0** | **9** |

---

## Notes d'implémentation pour les tests Playwright

### Infrastructure de test recommandée

L'extension navigateur nécessite une configuration Playwright spécifique pour les tests de content scripts :

```typescript
// playwright.config.ts (datapresent-extension/tests/)
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    // IMPORTANT : charger l'extension dans le navigateur de test
    launchOptions: {
      args: [
        `--disable-extensions-except=${__dirname}/../../dist`,
        `--load-extension=${__dirname}/../../dist`,
      ],
    },
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox et Edge si nécessaire
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
  ],
  webServer: {
    command: "npm run build", // build l'extension avant les tests
    url: "file://" + __dirname + "/../../dist/manifest.json",
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
```

### Fixtures Playwright personnalisées suggérées

Créer une fixture `extension` pour interagir avec le content script :

```typescript
// tests/fixtures/extension.ts
import { test as base, chromium, type BrowserContext } from "@playwright/test";
import path from "path";

const EXTENSION_PATH = path.resolve(__dirname, "../../dist");

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext("", {
      headless: false, // MV3 nécessite un headful pour le service worker
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

export { expect } from "@playwright/test";
```

### Pages de test HTML statiques (mock fixtures)

Créer des pages HTML de test dans `tests/fixtures/pages/` pour isoler chaque scénario :

```
tests/fixtures/pages/
├── simple-table.html          # Tableau standard
├── nested-tables.html         # Tableaux imbriqués
├── merged-cells.html          # Colspan + rowspan
├── large-table.html           # 10 000 lignes
├── empty-table.html           # Tableau vide
├── no-tables.html             # Pas de tableau
├── google-sheets-mock.html    # Simulation de Sheets
├── csv-inline.html            # Bloc CSV inline
├── json-inline.html           # Bloc JSON inline
├── airtable-mock.html         # Simulation Airtable
├── notion-mock.html           # Simulation Notion
├── coda-mock.html             # Simulation Coda
└── dark-theme.html            # Page en dark mode
```

### Exemple de test Playwright (table detection)

```typescript
// tests/e2e/table-detection.spec.ts
import { test, expect } from "../fixtures/extension";

test.describe("Table Detection", () => {
  test("TBL-001 : tableau standard avec thead/tbody est détecté", async ({ page }) => {
    await page.goto("file:///fixtures/pages/simple-table.html");
    
    // Attendre que le content script soit injecté
    await page.waitForSelector("[data-datapresent-detected]");
    
    // Vérifier que le tableau est détecté
    const count = await page.evaluate(() => {
      return (window as any).__DATAPRESENT__?.detectedTables?.length ?? 0;
    });
    expect(count).toBe(1);
    
    // Vérifier que le bouton est injecté
    const button = page.locator("[data-datapresent-button]");
    await expect(button).toBeVisible();
    await expect(button).toContainText("Créer un rapport");
  });
  
  test("TBL-009 : colspan est géré correctement", async ({ page }) => {
    await page.goto("file:///fixtures/pages/merged-cells.html");
    
    const data = await page.evaluate(() => {
      return (window as any).__DATAPRESENT__?.extractAsJSON();
    });
    
    // Vérifier que les cellules colspan sont correctement propagées
    expect(data[0]).toHaveProperty("Colonne avec colspan");
    expect(data[0]["Colonne avec colspan"]).toBeTruthy();
  });
});
```

---

## Recommandations

1. **Priorité haute** : TBL-001 à TBL-020 (détection de base), UI-001 à UI-010 (injection UI), EXT-001 à EXT-015 (extraction) — ces scénarios couvrent le parcours utilisateur principal
2. **Priorité moyenne** : GSH-001 à GSH-013 (Sheets), SPA-001 à SPA-014 (dynamique), SEC-001 à SEC-015 (sécurité)
3. **Priorité basse** : CRB-001 à CRB-007 (cross-browser), PERF-001 à PERF-007 (performance)
4. **Tests manuels nécessaires** : Les scénarios avec iframe cross-origin (SEC-007, SEC-008) nécessitent une infrastructure de test particulière
5. **Mocks Google Sheets** : Utiliser Playwright route interception pour simuler les réponses Google Sheets API sans authentification réelle
6. **CI** : Configurer les tests extension dans la CI avec `xvfb-run` pour Chrome headful (nécessaire pour MV3 service workers)

---

*Document généré le 2026-06-21 — Extension DataPresent v1.0.0 (squelette) — 212 scénarios de test identifiés*
