package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.repository.*;
import com.cratechnologie.baaraboloda.service.mapper.TaskMapper;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class TaskAssignmentTest {

    private final TaskRepository tasks = mock(TaskRepository.class);
    private final UserRepository users = mock(UserRepository.class);
    private final TaskService service = new TaskService(
        tasks,
        mock(TaskMapper.class),
        mock(CommentRepository.class),
        mock(SprintRepository.class),
        users,
        mock(NotificationService.class)
    );

    @Test
    void allowsAssignmentToProjectMember() {
        Task task = new Task().id(1L).project(new Project().id(10L));
        User member = new User();
        member.setId(2L);
        when(tasks.findById(1L)).thenReturn(Optional.of(task));
        when(users.isMemberOfProject(2L, 10L)).thenReturn(true);
        when(users.findById(2L)).thenReturn(Optional.of(member));
        when(tasks.save(task)).thenReturn(task);
        service.assign(1L, 2L);
        assertThat(task.getAssignee()).isSameAs(member);
        verify(tasks).save(task);
    }

    @Test
    void rejectsAssignmentOutsideProjectWithoutSaving() {
        when(tasks.findById(1L)).thenReturn(Optional.of(new Task().id(1L).project(new Project().id(10L))));
        assertThatThrownBy(() -> service.assign(1L, 99L)).isInstanceOf(BadRequestAlertException.class);
        verify(tasks, never()).save(any());
    }
}
