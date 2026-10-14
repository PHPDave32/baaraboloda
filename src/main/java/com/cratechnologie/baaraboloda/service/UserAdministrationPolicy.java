package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Authority;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.repository.AuthorityRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.security.AuthoritiesConstants;
import com.cratechnologie.baaraboloda.security.SecurityUtils;
import com.cratechnologie.baaraboloda.service.dto.AdminUserDTO;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

@Service
public class UserAdministrationPolicy {

    private final UserRepository users;
    private final AuthorityRepository authorities;

    public UserAdministrationPolicy(UserRepository users, AuthorityRepository authorities) {
        this.users = users;
        this.authorities = authorities;
    }

    public void checkCreate(AdminUserDTO dto) {
        boolean superAdmin = requireAdministrator();
        Set<String> requested = requestedAuthorities(dto);
        if (!superAdmin && !requested.equals(Set.of(AuthoritiesConstants.USER))) {
            throw denied();
        }
        validateAuthorities(requested);
    }

    public void checkUpdate(User existing, AdminUserDTO dto) {
        boolean superAdmin = requireAdministrator();
        Set<String> requested = requestedAuthorities(dto);
        if (
            !superAdmin &&
            (isAdministrator(existing) || !com.cratechnologie.baaraboloda.security.EffectiveAuthorities.of(existing).equals(requested))
        ) {
            throw denied();
        }
        validateAuthorities(requested);
        if (isSuperAdmin(existing) && (!requested.contains(AuthoritiesConstants.SUPER_ADMIN) || !dto.isActivated())) {
            protectLastSuperAdmin(existing);
        }
    }

    public void checkDelete(User existing) {
        boolean superAdmin = requireAdministrator();
        if (!superAdmin && isAdministrator(existing)) throw denied();
        if (isSuperAdmin(existing)) protectLastSuperAdmin(existing);
    }

    public void checkActivation(User existing, boolean activated) {
        boolean superAdmin = requireAdministrator("PERM_USER_DISABLE");
        if (!superAdmin && isAdministrator(existing)) throw denied();
        if (!activated && isSuperAdmin(existing)) protectLastSuperAdmin(existing);
    }

    private boolean requireAdministrator() {
        return requireAdministrator("PERM_USER_MANAGE");
    }

    private boolean requireAdministrator(String delegatedPermission) {
        User actor = SecurityUtils.getCurrentUserLogin().flatMap(users::findOneWithAuthoritiesByLogin).orElseThrow(this::denied);
        if (
            !actor.isActivated() ||
            (!isAdministrator(actor) &&
                !com.cratechnologie.baaraboloda.security.EffectiveAuthorities.of(actor).contains(delegatedPermission))
        ) throw denied();
        return isSuperAdmin(actor);
    }

    private Set<String> requestedAuthorities(AdminUserDTO dto) {
        if (dto.getAuthorities() == null || dto.getAuthorities().isEmpty()) {
            throw new BadRequestAlertException("Choisissez au moins un rôle.", "userManagement", "authorityrequired");
        }
        return dto.getAuthorities();
    }

    private void validateAuthorities(Set<String> requested) {
        if (requested.stream().anyMatch(name -> !authorities.existsById(name))) {
            throw new BadRequestAlertException("Rôle ou permission inconnu.", "userManagement", "unknownauthority");
        }
    }

    private void protectLastSuperAdmin(User existing) {
        // Serialize removals so concurrent requests cannot remove the last two super administrators.
        authorities.lockSuperAdminAuthority().orElseThrow();
        if (existing.isActivated() && users.findActiveSuperAdminsForUpdate().size() <= 1) {
            throw new BadRequestAlertException("Conservez au moins un super administrateur actif.", "userManagement", "lastsuperadmin");
        }
    }

    private Set<String> names(User user) {
        return user.getAuthorities().stream().map(Authority::getName).collect(Collectors.toSet());
    }

    private boolean isSuperAdmin(User user) {
        return names(user).contains(AuthoritiesConstants.SUPER_ADMIN);
    }

    private boolean isAdministrator(User user) {
        Set<String> roles = names(user);
        return (
            roles.contains(AuthoritiesConstants.SUPER_ADMIN) ||
            (user.getAccessProfile() == null && roles.contains(AuthoritiesConstants.ADMIN))
        );
    }

    private AccessDeniedException denied() {
        return new AccessDeniedException("Seul un super administrateur peut gérer les administrateurs et les permissions.");
    }
}
