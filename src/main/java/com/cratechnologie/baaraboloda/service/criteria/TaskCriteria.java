package com.cratechnologie.baaraboloda.service.criteria;

import com.cratechnologie.baaraboloda.domain.enumeration.TaskPriority;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskStatus;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskType;
import java.io.Serial;
import java.io.Serializable;
import java.util.Objects;
import java.util.Optional;
import org.springdoc.core.annotations.ParameterObject;
import tech.jhipster.service.Criteria;
import tech.jhipster.service.filter.*;

/**
 * Criteria class for the {@link com.cratechnologie.baaraboloda.domain.Task} entity. This class is used
 * in {@link com.cratechnologie.baaraboloda.web.rest.TaskResource} to receive all the possible filtering options from
 * the Http GET request parameters.
 * For example the following could be a valid request:
 * {@code /tasks?id.greaterThan=5&attr1.contains=something&attr2.specified=false}
 * As Spring is unable to properly convert the types, unless specific {@link Filter} class are used, we need to use
 * fix type specific filters.
 */
@ParameterObject
@SuppressWarnings("common-java:DuplicatedBlocks")
public class TaskCriteria implements Serializable, Criteria {

    /**
     * Class for filtering TaskStatus
     */
    public static class TaskStatusFilter extends Filter<TaskStatus> {

        public TaskStatusFilter() {}

        public TaskStatusFilter(TaskStatusFilter filter) {
            super(filter);
        }

        @Override
        public TaskStatusFilter copy() {
            return new TaskStatusFilter(this);
        }
    }

    /**
     * Class for filtering TaskPriority
     */
    public static class TaskPriorityFilter extends Filter<TaskPriority> {

        public TaskPriorityFilter() {}

        public TaskPriorityFilter(TaskPriorityFilter filter) {
            super(filter);
        }

        @Override
        public TaskPriorityFilter copy() {
            return new TaskPriorityFilter(this);
        }
    }

    /**
     * Class for filtering TaskType
     */
    public static class TaskTypeFilter extends Filter<TaskType> {

        public TaskTypeFilter() {}

        public TaskTypeFilter(TaskTypeFilter filter) {
            super(filter);
        }

        @Override
        public TaskTypeFilter copy() {
            return new TaskTypeFilter(this);
        }
    }

    @Serial
    private static final long serialVersionUID = 1L;

    private LongFilter id;

    private StringFilter title;

    private StringFilter description;

    private TaskStatusFilter status;

    private TaskPriorityFilter priority;

    private TaskTypeFilter type;

    private IntegerFilter storyPoints;

    private LocalDateFilter dueDate;

    private IntegerFilter position;

    private InstantFilter createdAt;

    private InstantFilter updatedAt;

    private LongFilter assigneeId;

    private LongFilter reporterId;

    private LongFilter projectId;

    private LongFilter sprintId;

    private Boolean distinct;

    public TaskCriteria() {}

    public TaskCriteria(TaskCriteria other) {
        this.id = other.optionalId().map(LongFilter::copy).orElse(null);
        this.title = other.optionalTitle().map(StringFilter::copy).orElse(null);
        this.description = other.optionalDescription().map(StringFilter::copy).orElse(null);
        this.status = other.optionalStatus().map(TaskStatusFilter::copy).orElse(null);
        this.priority = other.optionalPriority().map(TaskPriorityFilter::copy).orElse(null);
        this.type = other.optionalType().map(TaskTypeFilter::copy).orElse(null);
        this.storyPoints = other.optionalStoryPoints().map(IntegerFilter::copy).orElse(null);
        this.dueDate = other.optionalDueDate().map(LocalDateFilter::copy).orElse(null);
        this.position = other.optionalPosition().map(IntegerFilter::copy).orElse(null);
        this.createdAt = other.optionalCreatedAt().map(InstantFilter::copy).orElse(null);
        this.updatedAt = other.optionalUpdatedAt().map(InstantFilter::copy).orElse(null);
        this.assigneeId = other.optionalAssigneeId().map(LongFilter::copy).orElse(null);
        this.reporterId = other.optionalReporterId().map(LongFilter::copy).orElse(null);
        this.projectId = other.optionalProjectId().map(LongFilter::copy).orElse(null);
        this.sprintId = other.optionalSprintId().map(LongFilter::copy).orElse(null);
        this.distinct = other.distinct;
    }

    @Override
    public TaskCriteria copy() {
        return new TaskCriteria(this);
    }

    public LongFilter getId() {
        return id;
    }

    public Optional<LongFilter> optionalId() {
        return Optional.ofNullable(id);
    }

    public LongFilter id() {
        if (id == null) {
            setId(new LongFilter());
        }
        return id;
    }

    public void setId(LongFilter id) {
        this.id = id;
    }

    public StringFilter getTitle() {
        return title;
    }

    public Optional<StringFilter> optionalTitle() {
        return Optional.ofNullable(title);
    }

    public StringFilter title() {
        if (title == null) {
            setTitle(new StringFilter());
        }
        return title;
    }

    public void setTitle(StringFilter title) {
        this.title = title;
    }

    public StringFilter getDescription() {
        return description;
    }

    public Optional<StringFilter> optionalDescription() {
        return Optional.ofNullable(description);
    }

    public StringFilter description() {
        if (description == null) {
            setDescription(new StringFilter());
        }
        return description;
    }

    public void setDescription(StringFilter description) {
        this.description = description;
    }

    public TaskStatusFilter getStatus() {
        return status;
    }

    public Optional<TaskStatusFilter> optionalStatus() {
        return Optional.ofNullable(status);
    }

    public TaskStatusFilter status() {
        if (status == null) {
            setStatus(new TaskStatusFilter());
        }
        return status;
    }

    public void setStatus(TaskStatusFilter status) {
        this.status = status;
    }

    public TaskPriorityFilter getPriority() {
        return priority;
    }

    public Optional<TaskPriorityFilter> optionalPriority() {
        return Optional.ofNullable(priority);
    }

    public TaskPriorityFilter priority() {
        if (priority == null) {
            setPriority(new TaskPriorityFilter());
        }
        return priority;
    }

    public void setPriority(TaskPriorityFilter priority) {
        this.priority = priority;
    }

    public TaskTypeFilter getType() {
        return type;
    }

    public Optional<TaskTypeFilter> optionalType() {
        return Optional.ofNullable(type);
    }

    public TaskTypeFilter type() {
        if (type == null) {
            setType(new TaskTypeFilter());
        }
        return type;
    }

    public void setType(TaskTypeFilter type) {
        this.type = type;
    }

    public IntegerFilter getStoryPoints() {
        return storyPoints;
    }

    public Optional<IntegerFilter> optionalStoryPoints() {
        return Optional.ofNullable(storyPoints);
    }

    public IntegerFilter storyPoints() {
        if (storyPoints == null) {
            setStoryPoints(new IntegerFilter());
        }
        return storyPoints;
    }

    public void setStoryPoints(IntegerFilter storyPoints) {
        this.storyPoints = storyPoints;
    }

    public LocalDateFilter getDueDate() {
        return dueDate;
    }

    public Optional<LocalDateFilter> optionalDueDate() {
        return Optional.ofNullable(dueDate);
    }

    public LocalDateFilter dueDate() {
        if (dueDate == null) {
            setDueDate(new LocalDateFilter());
        }
        return dueDate;
    }

    public void setDueDate(LocalDateFilter dueDate) {
        this.dueDate = dueDate;
    }

    public IntegerFilter getPosition() {
        return position;
    }

    public Optional<IntegerFilter> optionalPosition() {
        return Optional.ofNullable(position);
    }

    public IntegerFilter position() {
        if (position == null) {
            setPosition(new IntegerFilter());
        }
        return position;
    }

    public void setPosition(IntegerFilter position) {
        this.position = position;
    }

    public InstantFilter getCreatedAt() {
        return createdAt;
    }

    public Optional<InstantFilter> optionalCreatedAt() {
        return Optional.ofNullable(createdAt);
    }

    public InstantFilter createdAt() {
        if (createdAt == null) {
            setCreatedAt(new InstantFilter());
        }
        return createdAt;
    }

    public void setCreatedAt(InstantFilter createdAt) {
        this.createdAt = createdAt;
    }

    public InstantFilter getUpdatedAt() {
        return updatedAt;
    }

    public Optional<InstantFilter> optionalUpdatedAt() {
        return Optional.ofNullable(updatedAt);
    }

    public InstantFilter updatedAt() {
        if (updatedAt == null) {
            setUpdatedAt(new InstantFilter());
        }
        return updatedAt;
    }

    public void setUpdatedAt(InstantFilter updatedAt) {
        this.updatedAt = updatedAt;
    }

    public LongFilter getAssigneeId() {
        return assigneeId;
    }

    public Optional<LongFilter> optionalAssigneeId() {
        return Optional.ofNullable(assigneeId);
    }

    public LongFilter assigneeId() {
        if (assigneeId == null) {
            setAssigneeId(new LongFilter());
        }
        return assigneeId;
    }

    public void setAssigneeId(LongFilter assigneeId) {
        this.assigneeId = assigneeId;
    }

    public LongFilter getReporterId() {
        return reporterId;
    }

    public Optional<LongFilter> optionalReporterId() {
        return Optional.ofNullable(reporterId);
    }

    public LongFilter reporterId() {
        if (reporterId == null) {
            setReporterId(new LongFilter());
        }
        return reporterId;
    }

    public void setReporterId(LongFilter reporterId) {
        this.reporterId = reporterId;
    }

    public LongFilter getProjectId() {
        return projectId;
    }

    public Optional<LongFilter> optionalProjectId() {
        return Optional.ofNullable(projectId);
    }

    public LongFilter projectId() {
        if (projectId == null) {
            setProjectId(new LongFilter());
        }
        return projectId;
    }

    public void setProjectId(LongFilter projectId) {
        this.projectId = projectId;
    }

    public LongFilter getSprintId() {
        return sprintId;
    }

    public Optional<LongFilter> optionalSprintId() {
        return Optional.ofNullable(sprintId);
    }

    public LongFilter sprintId() {
        if (sprintId == null) {
            setSprintId(new LongFilter());
        }
        return sprintId;
    }

    public void setSprintId(LongFilter sprintId) {
        this.sprintId = sprintId;
    }

    public Boolean getDistinct() {
        return distinct;
    }

    public Optional<Boolean> optionalDistinct() {
        return Optional.ofNullable(distinct);
    }

    public Boolean distinct() {
        if (distinct == null) {
            setDistinct(true);
        }
        return distinct;
    }

    public void setDistinct(Boolean distinct) {
        this.distinct = distinct;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (o == null || getClass() != o.getClass()) {
            return false;
        }
        final TaskCriteria that = (TaskCriteria) o;
        return (
            Objects.equals(id, that.id) &&
            Objects.equals(title, that.title) &&
            Objects.equals(description, that.description) &&
            Objects.equals(status, that.status) &&
            Objects.equals(priority, that.priority) &&
            Objects.equals(type, that.type) &&
            Objects.equals(storyPoints, that.storyPoints) &&
            Objects.equals(dueDate, that.dueDate) &&
            Objects.equals(position, that.position) &&
            Objects.equals(createdAt, that.createdAt) &&
            Objects.equals(updatedAt, that.updatedAt) &&
            Objects.equals(assigneeId, that.assigneeId) &&
            Objects.equals(reporterId, that.reporterId) &&
            Objects.equals(projectId, that.projectId) &&
            Objects.equals(sprintId, that.sprintId) &&
            Objects.equals(distinct, that.distinct)
        );
    }

    @Override
    public int hashCode() {
        return Objects.hash(
            id,
            title,
            description,
            status,
            priority,
            type,
            storyPoints,
            dueDate,
            position,
            createdAt,
            updatedAt,
            assigneeId,
            reporterId,
            projectId,
            sprintId,
            distinct
        );
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "TaskCriteria{" +
            optionalId().map(f -> "id=" + f + ", ").orElse("") +
            optionalTitle().map(f -> "title=" + f + ", ").orElse("") +
            optionalDescription().map(f -> "description=" + f + ", ").orElse("") +
            optionalStatus().map(f -> "status=" + f + ", ").orElse("") +
            optionalPriority().map(f -> "priority=" + f + ", ").orElse("") +
            optionalType().map(f -> "type=" + f + ", ").orElse("") +
            optionalStoryPoints().map(f -> "storyPoints=" + f + ", ").orElse("") +
            optionalDueDate().map(f -> "dueDate=" + f + ", ").orElse("") +
            optionalPosition().map(f -> "position=" + f + ", ").orElse("") +
            optionalCreatedAt().map(f -> "createdAt=" + f + ", ").orElse("") +
            optionalUpdatedAt().map(f -> "updatedAt=" + f + ", ").orElse("") +
            optionalAssigneeId().map(f -> "assigneeId=" + f + ", ").orElse("") +
            optionalReporterId().map(f -> "reporterId=" + f + ", ").orElse("") +
            optionalProjectId().map(f -> "projectId=" + f + ", ").orElse("") +
            optionalSprintId().map(f -> "sprintId=" + f + ", ").orElse("") +
            optionalDistinct().map(f -> "distinct=" + f + ", ").orElse("") +
        "}";
    }
}
