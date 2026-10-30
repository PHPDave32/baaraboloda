package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.Task;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Task entity.
 */
@Repository
public interface TaskRepository extends JpaRepository<Task, Long>, JpaSpecificationExecutor<Task> {
    java.util.Optional<Task> findOneByUuid(String uuid);

    List<Task> findAllByProject_IdOrderByPositionAsc(Long projectId);

    boolean existsByProject_Id(Long projectId);

    List<Task> findAllByProject_IdAndSprintIsNullOrderByPositionAsc(Long projectId);

    List<Task> findAllBySprint_IdOrderByPositionAsc(Long sprintId);

    @Query("select task from Task task where task.assignee.login = ?#{authentication.name}")
    List<Task> findByAssigneeIsCurrentUser();

    @Query("select task from Task task where task.reporter.login = ?#{authentication.name}")
    List<Task> findByReporterIsCurrentUser();

    /**
     * Checks whether the given login is a member or the owner of the project that owns the given task.
     *
     * @param taskId the task id.
     * @param login  the user login.
     * @return {@code true} if the user belongs to the task's project.
     */
    @Query(
        "select case when count(task) > 0 then true else false end from Task task " +
            "where task.id = :taskId and (task.project.owner.login = :login or exists " +
            "(select 1 from Task t join t.project.memberses m where t.id = :taskId and m.login = :login))"
    )
    boolean isUserMemberOfTaskProject(@Param("taskId") Long taskId, @Param("login") String login);

    boolean existsByIdAndReporterLogin(Long id, String login);

    default Optional<Task> findOneWithEagerRelationships(Long id) {
        return this.findOneWithToOneRelationships(id);
    }

    default List<Task> findAllWithEagerRelationships() {
        return this.findAllWithToOneRelationships();
    }

    default Page<Task> findAllWithEagerRelationships(Pageable pageable) {
        return this.findAllWithToOneRelationships(pageable);
    }

    @Query(
        value = "select task from Task task left join fetch task.assignee left join fetch task.reporter left join fetch task.project left join fetch task.sprint",
        countQuery = "select count(task) from Task task"
    )
    Page<Task> findAllWithToOneRelationships(Pageable pageable);

    @Query(
        "select task from Task task left join fetch task.assignee left join fetch task.reporter left join fetch task.project left join fetch task.sprint"
    )
    List<Task> findAllWithToOneRelationships();

    @Query(
        "select task from Task task left join fetch task.assignee left join fetch task.reporter left join fetch task.project left join fetch task.sprint where task.id =:id"
    )
    Optional<Task> findOneWithToOneRelationships(@Param("id") Long id);
}
