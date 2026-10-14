import { AfterViewInit, Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AccountService } from 'app/core/auth';
import { LoginService } from 'app/login/login.service';
import { PasswordToggleDirective } from 'app/shared/directives/password-toggle.directive';

@Component({
  selector: 'jhi-login',
  imports: [ReactiveFormsModule, RouterLink, PasswordToggleDirective],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export default class Login implements OnInit, AfterViewInit {
  readonly username = viewChild.required<ElementRef>('username');

  readonly authenticationError = signal(false);
  readonly loading = signal(false);

  loginForm = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    rememberMe: new FormControl(false, { nonNullable: true, validators: [Validators.required] }),
  });

  private readonly accountService = inject(AccountService);
  private readonly loginService = inject(LoginService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.accountService.identity().subscribe(() => {
      if (this.accountService.isAuthenticated()) {
        this.router.navigate(['']);
      }
    });
  }

  ngAfterViewInit(): void {
    this.username().nativeElement.focus();
  }

  login(): void {
    if (this.loginForm.invalid || this.loading()) {
      return;
    }

    this.loading.set(true);
    this.authenticationError.set(false);
    this.loginService
      .login(this.loginForm.getRawValue())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: () => {
          if (!this.router.currentNavigation()) {
            this.router.navigate(['']);
          }
        },
        error: () => this.authenticationError.set(true),
      });
  }
}
