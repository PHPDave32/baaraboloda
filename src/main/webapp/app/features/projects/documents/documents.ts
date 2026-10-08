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
import { DocumentsService, ProjectDocument } from './documents.service';

@Component({
  selector: 'jhi-project-documents',
  imports: [NotificationCenterComponent, DatePipe, FormsModule, ReactiveFormsModule, RouterLink],
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
    () => this.account.hasAnyAuthority('ROLE_ADMIN') || this.project()?.owner?.login === this.account.account()?.login,
  );
  projectId = 0;
  private readonly account = inject(AccountService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly service = inject(DocumentsService);
  private readonly workspace = inject(WorkspaceService);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap(params => {
          this.projectId = Number(params.get('id'));
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
          this.loading.set(false);
        },
        error: (error: HttpErrorResponse) => {
          this.loading.set(false);
          this.handleError(error);
        },
      });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const taskId = Number(params.get('taskId'));
      this.taskFilter.set(taskId > 0 ? taskId : null);
    });
  }

  openForm(): void {
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const body = new FormData();
    if (this.kind() === 'file') {
      const file = this.file();
      if (!file) {
        this.error.set('Sélectionnez un fichier.');
        return;
      }
      body.append('file', file);
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
    body.append('title', value.title.trim());
    body.append('description', value.description.trim());
    body.append('category', value.category);
    if (value.taskId) body.append('taskId', value.taskId);
    this.saving.set(true);
    this.error.set('');
    this.service.create(this.projectId, body).subscribe({
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
