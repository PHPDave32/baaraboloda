import { DestroyRef, Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, switchMap, tap } from 'rxjs';
import { AccountService } from 'app/core/auth/account.service';
import { serverApiUrl } from 'app/config';

@Injectable({ providedIn: 'root' })
export class BrandingService {
  readonly logoUrl = signal<string | null>(null);
  readonly logoSrc = computed(() => this.logoUrl() ?? '/content/images/figma-logo-cra.png');

  private readonly http = inject(HttpClient);
  private readonly api = `${serverApiUrl}api/branding`;
  private revision = 0;

  constructor() {
    const account = inject(AccountService);
    effect(() => {
      const authenticated = account.account();
      untracked(() => {
        if (authenticated) this.load();
        else {
          ++this.revision;
          this.setLogo(null);
        }
      });
    });
    inject(DestroyRef).onDestroy(() => this.setLogo(null));
  }

  load(): void {
    const revision = ++this.revision;
    this.http
      .get<{ logoUrl: string | null }>(this.api)
      .pipe(switchMap(res => (res.logoUrl ? this.fetchLogo() : of(null))))
      .subscribe({
        next: blob => {
          if (revision === this.revision) this.setLogo(blob);
        },
        error: () => {
          if (revision === this.revision) this.setLogo(null);
        },
      });
  }

  upload(file: File): Observable<void> {
    const body = new FormData();
    body.append('file', file);
    return this.http.post(`${this.api}/logo`, body).pipe(
      switchMap(() => {
        ++this.revision;
        return this.fetchLogo();
      }),
      tap(blob => this.setLogo(blob)),
      map(() => undefined),
    );
  }

  remove(): Observable<void> {
    return this.http.delete<unknown>(`${this.api}/logo`).pipe(
      tap(() => {
        ++this.revision;
        this.setLogo(null);
      }),
      map(() => undefined),
    );
  }

  private fetchLogo(): Observable<Blob> {
    // HttpClient attaches the session token; a plain image request cannot do so.
    return this.http.get(`${this.api}/logo`, { responseType: 'blob', params: { v: String(Date.now()) } });
  }

  private setLogo(blob: Blob | null): void {
    const previous = this.logoUrl();
    this.logoUrl.set(blob ? URL.createObjectURL(blob) : null);
    if (previous) URL.revokeObjectURL(previous);
  }
}
