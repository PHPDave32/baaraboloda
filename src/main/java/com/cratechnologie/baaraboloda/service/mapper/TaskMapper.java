package com.cratechnologie.baaraboloda.service.mapper;

import com.cratechnologie.baaraboloda.domain.Project;
import com.cratechnologie.baaraboloda.domain.Sprint;
import com.cratechnologie.baaraboloda.domain.Task;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.service.dto.ProjectDTO;
import com.cratechnologie.baaraboloda.service.dto.SprintDTO;
import com.cratechnologie.baaraboloda.service.dto.TaskDTO;
import com.cratechnologie.baaraboloda.service.dto.UserDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Task} and its DTO {@link TaskDTO}.
 */
@Mapper(componentModel = "spring")
public interface TaskMapper extends EntityMapper<TaskDTO, Task> {
    @Mapping(target = "uuid", ignore = true)
    Task toEntity(TaskDTO dto);

    @Mapping(target = "uuid", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void partialUpdate(@MappingTarget Task entity, TaskDTO dto);

    @Mapping(target = "assignee", source = "assignee", qualifiedByName = "userLogin")
    @Mapping(target = "reporter", source = "reporter", qualifiedByName = "userLogin")
    @Mapping(target = "project", source = "project", qualifiedByName = "projectName")
    @Mapping(target = "sprint", source = "sprint", qualifiedByName = "sprintName")
    TaskDTO toDto(Task s);

    @Named("userLogin")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "login", source = "login")
    @Mapping(target = "imageUrl", source = "imageUrl")
    UserDTO toDtoUserLogin(User user);

    @Named("projectName")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "uuid", source = "uuid")
    @Mapping(target = "name", source = "name")
    ProjectDTO toDtoProjectName(Project project);

    @Named("sprintName")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "uuid", source = "uuid")
    @Mapping(target = "name", source = "name")
    SprintDTO toDtoSprintName(Sprint sprint);
}
