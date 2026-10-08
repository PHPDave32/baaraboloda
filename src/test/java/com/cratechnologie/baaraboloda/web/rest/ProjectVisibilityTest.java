package com.cratechnologie.baaraboloda.web.rest;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.repository.*;
import com.cratechnologie.baaraboloda.service.*;
import com.cratechnologie.baaraboloda.service.criteria.ProjectCriteria;
import com.cratechnologie.baaraboloda.service.dto.ProjectDTO;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

class ProjectVisibilityTest {

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        RequestContextHolder.resetRequestAttributes();
    }

    @Test
    void ordinaryUserSeesProjectsWithoutMembershipAndKeepsPagination() {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken("outsider", "", List.of(new SimpleGrantedAuthority("ROLE_USER")))
        );
        var request = new MockHttpServletRequest();
        request.setRequestURI("/api/projects");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(request));
        ProjectQueryService query = mock(ProjectQueryService.class);
        ProjectRepository repository = mock(ProjectRepository.class);
        var resource = new ProjectResource(
            mock(ProjectService.class),
            repository,
            query,
            mock(UserRepository.class),
            mock(TaskRepository.class),
            mock(SprintRepository.class)
        );
        var criteria = new ProjectCriteria();
        var pageable = PageRequest.of(0, 10);
        var project = new ProjectDTO();
        project.setId(25L);
        project.setName("Autre équipe");
        when(query.findByCriteria(criteria, pageable)).thenReturn(new PageImpl<>(List.of(project), pageable, 1));
        var response = resource.getAllProjects(criteria, pageable);
        assertThat(response.getBody()).containsExactly(project);
        assertThat(response.getHeaders().getFirst("X-Total-Count")).isEqualTo("1");
        assertThat(criteria.getId()).isNull();
        verifyNoInteractions(repository);
    }
}
