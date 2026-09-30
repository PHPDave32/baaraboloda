package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Label;
import com.cratechnologie.baaraboloda.repository.LabelRepository;
import com.cratechnologie.baaraboloda.service.dto.LabelDTO;
import com.cratechnologie.baaraboloda.service.mapper.LabelMapper;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.cratechnologie.baaraboloda.domain.Label}.
 */
@Service
@Transactional
public class LabelService {

    private static final Logger LOG = LoggerFactory.getLogger(LabelService.class);

    private final LabelRepository labelRepository;

    private final LabelMapper labelMapper;

    public LabelService(LabelRepository labelRepository, LabelMapper labelMapper) {
        this.labelRepository = labelRepository;
        this.labelMapper = labelMapper;
    }

    /**
     * Save a label.
     *
     * @param labelDTO the entity to save.
     * @return the persisted entity.
     */
    public LabelDTO save(LabelDTO labelDTO) {
        LOG.debug("Request to save Label : {}", labelDTO);
        Label label = labelMapper.toEntity(labelDTO);
        label = labelRepository.save(label);
        return labelMapper.toDto(label);
    }

    /**
     * Update a label.
     *
     * @param labelDTO the entity to save.
     * @return the persisted entity.
     */
    public LabelDTO update(LabelDTO labelDTO) {
        LOG.debug("Request to update Label : {}", labelDTO);
        Label label = labelMapper.toEntity(labelDTO);
        label = labelRepository.save(label);
        return labelMapper.toDto(label);
    }

    /**
     * Partially update a label.
     *
     * @param labelDTO the entity to update partially.
     * @return the persisted entity.
     */
    public Optional<LabelDTO> partialUpdate(LabelDTO labelDTO) {
        LOG.debug("Request to partially update Label : {}", labelDTO);

        return labelRepository
            .findById(labelDTO.getId())
            .map(existingLabel -> {
                labelMapper.partialUpdate(existingLabel, labelDTO);

                return existingLabel;
            })
            .map(labelRepository::save)
            .map(labelMapper::toDto);
    }

    /**
     * Get all the labels with eager load of many-to-many relationships.
     *
     * @return the list of entities.
     */
    public Page<LabelDTO> findAllWithEagerRelationships(Pageable pageable) {
        return labelRepository.findAllWithEagerRelationships(pageable).map(labelMapper::toDto);
    }

    /**
     * Get one label by id.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    @Transactional(readOnly = true)
    public Optional<LabelDTO> findOne(Long id) {
        LOG.debug("Request to get Label : {}", id);
        return labelRepository.findOneWithEagerRelationships(id).map(labelMapper::toDto);
    }

    /**
     * Delete the label by id.
     *
     * @param id the id of the entity.
     */
    public void delete(Long id) {
        LOG.debug("Request to delete Label : {}", id);
        labelRepository.deleteById(id);
    }
}
