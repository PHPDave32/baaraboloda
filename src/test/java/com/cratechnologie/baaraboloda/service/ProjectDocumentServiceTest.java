package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.Project;
import com.cratechnologie.baaraboloda.domain.ProjectDocument;
import com.cratechnologie.baaraboloda.domain.Task;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.repository.ProjectDocumentRepository;
import com.cratechnologie.baaraboloda.repository.ProjectRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

class ProjectDocumentServiceTest {

    private final ProjectDocumentRepository documents = mock(ProjectDocumentRepository.class);
    private final ProjectRepository projects = mock(ProjectRepository.class);
    private final TaskRepository tasks = mock(TaskRepository.class);
    private final ProjectSecurityService security = mock(ProjectSecurityService.class);
    private final ProjectDocumentService service = new ProjectDocumentService(
        documents,
        projects,
        tasks,
        security,
        mock(com.cratechnologie.baaraboloda.repository.UserRepository.class)
    );

    @BeforeEach
    void setUp() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("member", "", List.of()));
        User owner = new User();
        owner.setLogin("owner");
        when(projects.findById(1L)).thenReturn(Optional.of(new Project().id(1L).owner(owner)));
        when(projects.findAccessibleProjectIds("member")).thenReturn(List.of(1L));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void deniesEveryOperationToAnOutsider() {
        doThrow(new AccessDeniedException("Denied")).when(security).checkProjectAccess(1L);
        assertThatThrownBy(() -> service.list(1L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.download(1L, 2L)).isInstanceOf(AccessDeniedException.class);
        assertThatThrownBy(() -> service.create(1L, "Design", "", "DESIGN", "https://figma.com/design/a", null, null)).isInstanceOf(
            AccessDeniedException.class
        );
        assertThatThrownBy(() -> service.delete(1L, 2L)).isInstanceOf(AccessDeniedException.class);
        verifyNoInteractions(documents);
    }

    @Test
    void storesFileWithAuthenticatedAuthor() throws Exception {
        var file = new MockMultipartFile("file", "../specification.pdf", "application/pdf", new byte[] { 1, 2, 3 });
        service.create(1L, " Specification ", "", "SPECIFICATION", null, null, file);
        var captor = ArgumentCaptor.forClass(ProjectDocument.class);
        verify(documents).save(captor.capture());
        assertThat(captor.getValue().getFilename()).isEqualTo("specification.pdf");
        assertThat(captor.getValue().getAuthor()).isEqualTo("member");
        assertThat(captor.getValue().getContent()).containsExactly(1, 2, 3);
        assertThat(captor.getValue().getTitle()).isEqualTo("Specification");
    }

    @Test
    void rejectsUnsafeLinksAndAmbiguousPayloads() {
        for (String url : List.of("javascript:alert(1)", "http://figma.com", "https://user:password@figma.com", "https:///missing")) {
            assertThatThrownBy(() -> service.create(1L, "Design", "", "DESIGN", url, null, null)).isInstanceOf(
                ResponseStatusException.class
            );
        }
        var file = new MockMultipartFile("file", "test.pdf", "application/pdf", new byte[] { 1 });
        assertThatThrownBy(() -> service.create(1L, "Design", "", "DESIGN", "https://figma.com", null, file)).isInstanceOf(
            ResponseStatusException.class
        );
        verify(documents, never()).save(any());
    }

    @Test
    void rejectsTasksFromAnotherProject() {
        when(tasks.findById(3L)).thenReturn(Optional.of(new Task().id(3L).project(new Project().id(9L))));
        assertThatThrownBy(() -> service.create(1L, "Design", "", "DESIGN", "https://figma.com", 3L, null)).isInstanceOf(
            ResponseStatusException.class
        );
        verify(documents, never()).save(any());
    }

    @Test
    void preventsMembersFromDeletingAndCrossProjectDownloads() {
        doThrow(new AccessDeniedException("Denied")).when(security).requirePermission("PERM_DOCUMENT_MANAGE");
        assertThatThrownBy(() -> service.delete(1L, 2L)).isInstanceOf(AccessDeniedException.class);
        when(documents.findByIdAndProject_Id(2L, 1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.download(1L, 2L)).isInstanceOf(ResponseStatusException.class);
        verify(documents, never()).delete(any());
    }

    @Test
    void acceptsFigmaLinkWithoutFile() throws Exception {
        service.create(1L, "Design", "", "DESIGN", "https://www.figma.com/design/example", null, null);
        var captor = ArgumentCaptor.forClass(ProjectDocument.class);
        verify(documents).save(captor.capture());
        assertThat(captor.getValue().getUrl()).isEqualTo("https://www.figma.com/design/example");
        assertThat(captor.getValue().getContent()).isNull();
    }

    @Test
    void rejectsEmptyAndUnsupportedFiles() {
        for (var file : List.of(
            new MockMultipartFile("file", "empty.pdf", "application/pdf", new byte[0]),
            new MockMultipartFile("file", "script.html", "text/html", new byte[] { 1 })
        )) {
            assertThatThrownBy(() -> service.create(1L, "File", "", "OTHER", null, null, file)).isInstanceOf(ResponseStatusException.class);
        }
        verify(documents, never()).save(any());
    }
}
