package com.cratechnologie.baaraboloda.web.rest;

import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.repository.ProjectRepository;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.security.AuthoritiesConstants;
import com.cratechnologie.baaraboloda.security.SecurityUtils;
import com.cratechnologie.baaraboloda.service.ProjectQueryService;
import com.cratechnologie.baaraboloda.service.ProjectService;
import com.cratechnologie.baaraboloda.service.criteria.ProjectCriteria;
import com.cratechnologie.baaraboloda.service.dto.ProjectDTO;
import com.cratechnologie.baaraboloda.service.dto.UserDTO;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.net.URI;
import java.net.URISyntaxException;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.core.ClaimAccessor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tech.jhipster.service.filter.LongFilter;
import tech.jhipster.web.util.HeaderUtil;
import tech.jhipster.web.util.PaginationUtil;
import tech.jhipster.web.util.ResponseUtil;

/**
 * REST controller for managing {@link com.cratechnologie.baaraboloda.domain.Project}.
 */
@RestController
@RequestMapping("/api/projects")
public class ProjectResource {

    private static final Logger LOG = LoggerFactory.getLogger(ProjectResource.class);

    private static final String ENTITY_NAME = "project";

    @Value("${jhipster.clientApp.name:baaraBoloda}")
    private String applicationName;

    private final ProjectService projectService;

    private final ProjectRepository projectRepository;

    private final ProjectQueryService projectQueryService;

    private final UserRepository userRepository;

    private final TaskRepository taskRepository;

    private final SprintRepository sprintRepository;

    public ProjectResource(
        ProjectService projectService,
        ProjectRepository projectRepository,
        ProjectQueryService projectQueryService,
        UserRepository userRepository,
        TaskRepository taskRepository,
        SprintRepository sprintRepository
    ) {
        this.projectService = projectService;
        this.projectRepository = projectRepository;
        this.projectQueryService = projectQueryService;
        this.taskRepository = taskRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
    }

    /**
     * {@code POST  /projects} : Create a new project.
     *
     * @param projectDTO the projectDTO to create.
     * @return the {@link ResponseEntity} with status {@code 201 (Created)} and with body the new projectDTO, or with status {@code 400 (Bad Request)} if the project already has an ID.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PostMapping("")
    @PreAuthorize(
        "hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\") or hasAuthority(\"" + AuthoritiesConstants.PERM_PROJECT_CREATE + "\")"
    )
    public ResponseEntity<ProjectDTO> createProject(@Valid @RequestBody ProjectDTO projectDTO) throws URISyntaxException {
        LOG.debug("REST request to save Project : {}", projectDTO);
        if (projectDTO.getId() != null) {
            throw new BadRequestAlertException("A new project cannot already have an ID", ENTITY_NAME, "idexists");
        }
        if (projectDTO.getOwner() == null || projectDTO.getOwner().getId() == null) {
            projectDTO.setOwner(new UserDTO(resolveCurrentUser()));
        }
        UserDTO owner = projectDTO.getOwner();
        Set<UserDTO> members = projectDTO.getMemberses() != null ? projectDTO.getMemberses() : new HashSet<>();
        if (owner != null && owner.getId() != null && members.stream().noneMatch(member -> Objects.equals(member.getId(), owner.getId()))) {
            members.add(owner);
        }
        projectDTO.setMemberses(members);
        projectDTO = projectService.save(projectDTO);
        return ResponseEntity.created(new URI("/api/projects/" + projectDTO.getId()))
            .headers(HeaderUtil.createEntityCreationAlert(applicationName, true, ENTITY_NAME, projectDTO.getId().toString()))
            .body(projectDTO);
    }

    @PostMapping("/{id}/members/{userId}")
    @PreAuthorize(
        "hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\") or hasAuthority(\"" + AuthoritiesConstants.PERM_MANAGE_MEMBERS + "\")"
    )
    public ResponseEntity<ProjectDTO> addMember(@PathVariable Long id, @PathVariable Long userId) {
        ProjectDTO project = projectService
            .findOne(id)
            .orElseThrow(() -> new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound"));
        UserDTO user = userRepository
            .findById(userId)
            .map(UserDTO::new)
            .orElseThrow(() -> new BadRequestAlertException("User not found", "user", "usernotfound"));
        project.getMemberses().add(user);
        return ResponseEntity.ok(projectService.update(project));
    }

    @DeleteMapping("/{id}/members/{userId}")
    @PreAuthorize(
        "hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\") or hasAuthority(\"" + AuthoritiesConstants.PERM_MANAGE_MEMBERS + "\")"
    )
    public ResponseEntity<ProjectDTO> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        ProjectDTO project = projectService
            .findOne(id)
            .orElseThrow(() -> new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound"));
        project.getMemberses().removeIf(member -> Objects.equals(member.getId(), userId));
        return ResponseEntity.ok(projectService.update(project));
    }

    /**
     * {@code PUT  /projects/:id} : Updates an existing project.
     *
     * @param id the id of the projectDTO to save.
     * @param projectDTO the projectDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated projectDTO,
     * or with status {@code 400 (Bad Request)} if the projectDTO is not valid,
     * or with status {@code 500 (Internal Server Error)} if the projectDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PutMapping("/{id}")
    @PreAuthorize(
        "hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\") or hasAuthority(\"" + AuthoritiesConstants.PERM_PROJECT_CREATE + "\")"
    )
    public ResponseEntity<ProjectDTO> updateProject(
        @PathVariable(value = "id", required = false) final Long id,
        @Valid @RequestBody ProjectDTO projectDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to update Project : {}, {}", id, projectDTO);
        if (projectDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, projectDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!projectRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        projectDTO = projectService.update(projectDTO);
        return ResponseEntity.ok()
            .headers(HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, projectDTO.getId().toString()))
            .body(projectDTO);
    }

    /**
     * {@code PATCH  /projects/:id} : Partial updates given fields of an existing project, field will ignore if it is null
     *
     * @param id the id of the projectDTO to save.
     * @param projectDTO the projectDTO to update.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the updated projectDTO,
     * or with status {@code 400 (Bad Request)} if the projectDTO is not valid,
     * or with status {@code 404 (Not Found)} if the projectDTO is not found,
     * or with status {@code 500 (Internal Server Error)} if the projectDTO couldn't be updated.
     * @throws URISyntaxException if the Location URI syntax is incorrect.
     */
    @PatchMapping(value = "/{id}", consumes = { "application/json", "application/merge-patch+json" })
    @PreAuthorize(
        "hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\") or hasAuthority(\"" + AuthoritiesConstants.PERM_PROJECT_CREATE + "\")"
    )
    public ResponseEntity<ProjectDTO> partialUpdateProject(
        @PathVariable(value = "id", required = false) final Long id,
        @NotNull @RequestBody ProjectDTO projectDTO
    ) throws URISyntaxException {
        LOG.debug("REST request to partially update Project : {}, {}", id, projectDTO);
        if (projectDTO.getId() == null) {
            throw new BadRequestAlertException("Invalid id", ENTITY_NAME, "idnull");
        }
        if (!Objects.equals(id, projectDTO.getId())) {
            throw new BadRequestAlertException("Invalid ID", ENTITY_NAME, "idinvalid");
        }

        if (!projectRepository.existsById(id)) {
            throw new BadRequestAlertException("Entity not found", ENTITY_NAME, "idnotfound");
        }

        Optional<ProjectDTO> result = projectService.partialUpdate(projectDTO);

        return ResponseUtil.wrapOrNotFound(
            result,
            HeaderUtil.createEntityUpdateAlert(applicationName, true, ENTITY_NAME, projectDTO.getId().toString())
        );
    }

    /**
     * {@code GET  /projects} : get all the Projects.
     *
     * @param pageable the pagination information.
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the list of Projects in body.
     */
    @GetMapping("")
    public ResponseEntity<List<ProjectDTO>> getAllProjects(
        ProjectCriteria criteria,
        @org.springdoc.core.annotations.ParameterObject Pageable pageable
    ) {
        LOG.debug("REST request to get Projects by criteria: {}", criteria);

        // Un utilisateur non-admin ne voit que les projets dont il est membre ou propriétaire.
        if (!SecurityUtils.hasCurrentUserThisAuthority(AuthoritiesConstants.ADMIN)) {
            List<Long> accessibleIds = SecurityUtils.getCurrentUserLogin()
                .map(projectRepository::findAccessibleProjectIds)
                .orElseGet(List::of);

            if (accessibleIds.isEmpty()) {
                // Aucun projet accessible : renvoyer une page vide sans interroger la base.
                HttpHeaders emptyHeaders = PaginationUtil.generatePaginationHttpHeaders(
                    ServletUriComponentsBuilder.fromCurrentRequest(),
                    Page.empty(pageable)
                );
                return ResponseEntity.ok().headers(emptyHeaders).body(List.of());
            }

            LongFilter idFilter = new LongFilter();
            idFilter.setIn(accessibleIds);
            criteria.setId(idFilter);
        }

        Page<ProjectDTO> page = projectQueryService.findByCriteria(criteria, pageable);
        HttpHeaders headers = PaginationUtil.generatePaginationHttpHeaders(ServletUriComponentsBuilder.fromCurrentRequest(), page);
        return ResponseEntity.ok().headers(headers).body(page.getContent());
    }

    /**
     * {@code GET  /projects/count} : count all the projects.
     *
     * @param criteria the criteria which the requested entities should match.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and the count in body.
     */
    @GetMapping("/count")
    public ResponseEntity<Long> countProjects(ProjectCriteria criteria) {
        LOG.debug("REST request to count Projects by criteria: {}", criteria);
        return ResponseEntity.ok().body(projectQueryService.countByCriteria(criteria));
    }

    /**
     * {@code GET  /projects/:id} : get the "id" project.
     *
     * @param id the id of the projectDTO to retrieve.
     * @return the {@link ResponseEntity} with status {@code 200 (OK)} and with body the projectDTO, or with status {@code 404 (Not Found)}.
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProjectDTO> getProject(@PathVariable("id") Long id) {
        LOG.debug("REST request to get Project : {}", id);
        Optional<ProjectDTO> projectDTO = projectService.findOne(id);
        return ResponseUtil.wrapOrNotFound(projectDTO);
    }

    /**
     * {@code DELETE  /projects/:id} : delete the "id" project.
     *
     * @param id the id of the projectDTO to delete.
     * @return the {@link ResponseEntity} with status {@code 204 (NO_CONTENT)}.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize(
        "hasAuthority(\"" + AuthoritiesConstants.ADMIN + "\") or hasAuthority(\"" + AuthoritiesConstants.PERM_PROJECT_DELETE + "\")"
    )
    public ResponseEntity<Void> deleteProject(@PathVariable("id") Long id) {
        LOG.debug("REST request to delete Project : {}", id);
        if (taskRepository.existsByProject_Id(id) || sprintRepository.existsByProject_Id(id)) {
            throw new BadRequestAlertException(
                "Ce projet contient encore des tâches ou des sprints. Videz-le avant de le supprimer.",
                ENTITY_NAME,
                "projecthaschildren"
            );
        }
        projectService.delete(id);
        return ResponseEntity.noContent()
            .headers(HeaderUtil.createEntityDeletionAlert(applicationName, true, ENTITY_NAME, id.toString()))
            .build();
    }

    private User resolveCurrentUser() {
        var authentication = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof ClaimAccessor claims) {
            Object idClaim = claims.getClaim(SecurityUtils.USER_ID_CLAIM);
            if (idClaim instanceof Number number) {
                Optional<User> owner = userRepository.findById(number.longValue());
                if (owner.isPresent()) {
                    return owner.get();
                }
            }
        }
        return SecurityUtils.getCurrentUserLogin()
            .map(login -> login.toLowerCase(Locale.ENGLISH))
            .flatMap(userRepository::findOneByLogin)
            .or(() -> SecurityUtils.getCurrentUserLogin().flatMap(userRepository::findOneByEmailIgnoreCase))
            .orElseThrow(() -> new BadRequestAlertException("Current user not found", ENTITY_NAME, "currentusernotfound"));
    }
}
