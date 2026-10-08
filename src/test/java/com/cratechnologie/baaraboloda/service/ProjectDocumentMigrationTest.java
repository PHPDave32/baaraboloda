package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.Test;

class ProjectDocumentMigrationTest {

    @Test
    void createsDocumentsOnANewDatabase() throws Exception {
        try (var connection = database("new_documents")) {
            migrate(connection);
            try (
                var statement = connection.createStatement();
                var result = statement.executeQuery("SELECT COUNT(*) FROM project_document")
            ) {
                result.next();
                assertThat(result.getInt(1)).isZero();
            }
            migrate(connection);
        }
    }

    @Test
    void preservesExistingDocumentsAndCanRunAgain() throws Exception {
        try (var connection = database("legacy_documents")) {
            try (var statement = connection.createStatement()) {
                statement.execute(
                    "CREATE TABLE project_document (id BIGINT PRIMARY KEY, project_id BIGINT NOT NULL, title VARCHAR(120), description VARCHAR(1000), file_name VARCHAR(255), content_type VARCHAR(100), size_bytes BIGINT, content BLOB, created_at TIMESTAMP, updated_at TIMESTAMP, uploaded_by_id BIGINT)"
                );
                statement.execute(
                    "INSERT INTO project_document VALUES (2, 1, 'Specification', 'Existing document', 'specification.pdf', 'application/pdf', 3, X'010203', NULL, NULL, 1)"
                );
            }
            migrate(connection);
            migrate(connection);
            try (
                var statement = connection.createStatement();
                var result = statement.executeQuery("SELECT id, filename, content, author, category, created_at FROM project_document")
            ) {
                assertThat(result.next()).isTrue();
                assertThat(result.getLong("id")).isEqualTo(2L);
                assertThat(result.getString("filename")).isEqualTo("specification.pdf");
                assertThat(result.getBytes("content")).containsExactly(1, 2, 3);
                assertThat(result.getString("author")).isEqualTo("owner");
                assertThat(result.getString("category")).isEqualTo("OTHER");
                assertThat(result.getTimestamp("created_at")).isNotNull();
                assertThat(result.next()).isFalse();
            }
            try (
                var statement = connection.createStatement();
                var result = statement.executeQuery("SELECT COUNT(*) FROM project_document_legacy")
            ) {
                result.next();
                assertThat(result.getInt(1)).isEqualTo(1);
            }
        }
    }

    private Connection database(String name) throws Exception {
        var connection = DriverManager.getConnection("jdbc:h2:mem:" + name + ";MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", "");
        try (var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE project (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE task (id BIGINT PRIMARY KEY)");
            statement.execute("CREATE TABLE jhi_user (id BIGINT PRIMARY KEY, login VARCHAR(50))");
            statement.execute("INSERT INTO project VALUES (1)");
            statement.execute("INSERT INTO jhi_user VALUES (1, 'owner')");
        }
        return connection;
    }

    private void migrate(Connection connection) throws Exception {
        var database = DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new JdbcConnection(connection));
        var liquibase = new Liquibase(
            "config/liquibase/changelog/20261005120000_added_project_document.xml",
            new ClassLoaderResourceAccessor(),
            database
        );
        liquibase.setChangeLogParameter("blobType", "BLOB");
        liquibase.setChangeLogParameter("datetimeType", "TIMESTAMP");
        liquibase.update(new Contexts(), new LabelExpression());
    }
}
