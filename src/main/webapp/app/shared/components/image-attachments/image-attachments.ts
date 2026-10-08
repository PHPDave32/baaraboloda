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
      files.some(file => !['image/png', 'image/jpeg'].includes(file.type) || !file.size || file.size > 2097152) ||
      existingSize + files.reduce((sum, file) => sum + file.size, 0) > 8388608
    ) {
      this.error = 'Maximum 5 images PNG/JPEG, 2 Mo par image et 8 Mo au total.';
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
                  type: file.type,
                  name: file.name.slice(0, 255),
                });
              reader.onerror = () => reject(new Error('Image illisible'));
              reader.readAsDataURL(file);
            }),
        ),
      );
      this.imagesChange.emit([...this.images, ...additions]);
    } catch {
      this.error = 'Les images n’ont pas pu être lues. Réessayez.';
    } finally {
      this.reading = false;
      this.readingChange.emit(false);
      this.cdr.markForCheck();
    }
  }
}
