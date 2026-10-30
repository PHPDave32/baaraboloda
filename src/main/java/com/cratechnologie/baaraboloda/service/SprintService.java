package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Sprint;
import com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.service.dto.SprintDTO;
import com.cratechnologie.baaraboloda.service.mapper.SprintMapper;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.cratechnologie.baaraboloda.domain.Sprint}.
 */
@Service
@Transactional
public class SprintService {

    private static final Logger LOG = LoggerFactory.getLogger(SprintService.class);

    private static final String ENTITY_NAME = "sprint";

    private final SprintRepository sprintRepository;

    private final SprintMapper sprintMapper;

    private final NotificationService notifications;

    public SprintService(SprintRepository sprintRepository, SprintMapper sprintMapper, NotificationService notifications) {
        this.notifications = notifications;
        this.sprintRepository = sprintRepository;
        this.sprintMapper = sprintMapper;
    }

    /**
     * Save a sprint.
     *
     * @param sprintDTO the entity to save.
     * @return the persisted entity.
     */
    public SprintDTO save(SprintDTO sprintDTO) {
        LOG.debug("Request to save Sprint : {}", sprintDTO);
        Sprint sprint = sprintMapper.toEntity(sprintDTO);
        sprint = sprintRepository.saveAndFlush(sprint);
        if (sprint.getStatus() == SprintStatus.COMPLETED) notifications.sprintCompleted(sprint);
        return sprintMapper.toDto(sprint);
    }

    /**
     * Update a sprint.
     *
     * @param sprintDTO the entity to save.
     * @return the persisted entity.
     */
    public SprintDTO update(SprintDTO sprintDTO) {
        LOG.debug("Request to update Sprint : {}", sprintDTO);
        Sprint sprint = sprintMapper.toEntity(sprintDTO);
        sprint.setUuid(sprintRepository.findById(sprintDTO.getId()).orElseThrow().getUuid());
        if (sprint.getStatus() == SprintStatus.ACTIVE && sprint.getProject() != null) {
            assertNoOtherActiveSprint(sprint.getProject().getId(), sprint.getId());
        }
        sprint = sprintRepository.saveAndFlush(sprint);
        if (sprint.getStatus() == SprintStatus.COMPLETED) notifications.sprintCompleted(sprint);
        return sprintMapper.toDto(sprint);
    }

    public int completeExpiredSprints() {
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Africa/Bamako"));
        var expired = sprintRepository.findAllByStatusAndEndDateBefore(SprintStatus.ACTIVE, today);
        if (expired.isEmpty()) {
            return 0;
        }
        expired.forEach(sprint -> sprint.setStatus(SprintStatus.COMPLETED));
        sprintRepository.saveAllAndFlush(expired);
        expired.forEach(notifications::sprintCompleted);
        LOG.info("Auto-completed {} expired sprint(s)", expired.size());
        return expired.size();
    }

    private void assertNoOtherActiveSprint(Long projectId, Long currentSprintId) {
        if (projectId == null) {
            return;
        }
        boolean anotherActive = sprintRepository.existsByProject_IdAndStatusAndIdNot(projectId, SprintStatus.ACTIVE, currentSprintId);
        if (anotherActive) {
            throw new BadRequestAlertException("Un sprint est déjà en cours pour ce projet", ENTITY_NAME, "sprintalreadyactive");
        }
    }

    /**
     * Partially update a sprint.
     *
     * @param sprintDTO the entity to update partially.
     * @return the persisted entity.
     */
    public Optional<SprintDTO> partialUpdate(SprintDTO sprintDTO) {
        LOG.debug("Request to partially update Sprint : {}", sprintDTO);

        return sprintRepository
            .findById(sprintDTO.getId())
            .map(existingSprint -> {
                sprintMapper.partialUpdate(existingSprint, sprintDTO);

                if (existingSprint.getStatus() == SprintStatus.ACTIVE && existingSprint.getProject() != null) {
                    assertNoOtherActiveSprint(existingSprint.getProject().getId(), existingSprint.getId());
                }

                return existingSprint;
            })
            .map(sprintRepository::saveAndFlush)
            .map(sprint -> {
                if (sprint.getStatus() == SprintStatus.COMPLETED) notifications.sprintCompleted(sprint);
                return sprintMapper.toDto(sprint);
            });
    }

    /**
     * Get all the sprints with eager load of many-to-many relationships.
     *
     * @return the list of entities.
     */
    public Page<SprintDTO> findAllWithEagerRelationships(Pageable pageable) {
        return sprintRepository.findAllWithEagerRelationships(pageable).map(sprintMapper::toDto);
    }

    /**
     * Get one sprint by id.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    @Transactional(readOnly = true)
    public Optional<SprintDTO> findOne(Long id) {
        LOG.debug("Request to get Sprint : {}", id);
        return sprintRepository.findOneWithEagerRelationships(id).map(sprintMapper::toDto);
    }

    /**
     * Delete the sprint by id.
     *
     * @param id the id of the entity.
     */
    public void delete(Long id) {
        LOG.debug("Request to delete Sprint : {}", id);
        sprintRepository.deleteById(id);
    }
}
