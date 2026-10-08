package com.cratechnologie.baaraboloda.web.rest;

import com.cratechnologie.baaraboloda.service.NotificationDeliveryService;
import com.cratechnologie.baaraboloda.service.NotificationService;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
public class NotificationResource {

    private final NotificationService notifications;
    private final NotificationDeliveryService delivery;

    public NotificationResource(NotificationService notifications, NotificationDeliveryService delivery) {
        this.notifications = notifications;
        this.delivery = delivery;
    }

    @GetMapping
    public Map<String, Object> list() {
        String login = notifications.currentLogin();
        return Map.of("items", notifications.list(login), "unread", notifications.unread(login));
    }

    @PostMapping("/read-all")
    public void readAll() {
        notifications.read(notifications.currentLogin(), null);
    }

    @PostMapping("/{id}/read")
    public void read(@PathVariable String id) {
        notifications.read(notifications.currentLogin(), id);
    }

    @GetMapping("/preferences")
    public Map<String, Object> preferences() {
        return Map.of(
            "preferences",
            notifications.preferences(notifications.currentLogin()),
            "emailAvailable",
            delivery.emailAvailable(),
            "pushKey",
            delivery.pushKey()
        );
    }

    @PutMapping("/preferences")
    public void preferences(@RequestBody NotificationService.Preferences preferences) {
        notifications.preferences(notifications.currentLogin(), preferences);
    }

    @GetMapping(value = "/stream", produces = "text/event-stream")
    public SseEmitter stream() {
        return notifications.stream(notifications.currentLogin());
    }

    @PostMapping("/push")
    public void subscribe(@RequestBody NotificationDeliveryService.Subscription subscription) {
        delivery.subscribe(notifications.currentLogin(), subscription);
    }

    @DeleteMapping("/push")
    public void unsubscribe(@RequestBody Map<String, String> body) {
        delivery.unsubscribe(notifications.currentLogin(), body.get("endpoint"));
    }
}
