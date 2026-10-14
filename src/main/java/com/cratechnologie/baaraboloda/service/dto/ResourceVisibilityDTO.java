package com.cratechnologie.baaraboloda.service.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record ResourceVisibilityDTO(boolean restricted, @NotNull @Size(max = 1000) Set<@NotBlank @Size(max = 50) String> allowedLogins) {}
