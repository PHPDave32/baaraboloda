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
import tools.jackson.databind.ObjectMapper;

@Service
@Transactional
public class NotificationService {

    public record Item(
        String id,
        String kind,
        String message,
        Long taskId,
        Long projectId,
        Instant createdAt,
        boolean read,
        String projectUuid,
        String taskUuid,
        SprintReport sprintReport
    ) {}

    public record RemainingTask(String uuid, String title, String status) {}

    public record AssigneeReport(String login, String name, String imageUrl, List<RemainingTask> tasks) {}

    public record SprintReport(String uuid, String name, String projectName, List<AssigneeReport> assignees) {}

    public SprintReport sprintReport(Long sprintId) {
        return jdbc
            .query(
                "select details from sprint_completion_alert where sprint_id=?",
                (rs, row) -> objectMapper.readValue(rs.getString(1), SprintReport.class),
                sprintId
            )
            .stream()
            .findFirst()
            .orElse(null);
    }

    public void sprintCompleted(com.cratechnologie.baaraboloda.domain.Sprint sprint) {
        // Serialize concurrent automatic/manual closures and retain one immutable report per period.
        jdbc.queryForObject("select id from sprint where id=? for update", Long.class, sprint.getId());
        if (jdbc.queryForObject("select count(*) from sprint_completion_alert where sprint_id=?", Long.class, sprint.getId()) > 0) return;
        var remaining = tasks
            .findAllBySprint_IdOrderByPositionAsc(sprint.getId())
            .stream()
            .filter(task -> task.getStatus() != com.cratechnologie.baaraboloda.domain.enumeration.TaskStatus.DONE)
            .toList();
        Map<String, List<Task>> grouped = new LinkedHashMap<>();
        remaining.forEach(task ->
            grouped.computeIfAbsent(task.getAssignee() == null ? "" : task.getAssignee().getLogin(), key -> new ArrayList<>()).add(task)
        );
        var groups = grouped
            .entrySet()
            .stream()
            .map(entry -> {
                var user = entry.getValue().getFirst().getAssignee();
                String name =
                    user == null
                        ? "Non assignées"
                        : (Objects.toString(user.getFirstName(), "") + " " + Objects.toString(user.getLastName(), "")).trim();
                if (name.isBlank()) name = user.getLogin();
                return new AssigneeReport(
                    entry.getKey(),
                    name,
                    user == null ? null : user.getImageUrl(),
                    entry
                        .getValue()
                        .stream()
                        .map(task ->
                            new RemainingTask(task.getUuid(), task.getTitle(), task.getStatus() == null ? "TODO" : task.getStatus().name())
                        )
                        .toList()
                );
            })
            .toList();
        var report = new SprintReport(sprint.getUuid(), sprint.getName(), sprint.getProject().getName(), groups);
        jdbc.update(
            "insert into sprint_completion_alert(sprint_id,details) values(?,?)",
            sprint.getId(),
            objectMapper.writeValueAsString(report)
        );
        if (remaining.isEmpty()) return;
        Set<String> recipients = new HashSet<>();
        users.findActiveSuperAdmins().forEach(user -> recipients.add(user.getLogin()));
        users.findProjectNotificationRecipientIds(sprint.getProject().getId()).forEach(id ->
            users
                .findById(id)
                .filter(
                    user ->
                        user.isActivated() &&
                        com.cratechnologie.baaraboloda.security.EffectiveAuthorities.of(user).contains("PERM_SPRINT_ALERT_RECEIVE")
                )
                .ifPresent(user -> recipients.add(user.getLogin()))
        );
        String message =
            "Période « " +
            sprint.getName() +
            " » terminée : " +
            remaining.size() +
            " tâche(s) restent à finaliser. Les objectifs sont à vérifier.";
        for (String login : recipients) {
            jdbc.update(
                "insert into app_notification(id,recipient,kind,message,project_id,sprint_id,created_at,email_pending,push_pending,attempts) values(?,?,?,?,?,?,?,true,false,0)",
                UUID.randomUUID().toString(),
                login,
                "SPRINT_INCOMPLETE",
                message.substring(0, Math.min(500, message.length())),
                sprint.getProject().getId(),
                sprint.getId(),
                Timestamp.from(Instant.now())
            );
            refreshAfterCommit(login);
        }
    }

    public record Preferences(
        boolean soundEnabled,
        boolean emailEnabled,
        Boolean assignmentEmail,
        Boolean commentEmail,
        Boolean statusEmail
    ) {
        public Preferences {
            // Categories are application policy, including for legacy saved preferences.
            assignmentEmail = true;
            commentEmail = true;
            statusEmail = true;
        }

        public Preferences(boolean soundEnabled, boolean emailEnabled) {
            this(soundEnabled, emailEnabled, true, true, true);
        }

        public boolean accepts(String kind) {
            return (
                emailEnabled &&
                switch (kind) {
                    case "ASSIGNMENT" -> assignmentEmail;
                    case "COMMENT", "MENTION" -> commentEmail;
                    case "STATUS" -> statusEmail;
                    default -> false;
                }
            );
        }
    }

    private final JdbcTemplate jdbc;
    private final UserRepository users;
    private final TaskRepository tasks;
    private final ObjectMapper objectMapper;
    private final Set<String> pendingRefresh = ConcurrentHashMap.newKeySet();
    private final Map<String, CopyOnWriteArrayList<SseEmitter>> streams = new ConcurrentHashMap<>();

    public NotificationService(JdbcTemplate jdbc, UserRepository users, TaskRepository tasks, ObjectMapper objectMapper) {
        this.jdbc = jdbc;
        this.users = users;
        this.tasks = tasks;
        this.objectMapper = objectMapper;
    }

    public String currentLogin() {
        return SecurityUtils.getCurrentUserLogin().orElseThrow(() ->
            new org.springframework.security.access.AccessDeniedException("Connexion requise")
        );
    }

    public List<Item> list(String login) {
        return jdbc.query(
            "select n.*, p.uuid as project_uuid, t.uuid as task_uuid from app_notification n left join project p on p.id=n.project_id left join task t on t.id=n.task_id where n.recipient=? order by n.created_at desc, n.id desc limit 50",
            (rs, row) ->
                new Item(
                    rs.getString("id"),
                    rs.getString("kind"),
                    rs.getString("message"),
                    rs.getLong("task_id"),
                    rs.getLong("project_id"),
                    rs.getTimestamp("created_at").toInstant(),
                    rs.getTimestamp("read_at") != null,
                    rs.getString("project_uuid"),
                    rs.getString("task_uuid"),
                    "SPRINT_INCOMPLETE".equals(rs.getString("kind")) ? sprintReport(rs.getLong("sprint_id")) : null
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
                (rs, row) ->
                    new Preferences(
                        rs.getBoolean("sound_enabled"),
                        rs.getBoolean("email_enabled"),
                        rs.getBoolean("assignment_email"),
                        rs.getBoolean("comment_email"),
                        rs.getBoolean("status_email")
                    ),
                login
            )
            .stream()
            .findFirst()
            .orElse(new Preferences(false, false));
    }

    public void preferences(String login, Preferences value) {
        if (
            jdbc.update(
                "update notification_preferences set sound_enabled=?, email_enabled=?, assignment_email=?, comment_email=?, status_email=? where login=?",
                value.soundEnabled(),
                value.emailEnabled(),
                value.assignmentEmail(),
                value.commentEmail(),
                value.statusEmail(),
                login
            ) == 0
        ) jdbc.update(
            "insert into notification_preferences(login,sound_enabled,email_enabled,assignment_email,comment_email,status_email) values(?,?,?,?,?,?)",
            login,
            value.soundEnabled(),
            value.emailEnabled(),
            value.assignmentEmail(),
            value.commentEmail(),
            value.statusEmail()
        );
    }

    public void taskCreated(Task task) {
        taskEvent(task, "TASK_CREATED", "a créé la tâche");
    }

    public void taskUpdated(Task task) {
        taskEvent(task, "TASK_UPDATED", "a modifié la tâche");
    }

    public void taskDeleted(Task task) {
        taskEvent(task, "TASK_DELETED", "a supprimé la tâche");
    }

    private void taskEvent(Task task, String kind, String action) {
        Set<Long> recipients = recipients(task);
        recipients.addAll(users.findProjectNotificationRecipientIds(task.getProject().getId()));
        recipients.forEach(id -> record(id, task, kind, action));
    }

    public void assignment(Task task, Long previousAssignee) {
        Long next = task.getAssignee() == null ? null : task.getAssignee().getId();
        if (next != null && !Objects.equals(previousAssignee, next)) record(next, task, "ASSIGNMENT", "vous a assigné la tâche");
    }

    public void status(Task task, Object previousStatus) {
        if (Objects.equals(previousStatus, task.getStatus())) return;
        if (task.getReporter() != null && task.getReporter().getId() != null) {
            String label =
                task.getStatus() == null
                    ? "non défini"
                    : switch (task.getStatus()) {
                          case TODO -> "À faire";
                          case IN_PROGRESS -> "En cours";
                          case IN_REVIEW -> "En revue";
                          case DONE -> "Terminée";
                      };
            record(task.getReporter().getId(), task, "STATUS", "a changé le statut de la tâche en « " + label + " » :");
        }
    }

    public void comment(Long taskId, String content) {
        Task task = tasks.findById(taskId).orElseThrow();
        Set<Long> recipients = recipients(task);
        Set<Long> mentioned = new HashSet<>();
        var matcher = Pattern.compile("(?<![\\w@])@([a-zA-Z0-9!$&*+=?^_`{|}~.@-]{1,50})(?![a-zA-Z0-9!$&*+=?^_`{|}~.@-])").matcher(
            content == null ? "" : content
        );
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
                    preferences(login).accepts(kind),
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
