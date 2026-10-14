package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus;
import com.cratechnologie.baaraboloda.repository.*;
import com.cratechnologie.baaraboloda.service.dto.*;
import com.cratechnologie.baaraboloda.service.mapper.TaskMapper;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.Optional;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

class TaskSprintTest {

    private final TaskRepository tasks = mock(TaskRepository.class);
    private final SprintRepository sprints = mock(SprintRepository.class);
    private final TaskMapper mapper = mock(TaskMapper.class);
    private final TaskService service = new TaskService(
        tasks,
        mapper,
        mock(CommentRepository.class),
        sprints,
        mock(UserRepository.class),
        mock(NotificationService.class)
    );

    private TaskDTO prepare(SprintStatus status, boolean alreadyInSprint) {
        Sprint target = new Sprint().id(2L).status(status).project(new Project().id(10L));
        Task existing = new Task().id(1L).project(new Project().id(10L));
        if (alreadyInSprint) existing.setSprint(target);
        when(sprints.findById(2L)).thenReturn(Optional.of(target));
        when(tasks.findById(1L)).thenReturn(Optional.of(existing));
        when(tasks.save(any(Task.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(mapper.toEntity(any(TaskDTO.class))).thenAnswer(invocation -> new Task().id(1L));
        when(mapper.toDto(any(Task.class))).thenReturn(new TaskDTO());
        SprintDTO sprint = new SprintDTO();
        sprint.setId(2L);
        // Incoming status cannot override the persisted status.
        sprint.setStatus(SprintStatus.PLANNED);
        TaskDTO dto = new TaskDTO();
        dto.setId(1L);
        var project = new com.cratechnologie.baaraboloda.service.dto.ProjectDTO();
        project.setId(10L);
        dto.setProject(project);
        dto.setSprint(sprint);
        return dto;
    }

    @ParameterizedTest
    @ValueSource(strings = { "create", "update", "patch" })
    void acceptsPdfAttachments(String operation) {
        TaskDTO dto = prepare(SprintStatus.PLANNED, false);
        dto.setImages(
            java.util.List.of(
                new ImageAttachment(
                    java.util.Base64.getEncoder().encodeToString("%PDF-1.4\n%%EOF".getBytes(java.nio.charset.StandardCharsets.US_ASCII)),
                    "application/pdf",
                    "specification.pdf"
                )
            )
        );
        assertThatCode(() -> perform(operation, dto)).doesNotThrowAnyException();
        verify(tasks).save(any(Task.class));
    }

    @ParameterizedTest
    @ValueSource(strings = { "create", "update", "patch" })
    void rejectsFakePdfBeforeSaving(String operation) {
        TaskDTO dto = prepare(SprintStatus.PLANNED, false);
        dto.setImages(java.util.List.of(new ImageAttachment("aW52YWxpZA==", "application/pdf", "fake.pdf")));
        assertThatThrownBy(() -> perform(operation, dto)).isInstanceOf(BadRequestAlertException.class);
        verify(tasks, never()).save(any(Task.class));
    }

    private void perform(String operation, TaskDTO dto) {
        switch (operation) {
            case "create" -> service.save(dto);
            case "update" -> service.update(dto);
            case "patch" -> service.partialUpdate(dto);
            case "move" -> service.moveToSprint(1L, 2L);
            case "copy" -> service.copyToSprint(1L, 2L);
            default -> throw new IllegalArgumentException(operation);
        }
    }

    @ParameterizedTest
    @ValueSource(strings = { "create", "update", "patch", "move", "copy" })
    void rejectsNewTasksInCompletedSprint(String operation) {
        TaskDTO dto = prepare(SprintStatus.COMPLETED, false);
        assertThatThrownBy(() -> perform(operation, dto))
            .isInstanceOf(BadRequestAlertException.class)
            .hasMessageContaining("Impossible d’ajouter une tâche à un sprint terminé.");
        verify(tasks, never()).save(any());
        verify(mapper, never()).partialUpdate(any(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = { "update", "patch", "move" })
    void allowsExistingTaskToKeepItsCompletedSprint(String operation) {
        perform(operation, prepare(SprintStatus.COMPLETED, true));
        verify(tasks).save(any(Task.class));
    }

    @ParameterizedTest
    @EnumSource(value = SprintStatus.class, names = { "PLANNED", "ACTIVE" })
    void allowsCreationInOpenSprint(SprintStatus status) {
        service.save(prepare(status, false));
        verify(tasks).save(argThat(task -> task.getSprint().getId().equals(2L)));
    }
}
