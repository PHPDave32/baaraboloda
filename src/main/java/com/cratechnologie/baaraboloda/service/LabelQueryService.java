package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.*; // for static metamodels
import com.cratechnologie.baaraboloda.domain.Label;
import com.cratechnologie.baaraboloda.repository.LabelRepository;
import com.cratechnologie.baaraboloda.service.criteria.LabelCriteria;
import com.cratechnologie.baaraboloda.service.dto.LabelDTO;
import com.cratechnologie.baaraboloda.service.mapper.LabelMapper;
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
 * Service for executing complex queries for {@link Label} entities in the database.
 * The main input is a {@link LabelCriteria} which gets converted to {@link Specification},
 * in a way that all the filters must apply.
 * It returns a {@link Page} of {@link LabelDTO} which fulfills the criteria.
 */
@Service
@Transactional(readOnly = true)
public class LabelQueryService extends QueryService<Label> {

    private static final Logger LOG = LoggerFactory.getLogger(LabelQueryService.class);

    private final LabelRepository labelRepository;

    private final LabelMapper labelMapper;

    public LabelQueryService(LabelRepository labelRepository, LabelMapper labelMapper) {
        this.labelRepository = labelRepository;
        this.labelMapper = labelMapper;
    }

    /**
     * Return a {@link Page} of {@link LabelDTO} which matches the criteria from the database.
     * @param criteria The object which holds all the filters, which the entities should match.
     * @param page The page, which should be returned.
     * @return the matching entities.
     */
    @Transactional(readOnly = true)
    public Page<LabelDTO> findByCriteria(LabelCriteria criteria, Pageable page) {
        LOG.debug("find by criteria : {}, page: {}", criteria, page);
        final Specification<Label> specification = createSpecification(criteria);
        return labelRepository.findAll(specification, page).map(labelMapper::toDto);
    }

    /**
     * Return the number of matching entities in the database.
     * @param criteria The object which holds all the filters, which the entities should match.
     * @return the number of matching entities.
     */
    @Transactional(readOnly = true)
    public long countByCriteria(LabelCriteria criteria) {
        LOG.debug("count by criteria : {}", criteria);
        final Specification<Label> specification = createSpecification(criteria);
        return labelRepository.count(specification);
    }

    /**
     * Function to convert {@link LabelCriteria} to a {@link Specification}
     * @param criteria The object which holds all the filters, which the entities should match.
     * @return the matching {@link Specification} of the entity.
     */
    protected Specification<Label> createSpecification(LabelCriteria criteria) {
        Specification<Label> specification = Specification.unrestricted();
        specification = specification.and((root, query, builder) -> {
            if (Long.class != query.getResultType()) {
                root.fetch(Label_.project, JoinType.LEFT);
            }
            return null;
        });
        if (criteria != null) {
            // This has to be called first, because the distinct method returns null
            specification = specification.and(
                Specification.allOf(
                    Boolean.TRUE.equals(criteria.getDistinct()) ? distinct(criteria.getDistinct()) : Specification.unrestricted(),
                    buildRangeSpecification(criteria.getId(), Label_.id),
                    buildStringSpecification(criteria.getName(), Label_.name),
                    buildStringSpecification(criteria.getColor(), Label_.color),
                    buildSpecification(criteria.getProjectId(), root -> root.join(Label_.project, JoinType.LEFT).get(Project_.id))
                )
            );
        }
        return specification;
    }
}
