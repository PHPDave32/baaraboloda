import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { PhotoPicker } from 'app/shared/components/photo-picker/photo-picker';
import { UserPhotoDirective } from 'app/shared/components/photo-picker/user-photo.directive';
import { HttpClient } from '@angular/common/http';
import { serverApiUrl } from 'app/config';
import { ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { AccountService } from 'app/core/auth';
import { PasswordService } from 'app/account/password/password.service';

@Component({
  selector: 'jhi-profile',
  standalone: true,
  imports: [NotificationCenterComponent, ReactiveFormsModule, PhotoPicker, UserPhotoDirective],
  templateUrl: './profile.html',
})
export default class ProfileComponent {
  readonly photoSaving = signal(false);
  readonly photoMessage = signal('');
  private readonly http = inject(HttpClient);
  private readonly accountService = inject(AccountService);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);
  readonly doNotMatch = signal(false);
  readonly loading = signal(false);

  readonly account = inject(AccountService).account;

  readonly displayName = computed(() => {
    const account = this.account();
    if (!account) {
      return '';
    }
    const fullName = [account.firstName, account.lastName].filter(Boolean).join(' ').trim();
    return fullName || account.login;
  });

  readonly initials = computed(() => {
    const account = this.account();
    if (!account) {
      return '?';
    }
    const first = account.firstName?.charAt(0) ?? '';
    const last = account.lastName?.charAt(0) ?? '';
    const value = `${first}${last}`.toUpperCase();
    return value || account.login.charAt(0).toUpperCase();
  });

  readonly isAdmin = computed(() => this.account()?.authorities?.includes('ROLE_ADMIN') ?? false);

  passwordForm: FormGroup;

  private readonly fb = inject(FormBuilder);
  private readonly passwordService = inject(PasswordService);
  private readonly cdr = inject(ChangeDetectorRef);

  constructor() {
    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(4), Validators.maxLength(100)]],
    });
  }

  savePhoto(imageUrl: string | null): void {
    const account = this.account();
    if (!account || this.photoSaving()) return;
    this.photoSaving.set(true);
    this.photoMessage.set('');
    this.http.post(`${serverApiUrl}api/account`, { ...account, imageUrl }).subscribe({
      next: () => {
        this.accountService.identity(true).subscribe();
        this.photoSaving.set(false);
        this.photoMessage.set('Photo de profil mise à jour.');
      },
      error: () => {
        this.photoSaving.set(false);
        this.photoMessage.set('La photo n’a pas pu être enregistrée.');
      },
    });
  }

  changePassword(): void {
    this.success.set(false);
    this.error.set(null);
    this.doNotMatch.set(false);

    if (this.passwordForm.invalid || this.loading()) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword !== confirmPassword) {
      this.doNotMatch.set(true);
      return;
    }

    this.loading.set(true);
    this.passwordService.save(newPassword, currentPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);
        this.passwordForm.reset();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Le mot de passe actuel est incorrect ou la mise à jour a échoué.');
        this.cdr.markForCheck();
      },
    });
  }
}
