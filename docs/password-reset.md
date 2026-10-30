# Réinitialisation du mot de passe

Depuis la connexion, « Mot de passe oublié ? » ouvre `/account/reset/request`.
Un compte actif reçoit un lien vers `/account/reset/finish?key=…`, valable 24 heures et utilisable une seule fois.
La réponse reste identique pour une adresse inconnue afin de ne pas révéler les comptes existants.

## Tests locaux avec Mailpit

Démarrer Docker Desktop, puis `npm run docker:mailpit:up` (ou `npm run services:up` pour les services de développement).

- Boîte de réception : http://localhost:8025
- SMTP local : localhost:1025, sans identifiant ni TLS.
- Avec le profil `dev`, l’application utilise cette configuration et les liens pointent vers http://localhost:4200.
- Redémarrer le backend après changement de configuration. Les variables d’environnement SMTP existantes restent prioritaires.
- Demander une réinitialisation avec l’adresse d’un compte actif, puis ouvrir le message dans Mailpit et suivre le lien.
- Les messages restent locaux : aucune livraison à une véritable boîte e-mail.
- Arrêter Mailpit : `npm run docker:mailpit:down`.

Configuration basée sur la [documentation officielle Mailpit](https://mailpit.axllent.org/docs/install/docker/).

## Configuration de l’envoi en production

Configurer ces variables dans l’environnement du serveur (ne pas enregistrer les identifiants SMTP dans Git) :

- `SPRING_MAIL_HOST` : serveur SMTP du fournisseur.
- `SPRING_MAIL_PORT` : port fourni (souvent 587 pour STARTTLS).
- `SPRING_MAIL_USERNAME` et `SPRING_MAIL_PASSWORD` : identifiants SMTP.
- `SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=true` si une authentification est nécessaire.
- `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE=true` pour un fournisseur utilisant STARTTLS.
- `JHIPSTER_MAIL_FROM` : adresse d’expédition autorisée par le fournisseur.
- `JHIPSTER_MAIL_BASE_URL` : URL de l’interface accessible aux utilisateurs, sans slash final. En développement Angular : `http://localhost:4200`. En production : URL publique HTTPS.

Le profil de production conserve `localhost:25` par défaut ; il faudra y configurer le SMTP de CRA. Les réglages TLS et le port doivent correspondre au fournisseur choisi. Redémarrer le serveur après configuration.

## Vérification réelle

Avec un compte de test actif : demander le lien, vérifier sa réception, changer le mot de passe puis se connecter avec le nouveau mot de passe. Vérifier que l’ancien mot de passe et le lien déjà utilisé ne fonctionnent plus. Sans serveur SMTP configuré, la réception de l’e-mail ne peut pas être validée.
