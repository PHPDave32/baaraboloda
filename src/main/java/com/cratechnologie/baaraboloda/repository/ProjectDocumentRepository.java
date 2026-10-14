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
        "select new com.cratechnologie.baaraboloda.service.dto.ProjectDocumentDTO(d.id, d.title, d.description, d.category, d.url, d.filename, d.fileSize, d.author, d.createdAt, t.id, d.restricted) from ProjectDocument d left join d.task t where d.project.id = :projectId and (d.restricted = false or d.author = :login or :login member of d.allowedLogins) order by d.createdAt desc, d.id desc"
    )
    List<ProjectDocumentDTO> list(@Param("projectId") Long projectId, @Param("login") String login);

    Optional<ProjectDocument> findByIdAndProject_Id(Long id, Long projectId);
}
