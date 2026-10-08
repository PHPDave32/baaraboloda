import { AfterViewInit, DestroyRef, Directive, DOCUMENT, ElementRef, NgZone, inject } from '@angular/core';

@Directive({ selector: '[jhiAnimatedCursor]' })
export class AnimatedCursorDirective implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly destroyRef = inject(DestroyRef);

  ngAfterViewInit(): void {
    const window = this.document.defaultView;
    if (!window) return;
    this.zone.runOutsideAngular(() => {
      const media = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
      const ring = this.document.createElement('div');
      ring.className = 'animated-cursor-ring';
      ring.setAttribute('aria-hidden', 'true');
      this.document.body.append(ring);
      const controller = new AbortController();
      const options = { signal: controller.signal, passive: true };
      const hide = (): void => {
        ring.classList.remove('is-visible', 'is-pressed');
      };
      const updatePreference = (): void => {
        this.element.nativeElement.classList.toggle('animated-cursor-enabled', media.matches);
        hide();
      };
      updatePreference();
      media.addEventListener('change', updatePreference, options);
      this.document.addEventListener(
        'pointermove',
        event => {
          const target = event.target;
          if (
            !media.matches ||
            event.pointerType !== 'mouse' ||
            !(target instanceof Element) ||
            !this.element.nativeElement.contains(target)
          ) {
            hide();
            return;
          }
          const cursor = window.getComputedStyle(target).cursor;
          if (['text', 'not-allowed', 'wait', 'col-resize', 'row-resize', 'grab', 'grabbing'].includes(cursor)) {
            hide();
            return;
          }
          const parent = target.closest('dialog[open]') ?? this.document.body;
          if (ring.parentElement !== parent) parent.append(ring);
          ring.classList.toggle('is-interactive', !!target.closest('a, button, select, label, summary, [role="button"], .cursor-pointer'));
          ring.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`;
          ring.classList.add('is-visible');
        },
        options,
      );
      this.document.addEventListener('pointerdown', () => ring.classList.add('is-pressed'), options);
      this.document.addEventListener('pointerup', () => ring.classList.remove('is-pressed'), options);
      this.document.addEventListener('pointercancel', hide, options);
      this.document.documentElement.addEventListener('pointerleave', hide, options);
      this.document.addEventListener('visibilitychange', hide, options);
      window.addEventListener('blur', hide, options);
      this.destroyRef.onDestroy(() => {
        controller.abort();
        ring.remove();
        this.element.nativeElement.classList.remove('animated-cursor-enabled');
      });
    });
  }
}
