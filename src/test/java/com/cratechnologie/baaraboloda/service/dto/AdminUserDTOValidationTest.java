package com.cratechnologie.baaraboloda.service.dto;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class AdminUserDTOValidationTest {

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = { " ", "personne", "personne@serveur", "personne@.com", "personne @entreprise.com", "personne@entreprise..com" })
    void rejectsInvalidEmail(String email) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validateValue(AdminUserDTO.class, "email", email)).isNotEmpty();
        }
    }

    @ParameterizedTest
    @ValueSource(strings = { "personne@entreprise.com", "prenom.nom+pro@service.entreprise.ml" })
    void acceptsValidEmail(String email) {
        try (var factory = Validation.buildDefaultValidatorFactory()) {
            assertThat(factory.getValidator().validateValue(AdminUserDTO.class, "email", email)).isEmpty();
        }
    }
}
