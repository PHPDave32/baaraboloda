package com.cratechnologie.baaraboloda.service.mapper;

import com.cratechnologie.baaraboloda.domain.Comment;
import com.cratechnologie.baaraboloda.domain.Task;
import com.cratechnologie.baaraboloda.domain.User;
import com.cratechnologie.baaraboloda.service.dto.CommentDTO;
import com.cratechnologie.baaraboloda.service.dto.TaskDTO;
import com.cratechnologie.baaraboloda.service.dto.UserDTO;
import org.mapstruct.*;

/**
 * Mapper for the entity {@link Comment} and its DTO {@link CommentDTO}.
 */
@Mapper(componentModel = "spring")
public interface CommentMapper extends EntityMapper<CommentDTO, Comment> {
    @Mapping(target = "author", source = "author", qualifiedByName = "userLogin")
    @Mapping(target = "task", source = "task", qualifiedByName = "taskTitle")
    CommentDTO toDto(Comment s);

    @Named("userLogin")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "login", source = "login")
    @Mapping(target = "imageUrl", source = "imageUrl")
    UserDTO toDtoUserLogin(User user);

    @Named("taskTitle")
    @BeanMapping(ignoreByDefault = true)
    @Mapping(target = "id", source = "id")
    @Mapping(target = "title", source = "title")
    TaskDTO toDtoTaskTitle(Task task);
}
