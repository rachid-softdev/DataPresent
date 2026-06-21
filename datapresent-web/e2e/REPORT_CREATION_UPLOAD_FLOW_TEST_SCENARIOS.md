# Report Creation & Upload Flow — Missing E2E Playwright Test Scenarios

> **Projet :** DataPresent  
> **Feature :** REPORT CREATION & UPLOAD FLOW  
> **Date :** 2026-06-21  
> **Status :** Analyse complète des scénarios manquants dans `tests/e2e/`

---

## Résumé de la couverture existante

| Fichier | Status | Ce qui est testé |
|---------|--------|-------------------|
| `report-creation.spec.ts` | ❌ Très basique | Auth redirect `/new` → `/login`, `/reports` → `/login`. 3 tests `skip` pour ReportsFilter (non exécutés). |
| `pages.spec.ts` | ⚠️ Partiel | Auth redirect 3 pages + 404 share/embed + pricing plans. |
| `share.spec.ts` | ❌ Minimal | Un seul test : share invalide → 404. |
| **Total** | **< 5% couverture** | **0 tests sur le flux réel upload → config → génération → résultat.** |

---

## Légende des catégories

- **🛡️ Auth/Security** — Authentification, autorisation, limites plan
- **✅ Success Path** — Parcours nominal
- **❌ Error Path** — Gestion d'erreurs
- **⚡ Edge Case** — Cas limites
- **♿ Accessibility** — A11y, clavier, ARIA
- **📱 Responsive** — Mobile/tablet
- **🌐 i18n** — Internationalisation (FR/EN)
- **🏎️ Performance** — Temps de chargement, grands volumes
- **🧪 State** — États UI (loading, empty, error)

---

## 1. Upload Flow — DropZone (`components/upload/DropZone.tsx`)

### 1.1 Success Paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| UPL-001 | Drag & drop fichier XLSX valide | ✅ Success | Déposer un fichier .xlsx valide de 50 KB sur la zone de drop | Utilisateur authentifié, page `/new` ouverte | Le fichier est accepté, l'icône XLSX verte s'affiche, le nom et la taille sont visibles, le bouton "Suivant" devient actif |
| UPL-002 | Drag & drop fichier CSV valide | ✅ Success | Déposer un fichier .csv valide | Même que UPL-001 | Icône CSV bleue affichée, fichier accepté |
| UPL-003 | Drag & drop fichier PDF valide | ✅ Success | Déposer un fichier .pdf valide (contenant un tableau) | Même que UPL-001 | Icône PDF rouge affichée, fichier accepté |
| UPL-004 | Sélection via browse dialog (XLSX) | ✅ Success | Cliquer sur la zone, choisir un fichier XLSX dans le dialogue OS | Même que UPL-001 | Fichier sélectionné, DataPreview affiché |
| UPL-005 | Sélection via browse dialog (CSV) | ✅ Success | Cliquer sur la zone, choisir un fichier CSV | Même que UPL-001 | Fichier sélectionné, DataPreview affiché |
| UPL-006 | Changement de fichier après sélection | ✅ Success | Déposer fichier A, puis cliquer X pour effacer, puis déposer fichier B | Fichier A déjà sélectionné | Fichier A remplacé par B, nouvel icône affiché |
| UPL-007 | Upload fichier .xls (ancien format) | ✅ Success | Fichier .xls valide | Même que UPL-001 | Accepté (extensions `.xls` dans `accept`) |

### 1.2 Error Paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| UPL-100 | Fichier format non supporté (.txt) | ❌ Error | Déposer un fichier `.txt` | Authentifié, page /new | Message rouge "Format non supporté. Utilisez: .xlsx,.xls,.csv,.pdf" affiché sous la zone |
| UPL-101 | Fichier format non supporté (.png) | ❌ Error | Déposer une image `.png` | Même que UPL-100 | Même message d'erreur de format |
| UPL-102 | Fichier trop volumineux (> 10 MB) | ❌ Error | Déposer un fichier de 15 MB | Même que UPL-100 | Message rouge "Fichier trop volumineux. Maximum: 10.0 MB" |
| UPL-103 | Fichier exactement à la limite (10 MB) | ⚡ Edge | Déposer un fichier de 10,0 MB | Même que UPL-100 | Accepté (limite inclusive) |
| UPL-104 | Fichier vide (0 bytes) | ❌ Error | Déposer un fichier XLSX vide (0 bytes) | Même que UPL-100 | Doit être soit accepté (0 < 10MB) puis erreur parsing, soit refusé par validation. Vérifier comportement réel |
| UPL-105 | Drag & drop sans fichier (annulation) | ⚡ Edge | Glisser un fichier puis appuyer sur Échap sans déposer | Même que UPL-100 | La zone revient à l'état normal (border dashed, pas de surbrillance) |
| UPL-106 | Drag over avec fichier non supporté | ⚡ Edge | Glisser un fichier `.exe` au-dessus de la zone | Même que UPL-100 | La zone s'illumine (isDragging) car la validation se fait au drop, pas au drag over |
| UPL-107 | Dépôt multiple fichiers (2+ à la fois) | ❌ Error | Déposer 3 fichiers .xlsx simultanément | Même que UPL-100 | Seul le premier fichier (`files[0]`) est pris, les autres ignorés (comportement actuel du code) |
| UPL-108 | Fichier avec extension en majuscules (.XLSX) | ⚡ Edge | Déposer un fichier `DATA.XLSX` | Même que UPL-100 | Accepté (ext lowercase via `toLowerCase()`) |
| UPL-109 | Fichier avec caractères spéciaux (émoji, accents) | ⚡ Edge | Déposer `rapport_ventes_2026_📊.xlsx` | Même que UPL-100 | Accepté, nom affiché correctement dans le composant |
| UPL-110 | Fichier avec nom très long (> 100 car.) | ⚡ Edge | Déposer fichier avec nom de 150 caractères | Même que UPL-100 | Accepté, nom tronqué via `truncate` CSS |

### 1.3 États UI

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| UPL-200 | État initial — aucun fichier sélectionné | 🧪 State | La zone de drop est vide | Page /new chargée | Message "Glissez votre fichier ici ou cliquez pour parcourir" visible, texte "Excel (.xlsx, .xls), CSV, ou PDF" visible |
| UPL-201 | Drag actif — surbrillance visuelle | 🧪 State | Glisser un fichier au-dessus de la zone | Aucun fichier sélectionné | La zone a `border-primary`, `bg-primary/5`, léger scale-up (1.02), icône Upload devient primary |
| UPL-202 | Drag leave — retour à l'état normal | 🧪 State | Glisser un fichier puis le sortir de la zone | Drag activé | La zone revient à l'état initial (border gris, pas de bg) |
| UPL-203 | Fichier sélectionné — composant "file card" | 🧪 State | Fichier valide sélectionné | Fichier accepté | La vue passe en mode "ficher sélectionné" : icône, nom, taille, bouton X pour effacer |
| UPL-204 | Désactivation — DropZone désactivée | 🧪 State | DropZone avec prop `disabled=true` | Simulation état désactivé | Toute la zone a `opacity-50 cursor-not-allowed`, l'input file est disabled |

### 1.4 Accessibilité

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| UPL-300 | Focus navigateur vers l'input file | ♿ A11y | Naviguer avec Tab jusqu'à la zone de drop | Aucun fichier | L'input file caché doit être focusable et activable avec Entrée/Espace |
| UPL-301 | Annulation fichier avec clavier | ♿ A11y | Fichier sélectionné, focus sur bouton X, appuyer Entrée | Fichier sélectionné | Fichier effacé, retour à l'état initial |
| UPL-302 | Message d'erreur lu par screen reader | ♿ A11y | Déposer fichier invalide, vérifier aria-live ou annonce erreur | Même que UPL-100 | L'erreur doit être accessible via un rôle alert ou aria-live |

---

## 2. Configuration — SectorSelector (`components/upload/SectorSelector.tsx`)

### 2.1 Success & Error Paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SEC-001 | 5 secteurs visibles au chargement | ✅ Success | Vérifier que tous les secteurs sont listés | Step "config" actif, page /new | 5 options visibles : Finance, Marketing, RH, SaaS, Générique |
| SEC-002 | Sélection secteur par défaut = GENERIC | ✅ Success | Vérifier que "Générique" est pré-selectionné | Aucun paramètre ?sector= dans l'URL | Le bouton GENERIC a la classe `border-primary bg-primary/5` |
| SEC-003 | Sélection secteur via URL param | ✅ Success | Naviguer vers `/new?sector=FINANCE` | Utilisateur authentifié | Le secteur FINANCE est pré-sélectionné |
| SEC-004 | Changement de secteur | ✅ Success | Cliquer sur "Marketing" puis sur "SaaS" | Secteur GENERIC sélectionné | Le nouveau secteur devient actif (bordure primary), l'ancien redevient normal |
| SEC-005 | Description unique par secteur | ✅ Success | Vérifier les descriptions textuelles | Step config actif | Chaque carte contient la description correcte (ex: "Revenus, marges, cash flow" pour Finance) |
| SEC-006 | Tous les secteurs ont une icône | ✅ Success | Vérifier la présence d'icônes | Step config actif | Chaque carte a un élément SVG/icône Lucide visible |

### 2.2 Accessibilité

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SEC-100 | Navigation clavier entre secteurs | ♿ A11y | Tab entre les 5 boutons secteur | Step config actif | Chaque bouton est focusable, le focus est visible, Entrée sélectionne |
| SEC-101 | Secteur sélectionné annoncé | ♿ A11y | Screen reader doit annoncer le secteur actif | Secteur sélectionné | `aria-pressed` ou `aria-current` présent sur le bouton actif |

---

## 3. Configuration — SlideCountSlider (`components/upload/SlideCountSlider.tsx`)

### 3.1 Success Paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SCNT-001 | Valeur par défaut = 10 | ✅ Success | Vérifier que le slider commence à 10 | Step config actif | Le nombre affiché est "10", le label est "Standard", la jauge est au milieu |
| SCNT-002 | Déplacement vers la valeur minimale (5) | ✅ Success | Glisser le slider jusqu'à 5 | Step config actif | Affichage "5", label "Minimal", badge bleu |
| SCNT-003 | Déplacement vers la valeur maximale (ex: 20) | ✅ Success | Glisser le slider jusqu'à 20 | Utilisateur authentifié (maxSlides=20) | Affichage "20", label "Détaillé", badge violet |
| SCNT-004 | Valeur intermédiaire (8) | ✅ Success | Glisser à 8 | Step config actif | Affichage "8", label "Standard", badge vert |
| SCNT-005 | Valeur "Complet" (12) | ✅ Success | Glisser à 12 | Step config actif | Affichage "12", label "Complet", badge orange |

### 3.2 Plan Limits & Edge Cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SCNT-100 | FREE plan max = 8 slides | 🛡️ Auth | Utilisateur FREE, maxSlides doit être 8 | Compte FREE, pas de membership org | Le slider va de 5 à 8 max |
| SCNT-101 | PRO plan max = 20 slides | 🛡️ Auth | Utilisateur PRO, maxSlides = 20 | Compte PRO actif | Le slider va de 5 à 20 |
| SCNT-102 | TEAM plan max = 30 slides | 🛡️ Auth | Utilisateur TEAM, maxSlides = 30 | Compte TEAM actif | Le slider va de 5 à 30 |
| SCNT-103 | Plan avec unlimited (null) — max = 50 | 🛡️ Auth | Plan enterprise, getLimit retourne null | Plan enterprise | Le slider va de 5 à 50 (fallback) |
| SCNT-104 | Min < 5 impossible | ❌ Error | Essayer de set min=3 programmatiquement | Step config actif | La valeur ne descend pas sous 5 |
| SCNT-105 | Max > plan impossible | ❌ Error | Essayer de set max=25 sur plan FREE | Plan FREE, maxSlides=8 | La valeur ne dépasse pas 8 |

### 3.3 Accessibilité & États

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SCNT-200 | Navigation clavier slider | ♿ A11y | Focus sur slider, utiliser flèches gauche/droite | Step config actif | La valeur change par pas de 1, l'affichage se met à jour |
| SCNT-201 | Valeur lue par screen reader | ♿ A11y | Vérifier aria-valuenow, aria-valuemin, aria-valuemax | Step config actif | Attributs ARIA présents sur le range input |
| SCNT-202 | Slider désactivé | 🧪 State | Slider avec prop `disabled=true` | Simulation | Opacité réduite, cursor not-allowed |

---

## 4. Configuration — Stepper (`components/upload/Stepper.tsx`)

### 4.1 Navigation Steps

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| STP-001 | 4 steps visibles à l'initialisation | ✅ Success | Vérifier les 4 étapes du stepper | Page /new chargée, step=upload | Upload (actif), Config (pending), Génération (pending), Résultat (pending) |
| STP-002 | Step upload = actif initialement | ✅ Success | Vérifier aria-current="step" | Page /new chargée | Le step "upload" a le statut actif (cercle primary, label "En cours") |
| STP-003 | Navigation vers config après upload | ✅ Success | Sélectionner fichier, cliquer "Suivant" | Fichier sélectionné | Stepper passe à "config" actif, "upload" devient completed (checkmark) |
| STP-004 | Retour de config vers upload | ✅ Success | Cliquer "Retour" depuis step config | Step config, fichier sélectionné | Retour step upload, fichier toujours sélectionné |
| STP-005 | Checkmark sur steps complétés | ✅ Success | Après upload — vérifier icône check | Step=config | Step "upload" affiche un checkmark vert au lieu de l'icône Upload |
| STP-006 | Connector line color changement | ✅ Success | Ligne entre upload et config après completion | Step=config | La ligne entre upload et config est `bg-primary` (vs grise pour les suivantes) |

### 4.2 Edge Cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| STP-100 | Navigation directe impossible (pas de clic sur step) | ⚡ Edge | Essayer de cliquer sur "Résultat" directement | Step=upload | Les steps ne sont pas des liens cliquables — le stepper est purement informatif |
| STP-101 | Upload sans fichier — bouton Suivant désactivé | ❌ Error | Step upload, aucun fichier choisi | Step=upload | Bouton "Suivant" désactivé (disabled) |
| STP-102 | Label "En cours" visible uniquement sur step actif | 🧪 State | Vérifier le texte "En cours" | Chaque step tour à tour | Seul le step actif affiche "En cours" en dessous du label |
| STP-103 | Affichage responsive stepper | 📱 Mobile | Écran < 640px, steps cachés | Viewport mobile (375px) | Les labels sont cachés (`hidden sm:block`), seuls les cercles icônes sont visibles |

---

## 5. Génération IA — NewReportForm (`app/[locale]/(dashboard)/new/NewReportForm.tsx`)

### 5.1 Submission & XHR Upload

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| GEN-001 | Upload XHR réussi complet | ✅ Success | Fichier valide + secteur + slideCount → POST /api/upload | Fichier sélectionné, secteur choisi, slideCount=10 | XHR POST envoyé avec FormData contenant file + sector + slideCount |
| GEN-002 | Upload progress 0% → 100% | ✅ Success | Vérifier la progression dans GenerationProgress | Upload en cours | Le pourcentage passe progressivement de 0 à 100 |
| GEN-003 | Transition vers polling après upload | ✅ Success | Upload terminé (201), réponse contient reportId | Upload réussi | Lancement du polling sur `/api/reports/{reportId}` |
| GEN-004 | Polling: DONE → success | ✅ Success | Polling reçoit status=DONE | Upload réussi, génération en cours | Transition vers step=result, ReportResult affiche success |
| GEN-005 | Polling: ERROR → error | ✅ Success | Polling reçoit status=ERROR | Upload réussi | Transition vers step=result, ReportResult affiche erreur |
| GEN-006 | Sous-étapes visuelles advancement | ✅ Success | Vérifier l'avancement des 4 sous-étapes | Pendant la génération | "Analyse des données" → "Création des graphiques" → "Mise en page" → "Finalisation du rapport" s'activent séquentiellement |

### 5.2 Error Paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| GEN-100 | Upload XHR retourne 400 | ❌ Error | API upload retourne une erreur 400 | Fichier envoyé | Error state affiché, message d'erreur spécifique |
| GEN-101 | Upload XHR retourne 401 | ❌ Error | Session expirée pendant l'upload | Session invalide | Error state affiché, message "Non autorisé" |
| GEN-102 | Upload XHR retourne 403 quota exceeded | ❌ Error | Limite mensuelle atteinte pour le plan | Plan FREE avec 3/3 rapports | Error state avec message de quota dépassé |
| GEN-103 | Upload XHR retourne 413 file too large | ❌ Error | Fichier dépasse limite serveur (malgré validation frontend) | Fichier > limite serveur | Error state affiché |
| GEN-104 | Upload XHR network error | ❌ Error | Perte de connexion pendant l'upload | Simulation offline | `xhr.onerror` déclenché, message "Erreur lors du téléversement" |
| GEN-105 | Upload XHR timeout | ❌ Error | Upload trop long (> 2 min) | Fichier très volumineux | Timeout, message d'erreur approprié |
| GEN-106 | Upload XHR aborted by user | ❌ Error | Utilisateur clique "Annuler" pendant upload | Upload en cours | XHR aborted, retour au step config |
| GEN-107 | JSON parse error sur réponse upload | ❌ Error | API retourne du texte non-JSON | Réponse invalide | Error state, message générique |
| GEN-108 | Polling: report status = PROCESSING pendant longtemps | ⚡ Edge | Génération > 30s sans changement | Upload réussi | Stall warning affiché après 30s "La génération semble prendre plus de temps que prévu" |
| GEN-109 | Polling: 60 retries atteint (5 min) | ⚡ Edge | Rapport ni DONE ni ERROR après 5 min | Génération bloquée | Polling s'arrête, mais aucun message visible — bug possible (log console seulement) |
| GEN-110 | Polling: fetch échoue temporairement | ⚡ Edge | Une requête de polling échoue (network) | Polling actif | Le polling continue, pas de changement d'état visible |
| GEN-111 | Annulation pendant polling | ❌ Error | Utilisateur clique "Annuler" pendant la génération | Polling actif, subStage > 0 | Polling arrêté, retour au step config |

### 5.3 Stall Detection

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| GEN-200 | Stall warning affiché après 30s | ✅ Success | Aucun progrès pendant 30s | Pendant upload ou génération | Bande ambre avec message "La génération semble prendre plus de temps que prévu" |
| GEN-201 | Bouton "Réessayer" dans stall warning | ✅ Success | Stall warning visible, cliquer "Réessayer" | Stalled=true | Appel handleRetry, retour au step config |
| GEN-202 | Stall warning disparaît si progrès reprend | ✅ Success | Upload progress change pendant stall | Stalled activé | Le warning disparaît, le timer est reset |
| GEN-203 | Stall warning n'apparaît pas pour les uploads rapides | ✅ Success | Fichier < 1 MB, upload < 5s | Upload rapide | Pas de stall warning |

---

## 6. Génération IA — GenerationProgress (`components/upload/GenerationProgress.tsx`)

### 6.1 États et Rendus

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| GP-001 | Progress bar visible et mis à jour | ✅ Success | Barre de progression avec pourcentage | Upload en cours | Progress value mis à jour en temps réel, % affiché |
| GP-002 | Sous-étape active = icône spinner | 🧪 State | Sous-étape active avec Loader2 qui tourne | Génération en cours | L'icône Loader2 est présente et animée (rotate infinie) |
| GP-003 | Sous-étape complétée = checkmark | 🧪 State | Sous-étape passée | Après advance | Checkmark vert, label barré (`line-through`) |
| GP-004 | Sous-étape pending = dot gris | 🧪 State | Sous-étape future | Génération en cours | Petit cercle gris |
| GP-005 | Sous-étape active = fond primary/5 | 🧪 State | Highlight de l'étape active | Génération en cours | La sous-étape active a `bg-primary/5 border-primary/15` |
| GP-006 | Bouton Annuler toujours visible | 🧪 State | Vérifier présence bouton "Annuler" | Génération en cours | Bouton avec icône XCircle et texte "Annuler" |

### 6.2 Animations

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| GP-100 | Stall warning animation d'entrée | 🧪 State | Vérifier animation framer-motion | Stalled devient true | Le warning apparaît avec slide-down (opacity 0 → 1, y: -8 → 0) |
| GP-101 | Spinner rotation infinie | 🧪 State | Loader2 animation vérifiée | Génération active | La sous-étape active tourne en continu via `animate={{ rotate: 360 }}` |

---

## 7. Résultat — ReportResult (`components/upload/ReportResult.tsx`)

### 7.1 Success States

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| RES-001 | État success complet | ✅ Success | Génération terminée avec succès | resultStatus=success, reportId présent | Checkmark vert animé, titre "Rapport généré avec succès", nom du fichier affiché |
| RES-002 | Lien "Voir le rapport" dans success | ✅ Success | Vérifier navigation vers /reports/[id] | État success | Lien href vers `/reports/{reportId}`, bouton avec texte et flèche |
| RES-003 | Lien "Tous les rapports" dans success | ✅ Success | Vérifier navigation vers /reports | État success | Lien href vers `/reports`, bouton outline |
| RES-004 | Action "Générer un autre rapport" | ✅ Success | Cliquer pour recommencer | État success, onDismiss fourni | Retour au step upload (handleDismiss) |
| RES-005 | Nom du rapport dans le message success | ✅ Success | Vérifier que file.name est affiché | Fichier avec nom "ventes_2024.xlsx" | "ventes_2024.xlsx" visible dans le message de succès |

### 7.2 Error States

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| RES-100 | État erreur avec message spécifique | ❌ Error | Génération échouée avec message | resultStatus=error, errorMessage="..." | Triangle warning rouge, titre "Échec de la génération", message d'erreur spécifique |
| RES-101 | État erreur sans message (message par défaut) | ❌ Error | Génération échouée sans message | resultStatus=error, errorMessage=undefined | Message par défaut "Une erreur s'est produite lors de la génération du rapport." |
| RES-102 | Bouton "Réessayer" dans erreur | ❌ Error | Cliquer Réessayer depuis l'état erreur | État erreur | Retour au step config (handleRetry) |
| RES-103 | Bouton "Recommencer" dans erreur | ❌ Error | Cliquer Recommencer depuis l'état erreur | État erreur, onDismiss fourni | Retour au step upload (handleDismiss) |

### 7.3 Pending State

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| RES-200 | État pending (ni success ni error) | 🧪 State | Afficher le composant avant résultat | resultStatus=null | Skeleton loader animé (placeholder circulaire + 2 lignes) |

---

## 8. Détail Rapport — Page `/reports/[id]`

### 8.1 Success & Access

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| DET-001 | Rapport DONE visible avec slides | ✅ Success | Accéder à un rapport terminé | Rapport DONE avec slides, utilisateur membre de l'org | Titre du rapport, badge status "Terminé", secteur, slides visibles via SlideViewerWrapper |
| DET-002 | Rapport PROCESSING — écran d'attente | ✅ Success | Accéder à un rapport en cours | Rapport PROCESSING | Spinner visible, texte "Génération en cours", ReportDetailPoller monté |
| DET-003 | Rapport PROCESSING → DONE (auto-refresh) | ✅ Success | Poller jusqu'à DONE puis router.refresh() | Rapport PROCESSING | Après transition DONE, page refresh avec SlideViewer visible |
| DET-004 | Rapport ERROR — slides non disponibles | ✅ Success | Accéder à un rapport en erreur | Rapport ERROR | Badge "Erreur", pas de SlideViewer, ReportActions retourne null |
| DET-005 | Rapport avec badge status correct | ✅ Success | Vérifier Badge par status | Rapports DONE/ERROR/PROCESSING | Badge variant = success/error/warning correspondant |

### 8.2 Error Paths

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| DET-100 | Accès à un rapport inexistant (404) | ❌ Error | Naviguer vers /reports/id-invalide | Utilisateur authentifié, aucun rapport avec cet ID | Page 404 (notFound) |
| DET-101 | Accès à un rapport d'une autre organisation | 🛡️ Auth | Naviguer vers rapport d'un autre org | Rapport existe mais org différente | 404 (where clause org.members) |
| DET-102 | Accès sans authentification | 🛡️ Auth | Naviguer vers /reports/[id] sans session | Non authentifié | Redirection vers /login |
| DET-103 | Rapport ID malformé (SQL injection attempt) | 🛡️ Auth | Naviguer avec ID `' OR '1'='1` | Utilisateur authentifié | 404 (pas d'injection possible avec Prisma) |

---

## 9. Slide Viewer (`components/slides/SlideViewer.tsx`)

### 9.1 Navigation

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SLV-001 | Slide initiale = index 0 | ✅ Success | Ouvrir un rapport avec 5 slides | Rapport DONE avec 5 slides | "Slide 1 sur 5" affiché |
| SLV-002 | Navigation suivante avec bouton | ✅ Success | Cliquer "Slide suivante" 4 fois | 5 slides | Slide 2 → 3 → 4 → 5 affiché correctement |
| SLV-003 | Navigation précédente avec bouton | ✅ Success | Aller à slide 4, puis "Slide précédente" | Slide 4 active | Retour à slide 3 |
| SLV-004 | Bouton précédent désactivé à slide 1 | ❌ Error | Slide 1, bouton précédent | Slide 1 | Bouton disabled |
| SLV-005 | Bouton suivant désactivé à dernière slide | ❌ Error | Dernière slide, bouton suivant | Dernier slide | Bouton disabled |
| SLV-006 | Pagination dots cliquables | ✅ Success | Cliquer sur dot de slide 3 | 5 slides | Slide 3 devient active, dot s'agrandit (w-8) |
| SLV-007 | Pagination dots — 1 slide | ⚡ Edge | Rapport avec 1 seule slide | 1 slide | Un seul dot, qui est actif |

### 9.2 Layouts

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SLV-100 | Layout TITLE_SLIDE s'affiche | ✅ Success | Slide avec layout=TITLE_SLIDE | Rapport avec title slide | Titre, sous-titre, date, auteur visibles selon les données |
| SLV-101 | Layout KPI_GRID s'affiche | ✅ Success | Slide avec layout=KPI_GRID, 4 KPI | Rapport avec KPIs | 4 cartes KPI avec valeur, label, tendance |
| SLV-102 | Layout KPI_GRID — 0 KPI | ⚡ Edge | KPI_GRID avec tableau vide | Contenu {kpis: []} | Message "Aucune donnée KPI disponible" |
| SLV-103 | Layout BAR_CHART s'affiche | ✅ Success | Slide avec layout=BAR_CHART | Rapport avec bar chart | Graphique à barres Recharts rendu dans ResponsiveContainer |
| SLV-104 | Layout BAR_CHART — 0 data | ⚡ Edge | BarChart avec data=[] | Contenu vide | Message "Aucune donnée de graphique disponible" |
| SLV-105 | Layout LINE_CHART s'affiche | ✅ Success | Slide avec layout=LINE_CHART | Rapport avec line chart | Graphique linéaire Recharts |
| SLV-106 | Layout LINE_CHART avec showArea | ✅ Success | Line chart avec area | Rapport avec showArea=true | AreaChart rendu au lieu de LineChart |
| SLV-107 | Layout PIE_CHART s'affiche | ✅ Success | Slide avec layout=PIE_CHART | Rapport avec pie chart | Graphique circulaire Recharts |
| SLV-108 | Layout TEXT_SUMMARY s'affiche | ✅ Success | Slide avec layout=TEXT_SUMMARY | Rapport avec text summary | Sections insight/recommendation/warning rendues avec icônes |
| SLV-109 | Layout COMPARISON s'affiche | ✅ Success | Slide avec layout=COMPARISON | Rapport avec comparison | Tableau comparatif 3 colonnes avec check/cross |
| SLV-110 | Layout inconnu (fallback) | ❌ Error | Slide avec layout non supporté | Layout inconnu | Pre JSON formaté affiché avec le contenu brut |
| SLV-111 | Lazy loading chart components | 🏎️ Perf | Vérifier que BarChart/LineChart/PieChart sont chargés dynamiquement | Rapport avec chart slides | Skeleton visible pendant le chargement, puis Recharts rendu |

### 9.3 Sidebar & Reorder

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SLV-200 | Sidebar slides fermée par défaut | ✅ Success | Vérifier état initial sidebar | Rapport avec slides | Sidebar non visible, bouton "Afficher la liste des slides" présent |
| SLV-201 | Ouverture sidebar | ✅ Success | Cliquer bouton liste | Rapport avec slides | Sidebar apparaît avec animation (width 0 → 240), liste des slides visible |
| SLV-202 | Fermeture sidebar | ✅ Success | Cliquer X dans sidebar | Sidebar ouverte | Sidebar disparaît avec animation |
| SLV-203 | Sélection slide via sidebar | ✅ Success | Cliquer sur slide 3 dans la sidebar | Sidebar ouverte | Slide 3 devient active dans le viewer |
| SLV-204 | Slide active en surbrillance dans sidebar | ✅ Success | Changer de slide, vérifier sidebar | Sidebar ouverte | Le slide actif a `bg-primary/10 border-primary` |
| SLV-205 | Drag & drop réorganisation | ✅ Success | Glisser slide 1 en position 3 | Sidebar ouverte, 5+ slides | Les slides sont réordonnés, requête PATCH /api/reports/[id]/reorder envoyée |
| SLV-206 | Drag & drop échoué (API error) | ❌ Error | Drag & drop, API retourne 500 | Sidebar ouverte | Toast "Erreur lors de la reorganisation" |
| SLV-207 | Drag handle visible sur chaque slide | ✅ Success | Vérifier icône GripVertical | Sidebar ouverte | Chaque slide de la sidebar a une poignée de drag |

### 9.4 Keyboard Navigation

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SLV-300 | Navigation flèches clavier | ♿ A11y | Appuyer flèche droite → slide suivante, flèche gauche → précédente | Rapport avec slides | Changement de slide comme avec les boutons |
| SLV-301 | Focus management boutons | ♿ A11y | Tab depuis slide → bouton précédent → suivant → dots | Rapport avec slides | Les boutons de navigation sont focusables dans l'ordre logique |

### 9.5 Empty/Error States

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SLV-400 | SlideViewer avec 0 slides | 🧪 State | Rapport DONE sans slides | Rapport avec slides.length=0 | Message "Aucune slide disponible" centré |
| SLV-401 | Speaker notes visibles | ✅ Success | Slide avec speakerNotes non nul | Slide avec notes | Section jaune avec "Notes:" visible en bas de la slide |

---

## 10. Commentaires (`components/comments/`)

### 10.1 CRUD

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| COM-001 | Ajout commentaire sur slide | ✅ Success | Écrire et envoyer un commentaire | Slide viewer ouvert, comment panel affiché | Commentaire POSTé, ajouté dans la liste en temps réel |
| COM-002 | Ajout commentaire général (sans slide) | ✅ Success | Commentaire sans slideId | Rapport sans slide sélectionnée | Commentaire dans section "Commentaires généraux" |
| COM-003 | Envoi avec Cmd+Enter | ✅ Success | Écrire commentaire, presser Cmd+Enter | Texte non vide | Commentaire envoyé, textarea vidé |
| COM-004 | Modification d'un commentaire | ✅ Success | Cliquer crayon, éditer, sauvegarder | Commentaire existant, utilisateur propriétaire | Texte modifié, badge "(modifié)" visible |
| COM-005 | Annulation modification | ✅ Success | Cliquer crayon, éditer, cliquer "Annuler" | Commentaire existant | Texte original restauré, mode édition fermé |
| COM-006 | Suppression d'un commentaire | ✅ Success | Cliquer poubelle, confirmer | Commentaire existant, utilisateur propriétaire | Commentaire supprimé de la liste |
| COM-007 | Boutons d'action visibles uniquement pour le propriétaire | 🛡️ Auth | Vérifier icônes crayon/poubelle | Deux utilisateurs : propriétaire + autre | Seul le propriétaire voit les icônes |
| COM-008 | Bouton "Voir tout" dans slide viewer | ✅ Success | Cliquer "Voir tout" sous le compteur de commentaires | Slide avec commentaires | Panneau de commentaires s'ouvre |

### 10.2 Edge Cases

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| COM-100 | Commentaire vide (juste espaces) | ❌ Error | Saisir "   " et cliquer Envoyer | Texte non significatif | Bouton Envoyer désactivé (body.trim() = empty) |
| COM-101 | Commentaire très long (> 1000 car.) | ⚡ Edge | Saisir un texte de 2000 caractères | Texte long | Envoyé et affiché avec `break-words` |
| COM-102 | Commentaire avec caractères spéciaux | ⚡ Edge | Saisir HTML, scripts, émojis | Texte avec <script>alert('xss')</script> | Affiché comme texte (safe), pas exécuté |
| COM-103 | 100+ commentaires sur un rapport | ⚡ Edge | Rapport avec nombreux commentaires | Beaucoup de commentaires | Scrollable, pagination ou virtualisation ? Vérifier |
| COM-104 | Compteur de commentaires sur dots de navigation | ✅ Success | Ajouter commentaire sur slide 2 | 1 commentaire sur slide 2 | Le dot de slide 2 a un petit point rouge primaire |

---

## 11. Export (`components/reports/ReportActions.tsx`)

### 11.1 Export Formats

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| EXP-001 | Export PPTX réussi | ✅ Success | Cliquer "PPTX" sur rapport DONE | Rapport DONE, ReportActions visible | POST /api/reports/[id]/export {format:"PPTX"}, toast "Export PPTX en cours" |
| EXP-002 | Export PDF réussi | ✅ Success | Cliquer "PDF" sur rapport DONE | Rapport DONE | POST PDF, toast de succès |
| EXP-003 | Export DOCX réussi | ✅ Success | Cliquer "Word" sur rapport DONE | Rapport DONE | POST DOCX, toast de succès |
| EXP-004 | Export pendant génération | ❌ Error | ReportActions retourne null si status !== "DONE" | Rapport PROCESSING/ERROR/PENDING | ReportActions non rendu (null) |
| EXP-005 | Double-click export (prévention) | ❌ Error | Cliquer PPTX 2x rapidement | Rapport DONE | isExporting=true au premier clic, disabled au second |
| EXP-006 | Export échoué (API error) | ❌ Error | API retourne 500 | Réseau OK, API erreur | Toast "Erreur lors de l'export" |
| EXP-007 | Export échoué (network error) | ❌ Error | Perte de connexion | Simulation offline | Toast "Erreur lors de l'export" |
| EXP-008 | Limite d'exports plan FREE | 🛡️ Auth | Plan FREE, export PDF (devrait être bloqué) | Plan FREE (PPTX only) | Vérifier si le bouton PDF est caché ou affiché mais échoue |

### 11.2 Export States

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| EXP-100 | Loading spinner sur bouton export | 🧪 State | Cliquer PPTX, attendre réponse | Rapport DONE | Loader2 remplace l'icône Download sur le bouton PPTX, les autres sont disabled |
| EXP-101 | Export panel masqué pour plan FREE | 🛡️ Auth | Plan FREE, vérifier les boutons disponibles | Plan FREE, status DONE | Voir implémentation — les 3 boutons sont peut-être visibles mais le backend refuse |

---

## 12. Régénération (`components/reports/ReportActions.tsx`)

### 12.1 Dialog & Execution

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| REG-001 | Ouverture dialog confirmation | ✅ Success | Cliquer "Régénérer" | Rapport DONE, ReportActions visible | ConfirmDialog ouvert avec titre "Régénérer le rapport ?" et description |
| REG-002 | Annulation régénération (cancel) | ✅ Success | Ouvrir dialog, cliquer "Annuler" | Dialog ouvert | Dialog fermé, rien ne se passe |
| REG-003 | Confirmation régénération (confirm) | ✅ Success | Cliquer "Régénérer" dans le dialog | Dialog ouvert | POST /api/reports/[id]/regenerate, toast "Régénération du rapport initiée" |
| REG-004 | Auto-reload après régénération | ✅ Success | Régénération confirmée | POST OK | setTimeout 1000 → window.location.reload() |
| REG-005 | Régénération échouée (API error) | ❌ Error | API retourne 400 avec message | POST échoué | Toast avec error.message ou "Erreur lors de la régénération" |
| REG-006 | Régénération échouée (network) | ❌ Error | Perte de connexion | POST network error | Toast "Erreur lors de la régénération" |

### 12.2 States

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| REG-100 | Bouton retourné null si status ≠ DONE | 🧪 State | Rapport PROCESSING ou ERROR | ReportActions rendu | Component retourne null |
| REG-101 | Loading spinner pendant régénération | 🧪 State | Cliquer Régénérer, attendre réponse | Rapport DONE | Loader2 visible, bouton disabled |
| REG-102 | Double-click régénération | ❌ Error | Cliquer 2x Régénérer rapidement | Rapport DONE | disabled=true pendant le premier appel |

---

## 13. Partage — ShareModal (`components/share/ShareModal.tsx`) & SharePage

### 13.1 ShareModal (In-report)

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SHR-001 | Ouverture ShareModal | ✅ Success | Cliquer bouton Partager dans ReportActions | Rapport DONE | ShareModal ouvert avec options de partage |
| SHR-002 | Activation partage public | ✅ Success | Activer switch "Rapport public" | ShareModal ouvert | POST isPublic=true, lien généré et affiché |
| SHR-003 | Copie lien partage | ✅ Success | Cliquer "Copier" sur le lien | Lien partage visible | Clipboard.writeText appelé, toast "Lien copié" |
| SHR-004 | Copie code iframe | ✅ Success | Cliquer "Copier" code iframe | Embed URL disponible | Clipboard avec `<iframe src="...">` |
| SHR-005 | Désactivation partage | ✅ Success | Cliquer "Désactiver le partage" | Partage actif | POST isPublic=false, lien disparaît |
| SHR-006 | Configuration expiration lien | ✅ Success | Changer expiration en "7 jours" | Partage actif | Select value = "7d", sauvegardé avec PATCH |
| SHR-007 | Configuration mot de passe | ✅ Success | Activer switch password, saisir mot de passe | Partage actif | Password envoyé dans PATCH |
| SHR-008 | Désactivation partage depuis page dédiée | ✅ Success | Cliquer "Désactiver le partage" sur la page share | Page /reports/[id]/share | POST isPublic=false, lien supprimé |

### 13.2 SharePage Errors & Edge

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| SHR-100 | Page share avec token invalide → 404 | ❌ Error | Naviguer vers /share/token-invalide | Token inexistant | Page 404 (testé partiellement) |
| SHR-101 | Page embed avec token invalide → 404 | ❌ Error | Naviguer vers /embed/token-invalide | Token inexistant | Page 404 |
| SHR-102 | Page share avec token expiré | ❌ Error | Naviguer vers share avec token expiré | Token expiré | Message "Ce lien a expiré" |
| SHR-103 | Page share avec mot de passe requis | ✅ Success | Naviguer vers share protégé | Rapport avec password | Formulaire demande mot de passe |
| SHR-104 | Page share mot de passe incorrect | ❌ Error | Saisir mauvais mot de passe | Rapport protégé | Message d'erreur, mot de passe refusé |

---

## 14. Batch Operations (`components/reports/ReportsFilter.tsx`)

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| BCH-001 | Sélection d'un rapport (checkbox) | ✅ Success | Cliquer checkbox d'un rapport | Au moins 1 rapport dans la liste | Checkbox cochée, toolbar batch apparaît |
| BCH-002 | Sélection multiple rapports | ✅ Success | Cocher 3 rapports | 3 rapports | Compteur "3 sélectionnés" visible |
| BCH-003 | Sélection "Tout sélectionner" | ✅ Success | Cliquer checkbox en-tête | 5 rapports filtrés | Les 5 rapports sont cochés |
| BCH-004 | Désélection "Tout désélectionner" | ✅ Success | Tout sélectionner puis re-cliquer | 5 rapports cochés | Tous décochés, toolbar disparaît |
| BCH-005 | Batch delete avec confirmation | ✅ Success | Cocher 2 rapports, cliquer Supprimer, confirmer | 2 rapports sélectionnés | POST /api/reports/batch/delete, toast succès, toolbar disparaît |
| BCH-006 | Batch delete annulation | ✅ Success | Cliquer Supprimer, cliquer Annuler dans le dialog | ConfirmDialog ouvert | Dialog fermé, sélection conservée |
| BCH-007 | Batch export PPTX | ✅ Success | Cocher 2 rapports, Exporter > PPTX | 2 rapports sélectionnés | 2 exports lancés, toast de succès |
| BCH-008 | Batch export mixte (succès+échec) | ❌ Error | 1 export OK, 1 export échoué | 2 rapports, 1 API OK, 1 API error | Toast "1 export PPTX lancé" + Toast "1 export en échec" |
| BCH-009 | Aucun rapport sélectionné, toolbar invisible | 🧪 State | Vérifier toolbar absente | selectedIds vide | Toolbar non rendue |

---

## 15. Filtres & Pagination — ReportsFilter

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| FLT-001 | Champ recherche visible | ✅ Success | Vérifier présence input search | Page /reports chargée | Input avec placeholder "Rechercher un rapport..." et icône Search |
| FLT-002 | Recherche par titre | ✅ Success | Saisir "ventes" dans la recherche | Rapports avec titres contenant "ventes" et d'autres non | Seuls les rapports avec "ventes" dans le titre sont affichés |
| FLT-003 | Recherche par secteur | ✅ Success | Saisir "Marketing" | Rapports Marketing et autres | Seuls les rapports du secteur Marketing |
| FLT-004 | Recherche sans résultats | ⚡ Edge | Saisir "zxcvbnm" (aucun match) | Rapports existants | EmptyState "Aucun résultat" |
| FLT-005 | Effacement recherche | ✅ Success | Saisir texte, cliquer X | Recherche active | Champ vidé, tous les rapports de nouveau visibles |
| FLT-006 | Filtre status = "Terminé" | ✅ Success | Cliquer pill "Terminé" | Rapports DONE + PROCESSING + ERROR | Seuls les rapports DONE sont visibles |
| FLT-007 | Filtre status = "En cours" | ✅ Success | Cliquer pill "En cours" | Rapports mixtes | Seuls PROCESSING visibles |
| FLT-008 | Filtre status = "Erreur" | ✅ Success | Cliquer pill "Erreur" | Rapports mixtes | Seuls ERROR visibles |
| FLT-009 | Filtre "Tous" rétablit tout | ✅ Success | Filtre actif "Terminé", cliquer "Tous" | Filtre actif | Tous les rapports de nouveau visibles |
| FLT-010 | "Effacer les filtres" visible si filtre actif | 🧪 State | Appliquer recherche ou filtre status | Filtre actif | Lien "Effacer les filtres" visible, cliquer → reset |
| FLT-011 | Pagination — page suivante | ✅ Success | Cliquer "Suivant" (>20 rapports) | 25 rapports, page 1 | URL → ?page=2, page 2 affichée |
| FLT-012 | Pagination — page précédente | ✅ Success | Page 2, cliquer "Précédent" | Page 2 | URL → ?page=1 |
| FLT-013 | Pagination désactivée si < 20 rapports | 🧪 State | 5 rapports seulement | totalPages = 1 | Pagination non rendue |
| FLT-014 | Pagination — compteur de résultats | ✅ Success | Page 1 sur 3 | 45 rapports | "Affichage de 1 à 20 sur 45 rapports" |
| FLT-015 | Liste vide (aucun rapport) | 🧪 State | Aucun rapport dans l'org | 0 rapports | EmptyState "Aucun rapport", description + bouton "Nouveau rapport" |

---

## 16. i18n (FR / EN)

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| I18-001 | Stepper labels en FR | 🌐 i18n | Naviguer en FR | Locale=fr | "Téléverser", "Secteur", "Génération", "Résultat" |
| I18-002 | Stepper labels en EN | 🌐 i18n | Naviguer en EN | Locale=en | "Upload", "Sector", "Generation", "Result" |
| I18-003 | SectorSelector labels en FR | 🌐 i18n | Locale=fr | Page /new | "Finance", "Marketing", "Ressources Humaines", "SaaS", "Générique" |
| I18-004 | SectorSelector labels en EN | 🌐 i18n | Locale=en | Page /new | "Finance", "Marketing", "HR", "SaaS", "Generic" |
| I18-005 | DropZone texte en FR | 🌐 i18n | Locale=fr | Page /new | "Glissez votre fichier ici ou cliquez pour parcourir" |
| I18-006 | DropZone texte en EN | 🌐 i18n | Locale=en | Page /new | "Drag & drop your file here or click to browse" |
| I18-007 | Status pills en FR | 🌐 i18n | /reports avec locale=fr | Page /reports | "Tous", "Terminé", "En cours", "Erreur" |
| I18-008 | Status pills en EN | 🌐 i18n | /reports avec locale=en | Page /reports | "All", "Done", "Processing", "Error" |
| I18-009 | Messages d'erreur en FR | 🌐 i18n | Upload fichier invalide en FR | Locale=fr | "Format non supporté. Utilisez: .xlsx,.xls,.csv,.pdf" |
| I18-010 | Messages d'erreur en EN | 🌐 i18n | Upload fichier invalide en EN | Locale=en | "Unsupported format. Use: .xlsx,.xls,.csv,.pdf" |

---

## 17. Accessibilité & Clavier

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| A11-001 | Tab complete flow upload | ♿ A11y | Tab depuis DropZone → Suivant → SectorSelector → Slider → Générer | Page /new step upload → config | Tous les éléments sont focusables dans l'ordre |
| A11-002 | ARIA labels sur les boutons d'action | ♿ A11y | Vérifier aria-label sur tous les boutons | Rapport DONE | "Régénérer le rapport", "Exporter en PPTX", "Exporter en PDF", "Exporter en Word" présents |
| A11-003 | ARIA sur stepper | ♿ A11y | Vérifier aria-current="step" | Step config | Le step actif a `aria-current="step"` |
| A11-004 | ARIA sur navigation slides | ♿ A11y | Vérifier labels des boutons slides | Slide viewer ouvert | "Slide précédente", "Slide suivante", "Afficher la liste des slides", "Fermer la liste des slides" |
| A11-005 | Skip to content | ♿ A11y | Vérifier présence lien "Aller au contenu" | Page /new | Lien caché visible au focus Tab initial |
| A11-006 | Contraste suffisant | ♿ A11y | Vérifier contrastes dans GenerationProgress | Mode clair et sombre | Textes sur fonds ambrés/rouges/verts lisibles |
| A11-007 | États de focus visibles | ♿ A11y | Tab sur tous les éléments interactifs | Page /new, /reports/[id] | Outline visible sur chaque élément focusé |

---

## 18. Responsive / Mobile

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| RSP-001 | Upload flow sur mobile (375px) | 📱 Mobile | Viewport iPhone SE | Step upload | DropZone s'adapte, Stepper labels cachés, boutons full-width |
| RSP-002 | Upload flow sur tablette (768px) | 📱 Mobile | Viewport iPad | Step upload | Grille SectorSelector 2 colonnes |
| RSP-003 | Slide viewer sur mobile | 📱 Mobile | Viewport 375px | Rapport DONE | Navigation slides adaptée, sidebar non disponible |
| RSP-004 | ReportsFilter table responsive | 📱 Mobile | Viewport 375px | Page /reports | Table horizontale scrollable ou adaptée |
| RSP-005 | ShareModal responsive | 📱 Mobile | Viewport 375px | Partage actif | Modale s'adapte, boutons full-width |
| RSP-006 | GenerationProgress responsive | 📱 Mobile | Viewport 375px | Génération en cours | Sous-étapes bien alignées |

---

## 19. Performance & Chargement

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| PERF-001 | Upload fichier 9 MB (gros) | 🏎️ Perf | Upload fichier XLSX de 9 MB | Authentifié | Upload réussi, progress bar visible |
| PERF-002 | Rapport avec 20 slides | 🏎️ Perf | Rapport DONE, 20 slides | Rapport chargé | Navigation fluide, pas de lag |
| PERF-003 | Lazy loading charts vérifié | 🏎️ Perf | Vérifier que recharts n'est pas dans le bundle initial | Page /new | Recharts importé dynamiquement (dynamic import) |
| PERF-004 | 100+ commentaires chargés | 🏎️ Perf | Rapport avec beaucoup de commentaires | Comment panel ouvert | Chargement des commentaires dans un délai acceptable |
| PERF-005 | Pagination 50 rapports | 🏎️ Perf | 50 rapports dans l'org | Page /reports | Pagination fonctionne, pas de ralentissement |

---

## 20. Rapports Polling — ReportDetailPoller & ReportsPoller

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| POL-001 | ReportDetailPoller monte si PROCESSING | ✅ Success | Rapport PROCESSING, page détail | Rapport PROCESSING | Poller monté, fetch toutes les 5s |
| POL-002 | ReportDetailPoller ne monte pas si DONE | 🧪 State | Rapport DONE | Rapport terminé | Poller non monté (isProcessing=false) |
| POL-003 | ReportDetailPoller s'arrête à 60 retries | ⚡ Edge | Rapport PROCESSING > 5 min | Génération bloquée | Polling arrêté, warn console |
| POL-004 | ReportDetailPoller cleanup au unmount | 🧪 State | Naviguer hors page pendant polling | Polling actif | Interval et ref nettoyés |
| POL-005 | ReportsPoller monte si PROCESSING dans liste | ✅ Success | Au moins 1 rapport PROCESSING | Page /reports | Poller monté |
| POL-006 | ReportsPoller ne monte pas si tout DONE | 🧪 State | Tous les rapports DONE/ERROR | Rapports terminés | Poller non monté |
| POL-007 | ReportsPoller fetch erreur silencieuse | ❌ Error | Échec fetch polling | Réseau instable | Erreur silencieuse (catch vide), polling continue |

---

## 21. Plan Limits & Feature Gates

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| PLN-001 | FREE plan: bouton Nouveau Rapport présent | 🛡️ Auth | Plan FREE | Authentifié | Accès à /new autorisé |
| PLN-002 | FREE plan: limite de 3 rapports atteinte | 🛡️ Auth | Plan FREE, 3/3 rapports ce mois | 3 rapports créés | Upload refusé avec message limite atteinte |
| PLN-003 | FREE plan: max 8 slides | 🛡️ Auth | Plan FREE, vérifier slider max | Plan FREE | Slider max = 8 |
| PLN-004 | FREE plan: watermark sur export | 🛡️ Auth | Plan FREE, exporter PPTX | Plan FREE, rapport DONE | Export inclu watermark |
| PLN-005 | PRO plan: 30 rapports/mois | 🛡️ Auth | Plan PRO actif | 30 rapports autorisés | Upload possible jusqu'à 30 |
| PLN-006 | PRO plan: exports multiples | 🛡️ Auth | Plan PRO, exporter PPTX+PDF+DOCX | Plan PRO, rapport DONE | Les 3 formats disponibles |
| PLN-007 | PRO plan: pas de watermark | 🛡️ Auth | Plan PRO, exporter PPTX | Plan PRO | Export sans watermark |
| PLN-008 | TEAM plan: illimité rapports | 🛡️ Auth | Plan TEAM | Plan TEAM | canConsume retourne toujours true |
| PLN-009 | TEAM plan: max 30 slides | 🛡️ Auth | Plan TEAM, slider max | Plan TEAM | Max = 30 |

---

## 22. Regressions & Transitions

| ID | Scénario | Catégorie | Description | Préconditions | Résultat attendu |
|----|----------|-----------|-------------|---------------|------------------|
| REGR-001 | Rafraîchissement page /new pendant génération | ⚡ Edge | F5 pendant que le rapport est PROCESSING | Génération en cours | Retour au step upload (pas d'état persistant) |
| REGR-002 | Retour arrière navigateur pendant polling | ⚡ Edge | Naviguer vers /reports pendant génération | Polling actif | Polling stoppé (cleanup useEffect) |
| REGR-003 | Session expirée pendant upload long | ⚡ Edge | Session expire pendant upload (30 min) | Upload en cours | XHR échoue avec 401, message erreur |
| REGR-004 | Onglet fermé pendant génération | ⚡ Edge | Fermer le navigateur pendant génération | Génération en cours | Le rapport continue en backend, visible dans la liste plus tard |
| REGR-005 | Multiple onglets /new simultanés | ⚡ Edge | Ouvrir 2 onglets /new, uploader sur les deux | Double upload | Les deux uploads sont indépendants |

---

## Synthèse des manques par composant

| Composant | Tests existants | Scénarios manquants identifiés |
|-----------|----------------|-------------------------------|
| DropZone | 0 | 23 (UPL-001 à UPL-302) |
| DataPreview | 0 | ~15 (non détaillés ci-dessus) |
| SectorSelector | 0 | 8 (SEC-001 à SEC-101) |
| SlideCountSlider | 0 | 12 (SCNT-001 à SCNT-202) |
| Stepper | 0 | 8 (STP-001 à STP-103) |
| FlowContainer | 0 | 1 (animation transition) |
| NewReportForm (submission) | 0 | 14 (GEN-001 à GEN-203) |
| GenerationProgress | 0 | 10 (GP-001 à GP-101) |
| ReportResult | 0 | 9 (RES-001 à RES-200) |
| ReportDetailPoller | 0 | 7 (POL-001 à POL-007) |
| ReportsPoller | 0 | 3 |
| SlideViewer | 0 | 28 (SLV-001 à SLV-401) |
| SlideCard / Layouts | 0 | 13 (layouts) |
| SortableSlideList | 0 | 8 |
| CommentThread / Input / Item | 0 | 13 (COM-001 à COM-104) |
| ReportActions (export) | 0 | 11 (EXP-001 à EXP-101) |
| ReportActions (regenerate) | 0 | 8 (REG-001 à REG-102) |
| ShareModal | 0 | ~10 |
| ReportsFilter | 3 (skip) | 22 (FLT-001 à FLT-015, BCH+) |
| **TOTAL** | **3 (skip)** | **~205 scénarios** |

---

## Recommandations

1. **Priorité haute (smoke tests)** : UPL-001, UPL-004, GEN-001, GEN-004, RES-001, DET-001, SLV-001, SLV-100→SLV-110
2. **Priorité haute (critical errors)** : UPL-100, UPL-102, GEN-100→GEN-107, RES-100, DET-100, COM-100
3. **Priorité moyenne (i18n)** : I18-001 à I18-010 (un test paramétré par locale)
4. **Priorité moyenne (responsive)** : RSP-001 à RSP-006
5. **Priorité moyenne (accessibilité)** : A11-001 à A11-007
6. **À intégrer en CI** : Tous les tests de priorité haute + les tests de pagination + les tests d'export

### Structure de fichiers suggérée

```
tests/e2e/
├── upload-flow.spec.ts        # DropZone + DataPreview
├── report-config.spec.ts      # SectorSelector + SlideCountSlider + Stepper
├── report-generation.spec.ts  # NewReportForm + GenerationProgress + ReportResult
├── report-detail.spec.ts      # SlideViewer + SlideCard + layouts
├── report-comments.spec.ts    # CommentThread + CommentInput + CommentItem
├── report-actions.spec.ts     # Export + Regenerate
├── report-list.spec.ts        # ReportsFilter + pagination + batch operations
├── report-share.spec.ts       # ShareModal + share page + embed
├── report-polling.spec.ts     # ReportDetailPoller + ReportsPoller
├── i18n.spec.ts               # Tests paramétrés FR/EN
├── responsive.spec.ts         # Viewport mobile/tablet
├── accessibility.spec.ts      # Tests axe-core ou manuels ARIA
└── plan-limits.spec.ts        # Tests par plan (FREE/PRO/TEAM)
```

### Configuration Playwright nécessaire

- **Authentification** : Créer un helper `authenticatedContext` ou utiliser `storageState` avec cookie de session valide
- **Mock API** : Utiliser `page.route()` pour simuler les réponses API (upload, polling, export)
- **Test fixtures** : Fichiers XLSX, CSV, PDF de test dans `tests/fixtures/`
- **Visual regression** : `await expect(page).toHaveScreenshot()` pour les composants clés (Stepper, GenerationProgress)
- **Paramétrage des plans** : Mock `featureGateService` ou seed DB avec différents plans
