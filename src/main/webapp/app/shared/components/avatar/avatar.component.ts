import { UserPhotoDirective } from '../photo-picker/user-photo.directive';
import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-avatar',
  standalone: true,
  imports: [CommonModule, UserPhotoDirective],
  template: `
    <div [class]="containerClass" [title]="titleText" [style.background-color]="color">
      @if (avatarUrl && failedUrl !== avatarUrl) {
        <img [jhiUserPhoto]="avatarUrl" (error)="failedUrl = avatarUrl" [alt]="firstName" class="w-full h-full object-cover rounded-full" />
      } @else {
        <span [class]="textClass">{{ initials }}</span>
      }
    </div>
  `,
})
export class AvatarComponent {
  failedUrl?: string;
  @Input() user?: any;
  @Input() color: string | null = null;
  @Input() size: 'xs' | 'sm' | 'md' | 'lg' = 'sm';

  get firstName(): string {
    return this.user?.firstName || this.user?.login || '';
  }

  get lastName(): string {
    return this.user?.lastName || '';
  }

  get avatarUrl(): string | undefined {
    return this.user?.avatarUrl || this.user?.imageUrl;
  }

  get titleText(): string {
    const name = `${this.firstName} ${this.lastName}`.trim();
    return name || this.user?.login || '';
  }

  get initials(): string {
    if (!this.user) return '?';
    const first = this.firstName.charAt(0);
    const last = this.lastName.charAt(0);
    if (first && last) return `${first}${last}`.toUpperCase();
    if (first) return first.toUpperCase();
    return '?';
  }

  get containerClass(): string {
    const sizes = {
      xs: 'w-6 h-6',
      sm: 'w-8 h-8',
      md: 'w-10 h-10',
      lg: 'w-12 h-12',
    };
    return `${sizes[this.size]} rounded-full bg-[#328cb1] flex items-center justify-center flex-shrink-0 overflow-hidden`;
  }

  get textClass(): string {
    const textSizes = {
      xs: 'text-[10px]',
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };
    return `${textSizes[this.size]} font-semibold text-white`;
  }
}
