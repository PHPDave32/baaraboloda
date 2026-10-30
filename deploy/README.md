# Baara Boloda — production isolée

Développement : MySQL inchangé. Production : PostgreSQL 17 dans un conteneur dédié, Redis dédié, application Spring Boot + Angular dans une seule image. Aucune connexion au PostgreSQL global du serveur. PostgreSQL et Redis n’exposent aucun port sur l’hôte ; l’application écoute uniquement sur `127.0.0.1:18080`.

Serveur cible : `david@192.168.2.249`, accès externe éventuel `197.155.136.250`. Dossier réservé : `/var/www/david/baaraboloda`. Domaine : `baaraboloda.crademo.com`.

## Sur le serveur : Docker snap et `./bb`

Docker y est installé en snap : il ne voit pas `/var/www`. Le serveur utilise donc `docker-compose.server.yml` (fichier unique, sans chemin hôte, script SQL d'init intégré) piloté par `./bb`, qui lit `.env.isolated` et la configuration avec bash puis les transmet à Docker sur l'entrée standard. Toujours passer par `./bb` dans `/var/www/david/baaraboloda` :

```sh
./bb ps                                     # état
./bb logs -f app                            # journaux
./bb load baaraboloda-production.tar.gz     # nouvelle image
./bb update                                 # recrée seulement l'app
./bb backup                                 # dump PostgreSQL dans backups/
```

Les commandes `docker compose ... -f docker-compose.isolated.yml` des sections suivantes restent valables pour un Docker non snap (essais locaux).

## Avant le déploiement

Faire confirmer l’empreinte SSH du serveur par son administrateur. Vérifier en lecture seule son architecture (`uname -m`), la disponibilité de Docker Compose, l’espace disque et que le port 18080 est libre. Vérifier si HestiaCP gère le domaine. Ne pas installer, reconfigurer, arrêter ou redémarrer Docker, Nginx, Apache, PostgreSQL ou HestiaCP sans coordination. Si Docker n’est pas déjà disponible avec démarrage automatique, faire préparer ce prérequis par l’administrateur.

## Construire l’image

Depuis la racine du dépôt, avec Docker :

```sh
docker build -t baaraboloda:production .
```

Le Dockerfile construit Angular en production avec Node 24, puis le JAR avec Java 21. L’image finale tourne sans root (UID 10001). Les secrets locaux, données `.data`, clés privées, `node_modules` et fichiers Git sont exclus du contexte.

Pour un serveur x86_64 depuis un Mac ARM, construire explicitement pour la cible (confirmer d’abord l’architecture) :

```sh
docker buildx build --platform linux/amd64 --load -t baaraboloda:production .
docker save baaraboloda:production | gzip > /tmp/baaraboloda-production.tar.gz
```

Ne pas transférer une image ARM vers un serveur x86_64. Transférer l’archive et ce dossier `deploy` uniquement après vérification SSH. Aucun mot de passe ne doit être placé dans la commande SSH ni dans Git.

## Configuration

Dans `/var/www/david/baaraboloda`, conserver les fichiers Compose et `postgres-init.sql` ensemble. Copier `.env.isolated.example` vers `.env.isolated`, protéger ce fichier avec `chmod 600`, puis renseigner :

- `POSTGRES_ADMIN_PASSWORD` : secret réservé à l’administration du conteneur PostgreSQL.
- `DATABASE_PASSWORD` : secret distinct pour le compte applicatif `baaraboloda`.
- `JWT_SECRET` : résultat de `openssl rand -base64 64` (une seule ligne).
- `SUPER_ADMIN_EMAIL` et `SUPER_ADMIN_PASSWORD` : premier compte réel, mot de passe d’au moins 12 caractères.
- SMTP si nécessaire ; `localhost` dans un conteneur ne désigne pas le serveur hôte.

Les mots de passe peuvent être générés avec `openssl rand -hex 32`. L’utilisateur applicatif n’a pas les droits superuser, création de bases ou création de rôles. Son accès est limité à la base dédiée. Le script d’initialisation ne s’exécute que sur un volume PostgreSQL neuf : modifier `.env.isolated` ne change pas automatiquement un mot de passe déjà enregistré dans PostgreSQL.

Les comptes de démonstration `admin` et `user` sont désactivés par une migration PostgreSQL de production. Aucun profil `faker`, `secret-samples` ou `api-docs` n’est activé. Le bootstrap ne réinitialise pas un superadmin existant.

## Démarrage

Après transfert, charger l’image, puis valider sans afficher les secrets :

```sh
gunzip -c baaraboloda-production.tar.gz | docker load
docker compose --env-file .env.isolated -p baaraboloda-production -f docker-compose.isolated.yml -f docker-compose.postgresql.yml config --quiet
docker compose --env-file .env.isolated -p baaraboloda-production -f docker-compose.isolated.yml -f docker-compose.postgresql.yml up -d --wait --wait-timeout 300
```

Liquibase crée le schéma dans PostgreSQL. Les photos et logos sont conservés dans le volume `app_data`, la base dans `postgres_data`. Les documents sont enregistrés en base. Cette procédure initialise une production neuve : elle ne copie pas les données MySQL de développement. Une reprise des données existantes demanderait un export et une conversion séparés.

```sh
curl --fail http://127.0.0.1:18080/management/health
docker compose --env-file .env.isolated -p baaraboloda-production -f docker-compose.isolated.yml -f docker-compose.postgresql.yml ps
```

`restart: unless-stopped` assure le redémarrage après un redémarrage du moteur Docker, si celui-ci démarre déjà avec le serveur. Un conteneur volontairement arrêté reste arrêté. Un statut unhealthy seul ne provoque pas de redémarrage automatique.

## HTTPS et serveur partagé

Le fichier `nginx-location.conf.example` est un fragment destiné UNIQUEMENT au vhost du domaine. Il prend en charge les notifications SSE (pas de buffering). Ne pas le copier dans une configuration globale, ne pas lancer de proxy concurrent sur 80/443 et ne pas exécuter de commande de redémarrage/rechargement globale sans coordination.

Si HestiaCP gère le domaine, son administrateur doit intégrer le proxy via le mécanisme Hestia approprié, vérifier les configurations, provisionner le certificat Let’s Encrypt du domaine et sa reconduction, puis convenir du rechargement nécessaire. Un DNS correct ne garantit ni l’ouverture de 80/443, ni le certificat. Prévoir également la redirection HTTP vers HTTPS dans ce vhost.

Après activation, vérifier `https://baaraboloda.crademo.com`, la connexion, les notifications, le téléversement de photo/logo et les e-mails. L’URL publique est déjà configurée pour les liens d’e-mail et la réinitialisation de mot de passe.

## Sauvegarde et mise à jour

Sauvegarder PostgreSQL et le volume `app_data` avant une mise à jour. Exemple de dump avec la même commande Compose :

```sh
docker compose --env-file .env.isolated -p baaraboloda-production -f docker-compose.isolated.yml -f docker-compose.postgresql.yml exec -T postgres pg_dump -U postgres -Fc baaraboloda > backup.dump
```

Protéger et copier les sauvegardes hors du serveur, tester leur restauration dans un environnement distinct. Conserver l’image précédente avec un tag de version. Après chargement d’une nouvelle image, recréer uniquement `app` avec `up -d --no-deps app`. Une migration de schéma peut empêcher un retour arrière par simple changement d’image : conserver le dump associé. Ne pas utiliser `down -v` sur la production.

La configuration de production retenue est exclusivement la combinaison `docker-compose.isolated.yml` + `docker-compose.postgresql.yml`. Les résultats des essais locaux sont consignés dans `VALIDATION.md`.

## CI/CD (déploiement automatique)

```
push main ─► GitHub Actions : tests backend + frontend ─► image amd64 ─► ghcr.io/phpdave32/baaraboloda:{sha-<commit>, production}
serveur  ─► baaraboloda-deploy.timer (toutes les 2 min, connexion sortante uniquement)
            └─ nouvelle image ? sauvegarde PostgreSQL → recrée `app` → healthy ? sinon retour à l'image précédente
```

- Workflow : `.github/workflows/ci-cd.yml`. Les pull requests ne lancent que les tests ; seul un push sur `main` dont tous les tests passent déplace le tag `production`.
- GitHub n'a aucun accès au serveur : aucun port à ouvrir, aucune clé SSH dans GitHub.
- Agent serveur : `server/baaraboloda-deploy` (installé dans `/usr/local/sbin`, root:root), `server/baaraboloda-deploy.{service,timer}` (dans `/etc/systemd/system`). Il ne touche qu'au projet Compose `baaraboloda-production` et ne fait jamais de `prune` global.
- Sauvegardes avant chaque mise à jour : `backups/pre-deploy-*.dump` (10 dernières conservées).
- Une image qui échoue n'est pas retentée : il faut pousser un nouveau commit.

Suivre / piloter sur le serveur :

```sh
systemctl list-timers baaraboloda-deploy.timer
journalctl -u baaraboloda-deploy -n 50 --no-pager      # historique des déploiements
sudo systemctl start baaraboloda-deploy                # vérifier tout de suite
sudo systemctl disable --now baaraboloda-deploy.timer  # suspendre l'automatisme
```

Revenir manuellement à une version précise : `sudo docker pull ghcr.io/phpdave32/baaraboloda:sha-<commit>`, `sudo docker tag` vers `baaraboloda:production`, puis `./bb update` (suspendre le timer avant, sinon il redéploie `production`).

Désinstaller : `sudo systemctl disable --now baaraboloda-deploy.timer && sudo rm /etc/systemd/system/baaraboloda-deploy.{service,timer} /usr/local/sbin/baaraboloda-deploy && sudo systemctl daemon-reload`.
