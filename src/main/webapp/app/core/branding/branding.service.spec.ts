import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from 'app/core/auth/account.service';
import { BrandingService } from './branding.service';

describe('BrandingService', () => {
  let http: HttpTestingController;
  let service: BrandingService;
  const account = signal<object | null>(null);

  beforeEach(() => {
    account.set({ login: 'admin' });
    vi.spyOn(URL, 'createObjectURL').mockReturnValueOnce('blob:old').mockReturnValueOnce('blob:new');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: AccountService, useValue: { account } }],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(BrandingService);
    TestBed.tick();
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it('fetches image bytes through HttpClient and replaces the image after an upload', () => {
    http.expectOne(req => req.url.endsWith('/branding')).flush({ logoUrl: '/api/branding/logo' });
    const image = http.expectOne(req => req.url.endsWith('/branding/logo'));
    expect(image.request.responseType).toBe('blob');
    image.flush(new Blob(['old'], { type: 'image/png' }));
    expect(service.logoSrc()).toBe('blob:old');
    service.upload(new File(['new'], 'logo.png', { type: 'image/png' })).subscribe();
    http.expectOne(req => req.method === 'POST').flush({ logoUrl: '/api/branding/logo' });
    http.expectOne(req => req.method === 'GET').flush(new Blob(['new'], { type: 'image/png' }));
    expect(service.logoSrc()).toBe('blob:new');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old');
    service.remove().subscribe();
    http.expectOne(req => req.method === 'DELETE').flush(null);
    expect(service.logoSrc()).toContain('figma-logo-cra.png');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:new');
  });

  it('does not restore an old logo if a pending load finishes after removal', () => {
    const pending = http.expectOne(req => req.url.endsWith('/branding'));
    service.remove().subscribe();
    http.expectOne(req => req.method === 'DELETE').flush(null);
    pending.flush({ logoUrl: '/api/branding/logo' });
    http.expectOne(req => req.method === 'GET').flush(new Blob(['old']));
    expect(service.logoUrl()).toBeNull();
  });
});
