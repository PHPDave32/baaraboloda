import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { PasswordResetInitService } from './password-reset-init.service';

@Component({
  selector: 'jhi-password-reset-init',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './password-reset-init.html',
  styleUrl: '../password-reset.scss',
})
export default class PasswordResetInit implements AfterViewInit {
  readonly email = viewChild<ElementRef>('email');

  readonly success = signal(false);
  readonly pending = signal(false);
  readonly error = signal(false);
  resetRequestForm;

  private readonly passwordResetInitService = inject(PasswordResetInitService);
  private readonly fb = inject(FormBuilder);

  constructor() {
    this.resetRequestForm = this.fb.group({
      email: [
        '',
        [
          Validators.required,
          Validators.minLength(5),
          Validators.maxLength(254),
          Validators.email,
          Validators.pattern(/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/),
        ],
      ],
    });
  }

  ngAfterViewInit(): void {
    this.email()?.nativeElement.focus();
  }

  requestReset(): void {
    this.resetRequestForm.markAllAsTouched();
    if (this.resetRequestForm.invalid || this.pending() || this.success()) return;
    this.pending.set(true);
    this.error.set(false);
    this.passwordResetInitService
      .save(this.resetRequestForm.controls.email.value!)
      .pipe(finalize(() => this.pending.set(false)))
      .subscribe({
        next: () => this.success.set(true),
        error: () => this.error.set(true),
      });
  }
}
