package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.ProjectDocument;
import com.cratechnologie.baaraboloda.service.dto.ProjectDocumentDTO;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProjectDocumentRepository extends JpaRepository<ProjectDocument, Long> {
    @Query(
        "select new com.cratechnologie.baaraboloda.service.dto.ProjectDocumentDTO(d.id, d.title, d.description, d.category, d.url, d.filename, d.fileSize, d.author, d.createdAt, t.id) from ProjectDocument d left join d.task t where d.project.id = :projectId order by d.createdAt desc, d.id desc"
    )
    List<ProjectDocumentDTO> list(@Param("projectId") Long projectId);

    Optional<ProjectDocument> findByIdAndProject_Id(Long id, Long projectId);
}
