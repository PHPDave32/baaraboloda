package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Sprint;
import com.cratechnologie.baaraboloda.domain.Task;
import com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus;
import com.cratechnologie.baaraboloda.repository.CommentRepository;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.service.dto.TaskDTO;
import com.cratechnologie.baaraboloda.service.mapper.TaskMapper;
import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Implementation for managing {@link com.cratechnologie.baaraboloda.domain.Task}.
 */
@Service
@Transactional
public class TaskService {

    private static final Logger LOG = LoggerFactory.getLogger(TaskService.class);

    private final TaskRepository taskRepository;

    private final TaskMapper taskMapper;

    private final CommentRepository commentRepository;

    private final SprintRepository sprintRepository;

    private final UserRepository userRepository;
    private final NotificationService notifications;

    public TaskService(
        TaskRepository taskRepository,
        TaskMapper taskMapper,
        CommentRepository commentRepository,
        SprintRepository sprintRepository,
        UserRepository userRepository,
        NotificationService notifications
    ) {
        this.taskRepository = taskRepository;
        this.taskMapper = taskMapper;
        this.commentRepository = commentRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
        this.notifications = notifications;
    }

    private void validateAssignee(Long userId, Long projectId) {
        if (userId != null && (projectId == null || !userRepository.isMemberOfProject(userId, projectId))) {
            throw new com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException(
                "La personne assignée doit appartenir au projet de la tâche.",
                "task",
                "assigneenotmember"
            );
        }
    }

    private Sprint resolveTargetSprint(Long sprintId, Sprint currentSprint, Long projectId) {
        if (sprintId == null) return null;
        Sprint sprint = sprintRepository
            .findById(sprintId)
            .orElseThrow(() -> new BadRequestAlertException("Sprint introuvable.", "task", "sprintnotfound"));
        if (projectId == null || sprint.getProject() == null || !projectId.equals(sprint.getProject().getId())) {
            throw new BadRequestAlertException("Le sprint doit appartenir au même projet que la tâche.", "task", "sprintprojectmismatch");
        }
        if (sprint.getStatus() == SprintStatus.COMPLETED && (currentSprint == null || !sprintId.equals(currentSprint.getId()))) {
            throw new BadRequestAlertException("Impossible d’ajouter une tâche à un sprint terminé.", "task", "sprintcompleted");
        }
        return sprint;
    }

    public TaskDTO assign(Long taskId, Long userId) {
        LOG.debug("Request to assign Task {} to user {}", taskId, userId);
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found: " + taskId));
        Long previousAssignee = task.getAssignee() == null ? null : task.getAssignee().getId();
        validateAssignee(userId, task.getProject().getId());
        if (userId != null) {
            task.setAssignee(userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found: " + userId)));
        } else {
            task.setAssignee(null);
        }
        task = taskRepository.save(task);
        notifications.taskUpdated(task);
        notifications.assignment(task, previousAssignee);
        return taskMapper.toDto(task);
    }

    /**
     * Save a task.
     *
     * @param taskDTO the entity to save.
     * @return the persisted entity.
     */
    public TaskDTO save(TaskDTO taskDTO) {
        validateAssignee(
            taskDTO.getAssignee() == null ? null : taskDTO.getAssignee().getId(),
            taskDTO.getProject() == null ? null : taskDTO.getProject().getId()
        );
        ImageAttachmentValidator.validate(taskDTO.getImages(), true);
        LOG.debug("Request to save Task : {}", taskDTO);
        Sprint targetSprint = resolveTargetSprint(
            taskDTO.getSprint() == null ? null : taskDTO.getSprint().getId(),
            null,
            taskDTO.getProject() == null ? null : taskDTO.getProject().getId()
        );
        Task task = taskMapper.toEntity(taskDTO);
        task.setSprint(targetSprint);
        task.setCreatedAt(java.time.Instant.now());
        task = taskRepository.save(task);
        notifications.taskCreated(task);
        notifications.assignment(task, null);
        return taskMapper.toDto(task);
    }

    /**
     * Update a task.
     *
     * @param taskDTO the entity to save.
     * @return the persisted entity.
     */
    public TaskDTO update(TaskDTO taskDTO) {
        validateAssignee(
            taskDTO.getAssignee() == null ? null : taskDTO.getAssignee().getId(),
            taskDTO.getProject() == null ? null : taskDTO.getProject().getId()
        );
        ImageAttachmentValidator.validate(taskDTO.getImages(), true);
        LOG.debug("Request to update Task : {}", taskDTO);
        Task original = taskRepository.findById(taskDTO.getId()).orElseThrow();
        Long previousAssignee = original.getAssignee() == null ? null : original.getAssignee().getId();
        var previousStatus = original.getStatus();
        Sprint targetSprint = resolveTargetSprint(
            taskDTO.getSprint() == null ? null : taskDTO.getSprint().getId(),
            original.getSprint(),
            original.getProject().getId()
        );
        Task task = taskMapper.toEntity(taskDTO);
        task.setUuid(original.getUuid());
        task.setSprint(targetSprint);
        task.setCreatedAt(original.getCreatedAt());
        task = taskRepository.save(task);
        notifications.taskUpdated(task);
        notifications.assignment(task, previousAssignee);
        notifications.status(task, previousStatus);
        return taskMapper.toDto(task);
    }

    /**
     * Déplace une tâche vers un sprint ou vers le backlog.
     * Charge le sprint via le repository pour éviter l'erreur Hibernate
     * "Identifier of an instance was altered".
     *
     * @param taskId   l'id de la tâche à déplacer
     * @param sprintId l'id du sprint cible, ou null pour déplacer au backlog
     * @return la tâche mise à jour
     */
    public TaskDTO moveToSprint(Long taskId, Long sprintId) {
        LOG.debug("Request to move Task {} to Sprint {}", taskId, sprintId);
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        if (sprintId != null) {
            task.setSprint(resolveTargetSprint(sprintId, task.getSprint(), task.getProject().getId()));
        } else {
            task.setSprint(null);
        }

        Task saved = taskRepository.save(task);
        notifications.taskUpdated(saved);
        return taskMapper.toDto(saved);
    }

    public TaskDTO copyToSprint(Long taskId, Long targetSprintId) {
        LOG.debug("Request to copy Task {} to Sprint {}", taskId, targetSprintId);
        Task source = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        Sprint targetSprint = resolveTargetSprint(targetSprintId, null, source.getProject().getId());

        Task copy = new Task();
        copy.setTitle(source.getTitle());
        copy.setDescription(source.getDescription());
        copy.setStatus(com.cratechnologie.baaraboloda.domain.enumeration.TaskStatus.TODO);
        copy.setPriority(source.getPriority());
        copy.setType(source.getType());
        copy.setStoryPoints(source.getStoryPoints());
        copy.setDueDate(source.getDueDate());
        copy.setPosition(source.getPosition());
        copy.setCreatedAt(java.time.Instant.now());
        copy.setUpdatedAt(java.time.Instant.now());
        copy.setAssignee(source.getAssignee());
        copy.setReporter(source.getReporter());
        copy.setProject(source.getProject());
        copy.setSprint(targetSprint);

        Task saved = taskRepository.save(copy);
        notifications.taskCreated(saved);
        notifications.assignment(saved, null);
        return taskMapper.toDto(saved);
    }

    /**
     * Partially update a task.
     * Gère manuellement le changement de sprint pour éviter l'erreur Hibernate
     * "Identifier of an instance was altered" causée par MapStruct qui tente
     * de modifier l'identifiant de l'objet Sprint géré par la session Hibernate.
     */
    public Optional<TaskDTO> partialUpdate(TaskDTO taskDTO) {
        ImageAttachmentValidator.validate(taskDTO.getImages(), true);
        LOG.debug("Request to partially update Task : {}", taskDTO);

        // Sauvegarder le sprint du DTO avant de le passer à MapStruct
        final com.cratechnologie.baaraboloda.service.dto.SprintDTO incomingSprintDTO = taskDTO.getSprint();
        final boolean hasSprint = incomingSprintDTO != null;

        // Retirer le sprint du DTO pour que MapStruct ne touche pas à l'entité Sprint attachée
        taskDTO.setSprint(null);

        return taskRepository
            .findById(taskDTO.getId())
            .map(existingTask -> {
                Long previousAssignee = existingTask.getAssignee() == null ? null : existingTask.getAssignee().getId();
                var previousStatus = existingTask.getStatus();
                validateAssignee(taskDTO.getAssignee() == null ? null : taskDTO.getAssignee().getId(), existingTask.getProject().getId());
                Sprint targetSprint =
                    hasSprint && incomingSprintDTO.getId() != null
                        ? resolveTargetSprint(incomingSprintDTO.getId(), existingTask.getSprint(), existingTask.getProject().getId())
                        : existingTask.getSprint();
                // MapStruct applique tous les champs sauf sprint (qui est null maintenant)
                taskMapper.partialUpdate(existingTask, taskDTO);

                // Gérer le sprint manuellement :
                // - Si le DTO avait un sprint avec un id → charger le sprint via repo
                // - Si le DTO avait sprint: null explicitement → déplacer au backlog
                // NullValuePropertyMappingStrategy.IGNORE dans MapStruct ne permet pas
                // de distinguer "non envoyé" de "null", donc on gère ici via le DTO original
                if (hasSprint && incomingSprintDTO.getId() != null) {
                    existingTask.setSprint(targetSprint);
                }
                // Si sprint était absent du DTO (null), MapStruct l'ignore — comportement voulu

                notifications.taskUpdated(existingTask);
                notifications.assignment(existingTask, previousAssignee);
                notifications.status(existingTask, previousStatus);
                return existingTask;
            })
            .map(taskRepository::save)
            .map(taskMapper::toDto);
    }

    /**
     * Get all the tasks with eager load of many-to-many relationships.
     *
     * @return the list of entities.
     */
    public Page<TaskDTO> findAllWithEagerRelationships(Pageable pageable) {
        return taskRepository.findAllWithEagerRelationships(pageable).map(taskMapper::toDto);
    }

    /**
     * Get one task by id.
     *
     * @param id the id of the entity.
     * @return the entity.
     */
    @Transactional(readOnly = true)
    public Optional<TaskDTO> findOne(Long id) {
        LOG.debug("Request to get Task : {}", id);
        return taskRepository.findOneWithEagerRelationships(id).map(taskMapper::toDto);
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> findByProjectId(Long projectId) {
        return taskRepository.findAllByProject_IdOrderByPositionAsc(projectId).stream().map(taskMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> findBacklogByProjectId(Long projectId) {
        return taskRepository.findAllByProject_IdAndSprintIsNullOrderByPositionAsc(projectId).stream().map(taskMapper::toDto).toList();
    }

    @Transactional(readOnly = true)
    public List<TaskDTO> findBySprintId(Long sprintId) {
        return taskRepository.findAllBySprint_IdOrderByPositionAsc(sprintId).stream().map(taskMapper::toDto).toList();
    }

    /**
     * Delete the task by id.
     * Supprime d'abord les commentaires liés pour éviter la contrainte FK.
     *
     * @param id the id of the entity.
     */
    public void delete(Long id) {
        LOG.debug("Request to delete Task : {}", id);
        taskRepository.findById(id).ifPresent(notifications::taskDeleted);
        commentRepository.deleteByTaskId(id);
        taskRepository.deleteById(id);
    }
}
