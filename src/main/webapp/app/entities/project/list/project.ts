import { PublicIdPipe } from 'app/core/identifiers/public-id.pipe';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgbPopover } from '@ng-bootstrap/ng-bootstrap';
import { AvatarComponent } from '../../../shared/components/avatar/avatar.component';

import { AccountService } from 'app/core/auth';
import { IProject, NewProject } from '../project.model';
import { ProjectService } from '../service/project.service';
import { ModalComponent } from '../../../shared/components/modal/modal.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { SearchBarComponent } from '../../../shared/components/search-bar/search-bar.component';

@Component({
  selector: 'jhi-project',
  templateUrl: './project.html',
  styles: `
    .project-card-closed {
      background: #f1f5f9;
      border-color: #94a3b8;
      border-top: 4px solid #64748b;
    }
    .project-card-closed:hover {
      border-color: #64748b;
    }
    .project-card-closed h3 {
      color: #475569;
    }
    .project-card-closed .project-card-footer,
    .project-card-closed .project-card-actions {
      border-top-color: #cbd5e1;
    }
    .project-closed-badge {
      display: inline-flex;
      align-items: center;
      margin-left: auto;
      padding: 5px 12px;
      border-radius: 999px;
      background: #475569;
      color: white;
      font-size: 12px;
      font-weight: 600;
    }

    .project-card-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      border-top: 1px solid #eef2f6;
      padding-top: 16px;
    }
    .project-card-footer .project-members-trigger {
      white-space: nowrap;
    }
    .project-card-actions {
      display: flex;
      flex: 0 0 100%;
      gap: 10px;
      padding-top: 16px;
      border-top: 1px solid #eef2f6;
    }
    .project-card-actions:not(:has(button)) {
      display: none;
    }
    .project-card-actions > button {
      flex: 1 1 0;
      min-width: 0;
      min-height: 44px;
      display: inline-flex;
      justify-content: center;
      align-items: center;
      padding: 10px;
      font-size: 13px;
      line-height: 1.3;
      box-shadow: none;
    }

    .project-edit-action {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-height: 44px;
      padding: 10px 14px;
      border: 1px solid #b9dce9;
      border-radius: 10px;
      background: #eaf5fa;
      color: #216b87;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }
    .project-edit-action svg {
      width: 20px;
      height: 20px;
    }
    .project-edit-action:hover {
      background: #d9edf6;
      border-color: #328cb1;
    }
    .project-edit-action:focus-visible {
      outline: 3px solid #328cb155;
      outline-offset: 2px;
    }
  `,
  imports: [
    PublicIdPipe,
    RouterLink,
    ReactiveFormsModule,
    ModalComponent,
    PaginationComponent,
    SearchBarComponent,
    AvatarComponent,
    NgbPopover,
  ],
})
export class Project implements OnInit {
  readonly projects = signal<IProject[]>([]);
  readonly showForm = signal(false);
  readonly editingProject = signal<IProject | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');

  readonly projectToReopen = signal<IProject | null>(null);
  get canReopenProject(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_PROJECT_REOPEN']);
  }
  reopenProject(): void {
    const project = this.projectToReopen();
    if (!project || this.loading()) return;
    this.loading.set(true);
    this.projectService.reopen(project.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.projectToReopen.set(null);
        this.load();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('La réouverture du projet a échoué.');
        this.projectToReopen.set(null);
      },
    });
  }

  readonly projectToClose = signal<IProject | null>(null);
  get canCloseProject(): boolean {
    return this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_PROJECT_CLOSE']);
  }
  closeProject(): void {
    const project = this.projectToClose();
    if (!project || this.loading()) return;
    this.loading.set(true);
    this.projectService.close(project.id).subscribe({
      next: () => {
        this.loading.set(false);
        this.projectToClose.set(null);
        this.load();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('La fermeture du projet a échoué.');
        this.projectToClose.set(null);
      },
    });
  }

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
    projectKey: [''],
    iconColor: ['#328cb1', Validators.required],
  });

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
      projectKey: project.projectKey ?? '',
      iconColor: project.iconColor ?? '#328cb1',
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingProject.set(null);
    this.error.set('');
  }

  private showAccessDenied(message: string, title = 'Accès non autorisé'): void {
    this.accessDeniedTitle.set(title);
    this.accessDeniedMessage.set(message);
    this.accessDenied.set(true);
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
    const generatedKey =
      (value.name || 'PROJET')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 6)
        .toUpperCase() || 'PROJET';
    const existing = this.editingProject();

    if (existing) {
      const updated: IProject = {
        ...existing,
        name: value.name,
        description: value.description,
        projectKey: value.projectKey || generatedKey,
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
      projectKey: value.projectKey || generatedKey,
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
            'Ce projet contient encore des tâches ou des périodes. Supprimez-les d’abord, puis réessayez de supprimer le projet.',
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

  getProjectColor(project: IProject): string {
    if (project.iconColor && /^#[0-9a-fA-F]{3,8}$/.test(project.iconColor.trim())) {
      return project.iconColor.trim();
    }

    const colors = ['#328cb1', '#6366f1', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#14b8a6', '#f59e0b'];

    const id = project.id ?? 1;

    return colors[Math.abs(id) % colors.length];
  }

  getProjectInitial(project: IProject): string {
    const raw = (project.projectKey || project.name || 'P').trim();
    return raw.charAt(0).toUpperCase();
  }

  // ── Helpers membres ──────────────────────────────────────────────────────

  private readonly memberColors = ['#328cb1', '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#f97316', '#14b8a6'];

  getMemberColor(index: number): string {
    return this.memberColors[index % this.memberColors.length];
  }

  getMemberInitials(member: any): string {
    const first = (member.firstName ?? '')[0] ?? '';
    const last = (member.lastName ?? '')[0] ?? '';
    if (first || last) return (first + last).toUpperCase();
    return (member.login ?? 'M')[0].toUpperCase();
  }

  getMemberName(member: any): string {
    const first = member.firstName ?? '';
    const last = member.lastName ?? '';
    const full = (first + ' ' + last).trim();
    return full || member.login || 'Membre';
  }
}
