import { Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';

import { AccountService } from 'app/core/auth';
import { LoginService } from 'app/login/login.service';
import { ModalComponent } from 'app/shared/components/modal/modal.component';
import { filter } from 'rxjs';

@Component({
  selector: 'jhi-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  imports: [RouterLink, RouterLinkActive, ModalComponent],
})
export default class Navbar implements OnInit {
  readonly activeProjectId = signal<number | null>(null);
  readonly showSprintAccessModal = signal(false);

  private readonly accountService = inject(AccountService);
  readonly account = this.accountService.account;

  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  get canManageSprints(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_SPRINT_MANAGE']);
  }

  goToSprints(): void {
    const projectId = this.activeProjectId();
    if (!projectId) {
      return;
    }
    if (!this.canManageSprints) {
      this.showSprintAccessModal.set(true);
      return;
    }
    this.router.navigate(['/projects', projectId, 'sprints']);
  }

  closeSprintAccessModal(): void {
    this.showSprintAccessModal.set(false);
  }

  ngOnInit(): void {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const match = event.urlAfterRedirects.match(/\/projects\/(\d+)/);
      this.activeProjectId.set(match ? Number(match[1]) : null);
    });
    this.activeProjectId.set(this.getActiveProjectId(this.router.url));
  }

  login(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.loginService.logout();
    this.activeProjectId.set(null);
    this.router.navigate(['/login']);
  }

  displayName(): string {
    const account = this.account();
    if (!account) {
      return '';
    }
    const fullName = [account.firstName, account.lastName].filter(Boolean).join(' ').trim();
    return fullName || account.login;
  }

  initials(): string {
    const account = this.account();
    if (!account) {
      return '?';
    }
    const first = account.firstName?.charAt(0) ?? '';
    const last = account.lastName?.charAt(0) ?? '';
    const value = `${first}${last}`.toUpperCase();
    return value || account.login.charAt(0).toUpperCase();
  }

  private getActiveProjectId(url: string): number | null {
    const match = url.match(/\/projects\/(\d+)/);
    return match ? Number(match[1]) : null;
  }
}
