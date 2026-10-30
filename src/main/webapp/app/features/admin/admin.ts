import { UserPreviewComponent } from 'app/shared/components/user-preview/user-preview.component';
import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { PhotoPicker } from 'app/shared/components/photo-picker/photo-picker';
import { AvatarComponent } from 'app/shared/components/avatar/avatar.component';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';

import { AccountService } from 'app/core/auth/account.service';
import { Account } from 'app/core/auth/account.model';
import { UserManagementService } from 'app/entities/admin/user-management/service/user-management.service';
import { IUserManagement } from 'app/entities/admin/user-management/user-management.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import { IProject } from 'app/entities/project/project.model';
import { ModalComponent } from 'app/shared/components/modal/modal.component';
import { PaginationComponent } from 'app/shared/components/pagination/pagination.component';
import { SearchBarComponent } from 'app/shared/components/search-bar/search-bar.component';
import { AccessProfileService } from 'app/entities/admin/access-profile/service/access-profile.service';
import { IAccessProfile } from 'app/entities/admin/access-profile/access-profile.model';
import AccessProfileComponent from 'app/entities/admin/access-profile/access-profile.component';
import { PasswordToggleDirective } from 'app/shared/directives/password-toggle.directive';
import { BrandingService } from 'app/core/branding/branding.service';

@Component({
  selector: 'jhi-admin',
  standalone: true,
  imports: [
    NotificationCenterComponent,
    PhotoPicker,
    AvatarComponent,
    UserPreviewComponent,
    CommonModule,
    ReactiveFormsModule,
    ModalComponent,
    PaginationComponent,
    SearchBarComponent,
    PasswordToggleDirective,
    AccessProfileComponent,
  ],
  templateUrl: './admin.html',
  styleUrls: ['./admin.css'],
})
export default class AdminComponent implements OnInit {
  photoUploading = false;
  users: IUserManagement[] = [];

  readonly branding = inject(BrandingService);
  logoUploading = false;
  logoError = '';
  projects: IProject[] = [];
  profiles: IAccessProfile[] = [];
  profilesLoading = false;
  profilesError = '';
  activeTab: 'users' | 'projects' | 'profiles' = 'users';

  readonly pageSize = 8;
  userPage = 1;
  projectPage = 1;
  userSearch = '';
  userStatus: 'all' | 'active' | 'inactive' = 'all';
  activationPending = new Set<string>();
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
  projectToDelete: number | null = null;
  deletingProject = false;
  deleteProjectError = '';

  showMemberPanel = false;
  selectedProject: IProject | null = null;

  // Modal de confirmation suppression employé
  showDeleteUserModal = false;
  userToDelete: IUserManagement | null = null;

  showPermissionPanel = false;
  permissionUser: IUserManagement | null = null;
  savingPermissions = false;
  selectedUserPermissions = new Set<string>();

  readonly permissionCatalog: { key: string; label: string; description: string }[] = [
    {
      key: 'PERM_PROJECT_REOPEN',
      label: 'Réouvrir les projets',
      description: 'Réouvrir un projet fermé et rétablir les actions autorisées.',
    },
    { key: 'PERM_PROJECT_CLOSE', label: 'Fermer les projets', description: 'Fermer un projet et le rendre consultable uniquement.' },
    { key: 'PERM_PROJECT_CREATE', label: 'Créer des projets', description: 'Autorise la création de nouveaux projets.' },
    {
      key: 'PERM_PROJECT_EDIT',
      label: 'Modifier les projets',
      description: 'Autorise la modification des informations des projets accessibles.',
    },
    { key: 'PERM_PROJECT_DELETE', label: 'Supprimer des projets', description: 'Autorise la suppression de projets existants.' },
    { key: 'PERM_SPRINT_MANAGE', label: 'Gérer les périodes', description: 'Autorise la création et la suppression de périodes.' },
    { key: 'PERM_MANAGE_MEMBERS', label: 'Gérer les membres', description: "Autorise l'ajout et le retrait de membres sur les projets." },
    {
      key: 'PERM_TASK_MANAGE',
      label: 'Gérer les tâches',
      description: 'Autorise la création, modification, assignation et suppression des tâches.',
    },
    {
      key: 'PERM_COMMENT_MANAGE',
      label: 'Participer aux commentaires',
      description: 'Autorise l’ajout, la modification et la suppression des commentaires.',
    },
    {
      key: 'PERM_RESOURCE_VISIBILITY',
      label: 'Gérer la visibilité de ses ressources',
      description: 'Choisir qui peut consulter les documents, fichiers et liens que vous avez ajoutés.',
    },
    {
      key: 'PERM_DOCUMENT_MANAGE',
      label: 'Gérer les documents',
      description: 'Autorise l’ajout et la suppression des documents et liens.',
    },
    {
      key: 'PERM_USER_DISABLE',
      label: 'Activer et désactiver les comptes',
      description: 'Voir les comptes désactivés et activer ou désactiver les comptes utilisateurs ordinaires.',
    },
    { key: 'PERM_USER_MANAGE', label: 'Gérer les comptes utilisateurs', description: 'Autorise la gestion des comptes ordinaires.' },
    {
      key: 'PERM_SPRINT_ALERT_RECEIVE',
      label: 'Recevoir les alertes de fin de période',
      description: 'Recevoir le bilan des tâches non terminées des projets dont vous êtes membre à la clôture de chaque période.',
    },
  ];

  readonly profileCatalog: {
    key: string;
    label: string;
    description: string;
    icon: string;
    role: string;
    permissions: string[];
  }[] = [
    {
      key: 'PROFILE_DIRECTOR',
      label: 'Directeur des opérations',
      description: 'Vision globale sur tous les projets. Peut tout créer, supprimer et gérer.',
      icon: '👔',
      role: 'ROLE_ADMIN',
      permissions: ['PERM_PROJECT_CREATE', 'PERM_PROJECT_DELETE', 'PERM_SPRINT_MANAGE', 'PERM_MANAGE_MEMBERS'],
    },
    {
      key: 'PROFILE_PM',
      label: 'Chef de projet',
      description: 'Crée et pilote des projets, gère les périodes et les équipes.',
      icon: '🗂️',
      role: 'ROLE_USER',
      permissions: ['PERM_PROJECT_CREATE', 'PERM_SPRINT_MANAGE', 'PERM_MANAGE_MEMBERS'],
    },
    {
      key: 'PROFILE_CONTRIBUTOR',
      label: 'Contributeur',
      description: 'Participe activement aux projets, gère les périodes mais ne crée pas de projets.',
      icon: '🛠️',
      role: 'ROLE_USER',
      permissions: ['PERM_SPRINT_MANAGE'],
    },
    {
      key: 'PROFILE_MEMBER',
      label: 'Membre',
      description: 'Crée et met à jour des tâches au sein des projets dont il est membre.',
      icon: '👤',
      role: 'ROLE_USER',
      permissions: [],
    },
    {
      key: 'PROFILE_OBSERVER',
      label: 'Observateur',
      description: 'Consultation uniquement. Aucune action de modification.',
      icon: '👁️',
      role: 'ROLE_USER',
      permissions: [],
    },
  ];

  private readonly accountService = inject(AccountService);
  private readonly userManagementService = inject(UserManagementService);
  private readonly projectService = inject(ProjectService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private readonly accessProfileService = inject(AccessProfileService);

  constructor() {
    this.userForm = this.fb.group({
      imageUrl: [null],
      firstName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/.*\S.*/)]],
      lastName: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/.*\S.*/)]],
      email: [
        '',
        [Validators.required, Validators.email, Validators.maxLength(254), Validators.pattern(/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/)],
      ],
      login: ['', [Validators.required, Validators.maxLength(50), Validators.pattern(/^[_.@A-Za-z0-9-]+$/)]],
      password: ['', [Validators.minLength(6)]],
      role: ['ROLE_USER', Validators.required],
      accessProfileId: [null as number | null],
    });

    this.projectForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      projectKey: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(6)]],
      iconColor: ['#328cb1'],
    });
  }

  get currentAccount(): Account | null {
    return this.accountService.account();
  }

  get isSuperAdmin(): boolean {
    return this.accountService.hasAnyAuthority('ROLE_SUPER_ADMIN');
  }

  get canManageUsers(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'PERM_USER_MANAGE']);
  }

  get canDisableUsers(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_SUPER_ADMIN', 'PERM_USER_DISABLE']);
  }

  canEditUser(user: IUserManagement): boolean {
    return this.canManageUsers && (this.isSuperAdmin || !this.isAdmin(user));
  }

  roleLabel(user: IUserManagement): string {
    return user.authorities?.includes('ROLE_SUPER_ADMIN')
      ? 'Super administrateur'
      : (user.accessProfileName ?? (this.isAdmin(user) ? 'Administrateur' : 'Employé'));
  }

  ngOnInit(): void {
    if (!this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'ROLE_SUPER_ADMIN', 'PERM_USER_MANAGE', 'PERM_USER_DISABLE'])) {
      this.router.navigate(['/']);
      return;
    }
    this.loadUsers();
    if (this.canManageUsers) this.loadProjects();
    if (this.canManageUsers) this.loadProfiles();
  }

  loadProfiles(): void {
    this.profilesLoading = true;
    this.profilesError = '';
    this.accessProfileService.query().subscribe({
      next: profiles => {
        this.profiles = profiles;
        this.profilesLoading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.profilesLoading = false;
        this.profilesError = 'Impossible de charger les profils. Veuillez réessayer.';
        this.cdr.markForCheck();
      },
    });
  }

  canChangeUserActivation(user: IUserManagement): boolean {
    return this.canDisableUsers && (this.isSuperAdmin || !this.isAdmin(user));
  }

  toggleUserActivation(user: IUserManagement): void {
    if (!this.canChangeUserActivation(user) || this.activationPending.has(user.login)) return;
    this.activationPending.add(user.login);
    this.userError = '';
    this.userManagementService.setActivation(user.login, !user.activated).subscribe({
      next: saved => {
        this.users = this.users.map(item => (item.login === saved.login ? saved : item));
        this.activationPending.delete(user.login);
        this.clampUserPage();
        this.cdr.markForCheck();
      },
      error: err => {
        this.activationPending.delete(user.login);
        this.userError = err?.error?.detail ?? err?.error?.title ?? "Impossible de modifier l'état de ce compte.";
        this.cdr.markForCheck();
      },
    });
  }

  loadUsers(): void {
    this.userManagementService.query({ size: 1000 }).subscribe({
      next: res => {
        const currentLogin = this.currentAccount?.login?.toLowerCase();
        this.users = (res.body ?? []).filter(
          user => !user.authorities?.includes('ROLE_SUPER_ADMIN') && (!currentLogin || user.login?.toLowerCase() !== currentLogin),
        );
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
    return this.users.filter(user => {
      const matchesStatus = this.userStatus === 'all' || (this.userStatus === 'active' ? user.activated : !user.activated);
      return (
        matchesStatus &&
        (!term || [user.firstName, user.lastName, user.email, user.login].some(value => (value ?? '').toLowerCase().includes(term)))
      );
    });
  }

  get inactiveUserCount(): number {
    return this.users.filter(user => !user.activated).length;
  }

  setUserStatus(status: 'all' | 'active' | 'inactive'): void {
    this.userStatus = status;
    this.userPage = 1;
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

  openCreateUser(): void {
    this.editingUser = null;
    this.showUserForm = true;
    this.userError = '';
    this.userForm.reset({ role: 'ROLE_USER' });
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(100)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  openEditUser(user: IUserManagement): void {
    if (!this.canEditUser(user)) return;
    this.editingUser = user;
    this.showUserForm = true;
    this.userError = '';
    this.userForm.patchValue({
      imageUrl: user.imageUrl ?? null,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      login: user.login,
      role: user.authorities?.includes('ROLE_SUPER_ADMIN') ? 'ROLE_SUPER_ADMIN' : this.isAdmin(user) ? 'ROLE_ADMIN' : 'ROLE_USER',
      accessProfileId: user.accessProfileId ?? null,
    });
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  userFieldError(name: string): string {
    const control = this.userForm.get(name);
    if (!control?.touched || !control.errors) return '';
    if (control.hasError('required')) return 'Ce champ est obligatoire.';
    if (control.hasError('maxlength')) return `Maximum ${control.errors['maxlength'].requiredLength} caractères.`;
    if (name === 'email') return 'Saisissez une adresse valide, par exemple nom@entreprise.com.';
    if (name === 'login') return 'Utilisez des lettres sans accents, des chiffres ou les caractères . _ @ -.';
    if (name === 'password') return 'Le mot de passe doit contenir au moins 6 caractères.';
    return 'Ce champ ne peut pas contenir uniquement des espaces.';
  }

  submitUser(): void {
    this.userForm.markAllAsTouched();
    if (this.userForm.invalid || this.loadingUser || this.photoUploading) return;
    this.userError = '';
    this.loadingUser = false;
    const { role, accessProfileId, ...fields } = this.userForm.value;
    const authorities =
      this.isSuperAdmin && !accessProfileId
        ? [...new Set(['ROLE_USER', role, ...(this.editingUser?.authorities ?? []).filter(authority => !authority.startsWith('ROLE_'))])]
        : (this.editingUser?.authorities ?? ['ROLE_USER']);

    if (this.editingUser) {
      this.loadingUser = true;
      if (!this.canEditUser(this.editingUser)) {
        this.loadingUser = false;
        return;
      }
      const { password, ...rest } = fields;
      const updated: IUserManagement = { ...this.editingUser, ...rest, authorities, accessProfileId: accessProfileId ?? null };
      this.userManagementService.update(updated).subscribe({
        next: () => {
          this.showUserForm = false;
          this.loadUsers();
          this.loadingUser = false;
        },
        error: err => {
          this.userError = err?.error?.detail ?? err?.error?.title ?? 'La modification a échoué.';
          this.loadingUser = false;
        },
      });
      return;
    }

    this.loadingUser = true;
    this.userManagementService
      .create({ ...fields, authorities, accessProfileId: accessProfileId ?? null, activated: true, langKey: 'fr' })
      .subscribe({
        next: () => {
          this.showUserForm = false;
          this.userForm.reset({ role: 'ROLE_USER' });
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
    if (!this.canEditUser(user) || user.login === this.currentAccount?.login) return;
    this.userToDelete = user;
    this.showDeleteUserModal = true;
  }

  closeDeleteUserModal(): void {
    this.showDeleteUserModal = false;
    this.userToDelete = null;
  }

  confirmDeleteUser(): void {
    if (!this.userToDelete || !this.canEditUser(this.userToDelete) || this.userToDelete.login === this.currentAccount?.login) return;
    const login = this.userToDelete.login;
    this.showDeleteUserModal = false;
    this.userManagementService.delete(login).subscribe({
      next: () => {
        this.userToDelete = null;
        this.loadUsers();
      },
      error: err => {
        this.userError = err?.error?.detail ?? err?.error?.title ?? 'Impossible de supprimer ce compte.';
        this.userToDelete = null;
        this.cdr.markForCheck();
      },
    });
  }

  deleteUser(login: string): void {
    const user = this.users.find(u => u.login === login) ?? null;
    if (user) this.openDeleteUserModal(user);
  }

  openPermissionPanel(user: IUserManagement): void {
    if (!this.isSuperAdmin) return;
    this.permissionUser = user;

    // Reconstruire l'état effectif : profil + surcharges individuelles
    const profilePerms = new Set<string>(this.profiles.find(p => p.id === user.accessProfileId)?.permissions ?? []);
    const effective = new Set<string>(profilePerms);
    (user.grantedPermissions ?? []).forEach(p => effective.add(p));
    (user.revokedPermissions ?? []).forEach(p => effective.delete(p));

    // Ne conserver que les clés connues du catalogue
    this.selectedUserPermissions = new Set([...effective].filter(key => this.permissionCatalog.some(p => p.key === key)));

    this.showPermissionPanel = true;
    this.userError = '';
  }

  closePermissionPanel(): void {
    this.showPermissionPanel = false;
    this.permissionUser = null;
    this.selectedUserPermissions.clear();
  }

  hasSelectedPermission(permission: string): boolean {
    return this.selectedUserPermissions.has(permission);
  }

  toggleSelectedPermission(permission: string, granted: boolean): void {
    if (granted) {
      this.selectedUserPermissions.add(permission);
    } else {
      this.selectedUserPermissions.delete(permission);
    }
  }

  saveUserPermissions(): void {
    if (!this.isSuperAdmin || this.savingPermissions || !this.permissionUser) return;
    const user = this.permissionUser;

    // Permissions de base du profil assigné (source de vérité pour le delta)
    const profilePermissions = new Set<string>(this.profiles.find(profile => profile.id === user.accessProfileId)?.permissions ?? []);

    const grantedPermissions = [...this.selectedUserPermissions].filter(p => !profilePermissions.has(p));
    const revokedPermissions = [...profilePermissions].filter(p => !this.selectedUserPermissions.has(p));
    const roleAuthorities = (user.authorities ?? []).filter(authority => authority.startsWith('ROLE_'));
    const updated: IUserManagement = { ...user, authorities: roleAuthorities, grantedPermissions, revokedPermissions };
    this.savingPermissions = true;
    this.userManagementService.update(updated).subscribe({
      next: saved => {
        const merged: IUserManagement = { ...updated, ...saved };
        this.users = this.users.map(item => (item.login === merged.login ? merged : item));
        if (this.permissionUser?.login === merged.login) {
          this.permissionUser = merged;
        }
        this.savingPermissions = false;
        this.showPermissionPanel = false;
        this.permissionUser = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.userError = 'La mise à jour des permissions a échoué.';
        this.savingPermissions = false;
        this.cdr.markForCheck();
      },
    });
  }

  onLogoFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.logoError = '';
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      this.logoError = 'Choisissez une image JPEG ou PNG de 2 Mo maximum.';
      this.cdr.markForCheck();
      return;
    }
    this.logoUploading = true;
    this.cdr.markForCheck();
    this.branding.upload(file).subscribe({
      next: () => {
        this.logoUploading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.logoError = 'Envoi impossible. Vérifiez le format et votre connexion.';
        this.logoUploading = false;
        this.cdr.markForCheck();
      },
    });
  }

  removeLogo(): void {
    this.logoError = '';
    this.branding.remove().subscribe({
      error: () => {
        this.logoError = 'Suppression impossible. Veuillez réessayer.';
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
    this.projectToDelete = id;
    this.deleteProjectError = '';
  }

  confirmDeleteProject(): void {
    if (this.projectToDelete === null || this.deletingProject) return;
    this.deletingProject = true;
    this.projectService.delete(this.projectToDelete).subscribe({
      next: () => {
        this.projectToDelete = null;
        this.deletingProject = false;
        this.loadProjects();
        this.cdr.markForCheck();
      },
      error: () => {
        this.deleteProjectError = 'Impossible de supprimer le projet. Réessayez dans un instant.';
        this.deletingProject = false;
        this.cdr.markForCheck();
      },
    });
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
    return user.authorities?.some(role => role === 'ROLE_ADMIN' || role === 'ROLE_SUPER_ADMIN') ?? false;
  }

  private clampUserPage(): void {
    this.userPage = Math.min(this.userPage, this.userPageCount);
  }

  private clampProjectPage(): void {
    this.projectPage = Math.min(this.projectPage, this.projectPageCount);
  }
}
