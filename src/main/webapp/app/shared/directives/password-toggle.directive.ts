import { AfterViewInit, Directive, ElementRef, OnDestroy, Renderer2, inject } from '@angular/core';

@Directive({
  selector: 'input[jhiPasswordToggle]',
  standalone: true,
})
export class PasswordToggleDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLInputElement>);
  private readonly renderer = inject(Renderer2);
  private button?: HTMLButtonElement;
  private unlisten?: () => void;
  private visible = false;

  ngAfterViewInit(): void {
    const input = this.element.nativeElement;
    const parent = input.parentNode;
    if (!parent || input.parentElement?.classList.contains('password-field')) return;

    const wrapper = this.renderer.createElement('span') as HTMLSpanElement;
    this.renderer.addClass(wrapper, 'password-field');
    this.renderer.insertBefore(parent, wrapper, input);
    this.renderer.appendChild(wrapper, input);
    this.renderer.addClass(input, 'password-field-input');

    this.button = this.renderer.createElement('button') as HTMLButtonElement;
    this.renderer.setAttribute(this.button, 'type', 'button');
    this.renderer.addClass(this.button, 'password-toggle');
    this.renderer.setAttribute(this.button, 'aria-label', 'Afficher le mot de passe');
    this.renderer.setAttribute(this.button, 'title', 'Afficher le mot de passe');
    this.updateIcon();
    this.renderer.appendChild(wrapper, this.button);
    this.unlisten = this.renderer.listen(this.button, 'click', () => this.toggle());
  }

  ngOnDestroy(): void {
    this.unlisten?.();
  }

  private toggle(): void {
    if (this.element.nativeElement.disabled) return;
    this.visible = !this.visible;
    this.renderer.setAttribute(this.element.nativeElement, 'type', this.visible ? 'text' : 'password');
    this.updateIcon();
  }

  private updateIcon(): void {
    if (!this.button) return;
    const label = this.visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe';
    this.renderer.setAttribute(this.button, 'aria-label', label);
    this.renderer.setAttribute(this.button, 'title', label);
    this.renderer.setAttribute(this.button, 'aria-pressed', String(this.visible));
    this.renderer.setProperty(
      this.button,
      'innerHTML',
      this.visible
        ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7M9.9 4.2A10.8 10.8 0 0112 4c5.5 0 9 5 9 5a17 17 0 01-2.2 2.6M6.2 6.2C4.2 7.5 3 9 3 9s3.5 5 9 5c1.1 0 2.1-.2 3-.5"/></svg>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5z"/><circle cx="12" cy="12" r="2.5"/></svg>',
    );
  }
}
