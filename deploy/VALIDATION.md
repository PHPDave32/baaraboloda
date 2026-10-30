# Validation locale — 29 octobre 2026

Aucun accès authentifié ni changement effectué sur le serveur de production.

- Image `baaraboloda:production` construite avec succès via le Dockerfile, Angular optimisé et JAR Spring Boot inclus. Image locale ARM64 ; reconstruire pour l’architecture du serveur après inventaire.
- Configuration Compose PostgreSQL validée avec `config --quiet`.
- Démarrage sain de l’application, PostgreSQL et Redis dans le projet Docker jetable `baaraboloda-smoke`.
- 38 entrées Liquibase appliquées sur PostgreSQL ; compte applicatif sans superuser, CREATEDB ou CREATEROLE ; comptes de démonstration admin/user désactivés.
- Scénarios HTTP validés sur PostgreSQL puis sur une seconde pile MySQL 8.4 isolée : santé, HTML Angular, connexion du superadmin, création et lecture de projet/période/tâche, images de tâches, image binaire de commentaire, téléversement/téléchargement de document, clôture et alerte sans doublon.
- Logo, projet et alerte conservés après redémarrage de l’application et PostgreSQL.
- SMTP désactivé durant ces essais. HTTPS et intégration Hestia/Nginx non testés : nécessitent un accès au serveur et une coordination avec son administrateur.

Le script `smoke-test.py` reproduit les scénarios HTTP et crée des données : l’exécuter uniquement sur une instance jetable, jamais sur la production réelle.

```sh
python3 deploy/smoke-test.py --env-file /chemin/protege/test.env --url http://127.0.0.1:18881
```

Le fichier de test contient `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` (valeurs brutes, sans guillemets). Les identifiants et jetons ne sont pas affichés.
