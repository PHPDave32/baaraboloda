import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AccountService } from './account.service';
import { StateStorageService } from './state-storage.service';
import { ToastService } from 'app/shared/toast/toast.service';
import { AUTHENTICATION_TOKEN_KEY } from 'app/shared/jhipster/constants';

export const SESSION_IDLE_MS = 5 * 24 * 60 * 60 * 1000;

export function tokenExpiresAt(token: string): number {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp: unknown = JSON.parse(atob(payload)).exp;
    return typeof exp === 'number' && Number.isFinite(exp) ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly account = inject(AccountService);
  private readonly storage = inject(StateStorageService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  private started = false;
  private warned = false;
  private lastWrite = 0;

  constructor() {
    effect(() => {
      if (this.account.account()) {
        this.recordActivity(true);
        this.check();
      }
    });
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    const timer = window.setInterval(() => this.check(), 15000);
    const onActivity = (): void => {
      this.check();
      this.recordActivity();
    };
    const onVisible = (): void => {
      if (!document.hidden) this.check();
    };
    const onStorage = (event: StorageEvent): void => {
      if (event.key === 'session.logout' || event.key === AUTHENTICATION_TOKEN_KEY || event.key === null) {
        if (this.account.isAuthenticated()) {
          // Never retain the previous account's screen after a shared token changes.
          this.end('Votre session a changé dans un autre onglet. Reconnectez-vous.', event.key === 'session.logout');
        }
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    for (const type of ['pointerdown', 'keydown', 'scroll']) window.addEventListener(type, onActivity, { passive: true });
    window.addEventListener('storage', onStorage);
    this.destroyRef.onDestroy(() => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      for (const type of ['pointerdown', 'keydown', 'scroll']) window.removeEventListener(type, onActivity);
      window.removeEventListener('storage', onStorage);
    });
    this.check();
  }

  private recordActivity(initial = false): void {
    const login = this.account.account()?.login;
    if (!login) return;
    const key = `session.activity.${login}`;
    if (initial && localStorage.getItem(key)) return;
    if (!initial && Date.now() - this.lastWrite < 1000) return;
    this.lastWrite = Date.now();
    localStorage.setItem(key, String(this.lastWrite));
    this.warned = false;
  }

  private check(): void {
    const token = this.storage.getAuthenticationToken();
    if ((token && tokenExpiresAt(token) <= Date.now()) || (!token && this.account.isAuthenticated())) {
      this.end('Votre session a expiré. Veuillez vous reconnecter.');
      return;
    }
    const login = this.account.account()?.login;
    if (!login || !token) return;
    const activity = Number(localStorage.getItem(`session.activity.${login}`)) || Date.now();
    const remaining = Math.min(tokenExpiresAt(token), activity + SESSION_IDLE_MS) - Date.now();
    if (remaining <= 0) {
      this.end('Votre session a expiré après 5 jours sans activité. Reconnectez-vous.');
    } else if (remaining < 60000 && !this.warned) {
      this.warned = true;
      this.toast.warning('Votre session expire dans moins d’une minute. Pensez à enregistrer votre travail.', { duration: 10000 });
    }
  }

  private end(message: string, clearToken = true): void {
    if (clearToken) this.storage.clearAuthenticationToken();
    else sessionStorage.removeItem(AUTHENTICATION_TOKEN_KEY);
    this.storage.clearUrl();
    this.account.authenticate(null);
    this.toast.info(message);
    void this.router.navigate(['/login'], { replaceUrl: true });
  }
}
