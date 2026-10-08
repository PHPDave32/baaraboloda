import { Component, Input, Output, EventEmitter, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { serverApiUrl } from 'app/config';
import { UserPhotoDirective } from './user-photo.directive';

@Component({
  selector: 'jhi-photo-picker',
  imports: [UserPhotoDirective],
  template: `
    <div class="photo-picker">
      <div class="photo-preview">
        @if (imageUrl) {
          <img [jhiUserPhoto]="imageUrl" alt="Photo de profil" />
        } @else {
          <span>Photo</span>
        }
      </div>
      <div>
        <label class="photo-select"
          >{{ busy() ? 'Chargement…' : 'Choisir une photo'
          }}<input type="file" accept="image/jpeg,image/png" [disabled]="busy() || disabled" (change)="select($event)"
        /></label>
        <p>JPEG ou PNG · 2 Mo maximum · recadrage carré centré</p>
        @if (imageUrl) {
          <button type="button" (click)="imageUrlChange.emit(null)" [disabled]="busy() || disabled">Retirer la photo</button>
        }
        @if (error()) {
          <p role="alert" class="photo-error">{{ error() }}</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .photo-picker {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 16px;
        border: 1px solid #e0e9f0;
        border-radius: 12px;
        background: #f8fafc;
        margin-bottom: 16px;
      }
      .photo-preview {
        display: grid;
        place-items: center;
        flex-shrink: 0;
        width: 64px;
        height: 64px;
        overflow: hidden;
        border-radius: 50%;
        background: #e6f0f6;
        color: #698398;
        font-size: 12px;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
      .photo-select {
        position: relative;
        display: inline-block;
        color: #257494;
        font-size: 12px;
        font-weight: 600;
        overflow: hidden;
      }
      input {
        position: absolute;
        inset: 0;
        opacity: 0;
        width: 100%;
      }
      .photo-select:focus-within {
        outline: 2px solid #328cb1;
        outline-offset: 3px;
      }
      p {
        font-size: 10px;
        color: #7a8f9f;
        margin: 6px 0;
      }
      button {
        border: 0;
        background: transparent;
        font-size: 11px;
        color: #8e4453;
        padding: 0;
      }
      .photo-error {
        color: #b4233f;
      }
    `,
  ],
})
export class PhotoPicker {
  @Input() imageUrl: string | null = null;
  @Input() disabled = false;
  @Output() imageUrlChange = new EventEmitter<string | null>();
  @Output() uploading = new EventEmitter<boolean>();
  readonly busy = signal(false);
  readonly error = signal('');
  private readonly http = inject(HttpClient);

  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.error.set('');
    if (!['image/jpeg', 'image/png'].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      this.error.set('Choisissez une image JPEG ou PNG de 2 Mo maximum.');
      return;
    }
    const body = new FormData();
    body.append('file', file);
    this.busy.set(true);
    this.uploading.emit(true);
    this.http.post<{ imageUrl: string }>(`${serverApiUrl}api/user-photos`, body).subscribe({
      next: result => {
        this.imageUrlChange.emit(result.imageUrl);
        this.busy.set(false);
        this.uploading.emit(false);
      },
      error: () => {
        this.error.set('Envoi impossible. Vérifiez le format, les dimensions (4096 × 4096 maximum) et votre connexion.');
        this.busy.set(false);
        this.uploading.emit(false);
      },
    });
  }
}
