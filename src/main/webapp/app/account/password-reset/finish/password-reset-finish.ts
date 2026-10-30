import { AfterViewInit, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { finalize } from 'rxjs';

import PasswordStrengthBar from 'app/account/password/password-strength-bar/password-strength-bar';

import { PasswordToggleDirective } from 'app/shared/directives/password-toggle.directive';

import { PasswordResetFinishService } from './password-reset-finish.service';

@Component({
  selector: 'jhi-password-reset-finish',
  imports: [RouterLink, ReactiveFormsModule, PasswordStrengthBar, PasswordToggleDirective],
  templateUrl: './password-reset-finish.html',
  styleUrl: '../password-reset.scss',
})
export default class PasswordResetFinish implements OnInit, AfterViewInit {
  readonly newPassword = viewChild<ElementRef>('newPassword');

  readonly pending = signal(false);
  readonly initialized = signal(false);
  readonly doNotMatch = signal(false);
  readonly error = signal(false);
  readonly success = signal(false);
  readonly key = signal('');

  passwordForm = new FormGroup({
    newPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(50)],
    }),
    confirmPassword: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(4), Validators.maxLength(50)],
    }),
  });

  private readonly passwordResetFinishService = inject(PasswordResetFinishService);
  private readonly route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params.key) {
        this.key.set(params.key);
      }
      this.initialized.set(true);
    });
  }

  ngAfterViewInit(): void {
    this.newPassword()?.nativeElement.focus();
  }

  finishReset(): void {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid || !this.key() || this.pending() || this.success()) return;
    this.doNotMatch.set(false);
    this.error.set(false);

    const { newPassword, confirmPassword } = this.passwordForm.getRawValue();

    if (newPassword === confirmPassword) {
      this.pending.set(true);
      this.passwordResetFinishService
        .save(this.key(), newPassword)
        .pipe(finalize(() => this.pending.set(false)))
        .subscribe({
          next: () => this.success.set(true),
          error: () => this.error.set(true),
        });
    } else {
      this.doNotMatch.set(true);
    }
  }
}
