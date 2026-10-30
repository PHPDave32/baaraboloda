package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskStatus;
import com.cratechnologie.baaraboloda.repository.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.test.util.ReflectionTestUtils;

class SprintCompletionAlertTest extends NotificationEmailTest {

    Sprint sprint;
    UserRepository users;

    @BeforeEach
    void prepareSprint() throws Exception {
        try (var connection = database.getConnection()) {
            new liquibase.Liquibase(
                "config/liquibase/changelog/20261026120000_sprint_alerts.xml",
                new liquibase.resource.ClassLoaderResourceAccessor(),
                liquibase.database.DatabaseFactory.getInstance().findCorrectDatabaseImplementation(
                    new liquibase.database.jvm.JdbcConnection(connection)
                )
            ).update(new liquibase.Contexts(), new liquibase.LabelExpression());
        }
        jdbc.execute("create table sprint(id bigint primary key)");
        jdbc.update("insert into sprint values(5)");
        sprint = new Sprint().id(5L).name("Période octobre").project(new Project().id(1L).name("CRA"));
        sprint.setUuid("period-uuid");
        task.setUuid("task-uuid");
        users = (UserRepository) ReflectionTestUtils.getField(events, "users");
        var tasks = (TaskRepository) ReflectionTestUtils.getField(events, "tasks");
        when(tasks.findAllBySprint_IdOrderByPositionAsc(5L)).thenReturn(List.of(task));
        when(users.findProjectNotificationRecipientIds(1L)).thenReturn(Set.of(2L));
        bob.setGrantedPermissions(new HashSet<>(Set.of("PERM_SPRINT_ALERT_RECEIVE")));
        bob.setFirstName("Bob");
        bob.setImageUrl("https://example.test/bob.png");
        when(users.findActiveSuperAdmins()).thenReturn(List.of());
    }

    @Test
    void snapshotsAssigneesAndDoesNotRepeatAfterTaskChanges() {
        events.sprintCompleted(sprint);
        task.setStatus(TaskStatus.DONE);
        events.sprintCompleted(sprint);
        var items = events.list("bob");
        assertThat(items).hasSize(1);
        assertThat(items.getFirst().sprintReport().assignees().getFirst().imageUrl()).isEqualTo("https://example.test/bob.png");
        assertThat(items.getFirst().sprintReport().assignees().getFirst().tasks().getFirst().status()).isEqualTo("TODO");
    }

    @Test
    void superAdminReceivesEveryProjectAndRevokedMemberDoesNot() {
        bob.setRevokedPermissions(new HashSet<>(Set.of("PERM_SPRINT_ALERT_RECEIVE")));
        User admin = new User();
        admin.setLogin("superadmin");
        admin.setActivated(true);
        when(users.findActiveSuperAdmins()).thenReturn(List.of(admin));
        events.sprintCompleted(sprint);
        assertThat(events.list("bob")).isEmpty();
        assertThat(events.list("superadmin")).hasSize(1);
    }

    @Test
    void completedTasksDoNotTriggerAlerts() {
        task.setStatus(TaskStatus.DONE);
        events.sprintCompleted(sprint);
        assertThat(events.list("bob")).isEmpty();
    }

    @Test
    void unassignedTasksAppearInTheirOwnGroupAndEmailIsSentWithoutPersonalOptIn() {
        task.setAssignee(null);
        events.preferences("bob", new NotificationService.Preferences(false, false));
        events.sprintCompleted(sprint);
        assertThat(events.list("bob").getFirst().sprintReport().assignees().getFirst().name()).isEqualTo("Non assignées");
        delivery.deliver();
        verify(mail).send(any(jakarta.mail.internet.MimeMessage.class));
        assertThat(jdbc.queryForObject("select email_pending from app_notification", Boolean.class)).isFalse();
    }

    @Test
    void permissionFromProfileIsAcceptedButInactiveMembersAreExcluded() {
        bob.setGrantedPermissions(new HashSet<>());
        var profile = new AccessProfile();
        profile.setPermissions(new HashSet<>(Set.of("PERM_SPRINT_ALERT_RECEIVE")));
        bob.setAccessProfile(profile);
        events.sprintCompleted(sprint);
        assertThat(events.list("bob")).hasSize(1);
        jdbc.update("delete from app_notification");
        jdbc.update("delete from sprint_completion_alert");
        bob.setActivated(false);
        events.sprintCompleted(sprint);
        assertThat(events.list("bob")).isEmpty();
    }

    @Test
    void transactionRollbackDoesNotLeaveAnAlertOrCompletionMarker() {
        var transaction = new org.springframework.transaction.support.TransactionTemplate(
            new org.springframework.jdbc.datasource.DataSourceTransactionManager(database)
        );
        transaction.executeWithoutResult(status -> {
            events.sprintCompleted(sprint);
            status.setRollbackOnly();
        });
        assertThat(events.list("bob")).isEmpty();
        assertThat(jdbc.queryForObject("select count(*) from sprint_completion_alert", Long.class)).isZero();
        events.sprintCompleted(sprint);
        assertThat(events.list("bob")).hasSize(1);
    }

    @Test
    void scheduledClosureRecordsItsReport() {
        var repository = mock(SprintRepository.class);
        var mapper = mock(com.cratechnologie.baaraboloda.service.mapper.SprintMapper.class);
        when(
            repository.findAllByStatusAndEndDateBefore(eq(com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus.ACTIVE), any())
        ).thenReturn(List.of(sprint));
        var service = new SprintService(repository, mapper, events);
        assertThat(service.completeExpiredSprints()).isEqualTo(1);
        assertThat(sprint.getStatus()).isEqualTo(com.cratechnologie.baaraboloda.domain.enumeration.SprintStatus.COMPLETED);
        assertThat(events.list("bob")).hasSize(1);
    }
}
