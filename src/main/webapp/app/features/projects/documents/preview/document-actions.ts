import { Component, DestroyRef, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { DocumentsService, ProjectDocument } from '../documents.service';

@Component({
  selector: 'jhi-document-actions',
  template: `
    <div class="flex flex-wrap gap-2">
      <button type="button" class="resource-icon-action" title="Aperçu" aria-label="Aperçu" (click)="preview()">
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      </button>
      <button
        type="button"
        class="resource-icon-action"
        [disabled]="downloading()"
        (click)="download()"
        [title]="downloading() ? 'Téléchargement…' : 'Télécharger'"
        [attr.aria-label]="downloading() ? 'Téléchargement en cours' : 'Télécharger'"
        [attr.aria-busy]="downloading()"
      >
        @if (downloading()) {
          <svg class="animate-spin" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 3a9 9 0 1 1-9 9" />
          </svg>
        } @else {
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 3v12m-4-4 4 4 4-4M5 16v5h14v-5" />
          </svg>
        }
      </button>
    </div>
    @if (downloadError()) {
      <p role="alert" class="mt-2 text-xs text-red-600">{{ downloadError() }}</p>
    }
    <dialog #dialog (cancel)="close()" (close)="clearPreview()" class="document-preview">
      <header>
        <div>
          <strong>{{ document().title }}</strong>
          <p>{{ document().filename }}</p>
        </div>
        <button type="button" class="btn-secondary" aria-label="Fermer l’aperçu" (click)="close()">Fermer</button>
      </header>
      <div class="preview-content">
        @if (loading()) {
          <p role="status">Chargement de l’aperçu…</p>
        } @else if (previewError()) {
          <p role="alert">{{ previewError() }}</p>
        } @else if (kind() === 'pdf' && safeUrl()) {
          <iframe [src]="safeUrl()" title="Aperçu du document PDF"></iframe>
        } @else if (kind() === 'image' && objectUrl()) {
          <img [src]="objectUrl()" [alt]="document().title" />
        } @else if (kind() === 'text') {
          <pre>{{ text() }}</pre>
        } @else {
          <p>L’aperçu n’est pas disponible pour ce format. Téléchargez le fichier pour le consulter.</p>
        }
      </div>
      @if (downloadError()) {
        <p role="alert" class="px-5 text-sm text-red-600">{{ downloadError() }}</p>
      }
      <footer>
        <button type="button" class="btn-primary" [disabled]="downloading()" (click)="download()">
          {{ downloading() ? 'Téléchargement…' : 'Télécharger le document' }}
        </button>
      </footer>
    </dialog>
  `,
  styles: `
    :host {
      display: block;
    }
    .document-preview {
      width: min(1000px, 94vw);
      max-height: 92dvh;
      padding: 0;
      border: 1px solid #dce6ed;
      border-radius: 18px;
      color: #203e50;
      background: white;
    }
    .document-preview::backdrop {
      background: #172b4680;
      backdrop-filter: blur(3px);
    }
    header,
    footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 16px 20px;
    }
    header {
      border-bottom: 1px solid #e5edf2;
    }
    header div {
      min-width: 0;
      overflow-wrap: anywhere;
    }
    header p {
      font-size: 12px;
      color: #71889a;
      margin-top: 4px;
    }
    footer {
      justify-content: flex-end;
      border-top: 1px solid #e5edf2;
    }
    .preview-content {
      height: min(65dvh, 720px);
      overflow: auto;
      background: #f5f8fb;
      padding: 12px;
    }
    iframe {
      width: 100%;
      height: 100%;
      border: 0;
      background: white;
    }
    img {
      display: block;
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
      margin: auto;
    }
    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 13px;
    }
  `,
})
export class DocumentActions {
  readonly projectId = input.required<number>();
  readonly document = input.required<ProjectDocument>();
  readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  readonly loading = signal(false);
  readonly downloading = signal(false);
  readonly previewError = signal('');
  readonly downloadError = signal('');
  readonly kind = signal('');
  readonly objectUrl = signal('');
  readonly safeUrl = signal<SafeResourceUrl | null>(null);
  readonly text = signal('');
  private readonly service = inject(DocumentsService);
  private readonly sanitizer = inject(DomSanitizer);
  private previewRequest?: Subscription;
  private downloadRequest?: Subscription;
  private generation = 0;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.clearPreview();
      this.downloadRequest?.unsubscribe();
    });
  }

  preview(): void {
    this.clearPreview();
    this.dialog()?.nativeElement.showModal();
    const extension = this.document().filename?.split('.').pop()?.toLowerCase() ?? '';
    const types: Record<string, string> = {
      pdf: 'application/pdf',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      txt: 'text/plain',
      csv: 'text/plain',
    };
    const type = types[extension];
    if (!type) return;
    this.kind.set(extension === 'pdf' ? 'pdf' : type.startsWith('image/') ? 'image' : 'text');
    this.loading.set(true);
    const generation = this.generation;
    this.previewRequest = this.service.download(this.projectId(), this.document().id).subscribe({
      next: blob => {
        if (this.kind() === 'text') {
          void blob
            .text()
            .then(content => {
              if (generation !== this.generation) return;
              this.text.set(content);
              this.loading.set(false);
            })
            .catch(() => {
              if (generation !== this.generation) return;
              this.loading.set(false);
              this.previewError.set('Impossible de lire le contenu de ce fichier.');
            });
          return;
        } else {
          const url = URL.createObjectURL(new Blob([blob], { type }));
          this.objectUrl.set(url);
          // Only a local blob URL with an explicitly allowed document MIME type is trusted.
          this.safeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.previewError.set('Aperçu indisponible. Le document a pu être supprimé ou votre accès modifié.');
      },
    });
  }

  close(): void {
    this.dialog()?.nativeElement.close();
    this.clearPreview();
  }

  clearPreview(): void {
    this.generation++;
    this.previewRequest?.unsubscribe();
    if (this.objectUrl()) URL.revokeObjectURL(this.objectUrl());
    this.objectUrl.set('');
    this.safeUrl.set(null);
    this.text.set('');
    this.kind.set('');
    this.loading.set(false);
    this.previewError.set('');
  }

  download(): void {
    if (this.downloading()) return;
    this.downloading.set(true);
    this.downloadError.set('');
    this.downloadRequest = this.service.download(this.projectId(), this.document().id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = globalThis.document.createElement('a');
        anchor.href = url;
        anchor.download = this.document().filename ?? this.document().title;
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.downloading.set(false);
      },
      error: () => {
        this.downloading.set(false);
        this.downloadError.set('Téléchargement impossible. Vérifiez votre accès au document.');
      },
    });
  }
}
