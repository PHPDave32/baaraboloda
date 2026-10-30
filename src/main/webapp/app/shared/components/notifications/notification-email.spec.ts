import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from 'app/core/auth';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { NotificationService } from './notification.service';
import { NotificationCenterComponent } from './notification-center.component';

describe('Notification email preferences', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('only saves the master switches and keeps values on failure', async () => {
    const put = vi.fn().mockReturnValue(of({}));
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { put } },
        { provide: AccountService, useValue: { account: () => null } },
        { provide: StateStorageService, useValue: {} },
      ],
    });
    const service = TestBed.inject(NotificationService);
    TestBed.tick();
    service.preferences.set({ soundEnabled: false, emailEnabled: true });
    await service.savePreferences(false, false);
    expect(put).toHaveBeenCalledWith(expect.stringContaining('/preferences'), { soundEnabled: false, emailEnabled: false });
    put.mockReturnValue(throwError(() => new Error('offline')));
    await service.savePreferences(false, true);
    expect(service.preferences().emailEnabled).toBe(false);
    expect(service.error()).toContain('Impossible');
    expect(service.savingPreferences()).toBe(false);
  });

  it('reloads email availability after a backend restart and clears a recovered loading error', async () => {
    let loggedIn = false;
    const get = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: { get } },
        { provide: AccountService, useValue: { account: () => (loggedIn ? { login: 'bob' } : null) } },
        { provide: StateStorageService, useValue: {} },
      ],
    });
    const service = TestBed.inject(NotificationService);
    TestBed.tick();
    loggedIn = true;
    get.mockReturnValue(throwError(() => new Error('server restarting')));
    await service.refresh();
    expect(service.error()).toBe('Impossible de charger les notifications.');
    get.mockReturnValue(of({ items: [], unread: 0 }));
    await service.refresh();
    expect(service.error()).toBe('');
    get.mockReturnValue(throwError(() => new Error('offline')));
    await service.reloadSettings();
    expect(service.settingsLoaded()).toBe(false);
    get.mockReturnValue(of({ preferences: { soundEnabled: false, emailEnabled: false }, emailAvailable: true, pushKey: '' }));
    await service.reloadSettings();
    expect(service.emailAvailable()).toBe(true);
    expect(service.settingsLoaded()).toBe(true);
    expect(service.settingsLoading()).toBe(false);
    expect(service.error()).toBe('');
  });

  it('exposes only the master email switch without category choices', () => {
    const notifications = {
      items: signal([]),
      unread: signal(0),
      preferences: signal({ soundEnabled: false, emailEnabled: true }),
      soundReady: signal(false),
      emailAvailable: signal(true),
      settingsLoaded: signal(true),
      settingsLoading: signal(false),
      savingPreferences: signal(false),
      error: signal(''),
      savePreferences: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [NotificationCenterComponent],
      providers: [
        { provide: NotificationService, useValue: notifications },
        { provide: Router, useValue: {} },
      ],
    });
    const fixture = TestBed.createComponent(NotificationCenterComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notification-email-options')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Quels e-mails');
    fixture.nativeElement.querySelector('[aria-label="Notifications par e-mail"]').click();
    expect(notifications.savePreferences).toHaveBeenCalledWith(false, false);
    notifications.emailAvailable.set(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[aria-label="Notifications par e-mail"]').disabled).toBe(true);
  });
});
