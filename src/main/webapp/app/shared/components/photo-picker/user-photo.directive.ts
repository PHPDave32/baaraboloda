import { Directive, ElementRef, Input, OnChanges, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { serverApiUrl } from 'app/config';

@Directive({ selector: 'img[jhiUserPhoto]' })
export class UserPhotoDirective implements OnChanges, OnDestroy {
  @Input() jhiUserPhoto: string | null | undefined;
  private readonly element = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private readonly http = inject(HttpClient);
  private request?: Subscription;
  private objectUrl?: string;

  ngOnChanges(): void {
    this.release();
    const image = this.element.nativeElement;
    image.removeAttribute('src');
    const url = this.jhiUserPhoto;
    if (!url) return;
    if (/^\/api\/user-photos\/[0-9a-f-]{36}$/.test(url)) {
      this.request = this.http.get(`${serverApiUrl}${url.slice(1)}`, { responseType: 'blob' }).subscribe({
        next: blob => {
          this.objectUrl = URL.createObjectURL(blob);
          image.src = this.objectUrl;
        },
        error: () => image.dispatchEvent(new Event('error')),
      });
    } else if (/^(https?:\/\/|blob:|data:image\/(png|jpeg);base64,)/.test(url)) {
      image.src = url;
    }
  }

  ngOnDestroy(): void {
    this.release();
  }

  private release(): void {
    this.request?.unsubscribe();
    if (this.objectUrl) URL.revokeObjectURL(this.objectUrl);
    this.objectUrl = undefined;
  }
}
