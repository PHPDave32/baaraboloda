import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Observable, finalize, map } from 'rxjs';

import { IProject } from 'app/entities/project/project.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import { AlertError } from 'app/shared/alert';
import { TranslateDirective } from 'app/shared/language';
import { ILabel } from '../label.model';
import { LabelService } from '../service/label.service';

import { LabelFormGroup, LabelFormService } from './label-form.service';

@Component({
  selector: 'jhi-label-update',
  templateUrl: './label-update.html',
  imports: [TranslateDirective, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class LabelUpdate implements OnInit {
  readonly isSaving = signal(false);
  label: ILabel | null = null;

  projectsSharedCollection = signal<IProject[]>([]);

  protected labelService = inject(LabelService);
  protected labelFormService = inject(LabelFormService);
  protected projectService = inject(ProjectService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: LabelFormGroup = this.labelFormService.createLabelFormGroup();

  compareProject = (o1: IProject | null, o2: IProject | null): boolean => this.projectService.compareProject(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ label }) => {
      this.label = label;
      if (label) {
        this.updateForm(label);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const label = this.labelFormService.getLabel(this.editForm);
    if (label.id === null) {
      this.subscribeToSaveResponse(this.labelService.create(label));
    } else {
      this.subscribeToSaveResponse(this.labelService.update(label));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ILabel | null>): void {
    result.pipe(finalize(() => this.onSaveFinalize())).subscribe({
      next: () => this.onSaveSuccess(),
      error: () => this.onSaveError(),
    });
  }

  protected onSaveSuccess(): void {
    this.previousState();
  }

  protected onSaveError(): void {
    // Api for inheritance.
  }

  protected onSaveFinalize(): void {
    this.isSaving.set(false);
  }

  protected updateForm(label: ILabel): void {
    this.label = label;
    this.labelFormService.resetForm(this.editForm, label);

    this.projectsSharedCollection.update(projects =>
      this.projectService.addProjectToCollectionIfMissing<IProject>(projects, label.project),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.projectService
      .query()
      .pipe(map((res: HttpResponse<IProject[]>) => res.body ?? []))
      .pipe(map((projects: IProject[]) => this.projectService.addProjectToCollectionIfMissing<IProject>(projects, this.label?.project)))
      .subscribe((projects: IProject[]) => this.projectsSharedCollection.set(projects));
  }
}
