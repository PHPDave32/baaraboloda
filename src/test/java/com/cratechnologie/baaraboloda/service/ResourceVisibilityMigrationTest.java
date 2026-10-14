package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.DriverManager;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.Test;

class ResourceVisibilityMigrationTest {

    @Test
    void preservesExistingVisibilityAndCascadesReadersOnDelete() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:resource_visibility;DB_CLOSE_DELAY=-1", "sa", "")) {
            try (var statement = connection.createStatement()) {
                statement.execute("CREATE TABLE jhi_authority (name VARCHAR(50) PRIMARY KEY)");
                statement.execute("CREATE TABLE project_document (id BIGINT PRIMARY KEY)");
                statement.execute("INSERT INTO project_document VALUES (1)");
            }
            var database = DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new JdbcConnection(connection));
            var liquibase = new Liquibase(
                "config/liquibase/changelog/20261013130000_resource_visibility.xml",
                new ClassLoaderResourceAccessor(),
                database
            );
            liquibase.update(new Contexts(), new LabelExpression());
            liquibase.update(new Contexts(), new LabelExpression());
            try (var statement = connection.createStatement()) {
                try (var result = statement.executeQuery("SELECT restricted FROM project_document WHERE id = 1")) {
                    result.next();
                    assertThat(result.getBoolean(1)).isFalse();
                }
                statement.execute("INSERT INTO project_document_reader VALUES (1, 'reader')");
                statement.execute("DELETE FROM project_document WHERE id = 1");
                try (var result = statement.executeQuery("SELECT COUNT(*) FROM project_document_reader")) {
                    result.next();
                    assertThat(result.getInt(1)).isZero();
                }
            }
        }
    }
}
