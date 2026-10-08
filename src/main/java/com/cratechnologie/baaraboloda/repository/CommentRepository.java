package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.Comment;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Comment entity.
 */
@Repository
public interface CommentRepository extends JpaRepository<Comment, Long>, JpaSpecificationExecutor<Comment> {
    @Query("select comment from Comment comment where comment.author.login = ?#{authentication.name}")
    List<Comment> findByAuthorIsCurrentUser();

    /**
     * Checks whether the given login is a member or the owner of the project that owns the given comment's task.
     *
     * @param commentId the comment id.
     * @param login     the user login.
     * @return {@code true} if the user belongs to the comment's project.
     */
    @Query(
        "select case when count(comment) > 0 then true else false end from Comment comment " +
            "where comment.id = :commentId and (comment.task.project.owner.login = :login or exists " +
            "(select 1 from Comment c join c.task.project.memberses m where c.id = :commentId and m.login = :login))"
    )
    boolean isUserMemberOfCommentProject(@Param("commentId") Long commentId, @Param("login") String login);

    boolean existsByIdAndAuthorLogin(Long id, String login);

    default Optional<Comment> findOneWithEagerRelationships(Long id) {
        return this.findOneWithToOneRelationships(id);
    }

    default List<Comment> findAllWithEagerRelationships() {
        return this.findAllWithToOneRelationships();
    }

    default Page<Comment> findAllWithEagerRelationships(Pageable pageable) {
        return this.findAllWithToOneRelationships(pageable);
    }

    @Query(
        value = "select comment from Comment comment left join fetch comment.author left join fetch comment.task",
        countQuery = "select count(comment) from Comment comment"
    )
    Page<Comment> findAllWithToOneRelationships(Pageable pageable);

    @Query("select comment from Comment comment left join fetch comment.author left join fetch comment.task")
    List<Comment> findAllWithToOneRelationships();

    @Query("select comment from Comment comment left join fetch comment.author left join fetch comment.task where comment.id =:id")
    Optional<Comment> findOneWithToOneRelationships(@Param("id") Long id);

    void deleteByTaskId(Long taskId);
}
