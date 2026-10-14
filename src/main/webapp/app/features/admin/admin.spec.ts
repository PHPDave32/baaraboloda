import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AccessProfileService } from 'app/entities/admin/access-profile/service/access-profile.service';
import { AccountService } from 'app/core/auth/account.service';
import { UserManagementService } from 'app/entities/admin/user-management/service/user-management.service';
import { IUserManagement } from 'app/entities/admin/user-management/user-management.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import AdminComponent from './admin';

describe('Administration roles', () => {
  let component: AdminComponent;
  let superAdmin: boolean;
  const update = vi.fn();
  const create = vi.fn();
  const queryProfiles = vi.fn();
  let actorRole: string;
  const employee: IUserManagement = {
    id: 1,
    login: 'employee',
    firstName: 'Test',
    lastName: 'User',
    email: 'employee@example.com',
    activated: true,
    authorities: ['ROLE_USER', 'PERM_PROJECT_CREATE'],
  };

  beforeEach(() => {
    superAdmin = false;
    actorRole = 'ROLE_ADMIN';
    queryProfiles.mockReset().mockReturnValue(of([{ id: 1, name: 'Développeur', allProjects: false, permissions: [] }]));
    create.mockReset().mockImplementation(user => of(user));
    update.mockReset().mockImplementation(user => of(user));
    TestBed.configureTestingModule({
      providers: [
        FormBuilder,
        { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
        { provide: Router, useValue: { navigate: vi.fn() } },
        { provide: ProjectService, useValue: { query: () => of({ body: [] }) } },
        { provide: AccessProfileService, useValue: { query: queryProfiles } },
        { provide: UserManagementService, useValue: { update, create, query: () => of({ body: [] }) } },
        {
          provide: AccountService,
          useValue: {
            account: () => ({ login: 'actor' }),
            hasAnyAuthority: (roles: string | string[]) =>
              (Array.isArray(roles) ? roles : [roles]).some(role => role === actorRole || (role === 'ROLE_SUPER_ADMIN' && superAdmin)),
          },
        },
      ],
    });
    component = TestBed.runInInjectionContext(() => new AdminComponent());
  });

  it.each(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'PERM_USER_MANAGE'])('loads and submits the selected profile for %s', role => {
    actorRole = role;
    component.ngOnInit();
    expect(component.canManageUsers).toBe(true);
    expect(component.profiles[0].name).toBe('Développeur');
    component.openCreateUser();
    component.userForm.patchValue({
      firstName: 'Test',
      lastName: 'User',
      login: 'newuser',
      email: 'new@example.com',
      password: 'password123',
      accessProfileId: 1,
    });
    component.submitUser();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ accessProfileId: 1, authorities: ['ROLE_USER'] }));
  });

  it('does not load profiles for a user who can only disable accounts', () => {
    actorRole = 'PERM_USER_DISABLE';
    component.ngOnInit();
    expect(component.canManageUsers).toBe(false);
    expect(queryProfiles).not.toHaveBeenCalled();
  });

  it('reports profile loading failures and allows retrying', () => {
    queryProfiles.mockReturnValueOnce(throwError(() => new Error('Unavailable')));
    component.loadProfiles();
    expect(component.profilesError).toContain('Impossible de charger');
    expect(component.profilesLoading).toBe(false);
    component.loadProfiles();
    expect(component.profilesError).toBe('');
    expect(component.profiles).toHaveLength(1);
  });

  it('keeps existing employee permissions when an administrator edits the profile', () => {
    component.openEditUser(employee);
    component.userForm.patchValue({ firstName: 'Updated', role: 'ROLE_SUPER_ADMIN' });
    component.submitUser();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ firstName: 'Updated', authorities: employee.authorities }));
  });

  it('blocks administrators from editing privileged accounts or opening permission controls', () => {
    component.openEditUser({ ...employee, authorities: ['ROLE_SUPER_ADMIN'] });
    expect(component.showUserForm).toBe(false);
    component.openPermissionPanel(employee);
    expect(component.showPermissionPanel).toBe(false);
  });

  it('sends the selected role as an array and preserves permissions when promoted by a super administrator', () => {
    superAdmin = true;
    component.openEditUser(employee);
    component.userForm.patchValue({ role: 'ROLE_ADMIN' });
    component.submitUser();
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ authorities: ['ROLE_USER', 'ROLE_ADMIN', 'PERM_PROJECT_CREATE'] }));
  });

  it('labels the super administrator distinctly', () => {
    expect(component.roleLabel({ ...employee, authorities: ['ROLE_SUPER_ADMIN'] })).toBe('Super administrateur');
  });
});
