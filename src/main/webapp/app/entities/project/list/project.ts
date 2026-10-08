import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { AvatarComponent } from 'app/shared/components/avatar/avatar.component';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AccountService } from 'app/core/auth';
import { IProject, NewProject } from '../project.model';
import { ProjectService } from '../service/project.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';

@Component({
  selector: 'jhi-project',
  templateUrl: './project.html',
  styleUrl: './project.scss',
  host: { '(document:click)': 'dismissMembers($event)', '(document:keydown.escape)': 'activeMembers.set(null)' },
  imports: [
    NotificationCenterComponent,
    AvatarComponent,
    RouterLink,
    ReactiveFormsModule,
    ModalComponent,
    PaginationComponent,
    SearchBarComponent,
  ],
})
export class Project implements OnInit {
  readonly activeMembers = signal<number | null>(null);
  readonly projects = signal<IProject[]>([]);
  readonly showForm = signal(false);
  readonly editingProject = signal<IProject | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly projectToDelete = signal<IProject | null>(null);

  readonly accessDenied = signal(false);
  readonly accessDeniedMessage = signal('');
  readonly accessDeniedTitle = signal('Accès non autorisé');

  readonly pageSize = 9;
  readonly page = signal(1);
  readonly search = signal('');

  readonly filteredProjects = computed(() => {
    const term = this.search().trim().toLowerCase();
    const all = this.projects();
    if (!term) {
      return all;
    }
    return all.filter(p => (p.name ?? '').toLowerCase().includes(term) || (p.projectKey ?? '').toLowerCase().includes(term));
  });

  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filteredProjects().length / this.pageSize)));

  readonly pagedProjects = computed(() => {
    const start = (this.page() - 1) * this.pageSize;
    return this.filteredProjects().slice(start, start + this.pageSize);
  });

  readonly form = inject(FormBuilder).group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    description: [''],
    iconColor: ['#328cb1', Validators.required],
  });

  private readonly memberColors = ['#328cb1', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6'];
  private readonly projectService = inject(ProjectService);
  private readonly accountService = inject(AccountService);

  get canCreateProject(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_PROJECT_CREATE']);
  }

  get canDeleteProject(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_PROJECT_DELETE']);
  }

  get canEditProject(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_PROJECT_CREATE']);
  }

  ngOnInit(): void {
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.pageCount()));
  }

  onSearch(term: string): void {
    this.search.set(term);
    this.page.set(1);
  }

  openCreate(): void {
    this.editingProject.set(null);
    this.error.set('');
    this.form.reset({ iconColor: '#328cb1' });
    this.showForm.set(true);
  }

  openEdit(project: IProject): void {
    this.editingProject.set(project);
    this.error.set('');
    this.form.reset({
      name: project.name ?? '',
      description: project.description ?? '',
      iconColor: project.iconColor ?? '#328cb1',
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProject.set(null);
    this.error.set('');
  }

  closeAccessDenied(): void {
    this.accessDenied.set(false);
  }

  load(): void {
    this.loading.set(true);

    this.projectService.query({ size: 1000 }).subscribe({
      next: response => {
        this.projects.set(response.body ?? []);
        this.page.set(Math.min(this.page(), this.pageCount()));
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Les projets n’ont pas pu être chargés.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.loading()) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const value = this.form.getRawValue();
    const existing = this.editingProject();

    if (existing) {
      const updated: IProject = {
        ...existing,
        name: value.name,
        description: value.description,
        iconColor: value.iconColor,
      };

      this.projectService.update(updated).subscribe({
        next: () => {
          this.loading.set(false);
          this.closeForm();
          this.load();
        },
        error: err => {
          this.loading.set(false);
          if (err?.status === 403) {
            this.closeForm();
            this.showAccessDenied('Vous n’avez pas la permission de modifier un projet. Contactez un administrateur pour obtenir l’accès.');
          } else {
            this.error.set('Le projet n’a pas pu être modifié.');
          }
        },
      });
      return;
    }

    const project: NewProject = {
      id: null,
      name: value.name,
      description: value.description,
      iconColor: value.iconColor,
      status: 'ACTIVE',
    };

    this.projectService.create(project).subscribe({
      next: () => {
        this.loading.set(false);
        this.closeForm();
        this.load();
      },
      error: err => {
        this.loading.set(false);
        if (err?.status === 403) {
          this.closeForm();
          this.showAccessDenied('Vous n’avez pas la permission de créer un projet. Contactez un administrateur pour obtenir l’accès.');
        } else {
          this.error.set('Le projet n’a pas pu être créé.');
        }
      },
    });
  }

  openDeleteModal(project: IProject): void {
    this.projectToDelete.set(project);
  }

  closeDeleteModal(): void {
    this.projectToDelete.set(null);
  }

  confirmDelete(): void {
    const project = this.projectToDelete();

    if (!project || this.loading()) {
      return;
    }

    this.loading.set(true);

    this.projectService.delete(project.id).subscribe({
      next: () => {
        this.projectToDelete.set(null);
        this.load();
      },
      error: err => {
        this.loading.set(false);
        this.projectToDelete.set(null);
        if (err?.status === 403) {
          this.showAccessDenied('Vous n’avez pas la permission de supprimer un projet. Contactez un administrateur pour obtenir l’accès.');
        } else if (err?.error?.message === 'error.projecthaschildren') {
          this.showAccessDenied(
            'Ce projet contient encore des tâches ou des sprints. Supprimez-les d’abord, puis réessayez de supprimer le projet.',
            'Suppression impossible',
          );
        } else {
          this.showAccessDenied(
            'Le projet n’a pas pu être supprimé. Il contient peut-être encore des éléments liés.',
            'Suppression impossible',
          );
        }
      },
    });
  }

  dismissMembers(event: Event): void {
    if (!(event.target instanceof Element) || !event.target.closest('.project-members')) this.activeMembers.set(null);
  }

  leaveMembers(event: FocusEvent): void {
    if (!(event.relatedTarget instanceof Node) || !(event.currentTarget as HTMLElement).contains(event.relatedTarget)) {
      this.activeMembers.set(null);
    }
  }

  tiltCard(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const card = event.currentTarget as HTMLElement;
    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    const y = (event.clientY - bounds.top) / bounds.height;
    card.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
    card.style.setProperty('--tilt-y', `${(x - 0.5) * 4}deg`);
  }

  resetCard(event: PointerEvent): void {
    const card = event.currentTarget as HTMLElement;
    card.style.setProperty('--tilt-x', '0deg');
    card.style.setProperty('--tilt-y', '0deg');
  }

  getProjectColor(project: IProject): string {
    if (project.iconColor && /^#[0-9a-fA-F]{3,8}$/.test(project.iconColor.trim())) {
      return project.iconColor.trim();
    }

    const colors = ['#328cb1', '#6366f1', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#f59e0b'];

    const id = project.id;

    return colors[Math.abs(id) % colors.length];
  }

  getProjectInitial(project: IProject): string {
    const raw = (project.projectKey?.trim() ? project.projectKey : (project.name ?? 'P')).trim();
    return raw.charAt(0).toUpperCase();
  }

  // ── Helpers membres ──────────────────────────────────────────────────────

  getMemberColor(index: number): string {
    return this.memberColors[index % this.memberColors.length];
  }

  getMemberInitials(member: { login?: string | null; firstName?: string | null; lastName?: string | null }): string {
    const first = member.firstName?.charAt(0) ?? '';
    const last = member.lastName?.charAt(0) ?? '';
    if (first || last) return (first + last).toUpperCase();
    return (member.login ?? 'M')[0].toUpperCase();
  }

  getMemberName(member: { login?: string | null; firstName?: string | null; lastName?: string | null }): string {
    const first = member.firstName ?? '';
    const last = member.lastName ?? '';
    const full = (first + ' ' + last).trim();
    return full ? full : (member.login ?? 'Membre');
  }
  private showAccessDenied(message: string, title = 'Accès non autorisé'): void {
    this.accessDeniedTitle.set(title);
    this.accessDeniedMessage.set(message);
    this.accessDenied.set(true);
  }
}
