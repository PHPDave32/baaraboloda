package com.cratechnologie.baaraboloda.service.criteria;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Objects;
import java.util.function.BiFunction;
import java.util.function.Function;
import org.assertj.core.api.Condition;
import org.junit.jupiter.api.Test;

class LabelCriteriaTest {

    @Test
    void newLabelCriteriaHasAllFiltersNullTest() {
        var labelCriteria = new LabelCriteria();
        assertThat(labelCriteria).is(criteriaFiltersAre(Objects::isNull));
    }

    @Test
    void labelCriteriaFluentMethodsCreatesFiltersTest() {
        var labelCriteria = new LabelCriteria();

        setAllFilters(labelCriteria);

        assertThat(labelCriteria).is(criteriaFiltersAre(Objects::nonNull));
    }

    @Test
    void labelCriteriaCopyCreatesNullFilterTest() {
        var labelCriteria = new LabelCriteria();
        var copy = labelCriteria.copy();

        assertThat(labelCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(copyFiltersAre(copy, (a, b) -> a == null || a instanceof Boolean ? a == b : a != b && a.equals(b))),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::isNull)),
            criteria -> assertThat(criteria).isEqualTo(labelCriteria)
        );
    }

    @Test
    void labelCriteriaCopyDuplicatesEveryExistingFilterTest() {
        var labelCriteria = new LabelCriteria();
        setAllFilters(labelCriteria);

        var copy = labelCriteria.copy();

        assertThat(labelCriteria).satisfies(
            criteria ->
                assertThat(criteria).is(copyFiltersAre(copy, (a, b) -> a == null || a instanceof Boolean ? a == b : a != b && a.equals(b))),
            criteria -> assertThat(criteria).isEqualTo(copy),
            criteria -> assertThat(criteria).hasSameHashCodeAs(copy)
        );

        assertThat(copy).satisfies(
            criteria -> assertThat(criteria).is(criteriaFiltersAre(Objects::nonNull)),
            criteria -> assertThat(criteria).isEqualTo(labelCriteria)
        );
    }

    @Test
    void toStringVerifier() {
        var labelCriteria = new LabelCriteria();

        assertThat(labelCriteria).hasToString("LabelCriteria{}");
    }

    private static void setAllFilters(LabelCriteria labelCriteria) {
        labelCriteria.id();
        labelCriteria.name();
        labelCriteria.color();
        labelCriteria.projectId();
        labelCriteria.distinct();
    }

    private static Condition<LabelCriteria> criteriaFiltersAre(Function<Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId()) &&
                condition.apply(criteria.getName()) &&
                condition.apply(criteria.getColor()) &&
                condition.apply(criteria.getProjectId()) &&
                condition.apply(criteria.getDistinct()),
            "every filter matches"
        );
    }

    private static Condition<LabelCriteria> copyFiltersAre(LabelCriteria copy, BiFunction<Object, Object, Boolean> condition) {
        return new Condition<>(
            criteria ->
                condition.apply(criteria.getId(), copy.getId()) &&
                condition.apply(criteria.getName(), copy.getName()) &&
                condition.apply(criteria.getColor(), copy.getColor()) &&
                condition.apply(criteria.getProjectId(), copy.getProjectId()) &&
                condition.apply(criteria.getDistinct(), copy.getDistinct()),
            "every filter matches"
        );
    }
}
