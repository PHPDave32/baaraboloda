package com.cratechnologie.baaraboloda.web.rest.util;

import com.cratechnologie.baaraboloda.repository.*;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.MethodParameter;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerMapping;

@Component
public class PublicIdResolver implements HandlerMethodArgumentResolver {

    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final SprintRepository sprints;

    public PublicIdResolver(ProjectRepository projects, TaskRepository tasks, SprintRepository sprints) {
        this.projects = projects;
        this.tasks = tasks;
        this.sprints = sprints;
    }

    @Override
    public boolean supportsParameter(MethodParameter parameter) {
        return parameter.hasParameterAnnotation(PublicId.class);
    }

    @Override
    public Object resolveArgument(
        MethodParameter parameter,
        ModelAndViewContainer container,
        NativeWebRequest request,
        WebDataBinderFactory binder
    ) {
        PublicId annotation = parameter.getParameterAnnotation(PublicId.class);
        @SuppressWarnings("unchecked")
        Map<String, String> variables = (Map<String, String>) request.getAttribute(HandlerMapping.URI_TEMPLATE_VARIABLES_ATTRIBUTE, 0);
        return resolve(annotation.entity(), variables == null ? null : variables.get(annotation.name()));
    }

    public Long resolve(String entity, String identifier) {
        if (identifier == null) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        if (identifier.matches("[0-9]+")) {
            try {
                return Long.valueOf(identifier);
            } catch (NumberFormatException exception) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
        }
        try {
            if (!UUID.fromString(identifier).toString().equalsIgnoreCase(identifier)) throw new IllegalArgumentException();
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        String uuid = identifier.toLowerCase(java.util.Locale.ROOT);
        java.util.Optional<Long> id = switch (entity) {
            case "project" -> projects.findOneByUuid(uuid).map(com.cratechnologie.baaraboloda.domain.Project::getId);
            case "task" -> tasks.findOneByUuid(uuid).map(com.cratechnologie.baaraboloda.domain.Task::getId);
            case "sprint" -> sprints.findOneByUuid(uuid).map(com.cratechnologie.baaraboloda.domain.Sprint::getId);
            default -> throw new IllegalArgumentException("Unsupported public identifier type");
        };
        return id.orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
