import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { SprintStatus } from 'app/entities/enumerations/sprint-status.model';
import { IProject } from 'app/entities/project/project.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import { UserService } from 'app/entities/user/service/user.service';
import { IUser } from 'app/entities/user/user.model';
import { AlertError } from 'app/shared/alert';
import { TranslateDirective } from 'app/shared/language';

import { SprintService } from '../service/sprint.service';
import { ISprint } from '../sprint.model';

import { SprintFormGroup, SprintFormService } from './sprint-form.service';

@Component({
  selector: 'jhi-sprint-update',
  templateUrl: './sprint-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class SprintUpdate implements OnInit {
  readonly isSaving = signal(false);
  sprint: ISprint | null = null;
  sprintStatusValues = Object.keys(SprintStatus);

  usersSharedCollection = signal<IUser[]>([]);
  projectsSharedCollection = signal<IProject[]>([]);

  protected sprintService = inject(SprintService);
  protected sprintFormService = inject(SprintFormService);
  protected userService = inject(UserService);
  protected projectService = inject(ProjectService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: SprintFormGroup = this.sprintFormService.createSprintFormGroup();

  compareUser = (o1: IUser | null, o2: IUser | null): boolean => this.userService.compareUser(o1, o2);

  compareProject = (o1: IProject | null, o2: IProject | null): boolean => this.projectService.compareProject(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ sprint }) => {
      this.sprint = sprint;
      if (sprint) {
        this.updateForm(sprint);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const sprint = this.sprintFormService.getSprint(this.editForm);
    if (sprint.id === null) {
      this.subscribeToSaveResponse(this.sprintService.create(sprint));
    } else {
      this.subscribeToSaveResponse(this.sprintService.update(sprint));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ISprint | null>): void {
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

  protected updateForm(sprint: ISprint): void {
    this.sprint = sprint;
    this.sprintFormService.resetForm(this.editForm, sprint);

    this.usersSharedCollection.update(users => this.userService.addUserToCollectionIfMissing<IUser>(users, sprint.createdBy));
    this.projectsSharedCollection.update(projects =>
      this.projectService.addProjectToCollectionIfMissing<IProject>(projects, sprint.project),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.userService
      .query()
      .pipe(map((res: HttpResponse<IUser[]>) => res.body ?? []))
      .pipe(map((users: IUser[]) => this.userService.addUserToCollectionIfMissing<IUser>(users, this.sprint?.createdBy)))
      .subscribe((users: IUser[]) => this.usersSharedCollection.set(users));

    this.projectService
      .query()
      .pipe(map((res: HttpResponse<IProject[]>) => res.body ?? []))
      .pipe(map((projects: IProject[]) => this.projectService.addProjectToCollectionIfMissing<IProject>(projects, this.sprint?.project)))
      .subscribe((projects: IProject[]) => this.projectsSharedCollection.set(projects));
  }
}
