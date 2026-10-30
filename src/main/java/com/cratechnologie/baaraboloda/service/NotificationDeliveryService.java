package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.web.rest.errors.BadRequestAlertException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.util.HtmlUtils;
import tools.jackson.databind.ObjectMapper;

@Service
public class NotificationDeliveryService {

    public record Subscription(String endpoint, Map<String, String> keys) {}

    private final JdbcTemplate jdbc;
    private final JavaMailSender mail;
    private final ObjectMapper mapper;

    @Value("${notifications.email-enabled:false}")
    private boolean emailEnabled;

    @Value("${notifications.base-url:http://localhost:4200}")
    private String baseUrl;

    @Value("${jhipster.mail.from:notifications@localhost}")
    private String from;

    @Value("${notifications.vapid-public-key:}")
    private String publicKey;

    @Value("${notifications.vapid-private-key:}")
    private String privateKey;

    @Value("${notifications.vapid-subject:mailto:admin@example.com}")
    private String subject;

    public NotificationDeliveryService(JdbcTemplate jdbc, JavaMailSender mail, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mail = mail;
        this.mapper = mapper;
    }

    public boolean emailAvailable() {
        return emailEnabled;
    }

    public String pushKey() {
        return privateKey.isBlank() ? "" : publicKey;
    }

    public void subscribe(String login, Subscription sub) {
        try {
            URI uri = URI.create(sub.endpoint());
            String host = uri.getHost();
            boolean allowed =
                host != null &&
                (host.equals("fcm.googleapis.com") ||
                    host.equals("updates.push.services.mozilla.com") ||
                    host.equals("web.push.apple.com") ||
                    host.endsWith(".notify.windows.com"));
            if (
                !allowed ||
                !"https".equals(uri.getScheme()) ||
                uri.getUserInfo() != null ||
                (uri.getPort() != -1 && uri.getPort() != 443) ||
                sub.endpoint().length() > 2048 ||
                sub.keys() == null ||
                Base64.getUrlDecoder().decode(sub.keys().get("p256dh")).length != 65 ||
                Base64.getUrlDecoder().decode(sub.keys().get("auth")).length != 16
            ) throw new IllegalArgumentException();
            if (pushKey().isBlank()) throw new IllegalArgumentException();
            String hash = hash(sub.endpoint());
            if (
                jdbc.update(
                    "update notification_push_subscription set login=?, p256dh=?, auth_key=? where endpoint_hash=?",
                    login,
                    sub.keys().get("p256dh"),
                    sub.keys().get("auth"),
                    hash
                ) == 0
            ) {
                if (
                    jdbc.queryForObject("select count(*) from notification_push_subscription where login=?", Long.class, login) >= 5
                ) throw new IllegalArgumentException();
                jdbc.update(
                    "insert into notification_push_subscription(endpoint_hash,login,endpoint,p256dh,auth_key) values(?,?,?,?,?)",
                    hash,
                    login,
                    sub.endpoint(),
                    sub.keys().get("p256dh"),
                    sub.keys().get("auth")
                );
            }
        } catch (Exception exception) {
            throw new BadRequestAlertException("Abonnement push invalide ou push non configuré.", "notification", "invalidsubscription");
        }
    }

    public void unsubscribe(String login, String endpoint) {
        jdbc.update("delete from notification_push_subscription where login=? and endpoint_hash=?", login, hash(endpoint));
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception error) {
            throw new IllegalArgumentException();
        }
    }

    @Scheduled(fixedDelay = 15000)
    public void deliver() {
        var now = Timestamp.from(Instant.now());
        var rows = jdbc.queryForList(
            "select * from app_notification where (email_pending=true or push_pending=true) and attempts<5 and (retry_at is null or retry_at<=?) order by created_at limit 50",
            now
        );
        for (var row : rows) {
            String id = (String) row.get("id");
            if (
                updateDelivery(
                    "update app_notification set retry_at=? where id=? and (email_pending=true or push_pending=true) and (retry_at is null or retry_at<=?)",
                    Timestamp.from(Instant.now().plusSeconds(120)),
                    id,
                    now
                ) == 0
            ) continue;
            boolean failed = false;
            row = jdbc.queryForMap(
                "select n.*, p.uuid as project_uuid, p.name as project_name, t.uuid as task_uuid, t.title as task_title from app_notification n left join project p on p.id=n.project_id left join task t on t.id=n.task_id where n.id=?",
                id
            );
            String login = (String) row.get("recipient");
            boolean sprintAlert = "SPRINT_INCOMPLETE".equals(row.get("kind"));
            String path =
                "/projects/" +
                row.get("project_uuid") +
                ("TASK_DELETED".equals(row.get("kind")) ? "/board" : "/tasks/" + row.get("task_uuid"));
            if (sprintAlert) path = "/projects/" + row.get("project_uuid") + "/sprints";
            boolean unread = row.get("read_at") == null;
            if (enabled(row.get("email_pending")) && emailEnabled) {
                if (
                    (!sprintAlert && (!emailPreference(login, (String) row.get("kind")) || row.get("task_uuid") == null)) ||
                    row.get("project_uuid") == null
                ) {
                    updateDelivery("update app_notification set email_pending=false where id=?", id);
                } else try {
                    var emails = jdbc.query(
                        "select email from jhi_user where login=? and activated=true",
                        (rs, index) -> rs.getString(1),
                        login
                    );
                    if (!emails.isEmpty() && emails.getFirst() != null && !emails.getFirst().isBlank()) {
                        sendEmail(emails.getFirst(), row, path);
                        updateDelivery(
                            "update app_notification set email_pending=false, email_sent_at=? where id=?",
                            Timestamp.from(Instant.now()),
                            id
                        );
                    } else {
                        updateDelivery("update app_notification set email_pending=false where id=?", id);
                    }
                } catch (Exception error) {
                    failed = true;
                }
            }
            if (enabled(row.get("push_pending"))) {
                if (!unread || pushKey().isBlank()) updateDelivery("update app_notification set push_pending=false where id=?", id);
                else try {
                    java.security.Security.addProvider(new BouncyCastleProvider());
                    PushService push = new PushService(publicKey, privateKey, subject);
                    var subscriptions = jdbc.queryForList("select * from notification_push_subscription where login=?", login);
                    for (var subscription : subscriptions) {
                        String payload = mapper.writeValueAsString(
                            Map.of("title", "Baara Boloda", "body", "Vous avez une nouvelle notification.", "url", path, "id", id)
                        );
                        var response = push.send(
                            new Notification(
                                (String) subscription.get("endpoint"),
                                (String) subscription.get("p256dh"),
                                (String) subscription.get("auth_key"),
                                payload
                            )
                        );
                        int code = response.getStatusLine().getStatusCode();
                        if (code == 404 || code == 410) updateDelivery(
                            "delete from notification_push_subscription where endpoint_hash=?",
                            subscription.get("endpoint_hash")
                        );
                        else if (code >= 300) throw new IllegalStateException("Push failed");
                    }
                    updateDelivery("update app_notification set push_pending=false where id=?", id);
                } catch (Exception error) {
                    failed = true;
                }
            }
            if (failed) org.slf4j.LoggerFactory.getLogger(NotificationDeliveryService.class).warn(
                "Notification delivery failed for {}; retry scheduled",
                id
            );
            if (failed) updateDelivery(
                "update app_notification set attempts=attempts+1, retry_at=? where id=?",
                Timestamp.from(Instant.now().plusSeconds(120)),
                id
            );
        }
    }

    private static boolean enabled(Object value) {
        return Boolean.TRUE.equals(value) || (value instanceof Number number && number.intValue() != 0);
    }

    // The application pool disables auto-commit. Scheduler writes need an explicit
    // transaction, committed before SMTP and separately after each delivery.
    private int updateDelivery(String sql, Object... args) {
        var transaction = new org.springframework.transaction.support.TransactionTemplate(
            new org.springframework.jdbc.datasource.DataSourceTransactionManager(Objects.requireNonNull(jdbc.getDataSource()))
        );
        transaction.setPropagationBehavior(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        return transaction.execute(status -> jdbc.update(sql, args));
    }

    private void sendEmail(String email, Map<String, Object> row, String path) throws jakarta.mail.MessagingException {
        if ("SPRINT_INCOMPLETE".equals(row.get("kind"))) {
            sendSprintEmail(email, row, path);
            return;
        }
        String title = switch ((String) row.get("kind")) {
            case "ASSIGNMENT" -> "Une tâche vous a été attribuée";
            case "COMMENT" -> "Nouveau commentaire";
            case "MENTION" -> "Vous avez été mentionné";
            case "STATUS" -> "Changement de statut";
            default -> "Nouvelle notification";
        };
        String project = Objects.toString(row.get("project_name"), "Votre projet");
        String task = Objects.toString(row.get("task_title"), "Votre tâche");
        String text = Objects.toString(row.get("message"), "");
        String url = baseUrl.replaceAll("/$", "") + path;
        var message = mail.createMimeMessage();
        var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        helper.setFrom(from);
        helper.setTo(email);
        helper.setSubject("Baara Boloda · " + title);
        String html = """
        <!doctype html><html lang="fr"><body style="margin:0;background:#f1f6f9;font-family:Arial,sans-serif;color:#203747">
        <div style="max-width:560px;margin:32px auto;padding:32px;background:#fff;border:1px solid #dce8ee;border-radius:16px">
        <p style="color:#237d99;font-weight:bold">CRA TECHNOLOGIE · BAARA BOLODA</p>
        <h1 style="font-size:24px">%s</h1><p style="color:#526b7b">Projet : %s</p>
        <h2 style="font-size:18px">%s</h2><p style="line-height:1.6">%s</p>
        <p style="margin:28px 0"><a href="%s" style="display:inline-block;background:#237d99;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none">Voir la tâche</a></p>
        <p style="font-size:12px;color:#526b7b">Cette notification vous est adressée automatiquement car cet événement vous concerne.</p>
        </div></body></html>
        """.formatted(escape(title), escape(project), escape(task), escape(text), escape(url));
        helper.setText(project + " · " + task + "\n\n" + text + "\n\nVoir la tâche : " + url, html);
        mail.send(message);
    }

    private void sendSprintEmail(String email, Map<String, Object> row, String path) throws jakarta.mail.MessagingException {
        var report = jdbc.queryForObject(
            "select details from sprint_completion_alert where sprint_id=?",
            (rs, index) -> mapper.readValue(rs.getString(1), NotificationService.SprintReport.class),
            row.get("sprint_id")
        );
        String url = baseUrl.replaceAll("/$", "") + path;
        StringBuilder text = new StringBuilder(report.projectName() + " · " + report.name() + "\n" + row.get("message") + "\n");
        StringBuilder html = new StringBuilder(
            "<html lang=\"fr\"><body><h1>Période terminée</h1><h2>" +
                escape(report.projectName()) +
                " · " +
                escape(report.name()) +
                "</h2><p>" +
                escape(row.get("message").toString()) +
                "</p>"
        );
        for (var group : report.assignees()) {
            text.append("\n").append(group.name()).append("\n");
            html.append("<h3>").append(escape(group.name())).append("</h3>");
            if (group.imageUrl() != null && group.imageUrl().startsWith("https://")) html.append(
                "<img width=\"48\" height=\"48\" alt=\"\" src=\""
            )
                .append(escape(group.imageUrl()))
                .append("\" />");
            html.append("<ul>");
            for (var task : group.tasks()) {
                String taskUrl = baseUrl.replaceAll("/$", "") + "/projects/" + row.get("project_uuid") + "/tasks/" + task.uuid();
                String status = switch (task.status()) {
                    case "IN_PROGRESS" -> "En cours";
                    case "IN_REVIEW" -> "En revue";
                    default -> "À faire";
                };
                text.append("- ").append(task.title()).append(" · ").append(status).append(" : ").append(taskUrl).append("\n");
                html.append("<li><a href=\"")
                    .append(escape(taskUrl))
                    .append("\">")
                    .append(escape(task.title()))
                    .append("</a> · ")
                    .append(status)
                    .append("</li>");
            }
            html.append("</ul>");
        }
        html.append("<p><a href=\"").append(escape(url)).append("\">Consulter les périodes du projet</a></p></body></html>");
        text.append("\nConsulter les périodes du projet : ").append(url);
        var message = mail.createMimeMessage();
        var helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
        helper.setFrom(from);
        helper.setTo(email);
        helper.setSubject("Baara Boloda · Période terminée : tâches à finaliser");
        helper.setText(text.toString(), html.toString());
        mail.send(message);
    }

    private static String escape(String value) {
        return HtmlUtils.htmlEscape(value);
    }

    private boolean emailPreference(String login, String kind) {
        return jdbc
            .query(
                "select * from notification_preferences where login=?",
                (rs, row) ->
                    new NotificationService.Preferences(
                        rs.getBoolean("sound_enabled"),
                        rs.getBoolean("email_enabled"),
                        rs.getBoolean("assignment_email"),
                        rs.getBoolean("comment_email"),
                        rs.getBoolean("status_email")
                    ).accepts(kind),
                login
            )
            .stream()
            .findFirst()
            .orElse(false);
    }
}
