package com.cratechnologie.baaraboloda.domain;

import com.cratechnologie.baaraboloda.domain.enumeration.ProjectStatus;
import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serial;
import java.io.Serializable;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import org.hibernate.annotations.Cache;
import org.hibernate.annotations.CacheConcurrencyStrategy;

/**
 * A Project.
 */
@Entity
@Table(name = "project")
@Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
@SuppressWarnings("common-java:DuplicatedBlocks")
public class Project implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @Column(name = "uuid", length = 36, nullable = false, unique = true, updatable = false)
    private String uuid = java.util.UUID.randomUUID().toString();

    public String getUuid() {
        return uuid;
    }

    public void setUuid(String uuid) {
        this.uuid = uuid;
    }

    @NotNull
    @Size(max = 100)
    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Size(max = 2000)
    @Column(name = "description", length = 2000)
    private String description;

    @Size(max = 20)
    @Column(name = "project_key", length = 20)
    private String projectKey;

    @Size(max = 30)
    @Column(name = "icon_color", length = 30)
    private String iconColor;

    @NotNull
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private ProjectStatus status;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @ManyToOne(optional = false)
    @NotNull
    private User owner;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
        name = "rel_project__members",
        joinColumns = @JoinColumn(name = "project_id"),
        inverseJoinColumns = @JoinColumn(name = "members_id")
    )
    @Cache(usage = CacheConcurrencyStrategy.READ_WRITE)
    private Set<User> memberses = new HashSet<>();

    // jhipster-needle-entity-add-field - JHipster will add fields here

    public Long getId() {
        return this.id;
    }

    public Project id(Long id) {
        this.setId(id);
        return this;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return this.name;
    }

    public Project name(String name) {
        this.setName(name);
        return this;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return this.description;
    }

    public Project description(String description) {
        this.setDescription(description);
        return this;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getProjectKey() {
        return this.projectKey;
    }

    public Project projectKey(String projectKey) {
        this.setProjectKey(projectKey);
        return this;
    }

    public void setProjectKey(String projectKey) {
        this.projectKey = projectKey;
    }

    public String getIconColor() {
        return this.iconColor;
    }

    public Project iconColor(String iconColor) {
        this.setIconColor(iconColor);
        return this;
    }

    public void setIconColor(String iconColor) {
        this.iconColor = iconColor;
    }

    public ProjectStatus getStatus() {
        return this.status;
    }

    public Project status(ProjectStatus status) {
        this.setStatus(status);
        return this;
    }

    public void setStatus(ProjectStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return this.createdAt;
    }

    public Project createdAt(Instant createdAt) {
        this.setCreatedAt(createdAt);
        return this;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public Instant getUpdatedAt() {
        return this.updatedAt;
    }

    public Project updatedAt(Instant updatedAt) {
        this.setUpdatedAt(updatedAt);
        return this;
    }

    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }

    public User getOwner() {
        return this.owner;
    }

    public void setOwner(User user) {
        this.owner = user;
    }

    public Project owner(User user) {
        this.setOwner(user);
        return this;
    }

    public Set<User> getMemberses() {
        return this.memberses;
    }

    public void setMemberses(Set<User> users) {
        this.memberses = users;
    }

    public Project memberses(Set<User> users) {
        this.setMemberses(users);
        return this;
    }

    public Project addMembers(User user) {
        this.memberses.add(user);
        return this;
    }

    public Project removeMembers(User user) {
        this.memberses.remove(user);
        return this;
    }

    // jhipster-needle-entity-add-getters-setters - JHipster will add getters and setters here

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof Project)) {
            return false;
        }
        return getId() != null && getId().equals(((Project) o).getId());
    }

    @Override
    public int hashCode() {
        // see https://vladmihalcea.com/how-to-implement-equals-and-hashcode-using-the-jpa-entity-identifier/
        return getClass().hashCode();
    }

    // prettier-ignore
    @Override
    public String toString() {
        return "Project{" +
            "id=" + getId() +
            ", name='" + getName() + "'" +
            ", description='" + getDescription() + "'" +
            ", projectKey='" + getProjectKey() + "'" +
            ", iconColor='" + getIconColor() + "'" +
            ", status='" + getStatus() + "'" +
            ", createdAt='" + getCreatedAt() + "'" +
            ", updatedAt='" + getUpdatedAt() + "'" +
            "}";
    }
}
