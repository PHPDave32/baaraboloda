import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { PhotoPicker } from 'app/shared/components/photo-picker/photo-picker';
import { AvatarComponent } from 'app/shared/components/avatar/avatar.component';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AccountService } from 'app/core/auth/account.service';
import { UserManagementService } from 'app/entities/admin/user-management/service/user-management.service';
import { IUserManagement } from 'app/entities/admin/user-management/user-management.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import { IProject } from 'app/entities/project/project.model';
import { ModalComponent } from 'app/shared/components/modal/modal.component';
import { PaginationComponent } from 'app/shared/components/pagination/pagination.component';
import { SearchBarComponent } from 'app/shared/components/search-bar/search-bar.component';

@Component({
  selector: 'jhi-admin',
  standalone: true,
  imports: [
    NotificationCenterComponent,
    PhotoPicker,
    AvatarComponent,
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    PaginationComponent,
    SearchBarComponent,
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export default class AdminComponent implements OnInit {
  photoUploading = false;
  users: IUserManagement[] = [];
  projects: IProject[] = [];
  activeTab: 'users' | 'projects' = 'users';

  readonly pageSize = 8;
  userPage = 1;
  projectPage = 1;
  userSearch = '';
  projectSearch = '';

  userForm: FormGroup;
  showUserForm = false;
  editingUser: IUserManagement | null = null;
  loadingUser = false;
  userError = '';

  projectForm: FormGroup;
  showProjectForm = false;
  loadingProject = false;
  projectError = '';

  showMemberPanel = false;
  selectedProject: IProject | null = null;

  // Modal de confirmation suppression employé
  showDeleteUserModal = false;
  userToDelete: IUserManagement | null = null;

  showPermissionPanel = false;
  permissionUser: IUserManagement | null = null;
  savingPermissions = false;

  readonly permissionCatalog: { key: string; label: string; description: string }[] = [
    { key: 'PERM_PROJECT_CREATE', label: 'Créer des projets', description: 'Autorise la création de nouveaux projets.' },
    { key: 'PERM_PROJECT_DELETE', label: 'Supprimer des projets', description: 'Autorise la suppression de projets existants.' },
    { key: 'PERM_SPRINT_MANAGE', label: 'Gérer les sprints', description: 'Autorise la création et la suppression de sprints.' },
    { key: 'PERM_MANAGE_MEMBERS', label: 'Gérer les membres', description: 'Autorise l’ajout et le retrait de membres sur les projets.' },
  ];

  private readonly accountService = inject(AccountService);
  private readonly userManagementService = inject(UserManagementService);
  private readonly projectService = inject(ProjectService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  constructor() {
    this.userForm = this.fb.group({
      imageUrl: [null],
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      login: ['', Validators.required],
      password: ['', [Validators.minLength(6)]],
      authorities: [['ROLE_USER'], Validators.required],
    });

    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      projectKey: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(6)]],
      iconColor: ['#328cb1'],
    });
  }

  get currentAccount() {
    return this.accountService.account();
  }

  ngOnInit(): void {
    if (!this.accountService.hasAnyAuthority('ROLE_ADMIN')) {
      this.router.navigate(['/']);
      return;
    }
    this.loadUsers();
    this.loadProjects();
  }

  loadUsers(): void {
    this.userManagementService.query({ size: 1000 }).subscribe({
      next: res => {
        this.users = res.body ?? [];
        this.clampUserPage();
        this.cdr.markForCheck();
      },
    });
  }

  loadProjects(): void {
    this.projectService.query({ size: 1000 }).subscribe({
      next: res => {
        this.projects = res.body ?? [];
        this.clampProjectPage();
        this.cdr.markForCheck();
      },
    });
  }

  get filteredUsers(): IUserManagement[] {
    const term = this.userSearch.trim().toLowerCase();
    if (!term) {
      return this.users;
    }
    return this.users.filter(u => [u.firstName, u.lastName, u.email, u.login].some(v => (v ?? '').toLowerCase().includes(term)));
  }

  get userPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.pageSize));
  }

  get pagedUsers(): IUserManagement[] {
    const start = (this.userPage - 1) * this.pageSize;
    return this.filteredUsers.slice(start, start + this.pageSize);
  }

  goToUserPage(page: number): void {
    this.userPage = Math.min(Math.max(1, page), this.userPageCount);
  }

  onUserSearch(term: string): void {
    this.userSearch = term;
    this.userPage = 1;
    this.cdr.markForCheck();
  }

  private clampUserPage(): void {
    this.userPage = Math.min(this.userPage, this.userPageCount);
  }

  get filteredProjects(): IProject[] {
    const term = this.projectSearch.trim().toLowerCase();
    if (!term) {
      return this.projects;
    }
    return this.projects.filter(p => (p.name ?? '').toLowerCase().includes(term) || (p.projectKey ?? '').toLowerCase().includes(term));
  }

  get projectPageCount(): number {
    return Math.max(1, Math.ceil(this.filteredProjects.length / this.pageSize));
  }

  get pagedProjects(): IProject[] {
    const start = (this.projectPage - 1) * this.pageSize;
    return this.filteredProjects.slice(start, start + this.pageSize);
  }

  goToProjectPage(page: number): void {
    this.projectPage = Math.min(Math.max(1, page), this.projectPageCount);
  }

  onProjectSearch(term: string): void {
    this.projectSearch = term;
    this.projectPage = 1;
    this.cdr.markForCheck();
  }

  private clampProjectPage(): void {
    this.projectPage = Math.min(this.projectPage, this.projectPageCount);
  }

  openCreateUser(): void {
    this.editingUser = null;
    this.showUserForm = true;
    this.userError = '';
    this.userForm.reset({ authorities: ['ROLE_USER'] });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  openEditUser(user: IUserManagement): void {
    this.editingUser = user;
    this.showUserForm = true;
    this.userError = '';
    this.userForm.patchValue({
      imageUrl: user.imageUrl ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      login: user.login,
      authorities: user.authorities ?? ['ROLE_USER'],
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  submitUser(): void {
    if (this.userForm.invalid || this.loadingUser || this.photoUploading) return;
    this.userError = '';
    this.loadingUser = true;

    if (this.editingUser) {
      const { password, ...rest } = this.userForm.value;
      const updated: IUserManagement = { ...this.editingUser, ...rest };
      this.userManagementService.update(updated).subscribe({
        next: () => {
          this.showUserForm = false;
          this.loadUsers();
          this.loadingUser = false;
        },
        error: () => {
          this.userError = 'La modification a échoué.';
          this.loadingUser = false;
        },
      });
      return;
    }

    const formValue = this.userForm.value;
    if (!confirm(`Voulez-vous créer le compte de ${formValue.firstName} ${formValue.lastName} (${formValue.email}) ?`)) {
      this.loadingUser = false;
      return;
    }

    this.userManagementService.create({ ...formValue, login: formValue.login, activated: true, langKey: 'fr' }).subscribe({
      next: () => {
        this.showUserForm = false;
        this.userForm.reset({ authorities: ['ROLE_USER'] });
        this.loadUsers();
        this.loadingUser = false;
      },
      error: (err: any) => {
        this.userError = err?.error?.message ?? 'La création du compte a échoué.';
        this.loadingUser = false;
      },
    });
  }

  openDeleteUserModal(user: IUserManagement): void {
    this.userToDelete = user;
    this.showDeleteUserModal = true;
  }

  closeDeleteUserModal(): void {
    this.showDeleteUserModal = false;
    this.userToDelete = null;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete) return;
    const login = this.userToDelete.login;
    this.showDeleteUserModal = false;
    this.userManagementService.delete(login).subscribe({
      next: () => {
        this.userToDelete = null;
        this.loadUsers();
      },
      error: () => {
        this.userError = 'Impossible de supprimer cet employé.';
        this.userToDelete = null;
        this.cdr.markForCheck();
      },
    });
  }

  deleteUser(login: string): void {
    const user = this.users.find(u => u.login === login) ?? null;
    this.userToDelete = user;
    this.showDeleteUserModal = true;
  }

  openPermissionPanel(user: IUserManagement): void {
    this.permissionUser = user;
    this.showPermissionPanel = true;
    this.userError = '';
  }

  closePermissionPanel(): void {
    this.showPermissionPanel = false;
    this.permissionUser = null;
  }

  hasPermission(user: IUserManagement, permission: string): boolean {
    return user.authorities?.includes(permission) ?? false;
  }

  togglePermission(user: IUserManagement, permission: string, granted: boolean): void {
    if (this.savingPermissions) {
      return;
    }
    const current = new Set(user.authorities ?? []);
    if (granted) {
      current.add(permission);
    } else {
      current.delete(permission);
    }
    const updated: IUserManagement = { ...user, authorities: Array.from(current) };
    this.savingPermissions = true;
    this.userManagementService.update(updated).subscribe({
      next: saved => {
        const merged: IUserManagement = { ...updated, ...saved };
        this.users = this.users.map(item => (item.login === merged.login ? merged : item));
        if (this.permissionUser?.login === merged.login) {
          this.permissionUser = merged;
        }
        this.savingPermissions = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.userError = 'La mise à jour des permissions a échoué.';
        this.savingPermissions = false;
        this.cdr.markForCheck();
      },
    });
  }

  submitProject(): void {
    if (this.projectForm.invalid || this.loadingProject) return;
    this.loadingProject = true;
    this.projectError = '';
    this.projectService.create({ ...this.projectForm.value, id: null }).subscribe({
      next: () => {
        this.showProjectForm = false;
        this.projectForm.reset({ iconColor: '#328cb1' });
        this.loadProjects();
        this.loadingProject = false;
      },
      error: () => {
        this.projectError = 'Failed to create project';
        this.loadingProject = false;
      },
    });
  }

  openMemberPanel(project: IProject): void {
    this.selectedProject = project;
    this.showMemberPanel = true;
  }

  addMember(projectId: number, userId: number): void {
    this.projectService.addMember(projectId, userId).subscribe({
      next: p => {
        this.selectedProject = p;
        this.loadProjects();
        this.cdr.markForCheck();
      },
    });
  }

  removeMember(projectId: number, userId: number): void {
    this.projectService.removeMember(projectId, userId).subscribe({
      next: p => {
        this.selectedProject = p;
        this.loadProjects();
        this.cdr.markForCheck();
      },
    });
  }

  deleteProject(id: number): void {
    if (confirm('Supprimer ce projet ? Toutes les tâches seront perdues.')) {
      this.projectService.delete(id).subscribe({ next: () => this.loadProjects() });
    }
  }

  isMember(project: IProject, userId: number): boolean {
    return project.memberses?.some(m => m.id === userId) ?? false;
  }

  getNonMembers(project: IProject): IUserManagement[] {
    return this.users.filter(u => !project.memberses?.some(m => m.id === u.id));
  }

  getUserInitials(user: IUserManagement): string {
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || user.login[0].toUpperCase();
  }

  isAdmin(user: IUserManagement): boolean {
    return user.authorities?.includes('ROLE_ADMIN') ?? false;
  }
}
