package com.cratechnologie.baaraboloda.web.rest.util;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

class PublicIdResolverTest {

    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final TaskRepository tasks = mock(TaskRepository.class);
    private final SprintRepository sprints = mock(SprintRepository.class);
    private final PublicIdResolver resolver = new PublicIdResolver(projects, tasks, sprints);

    @RestController
    static class Endpoint {

        @GetMapping("/projects/{id}")
        Long project(@PublicId(entity = "project", name = "id") Long id) {
            return id;
        }
    }

    @Test
    void resolvesAnActualMvcPathAndRetainsLegacyLinks() throws Exception {
        Project project = new Project();
        project.setId(42L);
        when(projects.findOneByUuid(project.getUuid())).thenReturn(Optional.of(project));
        var mvc = MockMvcBuilders.standaloneSetup(new Endpoint()).setCustomArgumentResolvers(resolver).build();
        mvc.perform(get("/projects/" + project.getUuid()))
            .andExpect(status().isOk())
            .andExpect(content().string("42"));
        mvc.perform(get("/projects/42")).andExpect(status().isOk()).andExpect(content().string("42"));
        verifyNoInteractions(tasks, sprints);
    }

    @Test
    void doesNotResolveTheUuidOfAnotherEntityOrMalformedValues() {
        Project project = new Project();
        when(tasks.findOneByUuid(project.getUuid())).thenReturn(Optional.empty());
        assertThatThrownBy(() -> resolver.resolve("task", project.getUuid())).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> resolver.resolve("project", "not-a-uuid")).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> resolver.resolve("project", "9999999999999999999999999")).isInstanceOf(ResponseStatusException.class);
        verifyNoInteractions(projects);
    }

    @Test
    void resolvesTasksAndSprints() {
        Task task = new Task();
        task.setId(12L);
        Sprint sprint = new Sprint();
        sprint.setId(13L);
        when(tasks.findOneByUuid(task.getUuid())).thenReturn(Optional.of(task));
        when(sprints.findOneByUuid(sprint.getUuid())).thenReturn(Optional.of(sprint));
        assertThat(resolver.resolve("task", task.getUuid())).isEqualTo(12L);
        assertThat(resolver.resolve("sprint", sprint.getUuid())).isEqualTo(13L);
    }
}
