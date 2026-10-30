package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.Project;
import com.cratechnologie.baaraboloda.domain.Task;
import com.cratechnologie.baaraboloda.domain.enumeration.ProjectStatus;
import com.cratechnologie.baaraboloda.repository.CommentRepository;
import com.cratechnologie.baaraboloda.repository.ProjectRepository;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import java.util.Arrays;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class ProjectSecurityServiceTest {

    private final TaskRepository tasks = mock(TaskRepository.class);
    private final CommentRepository comments = mock(CommentRepository.class);
    private final SprintRepository sprints = mock(SprintRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final ProjectSecurityService service = new ProjectSecurityService(tasks, comments, sprints, projects);

    @BeforeEach
    void authenticate() {
        authenticateAs("reporter", "ROLE_USER", "PERM_TASK_MANAGE", "PERM_COMMENT_MANAGE", "PERM_SPRINT_MANAGE");
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void superAdministratorCanManageAllProjectsWithoutMembership() {
        authenticateAs("superadmin", "ROLE_SUPER_ADMIN");
        assertThat(service.canModifyTask(1L)).isTrue();
        assertThat(service.canMoveTask(1L)).isTrue();
        assertThat(service.canModifySprint(1L)).isTrue();
        assertThat(service.canModifyComment(1L)).isTrue();
        verify(tasks, never()).isUserMemberOfTaskProject(anyLong(), anyString());
        verify(sprints, never()).isUserMemberOfSprintProject(anyLong(), anyString());
        verify(comments, never()).isUserMemberOfCommentProject(anyLong(), anyString());
    }

    @Test
    void reporterOutsideProjectCannotManageTask() {
        when(tasks.existsByIdAndReporterLogin(1L, "reporter")).thenReturn(true);
        assertThat(service.canModifyTask(1L)).isFalse();
        assertThat(service.canMoveTask(1L)).isFalse();
    }

    @Test
    void externalUserCannotManageAnotherTaskOrSprint() {
        assertThat(service.canModifyTask(2L)).isFalse();
        assertThat(service.canModifySprint(2L)).isFalse();
    }

    @Test
    void authorOutsideProjectCannotManageComment() {
        when(comments.existsByIdAndAuthorLogin(3L, "reporter")).thenReturn(true);
        assertThat(service.canModifyComment(3L)).isFalse();
    }

    @Test
    void projectMemberCanManageComment() {
        when(comments.isUserMemberOfCommentProject(3L, "reporter")).thenReturn(true);
        assertThat(service.canModifyComment(3L)).isTrue();
        assertThat(service.canModifyComment(4L)).isFalse();
    }

    @Test
    void projectMemberCanMoveTask() {
        when(tasks.isUserMemberOfTaskProject(1L, "reporter")).thenReturn(true);
        assertThat(service.canMoveTask(1L)).isTrue();
    }

    @Test
    void projectMemberKeepsExistingRights() {
        when(tasks.isUserMemberOfTaskProject(1L, "reporter")).thenReturn(true);
        assertThat(service.canModifyTask(1L)).isTrue();
    }

    @Test
    void projectMemberWithoutTaskPermissionCannotManageTask() {
        authenticateAs("reporter", "ROLE_USER");
        when(tasks.isUserMemberOfTaskProject(1L, "reporter")).thenReturn(true);
        assertThat(service.canModifyTask(1L)).isFalse();
        assertThat(service.canMoveTask(1L)).isFalse();
    }

    @Test
    void viewAllPermissionGrantsAccessWithoutMembership() {
        authenticateAs("manager", "ROLE_USER", "PERM_TASK_MANAGE", "PERM_PROJECT_VIEW_ALL");
        assertThat(service.canModifyTask(1L)).isTrue();
        verify(tasks, never()).isUserMemberOfTaskProject(anyLong(), anyString());
    }

    @Test
    void closedProjectIsReadOnlyEvenForSuperAdministrator() {
        authenticateAs("superadmin", "ROLE_SUPER_ADMIN");
        Project closed = new Project().id(10L).status(ProjectStatus.CLOSED);
        when(tasks.findById(1L)).thenReturn(Optional.of(new Task().id(1L).project(closed)));
        when(projects.findById(10L)).thenReturn(Optional.of(closed));

        assertThatThrownBy(() -> service.canModifyTask(1L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.canMoveTask(1L)).isInstanceOf(AccessDeniedException.class);
    }

    private static void authenticateAs(String login, String... authorities) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(login, "", Arrays.stream(authorities).map(SimpleGrantedAuthority::new).toList())
        );
    }
}
