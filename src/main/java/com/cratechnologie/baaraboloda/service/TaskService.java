package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Task;
import com.cratechnologie.baaraboloda.repository.CommentRepository;
import com.cratechnologie.baaraboloda.repository.SprintRepository;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.service.dto.TaskDTO;
import com.cratechnologie.baaraboloda.service.mapper.TaskMapper;
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

    public TaskService(
        TaskRepository taskRepository,
        TaskMapper taskMapper,
        CommentRepository commentRepository,
        SprintRepository sprintRepository,
        UserRepository userRepository
    ) {
        this.taskRepository = taskRepository;
        this.taskMapper = taskMapper;
        this.commentRepository = commentRepository;
        this.sprintRepository = sprintRepository;
        this.userRepository = userRepository;
    }

    public TaskDTO assign(Long taskId, Long userId) {
        LOG.debug("Request to assign Task {} to user {}", taskId, userId);
        Task task = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found: " + taskId));
        if (userId != null) {
            task.setAssignee(userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found: " + userId)));
        } else {
            task.setAssignee(null);
        }
        return taskMapper.toDto(taskRepository.save(task));
    }

    /**
     * Save a task.
     *
     * @param taskDTO the entity to save.
     * @return the persisted entity.
     */
    public TaskDTO save(TaskDTO taskDTO) {
        LOG.debug("Request to save Task : {}", taskDTO);
        Task task = taskMapper.toEntity(taskDTO);
        task = taskRepository.save(task);
        return taskMapper.toDto(task);
    }

    /**
     * Update a task.
     *
     * @param taskDTO the entity to save.
     * @return the persisted entity.
     */
    public TaskDTO update(TaskDTO taskDTO) {
        LOG.debug("Request to update Task : {}", taskDTO);
        Task task = taskMapper.toEntity(taskDTO);
        task = taskRepository.save(task);
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
            task.setSprint(sprintRepository.findById(sprintId).orElseThrow(() -> new RuntimeException("Sprint not found: " + sprintId)));
        } else {
            task.setSprint(null);
        }

        return taskMapper.toDto(taskRepository.save(task));
    }

    public TaskDTO copyToSprint(Long taskId, Long targetSprintId) {
        LOG.debug("Request to copy Task {} to Sprint {}", taskId, targetSprintId);
        Task source = taskRepository.findById(taskId).orElseThrow(() -> new RuntimeException("Task not found: " + taskId));

        com.cratechnologie.baaraboloda.domain.Sprint targetSprint = sprintRepository
            .findById(targetSprintId)
            .orElseThrow(() -> new RuntimeException("Sprint not found: " + targetSprintId));

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

        return taskMapper.toDto(taskRepository.save(copy));
    }

    /**
     * Partially update a task.
     * Gère manuellement le changement de sprint pour éviter l'erreur Hibernate
     * "Identifier of an instance was altered" causée par MapStruct qui tente
     * de modifier l'identifiant de l'objet Sprint géré par la session Hibernate.
     */
    public Optional<TaskDTO> partialUpdate(TaskDTO taskDTO) {
        LOG.debug("Request to partially update Task : {}", taskDTO);

        // Sauvegarder le sprint du DTO avant de le passer à MapStruct
        final com.cratechnologie.baaraboloda.service.dto.SprintDTO incomingSprintDTO = taskDTO.getSprint();
        final boolean hasSprint = incomingSprintDTO != null;

        // Retirer le sprint du DTO pour que MapStruct ne touche pas à l'entité Sprint attachée
        taskDTO.setSprint(null);

        return taskRepository
            .findById(taskDTO.getId())
            .map(existingTask -> {
                // MapStruct applique tous les champs sauf sprint (qui est null maintenant)
                taskMapper.partialUpdate(existingTask, taskDTO);

                // Gérer le sprint manuellement :
                // - Si le DTO avait un sprint avec un id → charger le sprint via repo
                // - Si le DTO avait sprint: null explicitement → déplacer au backlog
                // NullValuePropertyMappingStrategy.IGNORE dans MapStruct ne permet pas
                // de distinguer "non envoyé" de "null", donc on gère ici via le DTO original
                if (hasSprint && incomingSprintDTO.getId() != null) {
                    sprintRepository.findById(incomingSprintDTO.getId()).ifPresent(existingTask::setSprint);
                }
                // Si sprint était absent du DTO (null), MapStruct l'ignore — comportement voulu

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
        commentRepository.deleteByTaskId(id);
        taskRepository.deleteById(id);
    }
}
