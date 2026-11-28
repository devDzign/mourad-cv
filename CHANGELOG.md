# Changelog

## v0.3.0 (Novembre 2026)

### Features
* **[feat(offres)]**: la veille d'offres affiche aussi les fiches encore présentes dans le dépôt du job board mais retirées de sa liste, pour ne pas perdre de vue un poste peut-être pourvu ou en pause (PR #3)
  - ces offres portent un badge « Hors liste · à vérifier » et une note dans leur analyse ; leur ville est déduite du champ « Où » de la fiche

## v0.2.0 (Novembre 2026)

### Features
* **[security(acces)]**: les pages personnelles `/entretien` et `/offres` (pages, fichiers statiques et routes d'API) sont protégées par identifiant et mot de passe (PR #1)
  - identifiants lus dans `PRIVATE_USER` et `PRIVATE_PASSWORD` ; sans eux, ces pages répondent 404 en production et restent libres en local
* **[feat(accueil)]**: ajout d'une section « Bande démo » avec la vidéo de présentation de 30 secondes

### Infrastructure & Deployment
* **[config(contact)]**: l'adresse publique du site est renseignée, pour les QR codes, la carte et le CV

### Cleanup
* **[chore(git)]**: le dossier `.superelvest` est ignoré par Git

## v0.1.0 (Novembre 2026)

Première version versionnée du portfolio de Mourad Chabour (Node.js + Express, front HTML/CSS/JS sans build) :
page principale avec compétences, projets filtrables, schéma d'architecture animé exportable en SVG et GIF, et
formulaire de contact (email SMTP et sauvegarde JSON) ; carte de visite numérique avec QR code et vCard ; CV
imprimable en PDF ; parcours complet ; notes de formation « IA » ; pages personnelles de préparation d'entretien
et de veille d'offres d'emploi. Le contenu est piloté par `data/content.json`, `data/parcours.json` et
`data/entretien.json`, avec thème clair et sombre.
Cette version marque le passage aux releases par tag (`vX.Y.Z`) : elle regroupe tout l'historique antérieur
sans le détailler. Le site reste déployé par Render à chaque push sur `main` ; le tag ne déploie rien.
