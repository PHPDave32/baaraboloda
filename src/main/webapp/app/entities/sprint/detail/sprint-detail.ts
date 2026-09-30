import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Alert, AlertError } from 'app/shared/alert';
import { FormatMediumDatePipe, FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { ISprint } from '../sprint.model';

@Component({
  selector: 'jhi-sprint-detail',
  templateUrl: './sprint-detail.html',
  imports: [FontAwesomeModule, Alert, AlertError, TranslateDirective, RouterLink, FormatMediumDatetimePipe, FormatMediumDatePipe],
})
export class SprintDetail {
  readonly sprint = input<ISprint | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
