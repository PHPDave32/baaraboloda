package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.Label;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

/**
 * Spring Data JPA repository for the Label entity.
 */
@Repository
public interface LabelRepository extends JpaRepository<Label, Long>, JpaSpecificationExecutor<Label> {
    default Optional<Label> findOneWithEagerRelationships(Long id) {
        return this.findOneWithToOneRelationships(id);
    }

    default List<Label> findAllWithEagerRelationships() {
        return this.findAllWithToOneRelationships();
    }

    default Page<Label> findAllWithEagerRelationships(Pageable pageable) {
        return this.findAllWithToOneRelationships(pageable);
    }

    @Query(value = "select label from Label label left join fetch label.project", countQuery = "select count(label) from Label label")
    Page<Label> findAllWithToOneRelationships(Pageable pageable);

    @Query("select label from Label label left join fetch label.project")
    List<Label> findAllWithToOneRelationships();

    @Query("select label from Label label left join fetch label.project where label.id =:id")
    Optional<Label> findOneWithToOneRelationships(@Param("id") Long id);
}
