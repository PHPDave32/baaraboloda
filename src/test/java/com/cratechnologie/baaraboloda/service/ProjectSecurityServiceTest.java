package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.repository.CommentRepository;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

class ProjectSecurityServiceTest {

    private final TaskRepository tasks = mock(TaskRepository.class);
    private final CommentRepository comments = mock(CommentRepository.class);
    private final SprintRepository sprints = mock(SprintRepository.class);
    private final ProjectSecurityService service = new ProjectSecurityService(tasks, comments, sprints);

    @BeforeEach
    void authenticate() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("reporter", "", List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );
    }

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void superAdministratorCanManageAllProjectsWithoutMembership() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("superadmin", "", List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")))
        );
        assertThat(service.canModifyTask(1L)).isTrue();
        assertThat(service.canMoveTask(1L)).isTrue();
        assertThat(service.canModifySprint(1L)).isTrue();
        assertThat(service.canModifyComment(1L)).isTrue();
        verifyNoInteractions(tasks, comments, sprints);
    }

    @Test
    void externalReporterCanManageOwnTask() {
        when(tasks.existsByIdAndReporterLogin(1L, "reporter")).thenReturn(true);
        assertThat(service.canModifyTask(1L)).isTrue();
        assertThat(service.canMoveTask(1L)).isFalse();
    }

    @Test
    void externalUserCannotManageAnotherTaskOrSprint() {
        assertThat(service.canModifyTask(2L)).isFalse();
        assertThat(service.canModifySprint(2L)).isFalse();
    }

    @Test
    void externalAuthorCanManageOwnCommentOnly() {
        when(comments.existsByIdAndAuthorLogin(3L, "reporter")).thenReturn(true);
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
}
