package com.cratechnologie.baaraboloda.service.criteria;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Objects;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.assertj.core.api.Condition;
import org.junit.jupiter.api.Test;

class TaskCriteriaTest {

    @Test
    void newTaskCriteriaHasAllFiltersNullTest() {
        var taskCriteria = new TaskCriteria();
        assertThat(taskCriteria).is(criteriaFiltersAre(Objects::isNull));
    }

    @Test
    void taskCriteriaFluentMethodsCreatesFiltersTest() {
        var taskCriteria = new TaskCriteria();

        setAllFilters(taskCriteria);

        assertThat(taskCriteria).is(criteriaFiltersAre(Objects::nonNull));
    }

    @Test
    void taskCriteriaCopyCreatesNullFilterTest() {
        var taskCriteria = new TaskCriteria();
        var copy = taskCriteria.copy();

        assertThat(taskCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(copyFiltersAre(copy, (a, b) -> a == null || a instanceof Boolean ? a == b : a != b && a.equals(b))),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::isNull)),
            criteria -> assertThat(criteria).isEqualTo(taskCriteria)
        );
    }

    @Test
    void taskCriteriaCopyDuplicatesEveryExistingFilterTest() {
        var taskCriteria = new TaskCriteria();
        setAllFilters(taskCriteria);

        var copy = taskCriteria.copy();

        assertThat(taskCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(copyFiltersAre(copy, (a, b) -> a == null || a instanceof Boolean ? a == b : a != b && a.equals(b))),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::nonNull)),
            criteria -> assertThat(criteria).isEqualTo(taskCriteria)
        );
    }

    @Test
    void toStringVerifier() {
        var taskCriteria = new TaskCriteria();

        assertThat(taskCriteria).hasToString("TaskCriteria{}");
    }

    private static void setAllFilters(TaskCriteria taskCriteria) {
        taskCriteria.id();
        taskCriteria.title();
        taskCriteria.description();
        taskCriteria.status();
        taskCriteria.priority();
        taskCriteria.type();
        taskCriteria.storyPoints();
        taskCriteria.dueDate();
        taskCriteria.position();
        taskCriteria.createdAt();
        taskCriteria.updatedAt();
        taskCriteria.assigneeId();
        taskCriteria.reporterId();
        taskCriteria.projectId();
        taskCriteria.sprintId();
        taskCriteria.distinct();
    }

    private static Condition<TaskCriteria> criteriaFiltersAre(Function<Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId()) &&
                condition.apply(criteria.getTitle()) &&
                condition.apply(criteria.getDescription()) &&
                condition.apply(criteria.getStatus()) &&
                condition.apply(criteria.getPriority()) &&
                condition.apply(criteria.getType()) &&
                condition.apply(criteria.getStoryPoints()) &&
                condition.apply(criteria.getDueDate()) &&
                condition.apply(criteria.getPosition()) &&
                condition.apply(criteria.getCreatedAt()) &&
                condition.apply(criteria.getUpdatedAt()) &&
                condition.apply(criteria.getAssigneeId()) &&
                condition.apply(criteria.getReporterId()) &&
                condition.apply(criteria.getProjectId()) &&
                condition.apply(criteria.getSprintId()) &&
                condition.apply(criteria.getDistinct()),
            "every filter matches"
        );
    }

    private static Condition<TaskCriteria> copyFiltersAre(TaskCriteria copy, BiFunction<Object, Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId(), copy.getId()) &&
                condition.apply(criteria.getTitle(), copy.getTitle()) &&
                condition.apply(criteria.getDescription(), copy.getDescription()) &&
                condition.apply(criteria.getStatus(), copy.getStatus()) &&
                condition.apply(criteria.getPriority(), copy.getPriority()) &&
                condition.apply(criteria.getType(), copy.getType()) &&
                condition.apply(criteria.getStoryPoints(), copy.getStoryPoints()) &&
                condition.apply(criteria.getDueDate(), copy.getDueDate()) &&
                condition.apply(criteria.getPosition(), copy.getPosition()) &&
                condition.apply(criteria.getCreatedAt(), copy.getCreatedAt()) &&
                condition.apply(criteria.getUpdatedAt(), copy.getUpdatedAt()) &&
                condition.apply(criteria.getAssigneeId(), copy.getAssigneeId()) &&
                condition.apply(criteria.getReporterId(), copy.getReporterId()) &&
                condition.apply(criteria.getProjectId(), copy.getProjectId()) &&
                condition.apply(criteria.getSprintId(), copy.getSprintId()) &&
                condition.apply(criteria.getDistinct(), copy.getDistinct()),
            "every filter matches"
        );
    }
}
