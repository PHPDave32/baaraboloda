package com.cratechnologie.baaraboloda.web.rest;

import com.cratechnologie.baaraboloda.repository.LabelRepository;
import com.cratechnologie.baaraboloda.service.LabelQueryService;
import com.cratechnologie.baaraboloda.service.LabelService;
import com.cratechnologie.baaraboloda.service.criteria.LabelCriteria;
import com.cratechnologie.baaraboloda.service.dto.LabelDTO;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * REST controller for managing {@link com.cratechnologie.baaraboloda.domain.Label}.
 */
@RestController
@RequestMapping("/api/labels")
public class LabelResource {

    private static final Logger LOG = LoggerFactory.getLogger(LabelResource.class);

    private static final String ENTITY_NAME = "label";

    @Value("${jhipster.clientApp.name:baaraBoloda}")
    private String applicationName;

    private final LabelService labelService;

    private final LabelRepository labelRepository;

    private final LabelQueryService labelQueryService;

    public LabelResource(LabelService labelService, LabelRepository labelRepository, LabelQueryService labelQueryService) {
        this.labelService = labelService;
        this.labelRepository = labelRepository;
        this.labelQueryService = labelQueryService;
    }

    /**
     * {@code POST  /labels} : Create a new label.
     *
     * @param labelDTO the labelDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new labelDTO, or with status {@code 400 (Bad Request)} if the label already has an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<LabelDTO> createLabel(@Valid @RequestBody LabelDTO labelDTO) throws URISyntaxException {
        LOG.debug("REST request to save Label : {}", labelDTO);
        if (labelDTO.getId() != null) {
            throw new BadRequestAlertException("A new label cannot already have an ID", ENTITY_NAME, "idexists");
        }
        labelDTO = labelService.save(labelDTO);
        return ResponseEntity.created(new URI("/api/labels/" + labelDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, labelDTO.getId().toString()))
            .body(labelDTO);
    }

    /**
     * {@code PUT  /labels/:id} : Updates an existing label.
     *
     * @param id the id of the labelDTO to save.
     * @param labelDTO the labelDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated labelDTO,
     * or with status {@code 400 (Bad Request)} if the labelDTO is not valid,
     * or with status {@code 500 (Internal Server Error)} if the labelDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<LabelDTO> updateLabel(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody LabelDTO labelDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update Label : {}, {}", id, labelDTO);
        if (labelDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, labelDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!labelRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        labelDTO = labelService.update(labelDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, labelDTO.getId().toString()))
            .body(labelDTO);
    }

    /**
     * {@code PATCH  /labels/:id} : Partial updates given fields of an existing label, field will ignore if it is null
     *
     * @param id the id of the labelDTO to save.
     * @param labelDTO the labelDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated labelDTO,
     * or with status {@code 400 (Bad Request)} if the labelDTO is not valid,
     * or with status {@code 404 (Not Found)} if the labelDTO is not found,
     * or with status {@code 500 (Internal Server Error)} if the labelDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<LabelDTO> partialUpdateLabel(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody LabelDTO labelDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partially update Label : {}, {}", id, labelDTO);
        if (labelDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, labelDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!labelRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<LabelDTO> result = labelService.partialUpdate(labelDTO);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, labelDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /labels} : get all the Labels.
     *
     * @param pageable the pagination information.
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of Labels in body.
     */
    @GetMapping("")
    public ResponseEntity<List<LabelDTO>> getAllLabels(
        LabelCriteria criteria,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Labels by criteria: {}", criteria);

        Page<LabelDTO> page = labelQueryService.findByCriteria(criteria, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /labels/count} : count all the labels.
     *
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the count in body.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> countLabels(LabelCriteria criteria) {
        LOG.debug("REST request to count Labels by criteria: {}", criteria);
        return ResponseEntity.ok().body(labelQueryService.countByCriteria(criteria));
    }

    /**
     * {@code GET  /labels/:id} : get the "id" label.
     *
     * @param id the id of the labelDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the labelDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<LabelDTO> getLabel(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Label : {}", id);
        Optional<LabelDTO> labelDTO = labelService.findOne(id);
        return ResponseUtil.wrapOrNotFound(labelDTO);
    }

    /**
     * {@code DELETE  /labels/:id} : delete the "id" label.
     *
     * @param id the id of the labelDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLabel(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Label : {}", id);
        labelService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }
}
