package com.cratechnologie.baaraboloda.security;

import com.cratechnologie.baaraboloda.domain.Project;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

public final class ProjectScope {

    private ProjectScope() {}

    public static <T> Specification<T> visible(String... path) {
        return (root, query, builder) -> {
            if (
                SecurityUtils.hasCurrentUserAnyOfAuthorities("ROLE_SUPER_ADMIN", "ROLE_ADMIN", "PERM_PROJECT_VIEW_ALL")
            ) return builder.conjunction();
            String login = SecurityUtils.getCurrentUserLogin().orElse("");
            var allowed = query.subquery(Long.class);
            var project = allowed.from(Project.class);
            var member = project.join("memberses", JoinType.LEFT);
            allowed
                .select(project.get("id"))
                .where(builder.or(builder.equal(project.get("owner").get("login"), login), builder.equal(member.get("login"), login)));
            jakarta.persistence.criteria.Path<?> target = root;
            for (String segment : path) target = target.get(segment);
            return target.get("id").in(allowed);
        };
    }
}
