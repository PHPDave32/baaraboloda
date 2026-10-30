package com.cratechnologie.baaraboloda.service;

import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskStatus;
import com.cratechnologie.baaraboloda.repository.*;
import com.cratechnologie.baaraboloda.service.dto.*;
import com.cratechnologie.baaraboloda.service.mapper.TaskMapper;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TaskNotificationEventsTest {

    TaskRepository tasks;
    UserRepository users;
    NotificationService notifications;
    TaskService service;
    TaskMapper mapper;
    Task original;
    User next;

    @BeforeEach
    void setup() {
        tasks = mock(TaskRepository.class);
        users = mock(UserRepository.class);
        notifications = mock(NotificationService.class);
        mapper = mock(TaskMapper.class);
        service = new TaskService(tasks, mapper, mock(CommentRepository.class), mock(SprintRepository.class), users, notifications);
        User previous = new User();
        previous.setId(2L);
        next = new User();
        next.setId(3L);
        original = new Task().id(10L).title("Test").project(new Project().id(1L)).assignee(previous).status(TaskStatus.TODO);
        when(tasks.findById(10L)).thenReturn(Optional.of(original));
        when(users.isMemberOfProject(3L, 1L)).thenReturn(true);
        when(users.findById(3L)).thenReturn(Optional.of(next));
        when(tasks.save(any())).thenAnswer(call -> call.getArgument(0));
    }

    @Test
    void assignmentEndpointCapturesPreviousUser() {
        service.assign(10L, 3L);
        verify(notifications).assignment(original, 2L);
    }

    @Test
    void partialUpdateCapturesStatusBeforeMutation() {
        TaskDTO dto = new TaskDTO();
        dto.setId(10L);
        dto.setStatus(TaskStatus.DONE);
        doAnswer(call -> {
            original.setStatus(TaskStatus.DONE);
            return null;
        })
            .when(mapper)
            .partialUpdate(original, dto);
        service.partialUpdate(dto);
        verify(notifications).status(original, TaskStatus.TODO);
        verify(notifications).assignment(original, 2L);
    }

    @Test
    void creationNotifiesAssignee() {
        TaskDTO dto = new TaskDTO();
        when(mapper.toEntity(dto)).thenReturn(original);
        service.save(dto);
        verify(notifications).assignment(original, null);
    }

    @Test
    void fullUpdateCapturesValuesBeforeMerge() {
        TaskDTO dto = new TaskDTO();
        dto.setId(10L);
        Task updated = new Task().id(10L).project(original.getProject()).assignee(next).status(TaskStatus.DONE);
        when(mapper.toEntity(dto)).thenReturn(updated);
        when(tasks.save(updated)).thenAnswer(call -> {
            original.setStatus(TaskStatus.DONE);
            original.setAssignee(next);
            return updated;
        });
        service.update(dto);
        verify(notifications).assignment(updated, 2L);
        verify(notifications).status(updated, TaskStatus.TODO);
    }
}
