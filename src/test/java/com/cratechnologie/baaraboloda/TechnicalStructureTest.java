package com.cratechnologie.baaraboloda;

import static com.tngtech.archunit.base.DescribedPredicate.alwaysTrue;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.belongToAnyOf;
import static com.tngtech.archunit.core.domain.JavaClass.Predicates.resideInAPackage;
import static com.tngtech.archunit.library.Architectures.layeredArchitecture;

import com.tngtech.archunit.core.importer.ImportOption.DoNotIncludeTests;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;

@AnalyzeClasses(packagesOf = BaaraBolodaApp.class, importOptions = DoNotIncludeTests.class)
class TechnicalStructureTest {

    // prettier-ignore
    @ArchTest
    static final ArchRule respectsTechnicalArchitectureLayers = layeredArchitecture()
        .consideringAllDependencies()
        .layer("Config").definedBy("..config..")
        .layer("Web").definedBy("..web..")
        .optionalLayer("Service").definedBy("..service..")
        .layer("Security").definedBy("..security..")
        .optionalLayer("Persistence").definedBy("..repository..")
        .layer("Domain").definedBy("..domain..")

        .whereLayer("Config").mayNotBeAccessedByAnyLayer()
        .whereLayer("Web").mayOnlyBeAccessedByLayers("Config")
        .whereLayer("Service").mayOnlyBeAccessedByLayers("Web", "Config")
        .whereLayer("Security").mayOnlyBeAccessedByLayers("Config", "Service", "Web")
        .whereLayer("Persistence").mayOnlyBeAccessedByLayers("Service", "Security", "Web", "Config")
        .whereLayer("Domain").mayOnlyBeAccessedByLayers("Persistence", "Service", "Security", "Web", "Config")

        .ignoreDependency(belongToAnyOf(BaaraBolodaApp.class), alwaysTrue())
        .ignoreDependency(alwaysTrue(), belongToAnyOf(
            com.cratechnologie.baaraboloda.config.Constants.class,
            com.cratechnologie.baaraboloda.config.ApplicationProperties.class
        ))

        // Dette connue, tolérée en attendant un refactoring ; toute autre violation reste bloquante.
        // Les services lèvent l'exception HTTP 400 de la couche web pour les erreurs de validation.
        .ignoreDependency(resideInAPackage("..service.."), belongToAnyOf(
            com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException.class
        ))
        // Création d'utilisateur par l'admin : mot de passe initial lu depuis le VM de la requête.
        .ignoreDependency(belongToAnyOf(
            com.cratechnologie.baaraboloda.service.UserService.class
        ), belongToAnyOf(
            com.cratechnologie.baaraboloda.web.rest.vm.ManagedUserVM.class
        ))
        // Projections JPQL directement en DTO (requêtes de lecture optimisées).
        .ignoreDependency(belongToAnyOf(
            com.cratechnologie.baaraboloda.repository.ProjectDocumentRepository.class,
            com.cratechnologie.baaraboloda.repository.UserRepository.class
        ), belongToAnyOf(
            com.cratechnologie.baaraboloda.service.dto.ProjectDocumentDTO.class,
            com.cratechnologie.baaraboloda.service.dto.ResourceRecipientDTO.class
        ));
}
