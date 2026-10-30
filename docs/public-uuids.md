# UUID publics

Les projets, tâches et sprints possèdent un champ `uuid` unique et stable. Les clés numériques `id` restent internes : les relations, les références métier et les corps des requêtes existantes continuent à les utiliser.

Les liens Angular et les chemins API utilisent les UUID des entités chargées. Exemples :

- `/projects/550e8400-e29b-41d4-a716-446655440000/backlog`
- `/api/projects/550e8400-e29b-41d4-a716-446655440000`
- `/api/tasks/<uuid>/sprint`
- `/api/tasks/projects/<uuid>/backlog`
- `/api/projects/<uuid>/documents`

## Mise en service

Redémarrer le backend pour exécuter la migration Liquibase `20261020120000_public_uuids.xml`, puis recharger le frontend. La migration attribue un UUID à chaque ligne existante et ajoute des contraintes d’unicité et de non-nullité. Elle ne modifie aucune clé numérique ni relation. Les nouveaux éléments reçoivent un UUID côté serveur ; les UUID envoyés par un client ne sont pas acceptés pour les créations ou modifications.

Les anciens chemins API numériques restent compatibles. Les anciens liens numériques de l’espace projet sont redirigés vers leur URL UUID en conservant paramètres et fragment. Les identifiants des utilisateurs, commentaires et documents ne sont pas migrés par ce changement.

## Implémentation

- `PublicIdResolver` résout chaque identifiant dans le type d’entité demandé, puis laisse les contrôles d’accès habituels s’exécuter.
- `PublicIdentifiers` mémorise les correspondances des DTO chargés. L’intercepteur convertit les chemins API uniquement pour le serveur de l’application ; les relations numériques dans les corps des requêtes restent inchangées.
- `workspaceResolve` permet l’ouverture directe d’une URL UUID et protège contre les liens associant une tâche à un autre projet.
- Les UUID ne remplacent pas les permissions d’accès.

## Vérifications

Tests de migration sur H2 : reprise des lignes existantes, conservation des relations, unicité, non-nullité et stabilité après une seconde exécution. Tests Java du routage MVC et des mappers. Tests Angular des liens directs, redirections, correspondances et requêtes API. La migration MySQL utilise la fonction native `UUID()`.
