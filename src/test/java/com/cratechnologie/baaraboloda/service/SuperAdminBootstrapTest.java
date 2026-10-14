package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.Authority;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.repository.AuthorityRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.security.crypto.password.PasswordEncoder;

class SuperAdminBootstrapTest {

    private final UserRepository users = mock(UserRepository.class);
    private final AuthorityRepository authorities = mock(AuthorityRepository.class);
    private final PasswordEncoder passwords = mock(PasswordEncoder.class);
    private final String email = "superadmin@gmail.com";

    private SuperAdminBootstrap bootstrap(String address, String password) {
        when(authorities.lockSuperAdminAuthority()).thenReturn(Optional.of(new Authority().name("ROLE_SUPER_ADMIN")));
        when(authorities.findById("ROLE_USER")).thenReturn(Optional.of(new Authority().name("ROLE_USER")));
        return new SuperAdminBootstrap(
            users,
            authorities,
            passwords,
            new ConcurrentMapCacheManager(UserRepository.USERS_BY_LOGIN_CACHE, UserRepository.USERS_BY_EMAIL_CACHE),
            address,
            password
        );
    }

    @Test
    void createsOnlyTheExplicitlyConfiguredAccountWithAnEncodedPassword() {
        when(passwords.encode("initial-test-password")).thenReturn("encoded-password");
        bootstrap(email, "initial-test-password").run(null);
        verify(users).saveAndFlush(
            argThat(
                user ->
                    user.getEmail().equals(email) &&
                    user.getLogin().equals(email) &&
                    user.isActivated() &&
                    user.getPassword().equals("encoded-password") &&
                    user.getAuthorities().contains(new Authority().name("ROLE_SUPER_ADMIN"))
            )
        );
    }

    @Test
    void noConfigurationDoesNotCreateAnyAccount() {
        bootstrap("", "").run(null);
        verifyNoInteractions(users, passwords);
    }

    @Test
    void neverRegrantsOrResetsCredentialsAfterInitialization() {
        when(users.countByAuthoritiesName("ROLE_SUPER_ADMIN")).thenReturn(1L);
        bootstrap(email, "unused-password").run(null);
        verify(users, never()).saveAndFlush(any());
        verifyNoInteractions(passwords);
    }

    @Test
    void promotesExistingActiveAccountWithoutChangingItsPassword() {
        User user = new User();
        user.setEmail(email);
        user.setLogin("existing-login");
        user.setActivated(true);
        user.setPassword("existing-hash");
        when(users.findOneByEmailIgnoreCase(email)).thenReturn(Optional.of(user));
        bootstrap(email, "").run(null);
        assertThat(user.getPassword()).isEqualTo("existing-hash");
        verify(users).saveAndFlush(user);
        verifyNoInteractions(passwords);
    }

    @Test
    void refusesMissingPasswordForNewAccount() {
        assertThatThrownBy(() -> bootstrap(email, "").run(null)).isInstanceOf(IllegalStateException.class);
        verify(users, never()).saveAndFlush(any());
    }
}
