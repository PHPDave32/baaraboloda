import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AppNotification, NotificationService } from './notification.service';

@Component({
  selector: 'jhi-notification-toast',
  template: `
    @for (notice of notifications.notice() ? [notifications.notice()!] : []; track notice.id) {
      <div class="notification-toast" role="status" aria-live="polite">
        <span class="toast-emblem" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
        <button type="button" class="toast-content" (click)="openTask(notice)">
          <span class="toast-eyebrow">VOTRE ÉQUIPE · À L’INSTANT</span>
          <strong>{{
            notice.kind === 'SPRINT_INCOMPLETE'
              ? 'Période terminée : tâches restantes'
              : notice.kind === 'ASSIGNMENT'
                ? 'Une tâche vous attend'
                : notice.kind === 'MENTION'
                  ? 'On vous a mentionné'
                  : notice.kind === 'COMMENT'
                    ? 'Un nouveau commentaire'
                    : notice.kind === 'TASK_CREATED'
                      ? 'Nouvelle tâche'
                      : notice.kind === 'TASK_UPDATED'
                        ? 'Tâche modifiée'
                        : notice.kind === 'TASK_DELETED'
                          ? 'Tâche supprimée'
                          : 'Votre projet avance'
          }}</strong>
          <span class="notification-toast-message">{{ notice.message }}</span>
          <span class="toast-action"
            >{{
              notice.kind === 'SPRINT_INCOMPLETE'
                ? 'Voir les périodes'
                : notice.kind === 'TASK_DELETED'
                  ? 'Voir le projet'
                  : 'Voir la tâche'
            }}
            <span aria-hidden="true">↗</span></span
          >
        </button>
        <button type="button" class="toast-close" aria-label="Fermer la notification" (click)="notifications.notice.set(null)">×</button>
        <span class="toast-progress" aria-hidden="true"></span>
      </div>
    }
  `,
  styleUrl: './notification-toast.component.scss',
})
export class NotificationToastComponent {
  readonly notifications = inject(NotificationService);
  private readonly router = inject(Router);

  openTask(item: AppNotification): void {
    void this.notifications.markRead(item.id);
    this.notifications.notice.set(null);
    void this.router.navigate(
      item.kind === 'SPRINT_INCOMPLETE'
        ? ['/projects', item.projectUuid ?? item.projectId, 'sprints']
        : item.kind === 'TASK_DELETED'
          ? ['/projects', item.projectId, 'board']
          : ['/projects', item.projectId, 'tasks', item.taskId],
    );
  }
}
