package com.cratechnologie.baaraboloda.service.mapper;

import static org.assertj.core.api.Assertions.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.service.dto.*;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class PublicUuidMapperTest {

    @Test
    void createsUniqueProjectIdentifiersAndIgnoresClientAssignedUuids() {
        var mapper = Mappers.getMapper(ProjectMapper.class);
        var input = new ProjectDTO();
        input.setUuid(UUID.randomUUID().toString());
        Project first = mapper.toEntity(input);
        Project second = mapper.toEntity(input);
        assertThat(first.getUuid()).isNotEqualTo(second.getUuid()).isNotEqualTo(input.getUuid());
        assertThat(mapper.toDto(first).getUuid()).isEqualTo(first.getUuid());
        String stable = first.getUuid();
        mapper.partialUpdate(first, input);
        assertThat(first.getUuid()).isEqualTo(stable);
    }

    @Test
    void projectsNestedInTasksAndSprintsIncludeTheirPublicIdentifiers() {
        Project project = new Project();
        project.setId(7L);
        Task task = new Task();
        task.setProject(project);
        Sprint sprint = new Sprint();
        sprint.setProject(project);
        var taskMapper = Mappers.getMapper(TaskMapper.class);
        var sprintMapper = Mappers.getMapper(SprintMapper.class);
        assertThat(taskMapper.toDto(task).getUuid()).isEqualTo(task.getUuid());
        assertThat(taskMapper.toDto(task).getProject().getUuid()).isEqualTo(project.getUuid());
        assertThat(sprintMapper.toDto(sprint).getUuid()).isEqualTo(sprint.getUuid());
        assertThat(sprintMapper.toDto(sprint).getProject().getUuid()).isEqualTo(project.getUuid());
        String taskUuid = task.getUuid();
        String sprintUuid = sprint.getUuid();
        taskMapper.partialUpdate(task, new TaskDTO());
        sprintMapper.partialUpdate(sprint, new SprintDTO());
        assertThat(task.getUuid()).isEqualTo(taskUuid);
        assertThat(sprint.getUuid()).isEqualTo(sprintUuid);
    }
}
