package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.Sprint;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Sprint entity.
 */
@Repository
public interface SprintRepository extends JpaRepository<Sprint, Long>, JpaSpecificationExecutor<Sprint> {
    @Query("select sprint from Sprint sprint where sprint.createdBy.login = ?#{authentication.name}")
    List<Sprint> findByCreatedByIsCurrentUser();

    boolean existsByProject_Id(Long projectId);

    boolean existsByProject_IdAndStatusAndIdNot(
        Long projectId,
        com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus status,
        Long id
    );

    List<Sprint> findAllByStatusAndEndDateBefore(
        com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus status,
        java.time.LocalDate date
    );

    /**
     * Checks whether the given login is a member or the owner of the project that owns the given sprint.
     *
     * @param sprintId the sprint id.
     * @param login    the user login.
     * @return {@code true} if the user belongs to the sprint's project.
     */
    @Query(
        "select case when count(sprint) > 0 then true else false end from Sprint sprint " +
            "where sprint.id = :sprintId and (sprint.project.owner.login = :login or exists " +
            "(select 1 from Sprint s join s.project.memberses m where s.id = :sprintId and m.login = :login))"
    )
    boolean isUserMemberOfSprintProject(@Param("sprintId") Long sprintId, @Param("login") String login);

    default Optional<Sprint> findOneWithEagerRelationships(Long id) {
        return this.findOneWithToOneRelationships(id);
    }

    default List<Sprint> findAllWithEagerRelationships() {
        return this.findAllWithToOneRelationships();
    }

    default Page<Sprint> findAllWithEagerRelationships(Pageable pageable) {
        return this.findAllWithToOneRelationships(pageable);
    }

    @Query(
        value = "select sprint from Sprint sprint left join fetch sprint.createdBy left join fetch sprint.project",
        countQuery = "select count(sprint) from Sprint sprint"
    )
    Page<Sprint> findAllWithToOneRelationships(Pageable pageable);

    @Query("select sprint from Sprint sprint left join fetch sprint.createdBy left join fetch sprint.project")
    List<Sprint> findAllWithToOneRelationships();

    @Query("select sprint from Sprint sprint left join fetch sprint.createdBy left join fetch sprint.project where sprint.id =:id")
    Optional<Sprint> findOneWithToOneRelationships(@Param("id") Long id);
}
