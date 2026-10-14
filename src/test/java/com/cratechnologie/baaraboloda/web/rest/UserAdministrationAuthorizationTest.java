package com.cratechnologie.baaraboloda.web.rest;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.repository.AuthorityRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.service.MailService;
import com.cratechnologie.baaraboloda.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;

@SpringJUnitConfig(UserAdministrationAuthorizationTest.Config.class)
class UserAdministrationAuthorizationTest {

    @Configuration
    @EnableMethodSecurity
    static class Config {

        @Bean
        AuthorityResource authorities() {
            return new AuthorityResource(mock(AuthorityRepository.class));
        }

        @Bean
        UserResource users() {
            UserService service = mock(UserService.class);
            when(service.getUserWithAuthoritiesByLogin("unknown")).thenReturn(
                java.util.Optional.of(new com.cratechnologie.baaraboloda.domain.User())
            );
            return new UserResource(service, mock(UserRepository.class), mock(MailService.class));
        }
    }

    @Autowired
    private AuthorityResource authorities;

    @Autowired
    private UserResource users;

    @Test
    @WithMockUser(authorities = "ROLE_SUPER_ADMIN")
    void superAdministratorCanAccessAccountsAndAuthoritiesWithoutAdminRole() {
        assertThatCode(() -> users.getUser("unknown")).doesNotThrowAnyException();
        assertThatCode(() -> authorities.getAllAuthorities()).doesNotThrowAnyException();
    }

    @Test
    @WithMockUser(authorities = "ROLE_ADMIN")
    void administratorCanReadAccountsButCannotManageAuthorityCatalog() {
        assertThatCode(() -> users.getUser("unknown")).doesNotThrowAnyException();
        assertThatThrownBy(() -> authorities.getAllAuthorities()).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> authorities.deleteAuthority("ROLE_SUPER_ADMIN")).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @WithMockUser(authorities = "ROLE_USER")
    void employeeCannotAccessAdministration() {
        assertThatThrownBy(() -> users.getUser("unknown")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> authorities.getAllAuthorities()).isInstanceOf(AccessDeniedException.class);
    }
}
