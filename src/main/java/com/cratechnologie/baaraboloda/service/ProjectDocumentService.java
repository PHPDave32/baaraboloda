package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Project;
import com.cratechnologie.baaraboloda.domain.ProjectDocument;
import com.cratechnologie.baaraboloda.repository.ProjectDocumentRepository;
import com.cratechnologie.baaraboloda.repository.ProjectRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import com.cratechnologie.baaraboloda.security.SecurityUtils;
import com.cratechnologie.baaraboloda.service.dto.ProjectDocumentDTO;
import java.io.IOException;
import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class ProjectDocumentService {

    private static final Set<String> CATEGORIES = Set.of("SPECIFICATION", "REPORT", "DESIGN", "TECHNICAL", "DELIVERABLE", "OTHER");
    private static final Set<String> EXTENSIONS = Set.of(
        "pdf",
        "doc",
        "docx",
        "xls",
        "xlsx",
        "ppt",
        "pptx",
        "txt",
        "csv",
        "png",
        "jpg",
        "jpeg",
        "webp",
        "zip"
    );
    private final ProjectDocumentRepository documents;
    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final ProjectSecurityService security;
    private final com.cratechnologie.baaraboloda.repository.UserRepository users;

    public ProjectDocumentService(
        ProjectDocumentRepository documents,
        ProjectRepository projects,
        TaskRepository tasks,
        ProjectSecurityService security,
        com.cratechnologie.baaraboloda.repository.UserRepository users
    ) {
        this.documents = documents;
        this.projects = projects;
        this.tasks = tasks;
        this.security = security;
        this.users = users;
    }

    @Transactional(readOnly = true)
    public List<ProjectDocumentDTO> list(Long projectId) {
        checkAccess(projectId);
        return documents.list(projectId, currentLogin());
    }

    public void create(Long projectId, String title, String description, String category, String url, Long taskId, MultipartFile file)
        throws IOException {
        create(projectId, title, description, category, url, taskId, file, false, Set.of());
    }

    public void create(
        Long projectId,
        String title,
        String description,
        String category,
        String url,
        Long taskId,
        MultipartFile file,
        boolean restricted,
        Set<String> allowedLogins
    ) throws IOException {
        security.requirePermission("PERM_DOCUMENT_MANAGE");
        security.checkProjectWritable(projectId);
        Project project = checkAccess(projectId);
        ProjectDocument document = new ProjectDocument();
        document.setProject(project);
        document.setAuthor(currentLogin());
        document.setCreatedAt(Instant.now());
        populateDocument(document, projectId, title, description, category, url, taskId, file);
        if (restricted || !allowedLogins.isEmpty()) {
            requireVisibilityPermission();
            applyVisibility(document, project, restricted, allowedLogins);
        }
        documents.save(document);
    }

    private void populateDocument(
        ProjectDocument document,
        Long projectId,
        String title,
        String description,
        String category,
        String url,
        Long taskId,
        MultipartFile file
    ) throws IOException {
        if (
            title == null ||
            title.isBlank() ||
            title.length() > 200 ||
            (description != null && description.length() > 2000) ||
            !CATEGORIES.contains(category)
        ) {
            throw badRequest("Informations du document invalides.");
        }
        boolean hasUrl = url != null && !url.isBlank();
        if ((hasUrl && file != null) || (!hasUrl && file == null && document.getFilename() == null && document.getUrl() == null)) {
            throw badRequest("Ajoutez un fichier ou un lien, exclusivement.");
        }
        document.setTitle(title.trim());
        document.setDescription(description);
        document.setCategory(category);
        document.setTask(null);
        if (taskId != null) {
            var task = tasks.findById(taskId).orElseThrow(() -> badRequest("Tâche introuvable."));
            if (task.getProject() == null || !projectId.equals(task.getProject().getId())) {
                throw badRequest("La tâche doit appartenir au même projet.");
            }
            document.setTask(task);
        }
        if (hasUrl) {
            try {
                URI uri = URI.create(url.trim());
                if (
                    url.length() > 2000 || !"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null
                ) {
                    throw new IllegalArgumentException();
                }
                document.setUrl(uri.toASCIIString());
                document.setFilename(null);
                document.setContent(null);
                document.setFileSize(null);
                if (document.getUrl().length() > 2000) throw new IllegalArgumentException();
            } catch (IllegalArgumentException exception) {
                throw badRequest("Utilisez un lien HTTPS valide.");
            }
        } else if (file != null) {
            if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw badRequest("Le fichier doit contenir entre 1 octet et 10 Mo.");
            String filename = file.getOriginalFilename();
            if (filename == null) throw badRequest("Nom du fichier manquant.");
            filename = filename.replace('\\', '/');
            filename = filename.substring(filename.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
            String extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            if (filename.isBlank() || filename.length() > 255 || !EXTENSIONS.contains(extension)) throw badRequest(
                "Format de fichier non pris en charge."
            );
            document.setUrl(null);
            document.setFilename(filename);
            document.setFileSize(file.getSize());
            document.setContent(file.getBytes());
        }
    }

    public void update(
        Long projectId,
        Long id,
        String title,
        String description,
        String category,
        String url,
        Long taskId,
        MultipartFile file
    ) throws IOException {
        checkAccess(projectId);
        security.checkProjectWritable(projectId);
        ProjectDocument document = find(projectId, id);
        if (!currentLogin().equals(document.getAuthor())) {
            throw new AccessDeniedException("Seul le créateur peut modifier cette ressource.");
        }
        // Validate replacement data before modifying the managed entity.
        ProjectDocument replacement = new ProjectDocument();
        replacement.setFilename(document.getFilename());
        replacement.setContent(document.getContent());
        replacement.setFileSize(document.getFileSize());
        replacement.setUrl(document.getUrl());
        populateDocument(replacement, projectId, title, description, category, url, taskId, file);
        document.setTitle(replacement.getTitle());
        document.setDescription(replacement.getDescription());
        document.setCategory(replacement.getCategory());
        document.setTask(replacement.getTask());
        document.setUrl(replacement.getUrl());
        document.setFilename(replacement.getFilename());
        document.setFileSize(replacement.getFileSize());
        document.setContent(replacement.getContent());
        documents.save(document);
    }

    @Transactional(readOnly = true)
    public ProjectDocument download(Long projectId, Long id) {
        checkAccess(projectId);
        ProjectDocument document = find(projectId, id);
        checkVisible(document);
        if (document.getFilename() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return document;
    }

    public void delete(Long projectId, Long id) {
        security.requirePermission("PERM_DOCUMENT_MANAGE");
        security.checkProjectWritable(projectId);
        Project project = checkAccess(projectId);
        ProjectDocument document = find(projectId, id);
        checkVisible(document);
        documents.delete(document);
    }

    public com.cratechnologie.baaraboloda.service.dto.ResourceVisibilityDTO visibility(Long projectId, Long id) {
        checkAccess(projectId);
        ProjectDocument document = find(projectId, id);
        checkVisibilityOwner(document);
        return new com.cratechnologie.baaraboloda.service.dto.ResourceVisibilityDTO(
            document.isRestricted(),
            Set.copyOf(document.getAllowedLogins())
        );
    }

    public void updateVisibility(Long projectId, Long id, com.cratechnologie.baaraboloda.service.dto.ResourceVisibilityDTO input) {
        Project project = checkAccess(projectId);
        security.checkProjectWritable(projectId);
        ProjectDocument document = find(projectId, id);
        checkVisibilityOwner(document);
        applyVisibility(document, project, input.restricted(), input.allowedLogins());
        documents.save(document);
    }

    @Transactional(readOnly = true)
    public List<com.cratechnologie.baaraboloda.service.dto.ResourceRecipientDTO> recipients(Long projectId) {
        checkAccess(projectId);
        requireVisibilityPermission();
        return users.findResourceRecipients();
    }

    private void requireVisibilityPermission() {
        if (!SecurityUtils.hasCurrentUserAnyOfAuthorities("ROLE_SUPER_ADMIN", "PERM_RESOURCE_VISIBILITY")) {
            throw new AccessDeniedException("Votre profil ne permet pas de gérer la visibilité des ressources.");
        }
    }

    private void checkVisibilityOwner(ProjectDocument document) {
        requireVisibilityPermission();
        if (!currentLogin().equals(document.getAuthor())) throw new AccessDeniedException("Seul le créateur peut modifier la visibilité.");
    }

    private void applyVisibility(ProjectDocument document, Project project, boolean restricted, Set<String> allowedLogins) {
        if (
            allowedLogins == null ||
            allowedLogins.size() > 1000 ||
            (!allowedLogins.isEmpty() && !users.findExistingLogins(allowedLogins).containsAll(allowedLogins))
        ) {
            throw badRequest("Un utilisateur sélectionné n’existe plus. Actualisez la liste.");
        }
        document.setRestricted(restricted);
        document.setAllowedLogins(new java.util.HashSet<>(restricted ? allowedLogins : Set.of()));
    }

    private String currentLogin() {
        return SecurityUtils.getCurrentUserLogin().orElseThrow(() -> new AccessDeniedException("Authentification requise."));
    }

    private void checkVisible(ProjectDocument document) {
        String login = currentLogin();
        if (document.isRestricted() && !login.equals(document.getAuthor()) && !document.getAllowedLogins().contains(login)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    private ProjectDocument find(Long projectId, Long id) {
        return documents.findByIdAndProject_Id(id, projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Project checkAccess(Long projectId) {
        security.checkProjectAccess(projectId);
        return projects.findById(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
