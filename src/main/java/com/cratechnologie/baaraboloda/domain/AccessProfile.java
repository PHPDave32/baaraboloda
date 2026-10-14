package com.cratechnologie.baaraboloda.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import java.io.Serializable;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "access_profile")
public class AccessProfile implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 100)
    @Column(nullable = false, unique = true, length = 100)
    private String name;

    @Size(max = 500)
    @Column(length = 500)
    private String description;

    @NotNull
    @Column(name = "all_projects", nullable = false)
    private boolean allProjects;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "access_profile_permission", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "permission", nullable = false, length = 50)
    private Set<String> permissions = new HashSet<>();

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

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public boolean isAllProjects() {
        return allProjects;
    }

    public void setAllProjects(boolean allProjects) {
        this.allProjects = allProjects;
    }

    public Set<String> getPermissions() {
        return permissions;
    }

    public void setPermissions(Set<String> permissions) {
        this.permissions = permissions;
    }
}
