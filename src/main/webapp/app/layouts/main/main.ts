import { SessionService } from 'app/core/auth/session.service';
import { NotificationToastComponent } from 'app/shared/components/notifications/notification-toast.component';
import { Component, DOCUMENT, OnInit, Renderer2, RendererFactory2, inject } from '@angular/core';
import { Router, RouterOutlet, TitleStrategy } from '@angular/router';

import { LangChangeEvent, TranslateService } from '@ngx-translate/core';
import dayjs from 'dayjs/esm';

import { AccountService } from 'app/core/auth';
import { ToastContainer } from 'app/shared/toast/toast-container';
import { AnimatedCursorDirective } from 'app/shared/animated-cursor.directive';

@Component({
  selector: 'jhi-main',
  templateUrl: './main.html',
  imports: [NotificationToastComponent, RouterOutlet, ToastContainer, AnimatedCursorDirective],
})
export default class Main implements OnInit {
  private readonly renderer: Renderer2;
  private readonly htmlElement: HTMLElement;

  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  private readonly titleStrategy = inject(TitleStrategy);
  private readonly accountService = inject(AccountService);
  readonly account = this.accountService.account;
  private readonly document = inject(DOCUMENT);
  private readonly translateService = inject(TranslateService);
  private readonly rootRenderer = inject(RendererFactory2);

  constructor() {
    this.htmlElement = this.document.documentElement;
    this.renderer = this.rootRenderer.createRenderer(this.htmlElement, null);
  }

  ngOnInit(): void {
    this.session.start();
    // try to log in automatically
    this.accountService.identity().subscribe();

    this.translateService.onLangChange.subscribe((langChangeEvent: LangChangeEvent) => {
      this.titleStrategy.updateTitle(this.router.routerState.snapshot);
      dayjs.locale(langChangeEvent.lang);
      this.renderer.setAttribute(this.htmlElement, 'lang', langChangeEvent.lang);
    });
  }
}
