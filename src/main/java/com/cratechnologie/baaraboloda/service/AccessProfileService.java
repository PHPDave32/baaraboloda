package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.AccessProfile;
import com.cratechnologie.baaraboloda.repository.AccessProfileRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.security.PermissionCatalog;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.List;
import org.springframework.cache.CacheManager;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class AccessProfileService {

    private final AccessProfileRepository profiles;
    private final UserRepository users;
    private final CacheManager caches;

    public AccessProfileService(AccessProfileRepository profiles, UserRepository users, CacheManager caches) {
        this.profiles = profiles;
        this.users = users;
        this.caches = caches;
    }

    @Transactional(readOnly = true)
    public List<AccessProfile> list() {
        return profiles.findAll(Sort.by("name"));
    }

    public AccessProfile save(Long id, AccessProfile input) {
        if (
            input.getName() == null ||
            input.getName().isBlank() ||
            input.getName().trim().length() > 100 ||
            (input.getDescription() != null && input.getDescription().length() > 500) ||
            input.getPermissions() == null ||
            !PermissionCatalog.KEYS.containsAll(input.getPermissions())
        ) {
            throw bad("Profil ou permissions invalides.", "invalidprofile");
        }
        if (profiles.existsByNameIgnoreCaseAndIdNot(input.getName().trim(), id == null ? -1L : id)) throw bad(
            "Ce nom de profil existe déjà.",
            "duplicatename"
        );
        AccessProfile profile =
            id == null ? new AccessProfile() : profiles.findById(id).orElseThrow(() -> bad("Profil introuvable.", "profilenotfound"));
        profile.setName(input.getName().trim());
        profile.setDescription(input.getDescription());
        profile.setAllProjects(input.isAllProjects());
        profile.setPermissions(new java.util.HashSet<>(input.getPermissions()));
        AccessProfile saved = profiles.saveAndFlush(profile);
        clearUserCaches();
        return saved;
    }

    public void delete(Long id) {
        if (users.existsByAccessProfileId(id)) throw bad(
            "Ce profil est attribué à des utilisateurs. Réattribuez leurs profils avant de le supprimer.",
            "profileinuse"
        );
        profiles.delete(profiles.findById(id).orElseThrow(() -> bad("Profil introuvable.", "profilenotfound")));
        clearUserCaches();
    }

    private void clearUserCaches() {
        for (String name : List.of(
            UserRepository.USERS_BY_LOGIN_CACHE,
            UserRepository.USERS_BY_EMAIL_CACHE,
            "com.cratechnologie.baaraboloda.domain.User"
        )) {
            var cache = caches.getCache(name);
            if (cache != null) cache.clear();
        }
    }

    private BadRequestAlertException bad(String message, String key) {
        return new BadRequestAlertException(message, "accessProfile", key);
    }
}
