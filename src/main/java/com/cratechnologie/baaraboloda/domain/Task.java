package com.cratechnologie.baaraboloda.domain;

import com.cratechnologie.baaraboloda.domain.ImageAttachment;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskPriority;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskStatus;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskType;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * A Task.
 */
@Entity
@Table(name = "task")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Task implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @NotNull
    @Size(max = 200)
    @Column(name = "title", length = 200, nullable = false)
    private String title;

    @Size(max = 5000)
    @Column(name = "description", length = 5000)
    private String description;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private TaskStatus status;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "priority", nullable = false)
    private TaskPriority priority;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false)
    private TaskType type;

    @Column(name = "story_points")
    private Integer storyPoints;

    @Column(name = "due_date")
    private LocalDate dueDate;

    @Column(name = "position")
    private Integer position;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    private User assignee;

    @ManyToOne(optional = false)
    @NotNull
    private User reporter;

    @ManyToOne(optional = false)
    @NotNull
    @JsonIgnoreProperties(value = { "owner", "memberses" }, allowSetters = true)
    private Project project;

    @ManyToOne(fetch = FetchType.LAZY)
    @JsonIgnoreProperties(value = { "createdBy", "project" }, allowSetters = true)
    private Sprint sprint;

    // jhipster-needle-entity-add-field - JHipster will add fields here

    @Convert(converter = com.cratechnologie.baaraboloda.domain.converter.ImageAttachmentsConverter.class)
    @Column(name = "images", columnDefinition = "longtext")
    private List<ImageAttachment> images;

    public List<ImageAttachment> getImages() {
        return images;
    }

    public void setImages(List<ImageAttachment> images) {
        this.images = images;
    }

    public Long getId() {
        return this.id;
    }

    public Task id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getTitle() {
        return this.title;
    }

    public Task title(String title) {
        this.setTitle(title);
        return this;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return this.description;
    }

    public Task description(String description) {
        this.setDescription(description);
        return this;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public TaskStatus getStatus() {
        return this.status;
    }

    public Task status(TaskStatus status) {
        this.setStatus(status);
        return this;
    }

    public void setStatus(TaskStatus status) {
        this.status = status;
    }

    public TaskPriority getPriority() {
        return this.priority;
    }

    public Task priority(TaskPriority priority) {
        this.setPriority(priority);
        return this;
    }

    public void setPriority(TaskPriority priority) {
        this.priority = priority;
    }

    public TaskType getType() {
        return this.type;
    }

    public Task type(TaskType type) {
        this.setType(type);
        return this;
    }

    public void setType(TaskType type) {
        this.type = type;
    }

    public Integer getStoryPoints() {
        return this.storyPoints;
    }

    public Task storyPoints(Integer storyPoints) {
        this.setStoryPoints(storyPoints);
        return this;
    }

    public void setStoryPoints(Integer storyPoints) {
        this.storyPoints = storyPoints;
    }

    public LocalDate getDueDate() {
        return this.dueDate;
    }

    public Task dueDate(LocalDate dueDate) {
        this.setDueDate(dueDate);
        return this;
    }

    public void setDueDate(LocalDate dueDate) {
        this.dueDate = dueDate;
    }

    public Integer getPosition() {
        return this.position;
    }

    public Task position(Integer position) {
        this.setPosition(position);
        return this;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }

    public Task createdAt(Instant createdAt) {
        this.setCreatedAt(createdAt);
        return this;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public Task updatedAt(Instant updatedAt) {
        this.setUpdatedAt(updatedAt);
        return this;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public User getAssignee() {
        return this.assignee;
    }

    public void setAssignee(User user) {
        this.assignee = user;
    }

    public Task assignee(User user) {
        this.setAssignee(user);
        return this;
    }

    public User getReporter() {
        return this.reporter;
    }

    public void setReporter(User user) {
        this.reporter = user;
    }

    public Task reporter(User user) {
        this.setReporter(user);
        return this;
    }

    public Project getProject() {
        return this.project;
    }

    public void setProject(Project project) {
        this.project = project;
    }

    public Task project(Project project) {
        this.setProject(project);
        return this;
    }

    public Sprint getSprint() {
        return this.sprint;
    }

    public void setSprint(Sprint sprint) {
        this.sprint = sprint;
    }

    public Task sprint(Sprint sprint) {
        this.setSprint(sprint);
        return this;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Task)) {
            return false;
        }
        return getId() != null && getId().equals(((Task) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "Task{" +
            "id=" + getId() +
            ", title='" + getTitle() + "'" +
            ", description='" + getDescription() + "'" +
            ", status='" + getStatus() + "'" +
            ", priority='" + getPriority() + "'" +
            ", type='" + getType() + "'" +
            ", storyPoints=" + getStoryPoints() +
            ", dueDate='" + getDueDate() + "'" +
            ", position=" + getPosition() +
            ", createdAt='" + getCreatedAt() + "'" +
            ", updatedAt='" + getUpdatedAt() + "'" +
            "}";
    }
}
