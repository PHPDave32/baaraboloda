import { Service, inject } from '@angular/core';

import { Observable, mergeMap, tap } from 'rxjs';

import { Account, AccountService, AuthServerProvider, Login, StateStorageService } from 'app/core/auth';

@Service()
export class LoginService {
  private readonly storage = inject(StateStorageService);
  private readonly accountService = inject(AccountService);
  private readonly authServerProvider = inject(AuthServerProvider);

  login(credentials: Login): Observable<Account | null> {
    return this.authServerProvider.login(credentials).pipe(
      mergeMap(() => this.accountService.identity(true)),
      tap(account => {
        if (account) localStorage.setItem(`session.activity.${account.login}`, String(Date.now()));
      }),
    );
  }

  logout(): void {
    const login = this.accountService.account()?.login;
    if (login) localStorage.removeItem(`session.activity.${login}`);
    this.storage.clearUrl();
    localStorage.setItem('session.logout', String(Date.now()));
    this.authServerProvider.logout().subscribe({ complete: () => this.accountService.authenticate(null) });
  }
}
