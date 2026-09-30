import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { ProjectStatus } from 'app/entities/enumerations/project-status.model';
import { UserService } from 'app/entities/user/service/user.service';
import { IUser } from 'app/entities/user/user.model';
import { AlertError } from 'app/shared/alert';
import { TranslateDirective } from 'app/shared/language';
import { IProject } from '../project.model';
import { ProjectService } from '../service/project.service';

import { ProjectFormGroup, ProjectFormService } from './project-form.service';

@Component({
  selector: 'jhi-project-update',
  templateUrl: './project-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class ProjectUpdate implements OnInit {
  readonly isSaving = signal(false);
  project: IProject | null = null;
  projectStatusValues = Object.keys(ProjectStatus);

  usersSharedCollection = signal<IUser[]>([]);

  protected projectService = inject(ProjectService);
  protected projectFormService = inject(ProjectFormService);
  protected userService = inject(UserService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: ProjectFormGroup = this.projectFormService.createProjectFormGroup();

  compareUser = (o1: IUser | null, o2: IUser | null): boolean => this.userService.compareUser(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ project }) => {
      this.project = project;
      if (project) {
        this.updateForm(project);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const project = this.projectFormService.getProject(this.editForm);
    if (project.id === null) {
      this.subscribeToSaveResponse(this.projectService.create(project));
    } else {
      this.subscribeToSaveResponse(this.projectService.update(project));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IProject | null>): void {
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

  protected updateForm(project: IProject): void {
    this.project = project;
    this.projectFormService.resetForm(this.editForm, project);

    this.usersSharedCollection.update(users =>
      this.userService.addUserToCollectionIfMissing<IUser>(users, project.owner, ...(project.memberses ?? [])),
    );
  }

  protected loadRelationshipsOptions(): void {
    this.userService
      .query()
      .pipe(map((res: HttpResponse<IUser[]>) => res.body ?? []))
      .pipe(
        map((users: IUser[]) =>
          this.userService.addUserToCollectionIfMissing<IUser>(users, this.project?.owner, ...(this.project?.memberses ?? [])),
        ),
      )
      .subscribe((users: IUser[]) => this.usersSharedCollection.set(users));
  }
}
