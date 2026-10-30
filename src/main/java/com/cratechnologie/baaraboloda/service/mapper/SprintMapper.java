package com.cratechnologie.baaraboloda.service.mapper;

import com.cratechnologie.baaraboloda.domain.Project;
import com.cratechnologie.baaraboloda.domain.Sprint;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.service.dto.ProjectDTO;
import com.cratechnologie.baaraboloda.service.dto.SprintDTO;
import com.cratechnologie.baaraboloda.service.dto.UserDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Sprint} and its DTO {@link SprintDTO}.
 */
@Mapper(componentModel = "spring")
public interface SprintMapper extends EntityMapper<SprintDTO, Sprint> {
    @Mapping(target = "uuid", ignore = true)
    Sprint toEntity(SprintDTO dto);

    @Mapping(target = "uuid", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    void partialUpdate(@MappingTarget Sprint entity, SprintDTO dto);

    @Mapping(target = "createdBy", source = "createdBy", qualifiedByName = "userLogin")
    @Mapping(target = "project", source = "project", qualifiedByName = "projectName")
    SprintDTO toDto(Sprint s);

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
}
