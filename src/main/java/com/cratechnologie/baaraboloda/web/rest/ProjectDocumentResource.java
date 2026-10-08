package com.cratechnologie.baaraboloda.web.rest;

import com.cratechnologie.baaraboloda.service.ProjectDocumentService;
import com.cratechnologie.baaraboloda.service.dto.ProjectDocumentDTO;
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
    public List<ProjectDocumentDTO> list(@PathVariable Long projectId) {
        return service.list(projectId);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> create(
        @PathVariable Long projectId,
        @RequestParam String title,
        @RequestParam(defaultValue = "") String description,
        @RequestParam String category,
        @RequestParam(required = false) String url,
        @RequestParam(required = false) Long taskId,
        @RequestParam(required = false) MultipartFile file
    ) throws IOException {
        service.create(projectId, title, description, category, url, taskId, file);
        return ResponseEntity.status(201).build();
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<byte[]> download(@PathVariable Long projectId, @PathVariable Long id) {
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
    public ResponseEntity<Void> delete(@PathVariable Long projectId, @PathVariable Long id) {
        service.delete(projectId, id);
        return ResponseEntity.noContent().build();
    }
}
