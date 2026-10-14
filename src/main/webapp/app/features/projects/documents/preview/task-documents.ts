import { Component, effect, inject, input, signal } from '@angular/core';
import { DocumentsService, ProjectDocument } from '../documents.service';
import { DocumentActions } from './document-actions';

@Component({
  selector: 'jhi-task-documents',
  imports: [DocumentActions],
  template: `
    <section class="rounded-2xl border border-slate-200 bg-white p-5 space-y-4" aria-label="Documents de la tâche">
      <h2 class="font-semibold text-[#203e50]">
        Documents de la tâche <span class="text-sm text-slate-500">({{ documents().length }})</span>
      </h2>
      @if (loading()) {
        <p role="status" class="text-sm text-slate-500">Chargement des documents…</p>
      } @else if (error()) {
        <p role="alert" class="text-sm text-red-600">{{ error() }}</p>
      } @else {
        @for (document of documents(); track document.id) {
          <article class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 p-3">
            <div class="min-w-0">
              <strong class="text-sm">{{ document.title }}</strong>
              <p class="text-xs text-slate-500 break-all">{{ document.filename }}</p>
            </div>
            @if (document.url) {
              <a
                [href]="document.url"
                target="_blank"
                rel="noopener noreferrer"
                class="resource-icon-action"
                title="Ouvrir le lien"
                aria-label="Ouvrir le lien"
                ><svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M14 3h7v7M21 3 10 14M10 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5" /></svg
              ></a>
            } @else {
              <jhi-document-actions [projectId]="projectId()" [document]="document" />
            }
          </article>
        } @empty {
          <p class="text-sm text-slate-500">Aucun document accessible associé à cette tâche.</p>
        }
      }
    </section>
  `,
})
export class TaskDocuments {
  readonly projectId = input.required<number>();
  readonly taskId = input.required<number>();
  readonly documents = signal<ProjectDocument[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  private readonly service = inject(DocumentsService);
  constructor() {
    effect(onCleanup => {
      const taskId = this.taskId();
      this.documents.set([]);
      this.loading.set(true);
      this.error.set('');
      const request = this.service.list(this.projectId()).subscribe({
        next: documents => {
          this.documents.set(documents.filter(document => document.taskId === taskId));
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Impossible de charger les documents.');
          this.loading.set(false);
        },
      });
      onCleanup(() => request.unsubscribe());
    });
  }
}
