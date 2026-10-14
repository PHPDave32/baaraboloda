import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from 'app/core/auth';
import { StateStorageService } from 'app/core/auth/state-storage.service';
import { NotificationService } from './notification.service';

describe('Notification sound', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
  });
  it('plays a longer chime without overlapping and can play again afterwards', async () => {
    const stops: number[] = [];
    const clock = { time: 10 };
    vi.stubGlobal(
      'AudioContext',
      class {
        state = 'running';
        destination = {};
        get currentTime(): number {
          return clock.time;
        }
        close = vi.fn();
        createOscillator(): object {
          return {
            frequency: { value: 0 },
            connect: vi.fn(),
            disconnect: vi.fn(),
            start: vi.fn(),
            stop: (time: number) => stops.push(time),
          };
        }
        createGain(): object {
          return {
            connect: vi.fn(),
            disconnect: vi.fn(),
            gain: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
          };
        }
      },
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: HttpClient, useValue: {} },
        { provide: AccountService, useValue: { account: () => null } },
        { provide: StateStorageService, useValue: {} },
      ],
    });
    const service = TestBed.inject(NotificationService);
    await service.testSound();
    expect(stops).toHaveLength(8);
    expect(Math.max(...stops) - 10).toBeCloseTo(3.47);
    await service.testSound();
    expect(stops).toHaveLength(8);
    clock.time = 14;
    await service.testSound();
    expect(stops).toHaveLength(16);
  });
});
