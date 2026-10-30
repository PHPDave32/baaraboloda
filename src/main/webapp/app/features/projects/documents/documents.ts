import { PublicIdPipe } from 'app/core/identifiers/public-id.pipe';
import { DocumentActions } from './preview/document-actions';
import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, switchMap } from 'rxjs';
import { AccountService } from 'app/core/auth';
import { IProject } from 'app/entities/project/project.model';
import { ITask } from 'app/entities/task/task.model';
import { WorkspaceService } from '../workspace.service';
import { DocumentsService, ProjectDocument, ResourceRecipient } from './documents.service';

@Component({
  selector: 'jhi-project-documents',
  imports: [PublicIdPipe, DocumentActions, NotificationCenterComponent, DatePipe, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './documents.html',
  styleUrl: './documents.scss',
})
export default class Documents implements OnInit {
  readonly resourceDialog = viewChild<ElementRef<HTMLDialogElement>>('resourceDialog');
  readonly categories = [
    { value: 'SPECIFICATION', label: 'Cahier des charges' },
    { value: 'REPORT', label: 'Compte rendu' },
    { value: 'DESIGN', label: 'Maquette' },
    { value: 'TECHNICAL', label: 'Document technique' },
    { value: 'DELIVERABLE', label: 'Livrable' },
    { value: 'OTHER', label: 'Autre' },
  ];
  readonly project = signal<IProject | null>(null);
  readonly tasks = signal<ITask[]>([]);
  readonly documents = signal<ProjectDocument[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly showForm = signal(false);
  readonly search = signal('');
  readonly category = signal('');
  readonly taskFilter = signal<number | null>(null);
  readonly pendingDelete = signal<ProjectDocument | null>(null);
  readonly downloading = signal<number | null>(null);
  readonly kind = signal<'file' | 'link'>('file');
  readonly file = signal<File | null>(null);
  readonly editingResource = signal<ProjectDocument | null>(null);
  readonly editingVisibility = signal<ProjectDocument | null>(null);
  readonly restricted = signal(false);
  readonly allowedLogins = signal<string[]>([]);
  readonly canManageVisibility = computed(() => this.account.hasAnyAuthority(['ROLE_SUPER_ADMIN', 'PERM_RESOURCE_VISIBILITY']));
  readonly recipients = signal<ResourceRecipient[]>([]);
  readonly recipientNames = computed(
    () => new Map(this.recipients().map(user => [user.login, [user.firstName, user.lastName].filter(Boolean).join(' ') || user.login])),
  );
  readonly recipientsLoading = signal(false);
  readonly recipientsError = signal('');
  readonly recipientSearch = signal('');
  readonly selectedOnly = signal(false);
  readonly visibilityCandidates = computed(() => {
    const term = this.normalizeSearch(this.recipientSearch());
    return this.recipients().filter(
      user =>
        !this.isCurrentUser(user.login) &&
        (!this.selectedOnly() || this.allowedLogins().includes(user.login)) &&
        this.normalizeSearch(`${user.firstName ?? ''} ${user.lastName ?? ''} ${user.login}`).includes(term),
    );
  });

  readonly form = inject(FormBuilder).nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(200), Validators.pattern(/\S/)]],
    description: ['', Validators.maxLength(2000)],
    category: ['OTHER', Validators.required],
    url: [''],
    taskId: [''],
  });
  readonly filtered = computed(() =>
    this.documents().filter(
      document =>
        document.title.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase()) &&
        (!this.category() || document.category === this.category()) &&
        (!this.taskFilter() || document.taskId === this.taskFilter()),
    ),
  );
  readonly canDelete = computed(
    () =>
      this.project()?.status !== 'CLOSED' &&
      (this.account.hasAnyAuthority('ROLE_ADMIN') || this.project()?.owner?.login === this.account.account()?.login),
  );
  projectId = 0;
  private readonly account = inject(AccountService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(DocumentsService);
  private readonly workspace = inject(WorkspaceService);

  recipientName(login: string): string {
    return this.recipientNames().get(login) ?? login;
  }

  isCurrentUser(login: string): boolean {
    return login === this.account.account()?.login;
  }

  loadRecipients(): void {
    this.recipientsLoading.set(true);
    this.recipientsError.set('');
    this.service.recipients(this.projectId).subscribe({
      next: users => {
        this.recipients.set(users);
        this.recipientsLoading.set(false);
      },
      error: () => {
        this.recipientsLoading.set(false);
        this.recipientsError.set('Impossible de charger les utilisateurs.');
      },
    });
  }

  ngOnInit(): void {
    this.route.data
      .pipe(
        switchMap(data => {
          this.projectId = data['workspace'].projectId;
          this.loading.set(true);
          this.project.set(null);
          this.documents.set([]);
          this.closeForm();
          return forkJoin({
            project: this.workspace.getProject(this.projectId),
            documents: this.service.list(this.projectId),
            tasks: this.workspace.getTasksByProject(this.projectId),
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: result => {
          this.project.set(result.project);
          this.documents.set(result.documents);
          this.tasks.set(result.tasks);
          this.applyTaskQuery(this.route.snapshot.queryParamMap.get('taskId'));
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.handleError(error);
        },
      });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      this.applyTaskQuery(params.get('taskId'));
    });
  }

  private applyTaskQuery(reference: string | null): void {
    const task = this.tasks().find(item => item.uuid === reference || String(item.id) === reference);
    this.taskFilter.set(task?.id ?? null);
  }

  canChangeVisibility(document: ProjectDocument): boolean {
    return this.canManageVisibility() && this.project()?.status !== 'CLOSED' && document.author === this.account.account()?.login;
  }

  toggleReader(login: string): void {
    this.allowedLogins.update(logins => (logins.includes(login) ? logins.filter(value => value !== login) : [...logins, login]));
  }

  canEditResource(document: ProjectDocument): boolean {
    return this.isCurrentUser(document.author) && this.project()?.status !== 'CLOSED';
  }

  editResource(document: ProjectDocument): void {
    if (!this.canEditResource(document)) return;
    this.editingResource.set(document);
    this.editingVisibility.set(null);
    this.form.reset({
      title: document.title,
      description: document.description ?? '',
      category: document.category,
      url: document.url ?? '',
      taskId: document.taskId?.toString() ?? '',
    });
    this.kind.set(document.url ? 'link' : 'file');
    this.file.set(null);
    this.restricted.set(document.restricted);
    this.error.set('');
    this.showForm.set(true);
    this.resourceDialog()?.nativeElement.showModal();
  }

  editVisibility(document: ProjectDocument): void {
    this.editingResource.set(null);
    this.recipientSearch.set('');
    this.selectedOnly.set(false);
    this.loadRecipients();
    this.error.set('');
    this.service.visibility(this.projectId, document.id).subscribe({
      next: visibility => {
        this.editingVisibility.set(document);
        this.restricted.set(visibility.restricted);
        this.allowedLogins.set(visibility.allowedLogins.filter(login => !this.isCurrentUser(login)));
        this.showForm.set(true);
        this.resourceDialog()?.nativeElement.showModal();
      },
      error: (error: HttpErrorResponse) => this.handleError(error),
    });
  }

  openForm(): void {
    this.editingResource.set(null);
    this.recipientSearch.set('');
    this.selectedOnly.set(false);
    if (this.canManageVisibility()) this.loadRecipients();
    this.editingVisibility.set(null);
    this.restricted.set(false);
    this.allowedLogins.set([]);
    this.form.reset({ category: 'OTHER', taskId: this.taskFilter()?.toString() ?? '' });
    this.kind.set('file');
    this.file.set(null);
    this.error.set('');
    this.showForm.set(true);
    this.resourceDialog()?.nativeElement.showModal();
  }

  closeForm(): void {
    if (this.saving()) return;
    this.resourceDialog()?.nativeElement.close();
    this.showForm.set(false);
    this.file.set(null);
  }

  cancelDialog(event: Event): void {
    event.preventDefault();
    this.closeForm();
  }

  selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.file.set(null);
    this.error.set('');
    if (file && (file.size === 0 || file.size > 10 * 1024 * 1024)) {
      this.error.set('Choisissez un fichier non vide de 10 Mo maximum.');
      input.value = '';
      return;
    }
    this.file.set(file);
  }

  save(): void {
    if (this.saving()) return;
    const editing = this.editingVisibility();
    if (editing) {
      this.saving.set(true);
      this.service
        .updateVisibility(this.projectId, editing.id, {
          restricted: this.restricted(),
          allowedLogins: this.restricted() ? this.allowedLogins() : [],
        })
        .subscribe({
          next: () => {
            this.saving.set(false);
            this.closeForm();
            this.reload();
          },
          error: (error: HttpErrorResponse) => {
            this.saving.set(false);
            this.handleError(error);
          },
        });
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body = new FormData();
    if (this.kind() === 'file') {
      const file = this.file();
      if (!file && !this.editingResource()?.filename) {
        this.error.set('Sélectionnez un fichier.');
        return;
      }
      if (file) body.append('file', file);
    } else {
      try {
        const url = new URL(value.url.trim());
        if (url.protocol !== 'https:' || url.username || url.password || value.url.length > 2000) throw new Error();
        body.append('url', url.href);
      } catch {
        this.error.set('Saisissez un lien HTTPS valide.');
        return;
      }
    }
    if (!this.editingResource()) {
      body.append('restricted', String(this.restricted()));
      if (this.restricted()) this.allowedLogins().forEach(login => body.append('allowedLogins', login));
    }
    body.append('title', value.title.trim());
    body.append('description', value.description.trim());
    body.append('category', value.category);
    if (value.taskId) body.append('taskId', value.taskId);
    this.saving.set(true);
    this.error.set('');
    const resource = this.editingResource();
    const request = resource ? this.service.update(this.projectId, resource.id, body) : this.service.create(this.projectId, body);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.reload();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.handleError(error);
      },
    });
  }

  download(document: ProjectDocument): void {
    this.downloading.set(document.id);
    this.service.download(this.projectId, document.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = globalThis.document.createElement('a');
        anchor.href = url;
        anchor.download = document.filename ?? document.title;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.downloading.set(null);
      },
      error: (error: HttpErrorResponse) => {
        this.downloading.set(null);
        this.handleError(error);
      },
    });
  }

  delete(): void {
    const document = this.pendingDelete();
    if (!document || this.saving()) return;
    this.saving.set(true);
    this.service.delete(this.projectId, document.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.pendingDelete.set(null);
        this.reload();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.pendingDelete.set(null);
        this.handleError(error);
      },
    });
  }

  categoryLabel(value: string): string {
    return this.categories.find(category => category.value === value)?.label ?? value;
  }

  private normalizeSearch(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase()
      .trim();
  }

  private reload(): void {
    this.service
      .list(this.projectId)
      .subscribe({ next: documents => this.documents.set(documents), error: (error: HttpErrorResponse) => this.handleError(error) });
  }

  private handleError(error: HttpErrorResponse): void {
    this.error.set(
      error.status === 403
        ? 'Vous n’avez pas accès à cette ressource.'
        : error.status === 413
          ? 'Le fichier dépasse la taille autorisée de 10 Mo.'
          : 'L’opération a échoué. Vérifiez les informations et réessayez.',
    );
  }
}
