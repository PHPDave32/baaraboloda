# Notifications par e-mail

## Événements et préférences

Dans la cloche **Notifications**, activer **E-mails**, les événements sont ensuite sélectionnés automatiquement par le backend :

- Attribution ou réattribution : la nouvelle personne assignée, y compris à la création ou copie d’une tâche.
- Commentaire : le créateur et l’assigné, sans doublon ; une personne mentionnée reçoit également une notification si elle est autorisée par les règles existantes.
- Changement de statut : le créateur de la tâche.

L’auteur de l’action et les comptes désactivés sont exclus. L’activation des e-mails est individuelle et désactivée par défaut. Aucun choix de catégorie n’est proposé : les anciens choix individuels sont ignorés, y compris à la livraison. Le bouton général E-mails reste disponible. Les changements ordinaires d’une tâche restent dans le fil de l’application sans déclencher d’e-mail. Lire une notification dans l’application n’annule pas son e-mail.

Les fins de période disposent également d’une alerte dédiée : lors de la clôture manuelle ou automatique (00 h 05, heure de Bamako), les tâches autres que « Terminée » sont regroupées par personne assignée, avec nom, photo et statut dans le détail de la notification. Les tâches sans assigné figurent dans « Non assignées ». Le bilan conserve les données au moment de la clôture et indique que les objectifs sont à vérifier.

Tous les superadmins actifs sont destinataires pour tous les projets. Les autres comptes actifs doivent appartenir au projet (membre ou responsable) et disposer de `PERM_SPRINT_ALERT_RECEIVE`, via leur profil ou une attribution individuelle, sans révocation. Cette permission figure dans le catalogue d’administration. L’alerte de fin de période déclenche un e-mail indépendamment du réglage individuel E-mails ; le transport SMTP doit toutefois être activé sur le serveur. Les photos privées sont consultables dans l’application après authentification.

Une seule clôture est notifiée par période, y compris après réouverture. Le bilan et les notifications sont enregistrés dans la transaction de clôture ; une contrainte unique empêche plusieurs notifications pour la même période et le même destinataire. Les périodes déjà terminées avant l’installation ne sont pas retraitées automatiquement. Redémarrer le backend pour appliquer `20261026120000_sprint_alerts.xml`.

## Fonctionnement

L’événement et la ligne `app_notification` sont enregistrés dans la transaction métier. Une annulation de la transaction annule donc aussi la notification. Le traitement planifié examine les lignes validées toutes les 15 secondes, par lots de 50, sans bloquer la requête utilisateur.

Avant l’envoi, les préférences et l’activation du compte sont vérifiées à nouveau. Une tâche ou un projet supprimé annule l’e-mail en attente. Les messages comportent du HTML et du texte brut, le projet, la tâche, l’auteur de l’action et un lien UUID. L’accès au lien reste soumis à l’authentification et aux permissions.

Un échec entraîne une nouvelle tentative après deux minutes, avec cinq tentatives au maximum. `email_sent_at` indique un envoi accepté par le serveur SMTP ; cela ne garantit pas la livraison finale en boîte de réception. Après cinq échecs, la ligne reste en attente et nécessite une intervention après correction du SMTP. Le journal indique l’identifiant de la notification en échec, sans identifiants SMTP.

L’envoi SMTP et la mise à jour SQL ne sont pas atomiques : un arrêt du serveur entre ces deux opérations peut produire un doublon. Aucun système de suivi des rebonds n’est inclus.

## Développement avec Mailpit

1. Redémarrer le backend pour appliquer la migration `20261021120000_notification_email.xml`.
2. Avec Docker Desktop actif, démarrer `npm run docker:mailpit:up`.
3. Recharger l’interface et activer les e-mails dans les notifications du compte destinataire.
4. Depuis un autre compte, lui attribuer une tâche, commenter sa tâche ou modifier le statut d’une tâche qu’il a créée.
5. Consulter http://localhost:8025 après le prochain passage du traitement (environ 15 secondes, hors charge ou nouvelle tentative).

Le profil `dev` active l’envoi vers Mailpit sur `localhost:1025`. Aucun e-mail ne quitte Mailpit. Le destinataire doit avoir une adresse e-mail renseignée. Une même personne qui réalise ses propres actions ne recevra aucun message.

## Production

Configurer le SMTP selon [la configuration e-mail existante](password-reset.md#configuration-de-lenvoi-en-production), puis définir :

- `NOTIFICATIONS_EMAIL_ENABLED=true` (désactivé par défaut en production).
- `NOTIFICATIONS_BASE_URL=https://adresse-de-votre-application` ; à défaut, reprend `JHIPSTER_MAIL_BASE_URL`.
- `JHIPSTER_MAIL_FROM` : adresse d’expédition autorisée.
- `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` et les paramètres TLS/authentification requis par le fournisseur.

Les délais SMTP de connexion, lecture et écriture sont limités à cinq secondes par défaut. Les secrets restent dans l’environnement du serveur. Redémarrer le backend après configuration. Quand le transport est désactivé, les e-mails déjà en attente sont conservés pour une activation ultérieure.

## Vérifications automatisées

Les tests couvrent les migrations H2, les destinataires et préférences, les modifications de tâches, l’annulation de transaction, le contenu MIME/HTML échappé, les liens UUID, les nouvelles tentatives et les contrôles de l’interface. Le serveur SMTP est simulé dans ces tests ; effectuer la vérification Mailpit ci-dessus avant d’activer un fournisseur réel.
