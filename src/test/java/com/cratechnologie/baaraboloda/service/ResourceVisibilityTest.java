package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.repository.*;
import com.cratechnologie.baaraboloda.service.dto.ResourceVisibilityDTO;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

class ResourceVisibilityTest {

    final ProjectDocumentRepository documents = mock(ProjectDocumentRepository.class);
    final ProjectRepository projects = mock(ProjectRepository.class);
    final ProjectSecurityService security = mock(ProjectSecurityService.class);
    final UserRepository users = mock(UserRepository.class);
    final ProjectDocumentService service = new ProjectDocumentService(documents, projects, mock(TaskRepository.class), security, users);
    ProjectDocument document;

    void login(String login, String... permissions) {
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(login, "", Arrays.stream(permissions).map(SimpleGrantedAuthority::new).toList())
        );
    }

    @BeforeEach
    void setup() {
        User owner = new User();
        owner.setLogin("author");
        User reader = new User();
        reader.setLogin("reader");
        Project project = new Project().id(1L).owner(owner);
        project.getMemberses().add(reader);
        when(projects.findById(1L)).thenReturn(Optional.of(project));
        when(users.findExistingLogins(Set.of("reader"))).thenReturn(Set.of("reader"));
        document = new ProjectDocument();
        document.setAuthor("author");
        document.setFilename("sensitive.pdf");
        document.setRestricted(true);
        document.getAllowedLogins().add("reader");
        when(documents.findByIdAndProject_Id(2L, 1L)).thenReturn(Optional.of(document));
    }

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void onlyAuthorAndSelectedReadersCanDownload() {
        for (String login : List.of("author", "reader")) {
            login(login);
            assertThat(service.download(1L, 2L)).isSameAs(document);
        }
        login("outsider", "ROLE_SUPER_ADMIN");
        assertThatThrownBy(() -> service.download(1L, 2L)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> service.delete(1L, 2L)).isInstanceOf(ResponseStatusException.class);
        verify(documents, never()).delete(any());
    }

    @Test
    void visibilityRequiresBothPermissionAndOwnership() {
        login("author");
        assertThatThrownBy(() -> service.updateVisibility(1L, 2L, new ResourceVisibilityDTO(false, Set.of()))).isInstanceOf(
            AccessDeniedException.class
        );
        login("reader", "PERM_RESOURCE_VISIBILITY");
        assertThatThrownBy(() -> service.updateVisibility(1L, 2L, new ResourceVisibilityDTO(false, Set.of()))).isInstanceOf(
            AccessDeniedException.class
        );
        login("author", "PERM_RESOURCE_VISIBILITY");
        service.updateVisibility(1L, 2L, new ResourceVisibilityDTO(true, Set.of()));
        assertThat(document.isRestricted()).isTrue();
        assertThat(document.getAllowedLogins()).isEmpty();
        login("reader");
        assertThatThrownBy(() -> service.download(1L, 2L)).isInstanceOf(ResponseStatusException.class);
    }

    @Test
    void rejectsUnknownRecipientsAndSupportsRestoringVisibility() {
        login("author", "PERM_RESOURCE_VISIBILITY");
        assertThatThrownBy(() -> service.updateVisibility(1L, 2L, new ResourceVisibilityDTO(true, Set.of("outsider")))).isInstanceOf(
            ResponseStatusException.class
        );
        service.updateVisibility(1L, 2L, new ResourceVisibilityDTO(false, Set.of()));
        assertThat(document.isRestricted()).isFalse();
        assertThat(document.getAllowedLogins()).isEmpty();
        login("member");
        assertThat(service.download(1L, 2L)).isSameAs(document);
    }

    @Test
    void listUsesAuthenticatedIdentityForDatabaseFiltering() {
        login("reader");
        service.list(1L);
        verify(documents).list(1L, "reader");
    }

    @Test
    void cannotCreatePrivateResourceWithoutPermission() {
        login("author");
        assertThatThrownBy(() -> service.create(1L, "Secret", "", "OTHER", "https://example.com", null, null, true, Set.of())).isInstanceOf(
            AccessDeniedException.class
        );
        verify(documents, never()).save(any());
    }

    @Test
    void creatorCanEditMetadataWithoutReplacingFileOrVisibility() throws Exception {
        login("author");
        document.setContent(new byte[] { 1, 2 });
        document.setCreatedAt(java.time.Instant.EPOCH);
        service.update(1L, 2L, "Updated", "Description", "OTHER", null, null, null);
        assertThat(document.getTitle()).isEqualTo("Updated");
        assertThat(document.getFilename()).isEqualTo("sensitive.pdf");
        assertThat(document.getContent()).containsExactly(1, 2);
        assertThat(document.isRestricted()).isTrue();
        assertThat(document.getAllowedLogins()).containsExactly("reader");
        assertThat(document.getCreatedAt()).isEqualTo(java.time.Instant.EPOCH);
        assertThat(document.getAuthor()).isEqualTo("author");
    }

    @Test
    void preventsOtherUsersAndClosedProjectsFromEditing() {
        login("reader", "ROLE_SUPER_ADMIN");
        assertThatThrownBy(() -> service.update(1L, 2L, "Updated", "", "OTHER", null, null, null)).isInstanceOf(
            AccessDeniedException.class
        );
        login("author");
        doThrow(new AccessDeniedException("Closed")).when(security).checkProjectWritable(1L);
        assertThatThrownBy(() -> service.update(1L, 2L, "Updated", "", "OTHER", null, null, null)).isInstanceOf(
            AccessDeniedException.class
        );
        verify(documents, never()).save(any());
    }

    @Test
    void replacesFileWithLinkAndBack() throws Exception {
        login("author");
        document.setContent(new byte[] { 1 });
        service.update(1L, 2L, "Link", "", "OTHER", "https://example.com", null, null);
        assertThat(document.getFilename()).isNull();
        assertThat(document.getContent()).isNull();
        assertThat(document.getUrl()).isEqualTo("https://example.com");
        var file = new org.springframework.mock.web.MockMultipartFile("file", "new.pdf", "application/pdf", new byte[] { 3 });
        service.update(1L, 2L, "File", "", "OTHER", null, null, file);
        assertThat(document.getUrl()).isNull();
        assertThat(document.getFilename()).isEqualTo("new.pdf");
        assertThat(document.getContent()).containsExactly(3);
    }

    @Test
    void rejectsInvalidReplacementWithoutChangingExistingResource() {
        login("author");
        document.setTitle("Original");
        assertThatThrownBy(() -> service.update(1L, 2L, "Changed", "", "OTHER", "http://unsafe.example.com", null, null)).isInstanceOf(
            ResponseStatusException.class
        );
        assertThat(document.getTitle()).isEqualTo("Original");
        assertThat(document.getFilename()).isEqualTo("sensitive.pdf");
        verify(documents, never()).save(any());
    }

    @Test
    void acceptsExistingUsersOutsideProject() {
        login("author", "PERM_RESOURCE_VISIBILITY");
        when(users.findExistingLogins(Set.of("external"))).thenReturn(Set.of("external"));
        service.updateVisibility(1L, 2L, new ResourceVisibilityDTO(true, Set.of("external")));
        assertThat(document.getAllowedLogins()).containsExactly("external");
    }

    @Test
    void directoryRequiresVisibilityPermissionAndProjectAccess() {
        login("author");
        assertThatThrownBy(() -> service.recipients(1L)).isInstanceOf(AccessDeniedException.class);
        verify(users, never()).findResourceRecipients();
        login("author", "PERM_RESOURCE_VISIBILITY");
        service.recipients(1L);
        verify(users).findResourceRecipients();
        doThrow(new AccessDeniedException("Denied")).when(security).checkProjectAccess(1L);
        assertThatThrownBy(() -> service.recipients(1L)).isInstanceOf(AccessDeniedException.class);
    }

    @Test
    void createsRestrictedLinkAtomically() throws Exception {
        login("author", "PERM_RESOURCE_VISIBILITY");
        service.create(1L, "Secret", "", "OTHER", "https://example.com", null, null, true, Set.of("reader"));
        var captor = org.mockito.ArgumentCaptor.forClass(ProjectDocument.class);
        verify(documents).save(captor.capture());
        assertThat(captor.getValue().isRestricted()).isTrue();
        assertThat(captor.getValue().getAllowedLogins()).containsExactly("reader");
    }
}
