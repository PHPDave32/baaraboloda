package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.Authority;
import org.springframework.data.jpa.repository.*;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Authority entity.
 */
@SuppressWarnings("unused")
@Repository
public interface AuthorityRepository extends JpaRepository<Authority, String> {
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from Authority a where a.name = 'ROLE_SUPER_ADMIN'")
    java.util.Optional<Authority> lockSuperAdminAuthority();
}
