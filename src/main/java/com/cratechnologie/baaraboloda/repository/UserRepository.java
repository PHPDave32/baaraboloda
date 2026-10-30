package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.User;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the {@link User} entity.
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    @org.springframework.data.jpa.repository.Query(
        "select u.id from User u where u.activated = true and exists (select p.id from Project p left join p.memberses m where p.id = :projectId and (p.owner.id = u.id or m.id = u.id))"
    )
    java.util.Set<Long> findProjectNotificationRecipientIds(@org.springframework.data.repository.query.Param("projectId") Long projectId);

    @org.springframework.data.jpa.repository.Query(
        "select new com.cratechnologie.baaraboloda.service.dto.ResourceRecipientDTO(u.login, u.firstName, u.lastName) from User u order by u.firstName, u.lastName, u.login"
    )
    List<com.cratechnologie.baaraboloda.service.dto.ResourceRecipientDTO> findResourceRecipients();

    @org.springframework.data.jpa.repository.Query("select u.login from User u where u.login in :logins")
    java.util.Set<String> findExistingLogins(@org.springframework.data.repository.query.Param("logins") java.util.Set<String> logins);

    @org.springframework.data.jpa.repository.Query(
        "select count(p) > 0 from Project p left join p.memberses m where p.id = :projectId and (m.id = :userId or p.owner.id = :userId)"
    )
    boolean isMemberOfProject(
        @org.springframework.data.repository.query.Param("userId") Long userId,
        @org.springframework.data.repository.query.Param("projectId") Long projectId
    );

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
        "select u from User u join u.authorities a where a.name = 'ROLE_SUPER_ADMIN' and u.activated = true"
    )
    List<User> findActiveSuperAdminsForUpdate();

    @org.springframework.data.jpa.repository.Query(
        "select distinct u from User u join u.authorities a where a.name = 'ROLE_SUPER_ADMIN' and u.activated = true"
    )
    List<User> findActiveSuperAdmins();

    long countByAuthoritiesName(String name);

    boolean existsByAccessProfileId(Long id);

    @EntityGraph(
        attributePaths = { "authorities", "accessProfile", "accessProfile.permissions", "grantedPermissions", "revokedPermissions" }
    )
    @org.springframework.data.jpa.repository.Query("select u from User u where u.login = :login")
    Optional<User> findForAuthorization(@org.springframework.data.repository.query.Param("login") String login);

    String USERS_BY_LOGIN_CACHE = "usersByLogin";

    String USERS_BY_EMAIL_CACHE = "usersByEmail";

    Optional<User> findOneByActivationKey(String activationKey);

    List<User> findAllByActivatedIsFalseAndActivationKeyIsNotNullAndCreatedDateBefore(Instant dateTime);

    Optional<User> findOneByResetKey(String resetKey);

    @Cacheable(cacheNames = USERS_BY_EMAIL_CACHE, unless = "#result == null")
    @EntityGraph(
        attributePaths = { "authorities", "accessProfile", "accessProfile.permissions", "grantedPermissions", "revokedPermissions" }
    )
    Optional<User> findOneWithAuthoritiesByEmailIgnoreCase(String email);

    Optional<User> findOneByEmailIgnoreCase(String email);

    @Cacheable(cacheNames = USERS_BY_LOGIN_CACHE, unless = "#result == null")
    @EntityGraph(
        attributePaths = { "authorities", "accessProfile", "accessProfile.permissions", "grantedPermissions", "revokedPermissions" }
    )
    Optional<User> findOneWithAuthoritiesByLogin(String login);

    Optional<User> findOneByLogin(String login);

    Page<User> findAllByIdNotNullAndActivatedIsTrue(Pageable pageable);
}
