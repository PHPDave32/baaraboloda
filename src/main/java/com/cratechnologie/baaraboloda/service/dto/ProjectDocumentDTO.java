package com.cratechnologie.baaraboloda.service.dto;

import java.time.Instant;

public record ProjectDocumentDTO(
    Long id,
    String title,
    String description,
    String category,
    String url,
    String filename,
    Long fileSize,
    String author,
    Instant createdAt,
    Long taskId
) {}
