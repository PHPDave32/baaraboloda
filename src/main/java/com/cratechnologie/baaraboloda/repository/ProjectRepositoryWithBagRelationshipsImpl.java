package com.cratechnologie.baaraboloda.repository;

import com.cratechnologie.baaraboloda.domain.Project;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.HashMap;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;

/**
 * Utility repository to load bag relationships based on https://vladmihalcea.com/hibernate-multiplebagfetchexception/
 */
public class ProjectRepositoryWithBagRelationshipsImpl implements ProjectRepositoryWithBagRelationships {

    private static final String ID_PARAMETER = "id";
    private static final String PROJECTS_PARAMETER = "projects";

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public Optional<Project> fetchBagRelationships(Optional<Project> project) {
        return project.map(this::fetchMemberses);
    }

    @Override
    public Page<Project> fetchBagRelationships(Page<Project> projects) {
        return new PageImpl<>(fetchBagRelationships(projects.getContent()), projects.getPageable(), projects.getTotalElements());
    }

    @Override
    public List<Project> fetchBagRelationships(List<Project> projects) {
        return Optional.of(projects).map(this::fetchMemberses).orElse(List.of());
    }

    Project fetchMemberses(Project result) {
        return entityManager
            .createQuery("select project from Project project left join fetch project.memberses where project.id = :id", Project.class)
            .setParameter(ID_PARAMETER, result.getId())
            .getSingleResult();
    }

    List<Project> fetchMemberses(List<Project> projects) {
        HashMap<Object, Integer> order = new HashMap<>();
        IntStream.range(0, projects.size()).forEach(index -> order.put(projects.get(index).getId(), index));
        List<Project> result = entityManager
            .createQuery("select project from Project project left join fetch project.memberses where project in :projects", Project.class)
            .setParameter(PROJECTS_PARAMETER, projects)
            .getResultList();
        result.sort((o1, o2) -> Integer.compare(order.get(o1.getId()), order.get(o2.getId())));
        return result;
    }
}
