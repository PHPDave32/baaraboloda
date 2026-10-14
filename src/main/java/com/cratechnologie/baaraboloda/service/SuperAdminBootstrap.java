package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.repository.AuthorityRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.security.AuthoritiesConstants;
import java.util.Locale;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.cache.CacheManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/** Optional, one-time initialization using explicit deployment configuration. */
@Component
public class SuperAdminBootstrap implements ApplicationRunner {

    private static final Logger LOG = LoggerFactory.getLogger(SuperAdminBootstrap.class);
    private final UserRepository users;
    private final AuthorityRepository authorities;
    private final PasswordEncoder passwords;
    private final CacheManager caches;
    private final String email;
    private final String password;

    public SuperAdminBootstrap(
        UserRepository users,
        AuthorityRepository authorities,
        PasswordEncoder passwords,
        CacheManager caches,
        @Value("${security.bootstrap-super-admin.email:}") String email,
        @Value("${security.bootstrap-super-admin.password:}") String password
    ) {
        this.users = users;
        this.authorities = authorities;
        this.passwords = passwords;
        this.caches = caches;
        this.email = email.trim().toLowerCase(Locale.ROOT);
        this.password = password;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (email.isBlank()) return;
        var superRole = authorities.lockSuperAdminAuthority().orElseThrow();
        // Never re-grant a removed role or reset a password once the platform has a super administrator.
        if (users.countByAuthoritiesName(AuthoritiesConstants.SUPER_ADMIN) > 0) return;
        User user = users.findOneByEmailIgnoreCase(email).orElse(null);
        if (user == null) {
            if (email.length() > 50 || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
                throw new IllegalStateException("L’adresse du premier super administrateur est invalide.");
            }
            if (password.length() < 12) {
                throw new IllegalStateException(
                    "Configurez un mot de passe initial d’au moins 12 caractères pour le super administrateur."
                );
            }
            if (users.findOneByLogin(email).isPresent()) {
                throw new IllegalStateException("L’identifiant du super administrateur est déjà utilisé par un autre compte.");
            }
            user = new User();
            user.setLogin(email);
            user.setEmail(email);
            user.setFirstName("Super");
            user.setLastName("Administrateur");
            user.setActivated(true);
            user.setLangKey("fr");
            user.setPassword(passwords.encode(password));
        } else if (!user.isActivated()) {
            throw new IllegalStateException("Activez le compte choisi avant de lui attribuer le rôle Super administrateur.");
        }
        user.getAuthorities().add(superRole);
        user.getAuthorities().add(authorities.findById(AuthoritiesConstants.USER).orElseThrow());
        users.saveAndFlush(user);
        Objects.requireNonNull(caches.getCache(UserRepository.USERS_BY_LOGIN_CACHE)).evict(user.getLogin());
        Objects.requireNonNull(caches.getCache(UserRepository.USERS_BY_EMAIL_CACHE)).evict(user.getEmail());
        LOG.info("Le premier compte Super administrateur est configuré.");
    }
}
