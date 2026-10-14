package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.Authority;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.repository.AuthorityRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.service.dto.AdminUserDTO;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class UserAdministrationPolicyTest {

    private final UserRepository users = mock(UserRepository.class);
    private final AuthorityRepository authorities = mock(AuthorityRepository.class);
    private final UserAdministrationPolicy policy = new UserAdministrationPolicy(users, authorities);

    private User user(String... roles) {
        User user = new User();
        user.setActivated(true);
        for (String role : roles) user.getAuthorities().add(new Authority().name(role));
        return user;
    }

    private void authenticate(String role) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("actor", "", List.of(new SimpleGrantedAuthority(role)))
        );
        when(users.findOneWithAuthoritiesByLogin("actor")).thenReturn(Optional.of(user(role)));
        when(authorities.existsById(anyString())).thenReturn(true);
    }

    private AdminUserDTO dto(String... roles) {
        AdminUserDTO dto = new AdminUserDTO();
        dto.setAuthorities(Set.of(roles));
        dto.setActivated(true);
        return dto;
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @ParameterizedTest
    @ValueSource(strings = { "ROLE_ADMIN", "ROLE_SUPER_ADMIN", "PERM_PROJECT_CREATE" })
    void administratorCannotGrantRolesOrPermissions(String authority) {
        authenticate("ROLE_ADMIN");
        assertThatThrownBy(() -> policy.checkCreate(dto("ROLE_USER", authority))).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> policy.checkUpdate(user("ROLE_USER"), dto("ROLE_USER", authority))).isInstanceOf(
            AccessDeniedException.class
        );
    }

    @ParameterizedTest
    @ValueSource(strings = { "ROLE_ADMIN", "ROLE_SUPER_ADMIN" })
    void administratorCannotModifyOrDeletePrivilegedAccounts(String authority) {
        authenticate("ROLE_ADMIN");
        assertThatThrownBy(() -> policy.checkUpdate(user(authority), dto(authority))).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> policy.checkDelete(user(authority))).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void administratorCanManageEmployeesWithoutChangingTheirPermissions() {
        authenticate("ROLE_ADMIN");
        assertThatCode(() -> policy.checkCreate(dto("ROLE_USER"))).doesNotThrowAnyException();
        assertThatCode(() ->
            policy.checkUpdate(user("ROLE_USER", "PERM_PROJECT_CREATE"), dto("ROLE_USER", "PERM_PROJECT_CREATE"))
        ).doesNotThrowAnyException();
        assertThatCode(() -> policy.checkDelete(user("ROLE_USER"))).doesNotThrowAnyException();
        assertThatThrownBy(() -> policy.checkUpdate(user("ROLE_USER", "PERM_PROJECT_CREATE"), dto("ROLE_USER"))).isInstanceOf(
            AccessDeniedException.class
        );
    }

    @Test
    void administratorCanAssignAProfileToAnEmployee() {
        authenticate("ROLE_ADMIN");
        AdminUserDTO created = dto("ROLE_USER");
        created.setAccessProfileId(3L);
        assertThatCode(() -> policy.checkCreate(created)).doesNotThrowAnyException();

        User existing = user("ROLE_USER");
        AdminUserDTO updated = dto("ROLE_USER");
        updated.setAccessProfileId(2L);
        assertThatCode(() -> policy.checkUpdate(existing, updated)).doesNotThrowAnyException();
    }

    @Test
    void superAdministratorCanPromoteAccountsAndGrantPermissions() {
        authenticate("ROLE_SUPER_ADMIN");
        assertThatCode(() -> policy.checkCreate(dto("ROLE_SUPER_ADMIN"))).doesNotThrowAnyException();
        assertThatCode(() -> policy.checkUpdate(user("ROLE_USER"), dto("ROLE_ADMIN", "PERM_PROJECT_CREATE"))).doesNotThrowAnyException();
        assertThatCode(() -> policy.checkDelete(user("ROLE_ADMIN"))).doesNotThrowAnyException();
    }

    @Test
    void lastActiveSuperAdministratorCannotBeRemovedDeactivatedOrDemoted() {
        authenticate("ROLE_SUPER_ADMIN");
        User last = user("ROLE_SUPER_ADMIN");
        when(authorities.lockSuperAdminAuthority()).thenReturn(Optional.of(new Authority().name("ROLE_SUPER_ADMIN")));
        when(users.findActiveSuperAdminsForUpdate()).thenReturn(List.of(last));
        assertThatThrownBy(() -> policy.checkDelete(last)).isInstanceOf(BadRequestAlertException.class);
        assertThatThrownBy(() -> policy.checkUpdate(last, dto("ROLE_ADMIN"))).isInstanceOf(BadRequestAlertException.class);
        AdminUserDTO inactive = dto("ROLE_SUPER_ADMIN");
        inactive.setActivated(false);
        assertThatThrownBy(() -> policy.checkUpdate(last, inactive)).isInstanceOf(BadRequestAlertException.class);
        assertThatCode(() -> policy.checkUpdate(last, dto("ROLE_SUPER_ADMIN"))).doesNotThrowAnyException();
    }

    @Test
    void superAdministratorCanDemoteAnotherWhenAnotherActiveSuperAdministratorRemains() {
        authenticate("ROLE_SUPER_ADMIN");
        User target = user("ROLE_SUPER_ADMIN");
        when(authorities.lockSuperAdminAuthority()).thenReturn(Optional.of(new Authority().name("ROLE_SUPER_ADMIN")));
        when(users.findActiveSuperAdminsForUpdate()).thenReturn(List.of(target, user("ROLE_SUPER_ADMIN")));
        assertThatCode(() -> policy.checkUpdate(target, dto("ROLE_USER"))).doesNotThrowAnyException();
    }

    @Test
    void staleTokenCannotRestoreRevokedAdministrativeRights() {
        authenticate("ROLE_SUPER_ADMIN");
        when(users.findOneWithAuthoritiesByLogin("actor")).thenReturn(Optional.of(user("ROLE_USER")));
        assertThatThrownBy(() -> policy.checkCreate(dto("ROLE_SUPER_ADMIN"))).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void unknownAuthorityIsRejected() {
        authenticate("ROLE_SUPER_ADMIN");
        when(authorities.existsById("ROLE_UNKNOWN")).thenReturn(false);
        assertThatThrownBy(() -> policy.checkCreate(dto("ROLE_UNKNOWN"))).isInstanceOf(BadRequestAlertException.class);
    }
}
