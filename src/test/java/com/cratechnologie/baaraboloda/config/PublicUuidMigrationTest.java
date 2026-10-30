package com.cratechnologie.baaraboloda.config;

import static org.assertj.core.api.Assertions.*;

import java.sql.DriverManager;
import java.util.HashSet;
import java.util.UUID;
import liquibase.Liquibase;
import liquibase.database.jvm.JdbcConnection;
import liquibase.resource.ClassLoaderResourceAccessor;
import org.junit.jupiter.api.Test;

class PublicUuidMigrationTest {

    @Test
    void backfillsExistingRowsAndKeepsRelationshipsAndUuidsAcrossRestarts() throws Exception {
        try (var connection = DriverManager.getConnection("jdbc:h2:mem:uuid_migration;DB_CLOSE_DELAY=-1", "sa", "")) {
            var sql = connection.createStatement();
            sql.execute("create table project (id bigint primary key)");
            sql.execute("create table sprint (id bigint primary key, project_id bigint references project(id))");
            sql.execute(
                "create table task (id bigint primary key, project_id bigint references project(id), sprint_id bigint references sprint(id))"
            );
            sql.execute("insert into project values (1), (2)");
            sql.execute("insert into sprint values (3, 1), (4, 2)");
            sql.execute("insert into task values (5, 1, 3), (6, 2, 4)");
            var liquibase = new Liquibase(
                "config/liquibase/changelog/20261020120000_public_uuids.xml",
                new ClassLoaderResourceAccessor(),
                new JdbcConnection(connection)
            );
            liquibase.update(new liquibase.Contexts());
            var uuids = new HashSet<String>();
            for (String table : new String[] { "project", "sprint", "task" }) {
                try (var rows = sql.executeQuery("select uuid from " + table)) {
                    while (rows.next()) {
                        String uuid = rows.getString(1);
                        assertThat(UUID.fromString(uuid).toString()).isEqualTo(uuid);
                        assertThat(uuids.add(uuid)).isTrue();
                    }
                }
            }
            assertThat(uuids).hasSize(6);
            liquibase.update(new liquibase.Contexts());
            try (
                var rows = sql.executeQuery(
                    "select p.uuid, t.project_id, t.sprint_id from project p join task t on p.id=t.project_id where t.id=5"
                )
            ) {
                assertThat(rows.next()).isTrue();
                assertThat(uuids).contains(rows.getString(1));
                assertThat(rows.getLong(2)).isEqualTo(1L);
                assertThat(rows.getLong(3)).isEqualTo(3L);
            }
            assertThatThrownBy(() -> sql.execute("insert into project (id, uuid) select 7, uuid from project where id=1")).isInstanceOf(
                java.sql.SQLException.class
            );
            assertThatThrownBy(() -> sql.execute("insert into project (id) values (8)")).isInstanceOf(java.sql.SQLException.class);
        }
    }
}
