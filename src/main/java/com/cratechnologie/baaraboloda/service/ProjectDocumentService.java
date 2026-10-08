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

    public ProjectDocumentService(
        ProjectDocumentRepository documents,
        ProjectRepository projects,
        TaskRepository tasks,
        ProjectSecurityService security
    ) {
        this.documents = documents;
        this.projects = projects;
        this.tasks = tasks;
        this.security = security;
    }

    @Transactional(readOnly = true)
    public List<ProjectDocumentDTO> list(Long projectId) {
        checkAccess(projectId);
        return documents.list(projectId);
    }

    public void create(Long projectId, String title, String description, String category, String url, Long taskId, MultipartFile file)
        throws IOException {
        Project project = checkAccess(projectId);
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
        if (hasUrl == (file != null)) {
            throw badRequest("Ajoutez un fichier ou un lien, exclusivement.");
        }
        ProjectDocument document = new ProjectDocument();
        document.setProject(project);
        document.setTitle(title.trim());
        document.setDescription(description);
        document.setCategory(category);
        document.setAuthor(SecurityUtils.getCurrentUserLogin().orElseThrow(() -> new AccessDeniedException("Authentification requise.")));
        document.setCreatedAt(Instant.now());
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
                if (document.getUrl().length() > 2000) throw new IllegalArgumentException();
            } catch (IllegalArgumentException exception) {
                throw badRequest("Utilisez un lien HTTPS valide.");
            }
        } else {
            if (file.isEmpty() || file.getSize() > 10 * 1024 * 1024) throw badRequest("Le fichier doit contenir entre 1 octet et 10 Mo.");
            String filename = file.getOriginalFilename();
            if (filename == null) throw badRequest("Nom du fichier manquant.");
            filename = filename.replace('\\', '/');
            filename = filename.substring(filename.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}]", "");
            String extension = filename.substring(filename.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
            if (filename.isBlank() || filename.length() > 255 || !EXTENSIONS.contains(extension)) throw badRequest(
                "Format de fichier non pris en charge."
            );
            document.setFilename(filename);
            document.setFileSize(file.getSize());
            document.setContent(file.getBytes());
        }
        documents.save(document);
    }

    @Transactional(readOnly = true)
    public ProjectDocument download(Long projectId, Long id) {
        checkAccess(projectId);
        ProjectDocument document = find(projectId, id);
        if (document.getFilename() == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        return document;
    }

    public void delete(Long projectId, Long id) {
        Project project = checkAccess(projectId);
        if (
            !security.isCurrentUserAdmin() &&
            !SecurityUtils.getCurrentUserLogin()
                .filter(login -> login.equals(project.getOwner().getLogin()))
                .isPresent()
        ) {
            throw new AccessDeniedException("Seul le responsable du projet peut supprimer une ressource.");
        }
        documents.delete(find(projectId, id));
    }

    private ProjectDocument find(Long projectId, Long id) {
        return documents.findByIdAndProject_Id(id, projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Project checkAccess(Long projectId) {
        if (
            !security.isCurrentUserAdmin() &&
            !SecurityUtils.getCurrentUserLogin()
                .map(login -> projects.findAccessibleProjectIds(login).contains(projectId))
                .orElse(false)
        ) {
            throw new AccessDeniedException("Vous devez appartenir à ce projet pour accéder à ses ressources.");
        }
        return projects.findById(projectId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private ResponseStatusException badRequest(String message) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
    }
}
