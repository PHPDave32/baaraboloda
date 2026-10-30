import { PublicIdPipe } from 'app/core/identifiers/public-id.pipe';
import { UserPhotoDirective } from 'app/shared/components/photo-picker/user-photo.directive';
import { Component, HostListener, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';

import { AccountService } from 'app/core/auth';
import { LoginService } from 'app/login/login.service';
import { ModalComponent } from 'app/shared/components/modal/modal.component';
import { BrandingService } from 'app/core/branding/branding.service';
import { filter } from 'rxjs';

@Component({
  selector: 'jhi-navbar',
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
  imports: [PublicIdPipe, UserPhotoDirective, RouterLink, RouterLinkActive, ModalComponent, NotificationCenterComponent],
})
export default class Navbar implements OnInit {
  readonly activeProjectId = signal<string | null>(null);
  readonly showSprintAccessModal = signal(false);
  readonly sidebarOpen = signal(false);
  readonly sidebarCollapsed = signal(false);
  readonly isMobile = signal(window.innerWidth <= 900);

  @HostListener('window:resize')
  onResize(): void {
    this.isMobile.set(window.innerWidth <= 900);
    if (!this.isMobile()) this.sidebarOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closeSidebar();
  }

  private readonly accountService = inject(AccountService);
  readonly account = this.accountService.account;
  readonly branding = inject(BrandingService);

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

  toggleSidebar(): void {
    if (this.isMobile()) this.sidebarOpen.update(open => !open);
    else this.sidebarCollapsed.update(collapsed => !collapsed);
  }

  closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  ngOnInit(): void {
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(event => {
      const match = event.urlAfterRedirects.match(/\/projects\/([0-9a-f-]+)(?:\/|$)/i);
      this.activeProjectId.set(match ? match[1] : null);
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

  private getActiveProjectId(url: string): string | null {
    const match = url.match(/\/projects\/([0-9a-f-]+)(?:\/|$)/i);
    return match ? match[1] : null;
  }
}
