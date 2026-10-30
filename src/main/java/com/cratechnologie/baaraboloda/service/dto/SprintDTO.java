package com.cratechnologie.baaraboloda.service.dto;

import com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Objects;

/**
 * A DTO for the {@link com.cratechnologie.baaraboloda.domain.Sprint} entity.
 */
@SuppressWarnings("common-java:DuplicatedBlocks")
public class SprintDTO implements Serializable {

    private Long id;

    @com.fasterxml.jackson.annotation.JsonProperty(access = com.fasterxml.jackson.annotation.JsonProperty.Access.READ_ONLY)
    private String uuid;

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    @NotNull
    @Size(max = 100)
    private String name;

    @Size(max = 2000)
    private String goal;

    @NotNull
    private SprintStatus status;

    private LocalDate startDate;

    private LocalDate endDate;

    private Instant createdAt;

    private Instant updatedAt;

    private UserDTO createdBy;

    @NotNull
    private ProjectDTO project;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public SprintStatus getStatus() {
        return status;
    }

    public void setStatus(SprintStatus status) {
        this.status = status;
    }

    public LocalDate getStartDate() {
        return startDate;
    }

    public void setStartDate(LocalDate startDate) {
        this.startDate = startDate;
    }

    public LocalDate getEndDate() {
        return endDate;
    }

    public void setEndDate(LocalDate endDate) {
        this.endDate = endDate;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public UserDTO getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(UserDTO createdBy) {
        this.createdBy = createdBy;
    }

    public ProjectDTO getProject() {
        return project;
    }

    public void setProject(ProjectDTO project) {
        this.project = project;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof SprintDTO)) {
            return false;
        }

        SprintDTO sprintDTO = (SprintDTO) o;
        if (this.id == null) {
            return false;
        }
        return Objects.equals(this.id, sprintDTO.id);
    }

    @Override
    public int hashCode() {
        return Objects.hash(this.id);
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "SprintDTO{" +
            "id=" + getId() +
            ", name='" + getName() + "'" +
            ", goal='" + getGoal() + "'" +
            ", status='" + getStatus() + "'" +
            ", startDate='" + getStartDate() + "'" +
            ", endDate='" + getEndDate() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            ", updatedAt='" + getUpdatedAt() + "'" +
            ", createdBy=" + getCreatedBy() +
            ", project=" + getProject() +
            "}";
    }
}
