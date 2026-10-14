import { Component, ElementRef, Input, inject, signal, viewChild } from '@angular/core';
import { AvatarComponent } from '../avatar/avatar.component';
import { IUserManagement } from 'app/entities/admin/user-management/user-management.model';

@Component({
  selector: 'app-user-preview',
  standalone: true,
  imports: [AvatarComponent],
  templateUrl: './user-preview.component.html',
  styleUrl: './user-preview.component.scss',
  host: {
    '(document:keydown.escape)': 'close()',
    '(window:resize)': 'close()',
    '(document:pointerdown)': 'onOutsidePointer($event)',
    '(window:scroll)': 'close()',
  },
})
export class UserPreviewComponent {
  private readonly element = inject(ElementRef<HTMLElement>);
  onOutsidePointer(event: PointerEvent): void {
    if (!this.element.nativeElement.contains(event.target as Node)) this.close();
  }

  @Input({ required: true }) user!: IUserManagement;
  @Input() profile = '';
  @Input() externalHover = false;
  readonly opened = signal(false);
  readonly card = viewChild.required<ElementRef<HTMLElement>>('card');
  readonly left = signal(0);
  readonly top = signal(0);

  open(anchor: HTMLElement): void {
    const rect = anchor.getBoundingClientRect();
    const width = Math.min(340, window.innerWidth - 32);
    this.left.set(Math.max(16, Math.min(rect.left, window.innerWidth - width - 16)));
    const card = this.card().nativeElement;
    card.showPopover();
    const height = card.getBoundingClientRect().height;
    const top = rect.bottom + height + 12 <= window.innerHeight ? rect.bottom + 8 : rect.top - height - 8;
    this.top.set(Math.max(12, Math.min(top, window.innerHeight - height - 12)));
    this.opened.set(true);
  }
  close(): void {
    this.card().nativeElement.hidePopover();
    this.opened.set(false);
  }
}
