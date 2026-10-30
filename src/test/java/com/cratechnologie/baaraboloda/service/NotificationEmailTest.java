package com.cratechnologie.baaraboloda.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

import com.cratechnologie.baaraboloda.domain.*;
import com.cratechnologie.baaraboloda.domain.enumeration.TaskStatus;
import com.cratechnologie.baaraboloda.repository.*;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.embedded.*;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

class NotificationEmailTest {

    EmbeddedDatabase database;
    JdbcTemplate jdbc;
    NotificationService events;
    NotificationDeliveryService delivery;
    JavaMailSender mail;
    Task task;
    User bob;

    @BeforeEach
    void setup() throws Exception {
        database = new EmbeddedDatabaseBuilder().generateUniqueName(true).setType(EmbeddedDatabaseType.H2).build();
        jdbc = new JdbcTemplate(database);
        for (String change : List.of("20261008120000_notifications", "20261021120000_notification_email")) {
            try (var connection = database.getConnection()) {
                new liquibase.Liquibase(
                    "config/liquibase/changelog/" + change + ".xml",
                    new liquibase.resource.ClassLoaderResourceAccessor(),
                    liquibase.database.DatabaseFactory.getInstance().findCorrectDatabaseImplementation(
                        new liquibase.database.jvm.JdbcConnection(connection)
                    )
                ).update(new liquibase.Contexts(), new liquibase.LabelExpression());
            }
        }
        jdbc.execute("create table project(id bigint primary key, uuid varchar(36), name varchar(100))");
        jdbc.execute("create table task(id bigint primary key, uuid varchar(36), title varchar(100))");
        jdbc.execute("create table jhi_user(login varchar(50), email varchar(100), activated boolean)");
        jdbc.update("insert into project values(1, ?, ?)", "12af6573-08bb-4f1b-a0f3-792295679012", "Projet <CRA>");
        jdbc.update("insert into task values(10, ?, ?)", "78af6573-08bb-4f1b-a0f3-792295679012", "Corriger <script>alert(1)</script>");
        jdbc.update("insert into jhi_user values('bob','bob@example.test',true)");
        var users = mock(UserRepository.class);
        var tasks = mock(TaskRepository.class);
        bob = new User();
        bob.setId(2L);
        bob.setLogin("bob");
        bob.setActivated(true);
        when(users.findById(2L)).thenReturn(Optional.of(bob));
        task = new Task()
            .id(10L)
            .title("Corriger <script>alert(1)</script>")
            .project(new Project().id(1L))
            .assignee(bob)
            .reporter(bob)
            .status(TaskStatus.TODO);
        when(tasks.findById(10L)).thenReturn(Optional.of(task));
        events = new NotificationService(jdbc, users, tasks, new ObjectMapper());
        events.preferences("bob", new NotificationService.Preferences(false, true));
        mail = mock(JavaMailSender.class);
        when(mail.createMimeMessage()).thenAnswer(call -> new MimeMessage(Session.getInstance(new Properties())));
        delivery = new NotificationDeliveryService(jdbc, mail, new ObjectMapper());
        ReflectionTestUtils.setField(delivery, "emailEnabled", true);
        ReflectionTestUtils.setField(delivery, "baseUrl", "https://app.example.test");
        ReflectionTestUtils.setField(delivery, "from", "notifications@example.test");
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("alice", "ignored"));
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        database.shutdown();
    }

    @Test
    void sendsHtmlAndPlainTextWithUuidEvenAfterReadingAndDoesNotSendAgain() throws Exception {
        events.assignment(task, null);
        events.read("bob", null);
        delivery.deliver();
        delivery.deliver();
        var capture = org.mockito.ArgumentCaptor.forClass(MimeMessage.class);
        verify(mail, times(1)).send(capture.capture());
        var message = capture.getValue();
        message.saveChanges();
        // Decode the alternative MIME body to assert escaping and URLs independent of transfer encoding.
        var mixed = (jakarta.mail.Multipart) message.getContent();
        var related = (jakarta.mail.Multipart) mixed.getBodyPart(0).getContent();
        var alternatives = (jakarta.mail.Multipart) related.getBodyPart(0).getContent();
        String plain = (String) alternatives.getBodyPart(0).getContent();
        String html = (String) alternatives.getBodyPart(1).getContent();
        assertThat(plain).contains(
            "https://app.example.test/projects/12af6573-08bb-4f1b-a0f3-792295679012/tasks/78af6573-08bb-4f1b-a0f3-792295679012"
        );
        assertThat(html).contains("&lt;script&gt;", "Voir la tâche", "Projet &lt;CRA&gt;").doesNotContain("<script>");
        assertThat(message.getAllRecipients()[0].toString()).isEqualTo("bob@example.test");
        assertThat(
            jdbc.queryForObject("select count(*) from app_notification where email_sent_at is not null and email_pending=false", Long.class)
        ).isEqualTo(1);
    }

    @Test
    void handlesMysqlIntegerFlagsAndCommitsWithAutoCommitDisabled() throws Exception {
        jdbc.execute("set mode MySQL");
        jdbc.execute("alter table app_notification alter column email_pending integer");
        jdbc.execute("alter table app_notification alter column push_pending integer");
        var pool = new org.springframework.jdbc.datasource.DelegatingDataSource(database) {
            @Override
            public java.sql.Connection getConnection() throws java.sql.SQLException {
                var connection = super.getConnection();
                connection.setAutoCommit(false);
                return connection;
            }
        };
        ReflectionTestUtils.setField(delivery, "jdbc", new JdbcTemplate(pool));
        events.assignment(task, null);
        delivery.deliver();
        delivery.deliver();
        verify(mail, times(1)).send(any(MimeMessage.class));
        assertThat(jdbc.queryForObject("select email_pending from app_notification", Integer.class)).isZero();
        assertThat(jdbc.queryForObject("select count(*) from app_notification where email_sent_at is not null", Long.class)).isEqualTo(1);
    }

    @Test
    void retriesSmtpFailureThenRecordsSuccess() {
        events.comment(10L, "Bonjour");
        doThrow(new MailSendException("SMTP unavailable")).doNothing().when(mail).send(any(MimeMessage.class));
        delivery.deliver();
        assertThat(jdbc.queryForObject("select attempts from app_notification", Integer.class)).isEqualTo(1);
        assertThat(jdbc.queryForObject("select email_pending from app_notification", Boolean.class)).isTrue();
        delivery.deliver();
        verify(mail, times(1)).send(any(MimeMessage.class));
        jdbc.update("update app_notification set retry_at=null");
        delivery.deliver();
        verify(mail, times(2)).send(any(MimeMessage.class));
        assertThat(jdbc.queryForObject("select email_pending from app_notification", Boolean.class)).isFalse();
    }

    @Test
    void automaticCategoriesIgnoreLegacyOptOutsButRespectMasterSwitch() {
        events.preferences("bob", new NotificationService.Preferences(false, true, false, true, false));
        events.assignment(task, null);
        events.status(task, TaskStatus.DONE);
        events.taskUpdated(task);
        events.comment(10L, "Bonjour");
        assertThat(jdbc.queryForList("select kind from app_notification where email_pending=true", String.class)).containsExactlyInAnyOrder(
            "ASSIGNMENT",
            "STATUS",
            "COMMENT"
        );
        events.preferences("bob", new NotificationService.Preferences(false, false));
        delivery.deliver();
        verify(mail, never()).send(any(MimeMessage.class));
    }

    @Test
    void skipsDisabledAccountsAndSelfNotifications() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("bob", "ignored"));
        events.assignment(task, null);
        assertThat(events.unread("bob")).isZero();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("alice", "ignored"));
        events.assignment(task, null);
        jdbc.update("update jhi_user set activated=false");
        delivery.deliver();
        verify(mail, never()).send(any(MimeMessage.class));
        assertThat(jdbc.queryForObject("select email_pending from app_notification", Boolean.class)).isFalse();
    }

    @Test
    void rolledBackActionNeverReachesDelivery() {
        new TransactionTemplate(new DataSourceTransactionManager(database)).executeWithoutResult(status -> {
            events.assignment(task, null);
            status.setRollbackOnly();
        });
        delivery.deliver();
        verify(mail, never()).send(any(MimeMessage.class));
        assertThat(events.unread("bob")).isZero();
    }

    @Test
    void stopsAfterFiveFailedAttempts() {
        events.assignment(task, null);
        doThrow(new MailSendException("SMTP unavailable")).when(mail).send(any(MimeMessage.class));
        for (int i = 0; i < 6; i++) {
            jdbc.update("update app_notification set retry_at=null");
            delivery.deliver();
        }
        verify(mail, times(5)).send(any(MimeMessage.class));
        assertThat(jdbc.queryForObject("select attempts from app_notification", Integer.class)).isEqualTo(5);
    }

    @Test
    void disabledTransportKeepsPendingEmailForLater() {
        events.assignment(task, null);
        ReflectionTestUtils.setField(delivery, "emailEnabled", false);
        delivery.deliver();
        verify(mail, never()).send(any(MimeMessage.class));
        assertThat(jdbc.queryForObject("select email_pending from app_notification", Boolean.class)).isTrue();
    }
}
