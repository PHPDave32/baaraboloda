package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.repository.*;
import java.util.Optional;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.embedded.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

class NotificationServiceTest {

    private EmbeddedDatabase database;
    private NotificationService service;
    private UserRepository users;
    private TaskRepository tasks;
    private Task task;

    @BeforeEach
    void setup() throws Exception {
        database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2).build();
        var jdbc = new JdbcTemplate(database);
        try (var connection = database.getConnection()) {
            var liquibaseDatabase = liquibase.database.DatabaseFactory.getInstance().findCorrectDatabaseImplementation(
                new liquibase.database.jvm.JdbcConnection(connection)
            );
            var migration = new liquibase.Liquibase(
                "config/liquibase/changelog/20261008120000_notifications.xml",
                new liquibase.resource.ClassLoaderResourceAccessor(),
                liquibaseDatabase
            );
            migration.update(new liquibase.Contexts(), new liquibase.LabelExpression());
        }
        users = mock(UserRepository.class);
        tasks = mock(TaskRepository.class);
        service = new NotificationService(jdbc, users, tasks);
        var bob = new User();
        bob.setId(2L);
        bob.setLogin("bob");
        bob.setActivated(true);
        when(users.findById(2L)).thenReturn(Optional.of(bob));
        task = new Task().id(10L).title("Corriger le formulaire").project(new Project().id(1L)).assignee(bob).reporter(bob);
        when(tasks.findById(10L)).thenReturn(Optional.of(task));
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("alice", "ignored"));
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        database.shutdown();
    }

    @Test
    void repairsMissingTablesWithoutLosingNotifications() throws Exception {
        service.assignment(task, null);
        var jdbc = new JdbcTemplate(database);
        jdbc.execute("drop table notification_push_subscription");
        jdbc.execute("drop table notification_preferences");
        for (int attempt = 0; attempt < 2; attempt++) {
            try (var connection = database.getConnection()) {
                var target = liquibase.database.DatabaseFactory.getInstance().findCorrectDatabaseImplementation(
                    new liquibase.database.jvm.JdbcConnection(connection)
                );
                var migration = new liquibase.Liquibase(
                    "config/liquibase/changelog/20261008121000_repair_notifications.xml",
                    new liquibase.resource.ClassLoaderResourceAccessor(),
                    target
                );
                migration.update(new liquibase.Contexts(), new liquibase.LabelExpression());
            }
        }
        assertThat(service.unread("bob")).isEqualTo(1);
        assertThat(service.preferences("bob").emailEnabled()).isFalse();
        assertThat(jdbc.queryForObject("select count(*) from notification_push_subscription", Long.class)).isZero();
    }

    @Test
    void assignmentIsDurableAndOnlyRecipientCanReadIt() {
        service.assignment(task, null);
        assertThat(service.unread("bob")).isEqualTo(1);
        assertThat(service.list("alice")).isEmpty();
        String id = service.list("bob").getFirst().id();
        service.read("alice", id);
        assertThat(service.unread("bob")).isEqualTo(1);
        service.read("bob", id);
        assertThat(service.unread("bob")).isZero();
    }

    @Test
    void unchangedAssigneeAndOwnActionsAreSilent() {
        service.assignment(task, 2L);
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("bob", "ignored"));
        service.assignment(task, null);
        assertThat(service.list("bob")).isEmpty();
    }

    @Test
    void commentDeduplicatesReporterAssigneeAndMention() {
        when(users.findOneByLogin("bob")).thenReturn(Optional.of(task.getAssignee()));
        service.comment(10L, "Merci @bob");
        assertThat(service.list("bob")).hasSize(1);
        assertThat(service.list("bob").getFirst().kind()).isEqualTo("MENTION");
    }
}
