import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AccountService } from 'app/core/auth';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { serverApiUrl } from 'app/config';

export interface AppNotification {
  id: string;
  kind: string;
  message: string;
  taskId: number;
  projectId: number;
  createdAt: string;
  read: boolean;
}
interface Preferences {
  soundEnabled: boolean;
  emailEnabled: boolean;
}
interface Settings {
  preferences: Preferences;
  emailAvailable: boolean;
  pushKey: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly items = signal<AppNotification[]>([]);
  readonly unread = signal(0);
  readonly preferences = signal<Preferences>({ soundEnabled: false, emailEnabled: false });
  readonly emailAvailable = signal(false);
  readonly pushAvailable = signal(false);
  readonly pushUnavailableReason = signal('Vérification de la disponibilité des notifications du navigateur…');
  readonly pushEnabled = signal(false);
  readonly notice = signal<AppNotification | null>(null);
  readonly error = signal('');
  readonly soundReady = signal(false);
  readonly savingPreferences = signal(false);
  private readonly http = inject(HttpClient);
  private readonly account = inject(AccountService);
  private readonly storage = inject(StateStorageService);
  private readonly api = `${serverApiUrl}api/notifications`;
  private publicKey = '';
  private audio: AudioContext | null = null;
  private known: Set<string> | null = null;
  private controller: AbortController | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshing = false;
  private session = 0;
  private previousLogin: string | undefined;

  constructor() {
    const unlock = (event: Event): void => {
      if (event.isTrusted && this.account.account()) void this.prepareAudio();
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('keydown', unlock);
    inject(DestroyRef).onDestroy(() => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
      void this.audio?.close();
    });
    effect(() => {
      const login = this.account.account()?.login;
      const loggedOut = Boolean(this.previousLogin && !login);
      this.previousLogin = login;
      this.session++;
      const generation = this.session;
      this.controller?.abort();
      if (this.timer) clearInterval(this.timer);
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.items.set([]);
      this.unread.set(0);
      this.notice.set(null);
      this.pushAvailable.set(false);
      this.pushEnabled.set(false);
      this.pushUnavailableReason.set('Vérification de la disponibilité des notifications du navigateur…');
      this.known = null;
      this.refreshing = false;
      this.preferences.set({ soundEnabled: false, emailEnabled: false });
      if (!login) {
        if (loggedOut) void this.disableBrowserPush();
        return;
      }
      void this.settings(generation);
      void this.refresh(generation);
      this.controller = new AbortController();
      void this.connect(this.controller.signal, generation);
      this.timer = setInterval(() => void this.refresh(generation), 30000);
    });
  }

  async refresh(generation = this.session): Promise<void> {
    if (this.refreshing || !this.account.account()) return;
    this.refreshing = true;
    try {
      const response = await firstValueFrom(this.http.get<{ items: AppNotification[]; unread: number }>(this.api));
      if (generation !== this.session) return;
      const added = this.known ? response.items.filter(item => !item.read && !this.known?.has(item.id)) : [];
      this.known = new Set(response.items.map(item => item.id));
      this.items.set(response.items);
      this.unread.set(response.unread);
      if (added.length) {
        this.notice.set(added[0]);
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => this.notice.set(null), 10000);
        if (this.preferences().soundEnabled) void this.play();
      }
    } catch {
      if (generation === this.session) this.error.set('Impossible de charger les notifications.');
    } finally {
      if (generation === this.session) this.refreshing = false;
    }
  }

  async markRead(id?: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(id ? `${this.api}/${id}/read` : `${this.api}/read-all`, {}));
      await this.refresh();
    } catch {
      this.error.set('Impossible de marquer les notifications comme lues.');
    }
  }

  async savePreferences(sound: boolean, email: boolean): Promise<void> {
    if (this.savingPreferences()) return;
    this.savingPreferences.set(true);
    this.error.set('');
    try {
      if (sound && !this.preferences().soundEnabled) {
        if (!(await this.prepareAudio())) throw new Error('Le navigateur bloque le son. Cliquez sur Tester le son.');
        this.tone();
      }
      const value = { soundEnabled: sound, emailEnabled: email };
      await firstValueFrom(this.http.put(`${this.api}/preferences`, value));
      this.preferences.set(value);
    } catch {
      this.error.set('Impossible d’enregistrer ce réglage. Vérifiez votre connexion et les autorisations audio.');
    } finally {
      this.savingPreferences.set(false);
    }
  }

  async testSound(): Promise<void> {
    this.error.set('');
    if (await this.prepareAudio()) this.tone();
    else this.error.set('Le navigateur bloque le son. Vérifiez que l’onglet et votre appareil ne sont pas en mode silencieux.');
  }

  async togglePush(): Promise<void> {
    this.error.set('');
    try {
      if (this.pushEnabled()) {
        const registration = await navigator.serviceWorker.getRegistration('/content/notification-sw.js');
        const subscription = await registration?.pushManager.getSubscription();
        if (subscription) {
          await firstValueFrom(this.http.delete(`${this.api}/push`, { body: { endpoint: subscription.endpoint } }));
          await subscription.unsubscribe();
        }
        this.pushEnabled.set(false);
        return;
      }
      if (!this.pushAvailable() || (await globalThis.Notification.requestPermission()) !== 'granted') {
        this.error.set('Autorisez les notifications dans les réglages du navigateur.');
        return;
      }
      const registration = await navigator.serviceWorker.register('/content/notification-sw.js');
      if (!registration.active)
        await new Promise<void>((resolve, reject) => {
          const worker = registration.installing ?? registration.waiting;
          if (!worker) {
            reject(new Error('Service worker indisponible'));
            return;
          }
          worker.addEventListener('statechange', () => {
            if (worker.state === 'activated') resolve();
            if (worker.state === 'redundant') reject(new Error('Activation impossible'));
          });
        });
      const decoded = Uint8Array.from(atob(this.publicKey.replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0));
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decoded.buffer });
      try {
        await firstValueFrom(this.http.post(`${this.api}/push`, subscription.toJSON()));
      } catch (error) {
        await subscription.unsubscribe();
        throw error;
      }
      this.pushEnabled.set(true);
    } catch {
      this.error.set('Le push n’a pas pu être activé. Vérifiez la configuration et les autorisations.');
    }
  }

  private async prepareAudio(): Promise<boolean> {
    try {
      if (!this.audio || this.audio.state === 'closed') {
        this.audio = new AudioContext();
        this.audio.onstatechange = () => this.soundReady.set(this.audio?.state === 'running');
      }
      if (this.audio.state !== 'running') await this.audio.resume();
      const ready = this.audio.state === 'running';
      this.soundReady.set(ready);
      return ready;
    } catch {
      this.soundReady.set(false);
      return false;
    }
  }

  private async settings(generation: number): Promise<void> {
    try {
      const settings = await firstValueFrom(this.http.get<Settings>(`${this.api}/preferences`));
      if (generation !== this.session) return;
      this.preferences.set(settings.preferences);
      this.emailAvailable.set(settings.emailAvailable);
      this.publicKey = settings.pushKey;
      const pushUnavailableReason = !settings.pushKey
        ? 'Les notifications du navigateur ne sont pas activées pour cette application.'
        : !window.isSecureContext
          ? 'Une connexion sécurisée (HTTPS) est nécessaire pour activer les notifications du navigateur.'
          : !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)
            ? 'Ce navigateur ne prend pas en charge les notifications en dehors de l’application.'
            : '';
      this.pushUnavailableReason.set(pushUnavailableReason);
      this.pushAvailable.set(!pushUnavailableReason);
      if (!('serviceWorker' in navigator)) return;
      const registration = await navigator.serviceWorker.getRegistration('/content/notification-sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      if (generation !== this.session) return;
      if (subscription && this.pushAvailable()) await firstValueFrom(this.http.post(`${this.api}/push`, subscription.toJSON()));
      this.pushEnabled.set(Boolean(subscription));
    } catch {
      if (generation === this.session) {
        this.error.set('Les préférences ne sont pas disponibles.');
        if (!this.pushAvailable()) {
          this.pushUnavailableReason.set('Impossible de vérifier la disponibilité des notifications du navigateur. Réessayez plus tard.');
        }
      }
    }
  }

  private async disableBrowserPush(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration('/content/notification-sw.js');
      await (await registration?.pushManager.getSubscription())?.unsubscribe();
    } catch {
      this.pushEnabled.set(false);
    }
    this.pushEnabled.set(false);
  }

  private tone(): void {
    if (this.audio?.state !== 'running') return;
    const now = this.audio.currentTime;
    for (const [offset, frequency] of [
      [0, 740],
      [0.1, 988],
    ]) {
      const oscillator = this.audio.createOscillator();
      const gain = this.audio.createGain();
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, now + offset);
      gain.gain.linearRampToValueAtTime(0.12, now + offset + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.22);
      oscillator.connect(gain);
      gain.connect(this.audio.destination);
      oscillator.start(now + offset);
      oscillator.stop(now + offset + 0.24);
    }
  }

  private async play(): Promise<void> {
    const login = this.account.account()?.login;
    if (!login || !(await this.prepareAudio())) return;
    const ring = (): void => {
      const key = `notification-sound-${login}`;
      try {
        const last = Number(localStorage.getItem(key) ?? '0');
        if (Date.now() - last < 2500) return;
        localStorage.setItem(key, String(Date.now()));
      } catch {
        this.soundReady.set(this.audio?.state === 'running');
      }
      this.tone();
    };
    if ('locks' in navigator) await navigator.locks.request(`notification-sound-${login}`, ring);
    else ring();
  }

  private isAborted(value: AbortSignal): boolean {
    return value.aborted;
  }

  private async connect(abortSignal: AbortSignal, generation: number): Promise<void> {
    while (!abortSignal.aborted && generation === this.session) {
      try {
        const token = this.storage.getAuthenticationToken();
        if (!token) return;
        const response = await fetch(`${this.api}/stream`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'text/event-stream' },
          signal: abortSignal,
        });
        if (response.status === 401 || response.status === 403) return;
        if (!response.ok || !response.body) throw new Error('Flux indisponible');
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        for (;;) {
          const result = await reader.read();
          if (result.done) break;
          buffer += decoder.decode(result.value, { stream: true }).replace(/\r/g, '');
          let boundary = buffer.indexOf('\n\n');
          while (boundary >= 0) {
            const event = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (event.includes('event:refresh') || event.includes('event:ready')) void this.refresh(generation);
            boundary = buffer.indexOf('\n\n');
          }
        }
      } catch {
        if (this.isAborted(abortSignal)) return;
      }
      await new Promise<void>(resolve => {
        const timer = setTimeout(resolve, 5000);
        abortSignal.addEventListener(
          'abort',
          () => {
            clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
    }
  }
}
