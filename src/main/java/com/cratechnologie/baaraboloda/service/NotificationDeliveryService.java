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
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
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
            "select * from app_notification where (email_pending=true or push_pending=true) and attempts<5 and (retry_at is null or retry_at<=?) and (kind<>'COMMENT' or created_at<=?) order by created_at limit 50",
            now,
            Timestamp.from(Instant.now().minusSeconds(60))
        );
        for (var row : rows) {
            String id = (String) row.get("id");
            if (
                jdbc.update(
                    "update app_notification set retry_at=? where id=? and (email_pending=true or push_pending=true) and (retry_at is null or retry_at<=?)",
                    Timestamp.from(Instant.now().plusSeconds(120)),
                    id,
                    now
                ) == 0
            ) continue;
            boolean failed = false;
            row = jdbc.queryForMap("select * from app_notification where id=?", id);
            String login = (String) row.get("recipient");
            String path = "/projects/" + row.get("project_id") + "/tasks/" + row.get("task_id");
            boolean unread = row.get("read_at") == null;
            if (Boolean.TRUE.equals(row.get("email_pending"))) {
                if (!unread || !emailEnabled || !emailPreference(login)) jdbc.update(
                    "update app_notification set email_pending=false where id=?",
                    id
                );
                else try {
                    String email = jdbc.queryForObject("select email from jhi_user where login=? and activated=true", String.class, login);
                    var grouped = "COMMENT".equals(row.get("kind"))
                        ? jdbc.queryForList(
                              "select id,message from app_notification where recipient=? and task_id=? and kind='COMMENT' and email_pending=true and read_at is null and attempts<5 and created_at<=? and (id=? or retry_at is null or retry_at<=?) order by created_at limit 50",
                              login,
                              row.get("task_id"),
                              Timestamp.from(Instant.now().minusSeconds(60)),
                              id,
                              now
                          )
                        : List.of(row);
                    if (email != null && !email.isBlank()) {
                        SimpleMailMessage message = new SimpleMailMessage();
                        message.setFrom(from);
                        message.setTo(email);
                        message.setSubject("Baara Boloda · Nouvelle notification");
                        message.setText(
                            grouped
                                .stream()
                                .map(item -> (String) item.get("message"))
                                .collect(java.util.stream.Collectors.joining("\n")) +
                                "\n\nOuvrir la tâche : " +
                                baseUrl.replaceAll("/$", "") +
                                path
                        );
                        mail.send(message);
                    }
                    for (var item : grouped) jdbc.update("update app_notification set email_pending=false where id=?", item.get("id"));
                } catch (Exception error) {
                    failed = true;
                }
            }
            if (Boolean.TRUE.equals(row.get("push_pending"))) {
                if (!unread || pushKey().isBlank()) jdbc.update("update app_notification set push_pending=false where id=?", id);
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
                        if (code == 404 || code == 410) jdbc.update(
                            "delete from notification_push_subscription where endpoint_hash=?",
                            subscription.get("endpoint_hash")
                        );
                        else if (code >= 300) throw new IllegalStateException("Push failed");
                    }
                    jdbc.update("update app_notification set push_pending=false where id=?", id);
                } catch (Exception error) {
                    failed = true;
                }
            }
            if (failed) org.slf4j.LoggerFactory.getLogger(NotificationDeliveryService.class).warn(
                "Notification delivery failed for {}; retry scheduled",
                id
            );
            if (failed) jdbc.update(
                "update app_notification set attempts=attempts+1, retry_at=? where id=?",
                Timestamp.from(Instant.now().plusSeconds(120)),
                id
            );
        }
    }

    private boolean emailPreference(String login) {
        return jdbc
            .query("select email_enabled from notification_preferences where login=?", (rs, row) -> rs.getBoolean(1), login)
            .stream()
            .findFirst()
            .orElse(false);
    }
}
