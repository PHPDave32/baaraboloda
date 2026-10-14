package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.*;

import java.sql.DriverManager;
import liquibase.Contexts;
import liquibase.LabelExpression;
import liquibase.Liquibase;
import liquibase.database.DatabaseFactory;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SuperAdminMigrationTest {

    @ParameterizedTest
    @ValueSource(booleans = { false, true })
    void migrationAddsRoleIdempotentlyWithoutPromotingExistingAdministrators(boolean alreadyExists) throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:super_admin_" + alreadyExists + ";MODE=MySQL", "sa", "")) {
            try (var statement = connection.createStatement()) {
                statement.execute("CREATE TABLE jhi_authority (name VARCHAR(50) PRIMARY KEY)");
                statement.execute("CREATE TABLE jhi_user_authority (user_id BIGINT, authority_name VARCHAR(50))");
                statement.execute("INSERT INTO jhi_authority VALUES ('ROLE_ADMIN')");
                statement.execute("INSERT INTO jhi_user_authority VALUES (1, 'ROLE_ADMIN')");
                if (alreadyExists) statement.execute("INSERT INTO jhi_authority VALUES ('ROLE_SUPER_ADMIN')");
            }
            var database = DatabaseFactory.getInstance().findCorrectDatabaseImplementation(new JdbcConnection(connection));
            var liquibase = new Liquibase(
                "config/liquibase/changelog/20261009120000_super_admin.xml",
                new ClassLoaderResourceAccessor(),
                database
            );
            liquibase.update(new Contexts(), new LabelExpression());
            liquibase.update(new Contexts(), new LabelExpression());
            try (
                var statement = connection.createStatement();
                var result = statement.executeQuery("SELECT COUNT(*) FROM jhi_authority WHERE name = 'ROLE_SUPER_ADMIN'")
            ) {
                result.next();
                assertThat(result.getInt(1)).isEqualTo(1);
            }
            try (
                var statement = connection.createStatement();
                var result = statement.executeQuery("SELECT COUNT(*) FROM jhi_user_authority WHERE authority_name = 'ROLE_SUPER_ADMIN'")
            ) {
                result.next();
                assertThat(result.getInt(1)).isZero();
            }
        }
    }
}
