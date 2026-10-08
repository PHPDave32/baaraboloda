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
        "select count(p) > 0 from Project p left join p.memberses m where p.id = :projectId and (m.id = :userId or p.owner.id = :userId)"
    )
    boolean isMemberOfProject(
        @org.springframework.data.repository.query.Param("userId") Long userId,
        @org.springframework.data.repository.query.Param("projectId") Long projectId
    );

    String USERS_BY_LOGIN_CACHE = "usersByLogin";

    String USERS_BY_EMAIL_CACHE = "usersByEmail";

    Optional<User> findOneByActivationKey(String activationKey);

    List<User> findAllByActivatedIsFalseAndActivationKeyIsNotNullAndCreatedDateBefore(Instant dateTime);

    Optional<User> findOneByResetKey(String resetKey);

    @Cacheable(cacheNames = USERS_BY_EMAIL_CACHE, unless = "#result == null")
    @EntityGraph(attributePaths = "authorities")
    Optional<User> findOneWithAuthoritiesByEmailIgnoreCase(String email);

    Optional<User> findOneByEmailIgnoreCase(String email);

    @Cacheable(cacheNames = USERS_BY_LOGIN_CACHE, unless = "#result == null")
    @EntityGraph(attributePaths = "authorities")
    Optional<User> findOneWithAuthoritiesByLogin(String login);

    Optional<User> findOneByLogin(String login);

    Page<User> findAllByIdNotNullAndActivatedIsTrue(Pageable pageable);
}
