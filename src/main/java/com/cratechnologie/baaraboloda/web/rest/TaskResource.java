package com.cratechnologie.baaraboloda.web.rest;

import com.cratechnologie.baaraboloda.repository.TaskRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.security.SecurityUtils;
import com.cratechnologie.baaraboloda.service.ProjectSecurityService;
import com.cratechnologie.baaraboloda.service.TaskQueryService;
import com.cratechnologie.baaraboloda.service.TaskService;
import com.cratechnologie.baaraboloda.service.criteria.TaskCriteria;
import com.cratechnologie.baaraboloda.service.dto.TaskDTO;
import com.cratechnologie.baaraboloda.service.dto.UserDTO;
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
 * REST controller for managing {@link com.cratechnologie.baaraboloda.domain.Task}.
 */
@RestController
@RequestMapping("/api/tasks")
public class TaskResource {

    private static final Logger LOG = LoggerFactory.getLogger(TaskResource.class);

    private static final String ENTITY_NAME = "task";

    @Value("${jhipster.clientApp.name:baaraBoloda}")
    private String applicationName;

    private final TaskService taskService;

    private final TaskRepository taskRepository;

    private final TaskQueryService taskQueryService;

    private final UserRepository userRepository;

    private final ProjectSecurityService projectSecurityService;

    public TaskResource(
        TaskService taskService,
        TaskRepository taskRepository,
        TaskQueryService taskQueryService,
        UserRepository userRepository,
        ProjectSecurityService projectSecurityService
    ) {
        this.taskService = taskService;
        this.taskRepository = taskRepository;
        this.taskQueryService = taskQueryService;
        this.userRepository = userRepository;
        this.projectSecurityService = projectSecurityService;
    }

    /**
     * {@code POST  /tasks} : Create a new task.
     *
     * @param taskDTO the taskDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new taskDTO, or with status {@code 400 (Bad Request)} if the task already has an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    public ResponseEntity<TaskDTO> createTask(@Valid @RequestBody TaskDTO taskDTO) throws URISyntaxException {
        LOG.debug("REST request to save Task : {}", taskDTO);
        if (taskDTO.getId() != null) {
            throw new BadRequestAlertException("A new task cannot already have an ID", ENTITY_NAME, "idexists");
        }
        if (taskDTO.getReporter() == null || taskDTO.getReporter().getId() == null) {
            taskDTO.setReporter(
                SecurityUtils.getCurrentUserLogin()
                    .flatMap(userRepository::findOneByLogin)
                    .map(UserDTO::new)
                    .orElseThrow(() -> new BadRequestAlertException("Current user not found", ENTITY_NAME, "currentusernotfound"))
            );
        }
        taskDTO = taskService.save(taskDTO);
        return ResponseEntity.created(new URI("/api/tasks/" + taskDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, taskDTO.getId().toString()))
            .body(taskDTO);
    }

    /**
     * {@code PUT  /tasks/:id} : Updates an existing task.
     *
     * @param id the id of the taskDTO to save.
     * @param taskDTO the taskDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated taskDTO,
     * or with status {@code 400 (Bad Request)} if the taskDTO is not valid,
     * or with status {@code 500 (Internal Server Error)} if the taskDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    public ResponseEntity<TaskDTO> updateTask(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody TaskDTO taskDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update Task : {}, {}", id, taskDTO);
        if (taskDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, taskDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!taskRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        projectSecurityService.checkCanModifyTask(id);

        taskDTO = taskService.update(taskDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, taskDTO.getId().toString()))
            .body(taskDTO);
    }

    /**
     * {@code PATCH  /tasks/:id} : Partial updates given fields of an existing task, field will ignore if it is null
     *
     * @param id the id of the taskDTO to save.
     * @param taskDTO the taskDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated taskDTO,
     * or with status {@code 400 (Bad Request)} if the taskDTO is not valid,
     * or with status {@code 404 (Not Found)} if the taskDTO is not found,
     * or with status {@code 500 (Internal Server Error)} if the taskDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    public ResponseEntity<TaskDTO> partialUpdateTask(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody TaskDTO taskDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partially update Task : {}, {}", id, taskDTO);
        if (taskDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, taskDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!taskRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        projectSecurityService.checkCanModifyTask(id);

        Optional<TaskDTO> result = taskService.partialUpdate(taskDTO);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, taskDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /tasks} : get all the Tasks.
     *
     * @param pageable the pagination information.
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of Tasks in body.
     */
    @GetMapping("")
    public ResponseEntity<List<TaskDTO>> getAllTasks(
        TaskCriteria criteria,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Tasks by criteria: {}", criteria);

        Page<TaskDTO> page = taskQueryService.findByCriteria(criteria, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    @GetMapping("/projects/{projectId}/tasks")
    public ResponseEntity<List<TaskDTO>> getTasksByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(taskService.findByProjectId(projectId));
    }

    @GetMapping("/projects/{projectId}/backlog")
    public ResponseEntity<List<TaskDTO>> getBacklog(@PathVariable Long projectId) {
        return ResponseEntity.ok(taskService.findBacklogByProjectId(projectId));
    }

    @GetMapping("/sprints/{sprintId}/tasks")
    public ResponseEntity<List<TaskDTO>> getTasksBySprint(@PathVariable Long sprintId) {
        return ResponseEntity.ok(taskService.findBySprintId(sprintId));
    }

    /**
     * {@code PATCH /tasks/:id/sprint} : Déplace une tâche vers un sprint ou vers le backlog.
     * Accepte un body JSON : {"sprintId": 1503} pour déplacer vers un sprint,
     * ou {"sprintId": null} pour déplacer vers le backlog.
     */
    @PatchMapping("/{id}/sprint")
    public ResponseEntity<TaskDTO> moveTaskToSprint(@PathVariable Long id, @RequestBody java.util.Map<String, Long> body) {
        LOG.debug("REST request to move Task {} to sprint {}", id, body.get("sprintId"));
        if (!taskRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }
        projectSecurityService.checkCanModifyTask(id);
        Long sprintId = body.get("sprintId");
        TaskDTO result = taskService.moveToSprint(id, sprintId);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/{id}/copy-to-sprint")
    public ResponseEntity<TaskDTO> copyTaskToSprint(@PathVariable Long id, @RequestBody java.util.Map<String, Long> body) {
        LOG.debug("REST request to copy Task {} to sprint {}", id, body.get("sprintId"));
        if (!taskRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }
        Long sprintId = body.get("sprintId");
        if (sprintId == null) {
            throw new BadRequestAlertException("Target sprint is required", ENTITY_NAME, "sprintnull");
        }
        projectSecurityService.checkCanModifyTask(id);
        TaskDTO result = taskService.copyToSprint(id, sprintId);
        return ResponseEntity.ok(result);
    }

    @PatchMapping("/{id}/assignee")
    public ResponseEntity<TaskDTO> assignTask(@PathVariable Long id, @RequestBody java.util.Map<String, Long> body) {
        LOG.debug("REST request to assign Task {} to user {}", id, body.get("userId"));
        if (!taskRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }
        projectSecurityService.checkCanModifyTask(id);
        TaskDTO result = taskService.assign(id, body.get("userId"));
        return ResponseEntity.ok(result);
    }

    /**
     * {@code GET  /tasks/count} : count all the tasks.
     *
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the count in body.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> countTasks(TaskCriteria criteria) {
        LOG.debug("REST request to count Tasks by criteria: {}", criteria);
        return ResponseEntity.ok().body(taskQueryService.countByCriteria(criteria));
    }

    /**
     * {@code GET  /tasks/:id} : get the "id" task.
     *
     * @param id the id of the taskDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the taskDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<TaskDTO> getTask(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Task : {}", id);
        Optional<TaskDTO> taskDTO = taskService.findOne(id);
        return ResponseUtil.wrapOrNotFound(taskDTO);
    }

    /**
     * {@code DELETE  /tasks/:id} : delete the "id" task.
     *
     * @param id the id of the taskDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTask(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Task : {}", id);
        projectSecurityService.checkCanModifyTask(id);
        taskService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }
}
