package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.Project;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Project entity.
 *
 * When extending this class, extend ProjectRepositoryWithBagRelationships too.
 * For more information refer to https://github.com/jhipster/generator-jhipster/issues/17990.
 */
@Repository
public interface ProjectRepository
    extends ProjectRepositoryWithBagRelationships, JpaRepository<Project, Long>, JpaSpecificationExecutor<Project>
{
    java.util.Optional<Project> findOneByUuid(String uuid);

    @Query("select project from Project project where project.owner.login = ?#{authentication.name}")
    List<Project> findByOwnerIsCurrentUser();

    /**
     * Returns the ids of the projects the given login owns or is a member of.
     * Used to restrict the project list to the ones the user belongs to.
     *
     * @param login the user login.
     * @return the accessible project ids.
     */
    @Query(
        "select distinct project.id from Project project left join project.memberses member " +
            "where project.owner.login = :login or member.login = :login"
    )
    List<Long> findAccessibleProjectIds(@Param("login") String login);

    default Optional<Project> findOneWithEagerRelationships(Long id) {
        return this.fetchBagRelationships(this.findOneWithToOneRelationships(id));
    }

    default List<Project> findAllWithEagerRelationships() {
        return this.fetchBagRelationships(this.findAllWithToOneRelationships());
    }

    default Page<Project> findAllWithEagerRelationships(Pageable pageable) {
        return this.fetchBagRelationships(this.findAllWithToOneRelationships(pageable));
    }

    @Query(
        value = "select project from Project project left join fetch project.owner",
        countQuery = "select count(project) from Project project"
    )
    Page<Project> findAllWithToOneRelationships(Pageable pageable);

    @Query("select project from Project project left join fetch project.owner")
    List<Project> findAllWithToOneRelationships();

    @Query("select project from Project project left join fetch project.owner where project.id =:id")
    Optional<Project> findOneWithToOneRelationships(@Param("id") Long id);
}
