import { PublicIdPipe } from 'app/core/identifiers/public-id.pipe';
import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { Alert, AlertError } from 'app/shared/alert';
import { FormatMediumDatetimePipe } from 'app/shared/date';
import { TranslateDirective } from 'app/shared/language';
import { IProject } from '../project.model';

@Component({
  selector: 'jhi-project-detail',
  templateUrl: './project-detail.html',
  imports: [PublicIdPipe, FontAwesomeModule, Alert, AlertError, TranslateDirective, RouterLink, FormatMediumDatetimePipe],
})
export class ProjectDetail {
  readonly project = input<IProject | null>(null);

  previousState(): void {
    globalThis.history.back();
  }
}
