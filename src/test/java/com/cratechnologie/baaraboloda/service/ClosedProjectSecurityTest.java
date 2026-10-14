package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.domain.enumeration.ProjectStatus;
import com.cratechnologie.baaraboloda.repository.*;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class ClosedProjectSecurityTest {

    final ProjectRepository projects = mock(ProjectRepository.class);
    final TaskRepository tasks = mock(TaskRepository.class);
    final SprintRepository sprints = mock(SprintRepository.class);
    final CommentRepository comments = mock(CommentRepository.class);
    final ProjectSecurityService security = new ProjectSecurityService(tasks, comments, sprints, projects);

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void closedProjectRemainsReadableButRejectsAllModificationsEvenForSuperAdmin() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("superadmin", "", List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")))
        );
        Project project = new Project().id(1L).status(ProjectStatus.CLOSED);
        Task task = new Task().id(2L).project(project);
        when(projects.findById(1L)).thenReturn(Optional.of(project));
        when(tasks.findById(2L)).thenReturn(Optional.of(task));
        when(sprints.findById(3L)).thenReturn(Optional.of(new Sprint().project(project)));
        when(comments.findById(4L)).thenReturn(Optional.of(new Comment().task(task)));
        assertThatCode(() -> security.checkProjectAccess(1L)).doesNotThrowAnyException();
        assertThatThrownBy(() -> security.checkProjectAction(1L, "PERM_PROJECT_EDIT")).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> security.checkCanModifyTask(2L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> security.checkCanMoveTask(2L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> security.checkCanModifySprint(3L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> security.checkCanModifyComment(4L)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void activeProjectRemainsWritable() {
        when(projects.findById(1L)).thenReturn(Optional.of(new Project().status(ProjectStatus.ACTIVE)));
        assertThatCode(() -> security.checkProjectWritable(1L)).doesNotThrowAnyException();
    }
}
