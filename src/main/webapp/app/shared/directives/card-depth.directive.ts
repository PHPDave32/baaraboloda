import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

@Directive({ selector: '[jhiCardDepth]' })
export class CardDepthDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly zone = inject(NgZone);
  private readonly listeners = new AbortController();
  private frame = 0;

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      this.element.addEventListener('pointermove', this.move, { signal: this.listeners.signal });
      this.element.addEventListener('pointerleave', this.reset, { signal: this.listeners.signal });
      this.element.addEventListener('pointercancel', this.reset, { signal: this.listeners.signal });
      this.element.addEventListener('dragstart', this.reset, { signal: this.listeners.signal });
    });
  }

  ngOnDestroy(): void {
    this.listeners.abort();
    cancelAnimationFrame(this.frame);
  }

  private readonly move = (event: PointerEvent): void => {
    if (this.element.classList.contains('menu-open') || this.element.classList.contains('is-dragging')) {
      this.reset();
      return;
    }
    if (event.pointerType !== 'mouse' || !window.matchMedia('(prefers-reduced-motion: no-preference) and (pointer: fine)').matches) {
      this.reset();
      return;
    }
    cancelAnimationFrame(this.frame);
    this.frame = requestAnimationFrame(() => {
      const bounds = this.element.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      this.element.style.setProperty('--pointer-x', `${x * 100}%`);
      this.element.style.setProperty('--pointer-y', `${y * 100}%`);
      this.element.style.setProperty('--depth-x', `${(0.5 - y) * 5}deg`);
      this.element.style.setProperty('--depth-y', `${(x - 0.5) * 6}deg`);
      this.element.classList.add('depth-engaged');
    });
  };

  private readonly reset = (): void => {
    cancelAnimationFrame(this.frame);
    this.element.classList.remove('depth-engaged');
    this.element.style.setProperty('--depth-x', '0deg');
    this.element.style.setProperty('--depth-y', '0deg');
  };
}
