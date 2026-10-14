import { ChangeDetectorRef, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { ModalComponent } from '../modal/modal.component';

export interface ImageAttachment {
  data: string;
  type: string;
  name: string;
}

@Component({
  selector: 'jhi-image-attachments',
  imports: [ModalComponent],
  templateUrl: './image-attachments.html',
  styleUrl: './image-attachments.scss',
})
export class ImageAttachmentsComponent {
  @Input() images: ImageAttachment[] = [];
  @Input() editable = false;
  @Input() allowPdf = false;
  @Input() disabled = false;
  @Output() imagesChange = new EventEmitter<ImageAttachment[]>();
  @Output() readingChange = new EventEmitter<boolean>();
  reading = false;
  error = '';
  expanded: ImageAttachment | null = null;
  private readonly cdr = inject(ChangeDetectorRef);

  url(image: ImageAttachment): string {
    return `data:${image.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'};base64,${image.data}`;
  }

  downloadPdf(attachment: ImageAttachment): void {
    try {
      const bytes = Uint8Array.from(atob(attachment.data), character => character.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = attachment.name;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      this.error = 'Impossible de télécharger ce PDF.';
    }
  }

  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    void this.add(Array.from(input.files ?? []));
    input.value = '';
  }

  paste(event: ClipboardEvent): void {
    const files = Array.from(event.clipboardData?.files ?? []).filter(file => file.type.startsWith('image/'));
    if (this.editable && files.length) {
      event.preventDefault();
      void this.add(files);
    }
  }

  remove(index: number): void {
    if (!this.disabled && !this.reading) this.imagesChange.emit(this.images.filter((_, position) => position !== index));
  }

  async add(files: File[]): Promise<void> {
    if (!files.length || this.disabled || this.reading || !this.editable) return;
    this.error = '';
    const existingSize = this.images.reduce((sum, image) => sum + Math.ceil((image.data.length * 3) / 4), 0);
    if (
      this.images.length + files.length > 5 ||
      files.some(
        file =>
          !['image/png', 'image/jpeg', ...(this.allowPdf ? ['application/pdf'] : [])].includes(this.fileType(file)) ||
          !file.size ||
          file.size > 2097152,
      ) ||
      existingSize + files.reduce((sum, file) => sum + file.size, 0) > 8388608
    ) {
      this.error = this.allowPdf
        ? 'Maximum 5 fichiers PNG/JPEG/PDF, 2 Mo par fichier et 8 Mo au total.'
        : 'Maximum 5 images PNG/JPEG, 2 Mo par image et 8 Mo au total.';
      this.cdr.markForCheck();
      return;
    }
    this.reading = true;
    this.readingChange.emit(true);
    try {
      const additions = await Promise.all(
        files.map(
          file =>
            new Promise<ImageAttachment>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () =>
                resolve({
                  data: (typeof reader.result === 'string' ? reader.result : '').split(',')[1],
                  type: this.fileType(file),
                  name: file.name.slice(0, 255),
                });
              reader.onerror = () => reject(new Error('Image illisible'));
              reader.readAsDataURL(file);
            }),
        ),
      );
      this.imagesChange.emit([...this.images, ...additions]);
    } catch {
      this.error = 'Les pièces jointes n’ont pas pu être lues. Réessayez.';
    } finally {
      this.reading = false;
      this.readingChange.emit(false);
      this.cdr.markForCheck();
    }
  }
  private fileType(file: File): string {
    return !file.type && this.allowPdf && file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : file.type;
  }
}
