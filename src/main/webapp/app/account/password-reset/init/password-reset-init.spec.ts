import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ElementRef } from '@angular/core';
import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { provideTranslateService } from '@ngx-translate/core';
import { of, throwError } from 'rxjs';

import PasswordResetInit from './password-reset-init';
import { PasswordResetInitService } from './password-reset-init.service';

describe('PasswordResetInit', () => {
  let fixture: ComponentFixture<PasswordResetInit>;
  let comp: PasswordResetInit;
  let service: PasswordResetInitService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTranslateService(), provideRouter([])],
    });
    fixture = TestBed.createComponent(PasswordResetInit);
    comp = fixture.componentInstance;
    service = TestBed.inject(PasswordResetInitService);
  });

  it('sets focus after the view has been initialized', () => {
    const node = {
      focus: vi.fn(),
    };
    vi.spyOn(comp, 'email').mockReturnValue(new ElementRef(node));

    comp.ngAfterViewInit();

    expect(node.focus).toHaveBeenCalled();
  });

  it('notifies of success upon successful requestReset', () => {
    vi.spyOn(service, 'save').mockReturnValue(of({}));
    comp.resetRequestForm.patchValue({
      email: 'user@domain.com',
    });

    comp.requestReset();

    expect(service.save).toHaveBeenCalledWith('user@domain.com');
    expect(comp.success()).toBe(true);
  });

  it('no notification of success upon error response', () => {
    const err = { status: 503, data: 'something else' };
    vi.spyOn(service, 'save').mockReturnValue(throwError(() => err));
    comp.resetRequestForm.patchValue({
      email: 'user@domain.com',
    });
    comp.requestReset();

    expect(service.save).toHaveBeenCalledWith('user@domain.com');
    expect(comp.success()).toBe(false);
  });
  it('does not submit an invalid email', () => {
    vi.spyOn(service, 'save');
    comp.resetRequestForm.patchValue({ email: 'personne@serveur' });
    comp.requestReset();
    expect(service.save).not.toHaveBeenCalled();
    expect(comp.resetRequestForm.controls.email.touched).toBe(true);
  });

  it('does not submit twice while pending', () => {
    vi.spyOn(service, 'save');
    comp.resetRequestForm.patchValue({ email: 'user@domain.com' });
    comp.pending.set(true);
    comp.requestReset();
    expect(service.save).not.toHaveBeenCalled();
  });
});
