# Portfolio — Mourad Chabour

Portfolio personnel en Node.js + Express : présentation, compétences, projets filtrables et formulaire de contact (email + sauvegarde JSON).

## Démarrer le projet

Prérequis : [Node.js](https://nodejs.org) 20.6 ou plus récent (`node --version` pour vérifier). Aucune base de données, aucun build : le serveur Express sert directement les fichiers de `public/`.

```bash
git clone <url-du-depot> && cd mourad-dev   # ou ouvrez le dossier existant
npm install                                 # une seule fois, installe les 4 dépendances
npm run dev                                 # lance le serveur sur http://localhost:3000
```

Le serveur redémarre tout seul quand vous modifiez `server.js`. Les fichiers de `public/` et de `data/` sont relus à chaque requête : un simple rechargement de la page suffit.

| Commande | Usage |
|---|---|
| `npm run dev` | Développement, sans envoi d'email (les messages du formulaire sont seulement enregistrés dans `data/messages.json`) |
| `npm run dev:env` | Développement avec le fichier `.env` chargé, pour tester l'envoi d'email |
| `npm start` | Production (commande utilisée par Render) |

Pour tester l'envoi d'email en local : copiez `.env.example` en `.env`, remplissez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` et `CONTACT_TO`, puis lancez `npm run dev:env`.

Pages disponibles une fois le serveur lancé :

| Adresse | Page |
|---|---|
| http://localhost:3000 | Portfolio (présentation, compétences, projets, schéma d'architecture, contact) |
| http://localhost:3000/carte | Carte de visite numérique avec QR code |
| http://localhost:3000/cv | CV imprimable en PDF |
| http://localhost:3000/ia | Notes de formation « compétences Claude » |
| http://localhost:3000/entretien | Préparation d'entretien (page personnelle, non référencée) |
| http://localhost:3000/offres | Offres d'emploi analysées et scorées, avec brouillon de candidature (page personnelle) |

Si le port 3000 est déjà pris, lancez avec un autre port : `PORT=3001 npm run dev`. Pour arrêter le serveur : `Ctrl+C` dans le terminal.

## Modifier le contenu

Tout se trouve dans **`data/content.json`** : nom, accroche, textes, statistiques, compétences, réseaux sociaux et projets. Rechargez la page pour voir le résultat.

- Un réseau social ou un lien de projet (`demo`, `repo`) laissé vide (`""`) n'est pas affiché.
- `colors` définit le dégradé de la couverture d'un projet (deux couleurs hexadécimales).
- Les filtres sont créés automatiquement à partir des `category` de vos projets.

Chaque projet peut aussi avoir des champs `role`, `context` et `highlights` (liste) : ils s'affichent dans la fenêtre de détail quand on clique sur la carte. Un lien `demo` qui commence par `#` (ex. `#architecture`) renvoie vers une section de la page.

## Schéma d'architecture

La section Architecture est un schéma SVG animé, dessiné par `public/architecture.js`. Tout se règle en haut de ce fichier :

- `NODES` : les briques (position, taille, titre, sous-titre, type → couleur) ;
- `EDGES` : les liaisons, tracées point par point, avec leur type (`http`, `event`, `sql`) ;
- `SCENARIOS` : les histoires jouées étape par étape (légende + paquets qui circulent).

Les scénarios se lancent automatiquement quand le schéma est visible, et s'arrêtent si l'utilisateur a activé « réduire les animations » dans son système.

Deux boutons à côté de « Pause » exportent le schéma :

- **SVG** : image fixe, nette à toutes les tailles, avec titre, légende et polices du site intégrées ;
- **GIF animé** : enregistre le scénario sélectionné (environ 8 images par seconde, titre et légende de chaque étape inclus). Seuls les pixels qui changent sont enregistrés à chaque image, ce qui garde le fichier léger (moins de 1 Mo). Glissez-le dans Teams.

Une version croquis reste disponible (`public/architecture.svg` et `public/architecture.excalidraw`, modifiable sur [excalidraw.com](https://excalidraw.com)).

## Carte de visite numérique et CV PDF

- **`/carte`** : carte de visite qui se retourne (recto : identité, verso : QR code vers le portfolio).
  - « Envoyer par email » ouvre votre messagerie avec un message déjà rédigé contenant le lien de la carte.
  - « Ajouter à mes contacts » télécharge une fiche `.vcf` (route `/api/vcard`).
  - « Copier pour un email » copie une version compatible Gmail / Outlook (tableau + styles en ligne) à coller dans un message ou une signature.
  - « Exporter la carte en image » : SVG (net à toutes les tailles, polices intégrées), PNG 2400 × 1500 (idéal pour Teams), ou « Copier l'image » pour la coller directement dans une conversation Teams.
  - « GIF animé » : carte animée (reflet, QR qui pulse, étincelles), 720 × 450, en boucle. Les navigateurs ne copient pas les GIF animés dans le presse-papiers : le fichier est téléchargé, il suffit de le glisser dans Teams. Encodage par la librairie `gifenc`, servie sur `/vendor/gifenc/`.
- **`/cv`** : CV aux couleurs du site, mis en page en A4. Le bouton « Enregistrer en PDF » ouvre la fenêtre d'impression : choisissez « Enregistrer au format PDF ». `/cv?print` l'ouvre directement.

Réglages dans `data/content.json`, clé `contact` :

```json
"contact": { "phone": "+33 6 …", "location": "Paris et périphérie", "website": "https://votre-site.onrender.com" }
```

- `phone` vide : le téléphone n'apparaît nulle part.
- `website` : adresse publique du site, utilisée par les QR codes, la carte et le CV. Vide, c'est l'adresse de la page qui est utilisée (donc `localhost` en local). On peut aussi la définir avec la variable d'environnement `SITE_URL` sur Render.

Les QR codes sont générés par le serveur (`/api/qr.svg` et `/api/qr.gif`, ce dernier pour les emails) avec la petite librairie `qrcode-generator`.

## Page « IA · Compétences Claude »

**`/ia`** (fichiers `public/ia.html`, `ia.css`, `ia.js`) : synthèse expliquée d'un pack de formation sur les compétences (skills) Claude — définition et vocabulaire, structure d'un dossier, chargement progressif, anatomie de `SKILL.md`, formule de description, checklist interactive, tableau de dépannage, règles MCP, exemples « mauvais vs bon » à basculer, exercices et un quiz de 10 questions avec score. Liens depuis le menu (« IA »), la section Contact et le pied de page. Le contenu est directement dans `ia.html` ; les questions du quiz sont dans le tableau `QUIZ` en haut de `ia.js`.

## Page « Préparer mon entretien »

**`/entretien`** (fichiers `public/entretien.html`, `entretien.css`, `entretien.js`) : espace personnel, non référencé (`noindex`) et sans lien depuis le site, pour préparer un entretien de Staff Engineer ou d'architecte transverse. Fil rouge et trois preuves, pitch en trois durées modifiable et chronométré avec jauge de débit, parcours et principes repris du portfolio, histoires au format STAR avec notes personnelles, questions probables filtrables avec points clés, mode entraînement (question au hasard, 2 minutes, auto-évaluation qui fait revenir les questions faibles), questions à poser et checklist de la veille. Le bouton « Antisèche PDF » imprime une version compacte.

Le contenu se modifie dans **`data/entretien.json`** (servi par `/api/entretien`). Les modifications de pitch, notes, scores et cases cochées restent dans le navigateur (`localStorage`).

## Page « Offres à matcher »

**`/offres`** (fichiers `public/offres.html`, `offres.css`, `offres.js`, module serveur `offres.js`) : le serveur lit le job board GitHub de JL Recrutement (un README qui liste les offres par ville, une fiche Markdown par entreprise), analyse chaque fiche et la compare au profil. Chaque offre reçoit un score sur 100 et un verdict (Postuler, À étudier, Peu adapté), avec les atouts reconnus, les écarts à assumer et des notes de contexte (séniorité, localisation, métier). Le bouton « Préparer ma candidature » ouvre un brouillon de message en français, modifiable, à copier ou à ouvrir directement dans la messagerie avec l'objet et le corps remplis. Les offres déjà vues, les messages retouchés et les statuts (envoyée, écartée) restent dans le navigateur.

Réglages dans **`data/offres.json`** : dépôt source et email du recruteur, compétences reconnues et leur poids, compétences non maîtrisées, textes du message. Le dépôt est relu au plus toutes les 30 minutes (bouton « Relire le dépôt » pour forcer). Sans jeton, l'API GitHub autorise 60 requêtes par heure ; définir `GITHUB_TOKEN` dans l'environnement relève cette limite.

## Messages reçus

Chaque message est :

1. enregistré dans `data/messages.json` (créé automatiquement, ignoré par Git) ;
2. envoyé par email si les variables SMTP sont définies (voir `.env.example`).

Avec Gmail, utilisez un **mot de passe d'application** (Compte Google → Sécurité → Validation en deux étapes → Mots de passe des applications), pas votre mot de passe habituel.

## Déployer (GitHub + Render)

GitHub Pages n'héberge que des fichiers statiques et ne peut pas faire tourner Express : on utilise donc [Render](https://render.com), qui se branche sur le dépôt GitHub (https://github.com/devDzign/mourad-cv) et redéploie à chaque `git push` sur `main`.

Le fichier **`render.yaml`** à la racine décrit le service (Node, `npm install`, `npm start`, offre gratuite, région Francfort). Render le lit tout seul :

1. Créez un compte sur [render.com](https://render.com) avec votre compte GitHub, et autorisez l'accès au dépôt `devDzign/mourad-cv` quand Render le demande.
2. Dans le tableau de bord : **New → Blueprint**, choisissez le dépôt `mourad-cv`, puis **Apply**. Render crée le service `mourad-cv` et lance le premier déploiement (2 à 3 minutes).
3. Le site est en ligne sur `https://mourad-cv.onrender.com` (le nom peut varier si celui-ci est pris : il s'affiche en haut de la page du service).
4. Dans le service, onglet **Environment**, renseignez `SITE_URL` avec cette adresse : les QR codes, la carte de visite et le CV l'utiliseront. Pour recevoir les messages du formulaire par email, ajoutez aussi `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` et `CONTACT_TO` (voir `.env.example`). Chaque enregistrement redéploie le site.
5. Un nom de domaine personnalisé peut être ajouté dans **Settings → Custom Domains**.

Sans Blueprint, la création manuelle fonctionne aussi : **New → Web Service**, dépôt `mourad-cv`, Runtime **Node**, Build Command `npm install`, Start Command `npm start`, Instance Type **Free**, puis les mêmes variables d'environnement.

### Limites de l'offre gratuite

- Le site se met en veille après 15 min sans visite ; la première visite suivante prend ~30 secondes.
- Le disque est effacé à chaque redéploiement : `messages.json` ne sert que de secours, l'email reste le canal principal.
- Certains hébergeurs gratuits bloquent les ports SMTP. Si les emails ne partent pas, consultez les logs Render (onglet **Logs**) ; le message reste quand même enregistré.

## Structure

```
├── server.js          Serveur Express et API
├── data/content.json  Contenu du portfolio
└── public/            Page, styles et script du navigateur
```
