package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.repository.CommentRepository;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import com.cratechnologie.baaraboloda.security.AuthoritiesConstants;
import com.cratechnologie.baaraboloda.security.SecurityUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Centralizes project-membership based authorization checks.
 *
 * <p>The rule enforced here: a user may only modify (update/delete) a task's details
 * or its comments when they are a member (or the owner) of the project the task belongs to.
 * Administrators are exempt from this restriction.</p>
 */
@Service
@Transactional(readOnly = true)
public class ProjectSecurityService {

    private static final Logger LOG = LoggerFactory.getLogger(ProjectSecurityService.class);

    private final TaskRepository taskRepository;

    private final CommentRepository commentRepository;

    private final SprintRepository sprintRepository;

    public ProjectSecurityService(TaskRepository taskRepository, CommentRepository commentRepository, SprintRepository sprintRepository) {
        this.taskRepository = taskRepository;
        this.commentRepository = commentRepository;
        this.sprintRepository = sprintRepository;
    }

    /**
     * @return {@code true} if the current user is an administrator.
     */
    public boolean isCurrentUserAdmin() {
        return SecurityUtils.hasCurrentUserThisAuthority(AuthoritiesConstants.ADMIN);
    }

    /**
     * @param taskId the task id.
     * @return {@code true} if the current user is an admin, or a member/owner of the task's project.
     */
    public boolean canModifyTask(Long taskId) {
        if (isCurrentUserAdmin()) {
            return true;
        }
        return SecurityUtils.getCurrentUserLogin()
            .map(login -> taskRepository.isUserMemberOfTaskProject(taskId, login))
            .orElse(false);
    }

    /**
     * @param commentId the comment id.
     * @return {@code true} if the current user is an admin, or a member/owner of the comment's project.
     */
    public boolean canModifyComment(Long commentId) {
        if (isCurrentUserAdmin()) {
            return true;
        }
        return SecurityUtils.getCurrentUserLogin()
            .map(login -> commentRepository.isUserMemberOfCommentProject(commentId, login))
            .orElse(false);
    }

    /**
     * @param sprintId the sprint id.
     * @return {@code true} if the current user is an admin, or a member/owner of the sprint's project.
     */
    public boolean canModifySprint(Long sprintId) {
        if (isCurrentUserAdmin()) {
            return true;
        }
        return SecurityUtils.getCurrentUserLogin()
            .map(login -> sprintRepository.isUserMemberOfSprintProject(sprintId, login))
            .orElse(false);
    }

    /**
     * Ensures the current user is allowed to modify the given sprint, otherwise rejects with 403.
     *
     * @param sprintId the sprint id.
     * @throws AccessDeniedException if the current user does not belong to the sprint's project.
     */
    public void checkCanModifySprint(Long sprintId) {
        if (!canModifySprint(sprintId)) {
            LOG.warn(
                "User {} attempted to modify sprint {} without belonging to its project",
                SecurityUtils.getCurrentUserLogin().orElse("?"),
                sprintId
            );
            throw new AccessDeniedException("Vous devez appartenir au projet de ce sprint pour le modifier.");
        }
    }

    /**
     * Ensures the current user is allowed to modify the given task, otherwise rejects with 403.
     *
     * @param taskId the task id.
     * @throws AccessDeniedException if the current user does not belong to the task's project.
     */
    public void checkCanModifyTask(Long taskId) {
        if (!canModifyTask(taskId)) {
            LOG.warn(
                "User {} attempted to modify task {} without belonging to its project",
                SecurityUtils.getCurrentUserLogin().orElse("?"),
                taskId
            );
            throw new AccessDeniedException("Vous devez appartenir au projet de cette tâche pour la modifier.");
        }
    }

    /**
     * Ensures the current user is allowed to modify the given comment, otherwise rejects with 403.
     *
     * @param commentId the comment id.
     * @throws AccessDeniedException if the current user does not belong to the comment's project.
     */
    public void checkCanModifyComment(Long commentId) {
        if (!canModifyComment(commentId)) {
            LOG.warn(
                "User {} attempted to modify comment {} without belonging to its project",
                SecurityUtils.getCurrentUserLogin().orElse("?"),
                commentId
            );
            throw new AccessDeniedException("Vous devez appartenir au projet de cette tâche pour modifier ce commentaire.");
        }
    }
}
