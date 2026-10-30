import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from './account.service';
import { StateStorageService } from './state-storage.service';
import { SessionService, tokenExpiresAt, SESSION_IDLE_MS } from './session.service';
import { ToastService } from 'app/shared/toast/toast.service';

const jwt = (expires: number): string => `header.${btoa(JSON.stringify({ exp: expires / 1000 }))}.signature`;

describe('SessionService', () => {
  const identity = signal<{ login: string } | null>(null);
  let storage: StateStorageService;
  const router = { navigate: vi.fn().mockResolvedValue(true) };
  const toast = { info: vi.fn(), warning: vi.fn() };

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    sessionStorage.clear();
    identity.set({ login: 'test' });
    TestBed.configureTestingModule({
      providers: [
        StateStorageService,
        {
          provide: AccountService,
          useValue: { account: identity, isAuthenticated: () => !!identity(), authenticate: (value: null) => identity.set(value) },
        },
        { provide: Router, useValue: router },
        { provide: ToastService, useValue: toast },
      ],
    });
    storage = TestBed.inject(StateStorageService);
    vi.clearAllMocks();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('rejects malformed tokens', () => {
    expect(tokenExpiresAt('invalid')).toBe(0);
    expect(tokenExpiresAt('a.' + btoa('{}') + '.c')).toBe(0);
  });

  it('closes an expired session without an HTTP request', () => {
    storage.storeAuthenticationToken(jwt(Date.now() - 1000), false);
    TestBed.inject(SessionService).start();
    expect(identity()).toBeNull();
    expect(storage.getAuthenticationToken()).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
  });

  it('keeps a valid session active', () => {
    storage.storeAuthenticationToken(jwt(Date.now() + SESSION_IDLE_MS), false);
    TestBed.inject(SessionService).start();
    expect(identity()).not.toBeNull();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('expires after five days of inactivity', () => {
    storage.storeAuthenticationToken(jwt(Date.now() + SESSION_IDLE_MS), false);
    localStorage.setItem('session.activity.test', String(Date.now() - SESSION_IDLE_MS - 1000));
    TestBed.inject(SessionService).start();
    expect(identity()).toBeNull();
  });

  it('warns before expiration', () => {
    storage.storeAuthenticationToken(jwt(Date.now() + 30000), false);
    TestBed.inject(SessionService).start();
    expect(toast.warning).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(45000);
    expect(identity()).toBeNull();
  });

  it('handles logout in another tab', () => {
    storage.storeAuthenticationToken(jwt(Date.now() + SESSION_IDLE_MS), true);
    TestBed.inject(SessionService).start();
    window.dispatchEvent(new StorageEvent('storage', { key: 'session.logout', newValue: '1' }));
    expect(identity()).toBeNull();
    expect(storage.getAuthenticationToken()).toBeNull();
  });
});
