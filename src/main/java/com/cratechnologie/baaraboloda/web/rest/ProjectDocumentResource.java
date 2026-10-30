package com.cratechnologie.baaraboloda.web.rest;

import com.cratechnologie.baaraboloda.service.ProjectDocumentService;
import com.cratechnologie.baaraboloda.service.dto.ProjectDocumentDTO;
import com.cratechnologie.baaraboloda.web.rest.util.PublicId;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/projects/{projectId}/documents")
public class ProjectDocumentResource {

    private final ProjectDocumentService service;

    public ProjectDocumentResource(ProjectDocumentService service) {
        this.service = service;
    }

    @GetMapping
    public List<ProjectDocumentDTO> list(@PublicId(entity = "project", name = "projectId") Long projectId) {
        return service.list(projectId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> create(
        @PublicId(entity = "project", name = "projectId") Long projectId,
        @RequestParam String title,
        @RequestParam(defaultValue = "") String description,
        @RequestParam String category,
        @RequestParam(required = false) String url,
        @RequestParam(required = false) Long taskId,
        @RequestParam(required = false) MultipartFile file,
        @RequestParam(defaultValue = "false") boolean restricted,
        @RequestParam(required = false) java.util.Set<String> allowedLogins
    ) throws IOException {
        service.create(
            projectId,
            title,
            description,
            category,
            url,
            taskId,
            file,
            restricted,
            allowedLogins == null ? java.util.Set.of() : allowedLogins
        );
        return ResponseEntity.status(201).build();
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> update(
        @PublicId(entity = "project", name = "projectId") Long projectId,
        @PathVariable Long id,
        @RequestParam String title,
        @RequestParam(defaultValue = "") String description,
        @RequestParam String category,
        @RequestParam(required = false) String url,
        @RequestParam(required = false) Long taskId,
        @RequestParam(required = false) MultipartFile file
    ) throws IOException {
        service.update(projectId, id, title, description, category, url, taskId, file);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/recipients")
    public List<com.cratechnologie.baaraboloda.service.dto.ResourceRecipientDTO> recipients(
        @PublicId(entity = "project", name = "projectId") Long projectId
    ) {
        return service.recipients(projectId);
    }

    @GetMapping("/{id}/visibility")
    public com.cratechnologie.baaraboloda.service.dto.ResourceVisibilityDTO visibility(
        @PublicId(entity = "project", name = "projectId") Long projectId,
        @PathVariable Long id
    ) {
        return service.visibility(projectId, id);
    }

    @PutMapping("/{id}/visibility")
    public ResponseEntity<Void> updateVisibility(
        @PublicId(entity = "project", name = "projectId") Long projectId,
        @PathVariable Long id,
        @jakarta.validation.Valid @RequestBody com.cratechnologie.baaraboloda.service.dto.ResourceVisibilityDTO input
    ) {
        service.updateVisibility(projectId, id, input);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PublicId(entity = "project", name = "projectId") Long projectId, @PathVariable Long id) {
        var document = service.download(projectId, id);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .cacheControl(CacheControl.noStore())
            .header(
                HttpHeaders.CONTENT_DISPOSITION,
                ContentDisposition.attachment().filename(document.getFilename(), StandardCharsets.UTF_8).build().toString()
            )
            .header("X-Content-Type-Options", "nosniff")
            .body(document.getContent());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PublicId(entity = "project", name = "projectId") Long projectId, @PathVariable Long id) {
        service.delete(projectId, id);
        return ResponseEntity.noContent().build();
    }
}
