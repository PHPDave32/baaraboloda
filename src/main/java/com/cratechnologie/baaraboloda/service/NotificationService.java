package com.cratechnologie.baaraboloda.service;

import com.cratechnologie.baaraboloda.domain.Task;
import com.cratechnologie.baaraboloda.repository.TaskRepository;
import com.cratechnologie.baaraboloda.repository.UserRepository;
import com.cratechnologie.baaraboloda.security.SecurityUtils;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
@Transactional
public class NotificationService {

    public record Item(String id, String kind, String message, Long taskId, Long projectId, Instant createdAt, boolean read) {}

    public record Preferences(boolean soundEnabled, boolean emailEnabled) {}

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final TaskRepository tasks;
    private final Set<String> pendingRefresh = ConcurrentHashMap.newKeySet();
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> streams = new ConcurrentHashMap<>();

    public NotificationService(JdbcTemplate jdbc, UserRepository users, TaskRepository tasks) {
        this.jdbc = jdbc;
        this.users = users;
        this.tasks = tasks;
    }

    public String currentLogin() {
        return SecurityUtils.getCurrentUserLogin().orElseThrow(() ->
            new org.springframework.security.access.AccessDeniedException("Connexion requise")
        );
    }

    public List<Item> list(String login) {
        return jdbc.query(
            "select * from app_notification where recipient=? order by created_at desc, id desc limit 50",
            (rs, row) ->
                new Item(
                    rs.getString("id"),
                    rs.getString("kind"),
                    rs.getString("message"),
                    rs.getLong("task_id"),
                    rs.getLong("project_id"),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getTimestamp("read_at") != null
                ),
            login
        );
    }

    public long unread(String login) {
        return jdbc.queryForObject("select count(*) from app_notification where recipient=? and read_at is null", Long.class, login);
    }

    public void read(String login, String id) {
        if (id == null) jdbc.update(
            "update app_notification set read_at=? where recipient=? and read_at is null",
            Timestamp.from(Instant.now()),
            login
        );
        else jdbc.update(
            "update app_notification set read_at=? where recipient=? and id=? and read_at is null",
            Timestamp.from(Instant.now()),
            login,
            id
        );
        refreshAfterCommit(login);
    }

    public Preferences preferences(String login) {
        return jdbc
            .query(
                "select * from notification_preferences where login=?",
                (rs, row) -> new Preferences(rs.getBoolean("sound_enabled"), rs.getBoolean("email_enabled")),
                login
            )
            .stream()
            .findFirst()
            .orElse(new Preferences(false, false));
    }

    public void preferences(String login, Preferences value) {
        if (
            jdbc.update(
                "update notification_preferences set sound_enabled=?, email_enabled=? where login=?",
                value.soundEnabled(),
                value.emailEnabled(),
                login
            ) == 0
        ) jdbc.update(
            "insert into notification_preferences(login,sound_enabled,email_enabled) values(?,?,?)",
            login,
            value.soundEnabled(),
            value.emailEnabled()
        );
    }

    public void assignment(Task task, Long previousAssignee) {
        Long next = task.getAssignee() == null ? null : task.getAssignee().getId();
        if (next != null && !Objects.equals(previousAssignee, next)) record(next, task, "ASSIGNMENT", "vous a assigné la tâche");
    }

    public void status(Task task, Object previousStatus) {
        if (Objects.equals(previousStatus, task.getStatus())) return;
        Set<Long> recipients = recipients(task);
        recipients.forEach(id -> record(id, task, "STATUS", "a changé le statut de la tâche"));
    }

    public void comment(Long taskId, String content) {
        Task task = tasks.findById(taskId).orElseThrow();
        Set<Long> recipients = recipients(task);
        Set<Long> mentioned = new HashSet<>();
        var matcher = Pattern.compile("(?<![\\w@])@([\\w.\\-]{1,50})").matcher(content == null ? "" : content);
        while (matcher.find())
            users.findOneByLogin(matcher.group(1)).ifPresent(user -> {
                if (
                    users.isMemberOfProject(user.getId(), task.getProject().getId()) ||
                    (task.getReporter() != null && Objects.equals(task.getReporter().getId(), user.getId())) ||
                    (task.getAssignee() != null && Objects.equals(task.getAssignee().getId(), user.getId()))
                ) mentioned.add(user.getId());
            });
        recipients.addAll(mentioned);
        recipients.forEach(id ->
            record(
                id,
                task,
                mentioned.contains(id) ? "MENTION" : "COMMENT",
                mentioned.contains(id) ? "vous a mentionné sur la tâche" : "a commenté la tâche"
            )
        );
    }

    private Set<Long> recipients(Task task) {
        Set<Long> ids = new HashSet<>();
        if (task.getReporter() != null) ids.add(task.getReporter().getId());
        if (task.getAssignee() != null) ids.add(task.getAssignee().getId());
        ids.remove(null);
        return ids;
    }

    private void record(Long userId, Task task, String kind, String action) {
        String actor = SecurityUtils.getCurrentUserLogin().orElse(null);
        users
            .findById(userId)
            .filter(user -> user.isActivated() && !user.getLogin().equals(actor))
            .ifPresent(user -> {
                String login = user.getLogin();
                String message = (actor == null ? "Un utilisateur" : actor) + " " + action + " « " + task.getTitle() + " ».";
                if (message.length() > 500) message = message.substring(0, 500);
                boolean push =
                    jdbc.queryForObject("select count(*) from notification_push_subscription where login=?", Long.class, login) > 0;
                jdbc.update(
                    "insert into app_notification(id,recipient,actor,kind,message,task_id,project_id,created_at,email_pending,push_pending,attempts) values(?,?,?,?,?,?,?,?,?,?,0)",
                    UUID.randomUUID().toString(),
                    login,
                    actor,
                    kind,
                    message,
                    task.getId(),
                    task.getProject().getId(),
                    Timestamp.from(Instant.now()),
                    preferences(login).emailEnabled(),
                    push
                );
                refreshAfterCommit(login);
            });
    }

    private void refreshAfterCommit(String login) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) TransactionSynchronizationManager.registerSynchronization(
            new TransactionSynchronization() {
                public void afterCommit() {
                    pendingRefresh.add(login);
                }
            }
        );
        else pendingRefresh.add(login);
    }

    public SseEmitter stream(String login) {
        SseEmitter emitter = new SseEmitter(60000L);
        var list = streams.computeIfAbsent(login, key -> new CopyOnWriteArrayList<>());
        list.add(emitter);
        Runnable cleanup = () -> {
            list.remove(emitter);
            if (list.isEmpty()) streams.remove(login, list);
        };
        emitter.onCompletion(cleanup);
        emitter.onTimeout(() -> {
            cleanup.run();
            emitter.complete();
        });
        emitter.onError(error -> cleanup.run());
        try {
            emitter.send(SseEmitter.event().name("ready").data("ready"));
        } catch (Exception error) {
            cleanup.run();
        }
        return emitter;
    }

    private void send(String login, String event) {
        var list = streams.get(login);
        if (list == null) return;
        for (SseEmitter emitter : list)
            try {
                emitter.send(SseEmitter.event().name(event).data(event));
            } catch (Exception error) {
                list.remove(emitter);
                emitter.complete();
            }
    }

    @Scheduled(fixedDelay = 1000)
    public void publishRefreshes() {
        for (String login : pendingRefresh.toArray(String[]::new)) {
            if (pendingRefresh.remove(login)) send(login, "refresh");
        }
    }

    @Scheduled(fixedDelay = 20000)
    public void heartbeat() {
        streams.keySet().forEach(login -> send(login, "heartbeat"));
    }
}
