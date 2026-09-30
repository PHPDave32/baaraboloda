import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title?: string;
  duration?: number;
  closeButton?: boolean;
  progressBar?: boolean;
}

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  closeButton: boolean;
  progressBar: boolean;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);

  private nextId = 0;

  private readonly defaults: Record<ToastType, { title: string; duration: number }> = {
    success: { title: 'Succès', duration: 4000 },
    error: { title: 'Erreur', duration: 5000 },
    info: { title: 'Information', duration: 4000 },
    warning: { title: 'Attention', duration: 4000 },
  };

  success(message: string, options: ToastOptions = {}): number {
    return this.show('success', message, options);
  }

  error(message: string, options: ToastOptions = {}): number {
    return this.show('error', message, options);
  }

  info(message: string, options: ToastOptions = {}): number {
    return this.show('info', message, options);
  }

  warning(message: string, options: ToastOptions = {}): number {
    return this.show('warning', message, options);
  }

  show(type: ToastType, message: string, options: ToastOptions = {}): number {
    const id = ++this.nextId;
    const toast: Toast = {
      id,
      type,
      message,
      title: options.title ?? this.defaults[type].title,
      duration: options.duration ?? this.defaults[type].duration,
      closeButton: options.closeButton ?? true,
      progressBar: options.progressBar ?? true,
      createdAt: Date.now(),
    };

    this.toasts.update(list => [...list, toast]);
    return id;
  }

  remove(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}
