package com.cratechnologie.baaraboloda.security;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public final class PermissionCatalog {

    public record Permission(String key, String label, String description) {}

    public static final List<Permission> ALL = List.of(
        new Permission("PERM_PROJECT_CREATE", "Créer des projets", "Créer un projet et en devenir responsable."),
        new Permission("PERM_PROJECT_EDIT", "Modifier les projets", "Modifier les informations des projets accessibles."),
        new Permission(
            "PERM_PROJECT_REOPEN",
            "Réouvrir les projets",
            "Réouvrir un projet fermé et rétablir les actions autorisées par les profils."
        ),
        new Permission(
            "PERM_PROJECT_CLOSE",
            "Fermer les projets",
            "Fermer un projet après analyse de l’équipe et le rendre consultable uniquement."
        ),
        new Permission("PERM_PROJECT_DELETE", "Supprimer les projets", "Supprimer les projets accessibles."),
        new Permission("PERM_MANAGE_MEMBERS", "Gérer les équipes", "Ajouter ou retirer des membres et changer le responsable."),
        new Permission("PERM_SPRINT_MANAGE", "Gérer les sprints", "Créer, modifier, démarrer, terminer et supprimer les sprints."),
        new Permission("PERM_TASK_MANAGE", "Gérer les tâches", "Créer, modifier, assigner, déplacer et supprimer les tâches."),
        new Permission("PERM_COMMENT_MANAGE", "Participer aux commentaires", "Ajouter, modifier et supprimer les commentaires."),
        new Permission(
            "PERM_RESOURCE_VISIBILITY",
            "Gérer la visibilité de ses ressources",
            "Choisir qui peut consulter les documents, fichiers et liens que vous avez ajoutés."
        ),
        new Permission("PERM_DOCUMENT_MANAGE", "Gérer les documents", "Ajouter et supprimer les documents et liens."),
        new Permission("PERM_USER_DISABLE", "Désactiver les comptes", "Désactiver ou réactiver les comptes utilisateurs ordinaires."),
        new Permission(
            "PERM_USER_MANAGE",
            "Gérer les comptes utilisateurs",
            "Créer et gérer les comptes ordinaires, puis leur attribuer un profil."
        )
    );
    public static final Set<String> KEYS = ALL.stream().map(Permission::key).collect(Collectors.toUnmodifiableSet());

    private PermissionCatalog() {}
}
