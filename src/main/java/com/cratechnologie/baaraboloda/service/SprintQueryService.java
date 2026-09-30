package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.*; // for static metamodels
import com.cratechnologie.baaraboloda.domain.Sprint;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.service.criteria.SprintCriteria;
import com.cratechnologie.baaraboloda.service.dto.SprintDTO;
import com.cratechnologie.baaraboloda.service.mapper.SprintMapper;
import jakarta.persistence.criteria.JoinType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.jhipster.service.QueryService;

/**
 * Service for executing complex queries for {@link Sprint} entities in the database.
 * The main input is a {@link SprintCriteria} which gets converted to {@link Specification},
 * in a way that all the filters must apply.
 * It returns a {@link Page} of {@link SprintDTO} which fulfills the criteria.
 */
@Service
@Transactional(readOnly = true)
public class SprintQueryService extends QueryService<Sprint> {

    private static final Logger LOG = LoggerFactory.getLogger(SprintQueryService.class);

    private final SprintRepository sprintRepository;

    private final SprintMapper sprintMapper;

    public SprintQueryService(SprintRepository sprintRepository, SprintMapper sprintMapper) {
        this.sprintRepository = sprintRepository;
        this.sprintMapper = sprintMapper;
    }

    /**
     * Return a {@link Page} of {@link SprintDTO} which matches the criteria from the database.
     * @param criteria The object which holds all the filters, which the entities should match.
     * @param page The page, which should be returned.
     * @return the matching entities.
     */
    @Transactional(readOnly = true)
    public Page<SprintDTO> findByCriteria(SprintCriteria criteria, Pageable page) {
        LOG.debug("find by criteria : {}, page: {}", criteria, page);
        final Specification<Sprint> specification = createSpecification(criteria);
        return sprintRepository.findAll(specification, page).map(sprintMapper::toDto);
    }

    /**
     * Return the number of matching entities in the database.
     * @param criteria The object which holds all the filters, which the entities should match.
     * @return the number of matching entities.
     */
    @Transactional(readOnly = true)
    public long countByCriteria(SprintCriteria criteria) {
        LOG.debug("count by criteria : {}", criteria);
        final Specification<Sprint> specification = createSpecification(criteria);
        return sprintRepository.count(specification);
    }

    /**
     * Function to convert {@link SprintCriteria} to a {@link Specification}
     * @param criteria The object which holds all the filters, which the entities should match.
     * @return the matching {@link Specification} of the entity.
     */
    protected Specification<Sprint> createSpecification(SprintCriteria criteria) {
        Specification<Sprint> specification = Specification.unrestricted();
        specification = specification.and((root, query, builder) -> {
            if (Long.class != query.getResultType()) {
                root.fetch(Sprint_.createdBy, JoinType.LEFT);
                root.fetch(Sprint_.project, JoinType.LEFT);
            }
            return null;
        });
        if (criteria != null) {
            // This has to be called first, because the distinct method returns null
            specification = specification.and(
                Specification.allOf(
                    Boolean.TRUE.equals(criteria.getDistinct()) ? distinct(criteria.getDistinct()) : Specification.unrestricted(),
                    buildRangeSpecification(criteria.getId(), Sprint_.id),
                    buildStringSpecification(criteria.getName(), Sprint_.name),
                    buildStringSpecification(criteria.getGoal(), Sprint_.goal),
                    buildSpecification(criteria.getStatus(), Sprint_.status),
                    buildRangeSpecification(criteria.getStartDate(), Sprint_.startDate),
                    buildRangeSpecification(criteria.getEndDate(), Sprint_.endDate),
                    buildRangeSpecification(criteria.getCreatedAt(), Sprint_.createdAt),
                    buildRangeSpecification(criteria.getUpdatedAt(), Sprint_.updatedAt),
                    buildSpecification(criteria.getCreatedById(), root -> root.join(Sprint_.createdBy, JoinType.LEFT).get(User_.id)),
                    buildSpecification(criteria.getProjectId(), root -> root.join(Sprint_.project, JoinType.LEFT).get(Project_.id))
                )
            );
        }
        return specification;
    }
}
