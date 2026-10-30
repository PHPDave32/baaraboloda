package com.cratechnologie.baaraboloda.service.mapper;

import com.cratechnologie.baaraboloda.domain.Label;
import com.cratechnologie.baaraboloda.domain.Project;
import com.cratechnologie.baaraboloda.service.dto.LabelDTO;
import com.cratechnologie.baaraboloda.service.dto.ProjectDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Label} and its DTO {@link LabelDTO}.
 */
@Mapper(componentModel = "spring")
public interface LabelMapper extends EntityMapper<LabelDTO, Label> {
    @Mapping(target = "project", source = "project", qualifiedByName = "projectName")
    LabelDTO toDto(Label s);

    @Named("projectName")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "uuid", source = "uuid")
    @Mapping(target = "name", source = "name")
    ProjectDTO toDtoProjectName(Project project);
}
