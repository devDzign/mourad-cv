# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Portfolio personnel (Node.js ≥ 20.6 + Express) : page principale, carte de visite numérique, CV imprimable, page « parcours complet », page de formation « IA », page personnelle de préparation d'entretien et veille d'offres d'emploi. Le code, les commentaires et les textes sont en français : garder cette convention.

## Commandes

```bash
npm install
npm run dev        # node --watch server.js → http://localhost:3000
npm run dev:env    # idem, en chargeant .env (nécessaire pour tester l'envoi d'email)
npm start          # production (Render)
```

Il n'y a ni build, ni linter, ni tests : le front est en HTML/CSS/JS vanilla servi tel quel depuis `public/`. Pour vérifier un changement, lancer le serveur et ouvrir la page concernée.

## Architecture

- **`server.js`** : fichier back-end principal (plus `offres.js`, module de lecture et d'analyse des offres). Sert `public/` en statique, expose `/vendor/gifenc/` (depuis `node_modules`) et définit les routes :
  - `/api/profile` (contenu sans les projets) et `/api/projects` (projets + catégories dédupliquées dans l'ordre d'apparition) ;
  - `/api/contact` : honeypot `website`, validation, rate limit en mémoire (3 messages / IP / 10 min), puis sauvegarde dans `data/messages.json` (écritures sérialisées via une file de promesses) **et** email SMTP. Succès si au moins un des deux canaux fonctionne. SMTP actif seulement si `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` et `CONTACT_TO` sont tous définis ;
  - `/api/qr.svg`, `/api/qr.gif` (QR vers un chemin interne validé par regex), `/api/vcard` ;
  - `/api/parcours` : contenu de `data/parcours.json` (parcours complet) ;
  - `/api/entretien` : contenu de `data/entretien.json` (préparation d'entretien) ;
  - `/api/offres` : offres du job board GitHub analysées et scorées (cache mémoire 30 min, `?refresh=1` force la relecture) ;
  - pages courtes `/carte`, `/cv`, `/parcours`, `/ia`, `/entretien`, `/offres` ; toute autre route `/api/*` renvoie un 404 JSON.
- **`data/content.json`** : source unique du contenu (identité, textes, compétences, réseaux, `contact`, projets). Relu à chaque requête, donc pas besoin de redémarrer. Un lien vide (`""`) n'est pas affiché ; `demo` commençant par `#` pointe vers une section de la page ; `visual` d'un projet référence une illustration de `covers.js`.
- **URL publique** (QR, carte, CV) : `SITE_URL` > `content.contact.website` > hôte de la requête (`siteUrl()` dans `server.js`).
- **Front (`public/`)** : une paire HTML/CSS/JS par page. `index.html` charge `covers.js` (illustrations SVG animées des cartes projets, exposées dans `window.COVERS`), `script.js` (rendu depuis `/api/profile` et `/api/projects`, bandeau des entreprises depuis `/api/parcours`, filtres, modale, formulaire) et `architecture.js`. `carte.html` et `ia.html` réutilisent `style.css` ; `cv.html` n'utilise que `cv.css`.
- **`architecture.js`** : schéma SVG animé piloté par les constantes `NODES`, `EDGES` (types `http`, `event`, `sql`) et `SCENARIOS` en haut du fichier, avec export SVG et GIF (via `gifenc`). Respecte `prefers-reduced-motion`.
- **`ia.html`** : contenu en dur dans le HTML ; les questions du quiz sont dans le tableau `QUIZ` en haut de `ia.js`.
- **`parcours.html`** (`/parcours`, liée depuis la nav, la frise et la section Contact de l'accueil) : parcours de carrière détaillé. Le contenu est dans `data/parcours.json` (entreprises avec logo dans `public/logos/`, affichées en bandeau défilant `.marquee` et en fiches ; postes, formation, certifications, projets personnels, publications, langues) ; le détail année par année des cinq dernières années réutilise `timeline` de `/api/profile` pour éviter la duplication — c'est le rôle du champ `detail: "timeline"` sur un poste. Un poste marqué `aCompleter: true` s'affiche en pointillés : c'est un emplacement à remplir, pas un contenu définitif.
- **`entretien.html`** (`/entretien`, `noindex`, non liée depuis le site) : préparation d'entretien pour un poste Staff Engineer / architecte transverse. Le contenu (fil rouge, pitchs 30 s / 2 min / 5 min, histoires STAR, questions, checklist) est dans `data/entretien.json` ; parcours et principes viennent de `/api/profile`. Pitch réécrit, notes, scores d'entraînement et cases cochées sont gardés dans `localStorage` (préfixe `ent:`).
- **`offres.html`** (`/offres`, `noindex`, liée seulement depuis `/entretien`) : veille d'offres. `offres.js` (racine) lit le job board GitHub défini dans `data/offres.json` (README listant les offres par ville + une fiche Markdown par entreprise), analyse chaque fiche (domaine, lieu, stack, missions, profil, salaire), calcule un score d'adéquation à partir des compétences et écarts pondérés de `data/offres.json`, et génère un brouillon de candidature. `GITHUB_TOKEN` (facultatif) relève la limite de l'API GitHub. Statuts, messages retouchés et offres déjà vues sont dans `localStorage` (préfixe `off:`).
- **Thème clair/sombre** : tokens CSS dans `style.css`, `:root[data-theme]` + `prefers-color-scheme`, choix mémorisé dans `localStorage` (clé `theme`) et appliqué par un petit script inline dans le `<head>` de chaque page pour éviter le flash.

## Points d'attention

- Les fichiers CSS/JS sont référencés avec un paramètre de cache-busting (`style.css?v=16`, `cv.js?v=12`…). Après modification d'un fichier, incrémenter son `?v=` dans toutes les pages HTML qui le chargent.
- `data/messages.json` et `.env` sont ignorés par Git. Sur Render (offre gratuite), le disque est effacé à chaque redéploiement : l'email est le canal principal pour les messages.
- `public/architecture.svg` et `public/architecture.excalidraw` sont une ancienne version « croquis » du schéma, indépendante de `architecture.js`.
