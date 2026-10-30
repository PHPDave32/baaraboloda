package com.cratechnologie.baaraboloda.service.mapper;

import static org.assertj.core.api.Assertions.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.domain.enumeration.*;
import com.cratechnologie.baaraboloda.service.dto.*;
import org.hibernate.cfg.Configuration;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

class UuidCreationPersistenceTest {

    @Test
    void createsSprintAndBacklogTaskUsingOnlyTheExistingProjectId() {
        var config = new Configuration();
        for (Class<?> type : new Class<?>[] {
            User.class,
            Authority.class,
            AccessProfile.class,
            Project.class,
            Sprint.class,
            Task.class,
            Label.class,
            Comment.class,
            ProjectDocument.class,
        })
            config.addAnnotatedClass(type);
        config.setProperty("hibernate.connection.url", "jdbc:h2:mem:uuid_creation;DB_CLOSE_DELAY=-1;NON_KEYWORDS=VALUE");
        config.setProperty("hibernate.connection.driver_class", "org.h2.Driver");
        config.setProperty("hibernate.hbm2ddl.auto", "create-drop");
        config.setProperty("hibernate.cache.use_second_level_cache", "false");
        config.setProperty("jakarta.persistence.validation.mode", "none");
        try (var factory = config.buildSessionFactory()) {
            Long projectId;
            Long ownerId;
            try (var session = factory.openSession()) {
                var transaction = session.beginTransaction();
                User owner = new User();
                owner.setLogin("uuid-test-owner");
                owner.setActivated(true);
                owner.setCreatedBy("system");
                owner.setPassword("0".repeat(60));
                session.persist(owner);
                ownerId = owner.getId();
                Project project = new Project();
                project.setName("UUID creation regression");
                project.setStatus(ProjectStatus.ACTIVE);
                project.setOwner(owner);
                session.persist(project);
                projectId = project.getId();
                transaction.commit();
            }
            try (var session = factory.openSession()) {
                var transaction = session.beginTransaction();
                ProjectDTO projectRef = new ProjectDTO();
                projectRef.setId(projectId);
                SprintDTO sprintDTO = new SprintDTO();
                sprintDTO.setName("Creation regression");
                sprintDTO.setStatus(SprintStatus.PLANNED);
                sprintDTO.setProject(projectRef);
                Sprint sprint = Mappers.getMapper(SprintMapper.class).toEntity(sprintDTO);
                session.persist(sprint);
                TaskDTO taskDTO = new TaskDTO();
                taskDTO.setTitle("Backlog regression");
                taskDTO.setStatus(TaskStatus.TODO);
                taskDTO.setPriority(TaskPriority.MEDIUM);
                taskDTO.setType(TaskType.TASK);
                taskDTO.setProject(projectRef);
                UserDTO reporter = new UserDTO();
                reporter.setId(ownerId);
                taskDTO.setReporter(reporter);
                Task task = Mappers.getMapper(TaskMapper.class).toEntity(taskDTO);
                session.persist(task);
                session.flush();
                assertThat(sprint.getId()).isNotNull();
                assertThat(task.getId()).isNotNull();
                transaction.commit();
            }
        }
    }
}
