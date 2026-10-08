import { Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService, AppNotification } from './notification.service';

@Component({
  selector: 'jhi-notification-center',
  imports: [DatePipe],
  templateUrl: './notification-center.component.html',
  styleUrl: './notification-center.component.scss',
})
export class NotificationCenterComponent {
  readonly notifications = inject(NotificationService);
  readonly opened = signal(false);
  readonly onlyUnread = signal(false);
  readonly visible = computed(() => this.notifications.items().filter(item => !this.onlyUnread() || !item.read));
  private readonly router = inject(Router);

  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('notificationDialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog()?.nativeElement;
      if (!dialog) return;
      if (this.opened() && !dialog.open) dialog.showModal();
      else if (!this.opened() && dialog.open) dialog.close();
    });
  }

  dismissOutside(event: MouseEvent): void {
    const dialog = this.dialog()?.nativeElement;
    if (!dialog || event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)
      this.opened.set(false);
  }

  openTask(item: AppNotification): void {
    void this.notifications.markRead(item.id);
    this.opened.set(false);
    this.notifications.notice.set(null);
    void this.router.navigate(['/projects', item.projectId, 'tasks', item.taskId]);
  }
}
