import { ChangeDetectionStrategy, Component, OnDestroy, effect, inject, signal } from '@angular/core';

import { Toast, ToastService, ToastType } from './toast.service';

@Component({
  selector: 'jhi-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toast-container.html',
  styleUrl: './toast-container.scss',
})
export class ToastContainer implements OnDestroy {
  private readonly toastService = inject(ToastService);

  readonly toasts = this.toastService.toasts;
  readonly leaving = signal<Set<number>>(new Set());

  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly remaining = new Map<number, number>();
  private readonly deadlines = new Map<number, number>();

  constructor() {
    effect(() => {
      const current = this.toasts();
      const ids = new Set(current.map(t => t.id));

      for (const toast of current) {
        if (toast.duration > 0 && !this.timers.has(toast.id) && !this.deadlines.has(toast.id)) {
          this.startTimer(toast.id, toast.duration);
        }
      }

      for (const id of [...this.timers.keys()]) {
        if (!ids.has(id)) {
          this.clearTimer(id);
          this.deadlines.delete(id);
          this.remaining.delete(id);
        }
      }
    });
  }

  iconFor(type: ToastType): string {
    return type;
  }

  isLeaving(id: number): boolean {
    return this.leaving().has(id);
  }

  onMouseEnter(toast: Toast): void {
    const deadline = this.deadlines.get(toast.id);
    if (deadline !== undefined) {
      this.remaining.set(toast.id, Math.max(0, deadline - Date.now()));
    }
    this.clearTimer(toast.id);
  }

  onMouseLeave(toast: Toast): void {
    if (this.isLeaving(toast.id)) {
      return;
    }
    const remaining = this.remaining.get(toast.id) ?? toast.duration;
    if (remaining > 0) {
      this.startTimer(toast.id, remaining);
    }
  }

  close(id: number): void {
    this.beginLeave(id);
  }

  ngOnDestroy(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }

  private startTimer(id: number, duration: number): void {
    this.clearTimer(id);
    this.deadlines.set(id, Date.now() + duration);
    this.timers.set(
      id,
      setTimeout(() => this.beginLeave(id), duration),
    );
  }

  private beginLeave(id: number): void {
    if (this.isLeaving(id)) {
      return;
    }
    this.clearTimer(id);
    this.leaving.update(set => new Set(set).add(id));
    setTimeout(() => {
      this.toastService.remove(id);
      this.leaving.update(set => {
        const next = new Set(set);
        next.delete(id);
        return next;
      });
    }, 200);
  }

  private clearTimer(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}
