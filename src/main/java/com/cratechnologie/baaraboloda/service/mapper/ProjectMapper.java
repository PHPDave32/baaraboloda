package com.cratechnologie.baaraboloda.service.mapper;

import com.cratechnologie.baaraboloda.domain.Project;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.service.dto.ProjectDTO;
import com.cratechnologie.baaraboloda.service.dto.UserDTO;
import java.util.Set;
import java.util.stream.Collectors;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Project} and its DTO {@link ProjectDTO}.
 */
@Mapper(componentModel = "spring")
public interface ProjectMapper extends EntityMapper<ProjectDTO, Project> {
    @Mapping(target = "uuid", ignore = true)
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "removeMembers", ignore = true)
    void partialUpdate(@MappingTarget Project entity, ProjectDTO dto);

    @Mapping(target = "owner", source = "owner", qualifiedByName = "userLogin")
    @Mapping(target = "memberses", source = "memberses", qualifiedByName = "userLoginSet")
    ProjectDTO toDto(Project s);

    @Mapping(target = "uuid", ignore = true)
    @Mapping(target = "removeMembers", ignore = true)
    @Mapping(target = "owner", ignore = true)
    @Mapping(target = "memberses", ignore = true)
    Project toEntity(ProjectDTO projectDTO);

    @Named("userLogin")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "login", source = "login")
    @Mapping(target = "imageUrl", source = "imageUrl")
    UserDTO toDtoUserLogin(User user);

    @Named("userLoginSet")
    default Set<UserDTO> toDtoUserLoginSet(Set<User> user) {
        return user.stream().map(this::toDtoUserLogin).collect(Collectors.toSet());
    }
}
