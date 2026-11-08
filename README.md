# Portfolio — Mourad Chabour

Portfolio personnel en Node.js + Express : présentation, compétences, projets filtrables et formulaire de contact (email + sauvegarde JSON).

## Lancer en local

Prérequis : [Node.js](https://nodejs.org) 20.6 ou plus récent.

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Le serveur redémarre tout seul quand vous modifiez `server.js`.

Pour tester l'envoi d'email en local : copiez `.env.example` en `.env`, remplissez-le, puis lancez `npm run dev:env`.

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

## Messages reçus

Chaque message est :

1. enregistré dans `data/messages.json` (créé automatiquement, ignoré par Git) ;
2. envoyé par email si les variables SMTP sont définies (voir `.env.example`).

Avec Gmail, utilisez un **mot de passe d'application** (Compte Google → Sécurité → Validation en deux étapes → Mots de passe des applications), pas votre mot de passe habituel.

## Déployer (GitHub + Render)

GitHub Pages n'héberge que des fichiers statiques et ne peut pas faire tourner Express : on utilise donc Render, qui se branche sur votre dépôt GitHub.

1. **Créer le dépôt GitHub** et y pousser le projet :
   ```bash
   git init
   git add .
   git commit -m "Premier commit du portfolio"
   git branch -M main
   git remote add origin https://github.com/<votre-compte>/<nom-du-depot>.git
   git push -u origin main
   ```
2. Sur [render.com](https://render.com), connectez-vous avec GitHub puis **New → Web Service** et choisissez le dépôt.
3. Réglages :
   - Runtime : **Node**
   - Build Command : `npm install`
   - Start Command : `npm start`
   - Instance Type : **Free**
4. Dans **Environment**, ajoutez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` et `CONTACT_TO`.
5. Cliquez sur **Create Web Service**. Votre site est en ligne sur `https://<nom>.onrender.com`.

Ensuite, chaque `git push` sur `main` redéploie le site automatiquement. Un nom de domaine personnalisé peut être ajouté dans **Settings → Custom Domains**.

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
