import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { NgbInputDatepicker } from '@ng-bootstrap/ng-bootstrap/datepicker';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable, finalize, map } from 'rxjs';

import { TaskPriority } from 'app/entities/enumerations/task-priority.model';
import { TaskStatus } from 'app/entities/enumerations/task-status.model';
import { IProject } from 'app/entities/project/project.model';
import { UserService } from 'app/entities/user/service/user.service';
import { IUser } from 'app/entities/user/user.model';
import { AlertError } from 'app/shared/alert';
import { TranslateDirective } from 'app/shared/language';

import { TaskService } from '../service/task.service';
import { ITask } from '../task.model';

import { TaskFormGroup, TaskFormService } from './task-form.service';
import { ProjectService } from 'app/entities/project/service/project.service';
import { ISprint } from 'app/entities/sprint/sprint.model';
import { SprintService } from 'app/entities/sprint/service/sprint.service';
import { TaskType } from 'app/entities/enumerations/task-type.model';

@Component({
  selector: 'jhi-task-update',
  templateUrl: './task-update.html',
  imports: [TranslateDirective, TranslatePipe, FontAwesomeModule, AlertError, ReactiveFormsModule, NgbInputDatepicker],
})
export class TaskUpdate implements OnInit {
  readonly isSaving = signal(false);
  task: ITask | null = null;
  taskStatusValues = Object.keys(TaskStatus);
  taskPriorityValues = Object.keys(TaskPriority);
  taskTypeValues = Object.keys(TaskType);

  usersSharedCollection = signal<IUser[]>([]);
  projectsSharedCollection = signal<IProject[]>([]);
  sprintsSharedCollection = signal<ISprint[]>([]);

  protected taskService = inject(TaskService);
  protected taskFormService = inject(TaskFormService);
  protected userService = inject(UserService);
  protected projectService = inject(ProjectService);
  protected sprintService = inject(SprintService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: TaskFormGroup = this.taskFormService.createTaskFormGroup();

  compareUser = (o1: IUser | null, o2: IUser | null): boolean => this.userService.compareUser(o1, o2);

  compareProject = (o1: IProject | null, o2: IProject | null): boolean => this.projectService.compareProject(o1, o2);

  compareSprint = (o1: ISprint | null, o2: ISprint | null): boolean => this.sprintService.compareSprint(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ task }) => {
      this.task = task;
      if (task) {
        this.updateForm(task);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const task = this.taskFormService.getTask(this.editForm);
    if (task.id === null) {
      this.subscribeToSaveResponse(this.taskService.create(task));
    } else {
      this.subscribeToSaveResponse(this.taskService.update(task));
    }
  }

  protected subscribeToSaveResponse(result: Observable<ITask | null>): void {
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

  protected updateForm(task: ITask): void {
    this.task = task;
    this.taskFormService.resetForm(this.editForm, task);

    this.usersSharedCollection.update(users => this.userService.addUserToCollectionIfMissing<IUser>(users, task.assignee, task.reporter));
    this.projectsSharedCollection.update(projects => this.projectService.addProjectToCollectionIfMissing<IProject>(projects, task.project));
    this.sprintsSharedCollection.update(sprints => this.sprintService.addSprintToCollectionIfMissing<ISprint>(sprints, task.sprint));
  }

  protected loadRelationshipsOptions(): void {
    this.userService
      .query()
      .pipe(map((res: HttpResponse<IUser[]>) => res.body ?? []))
      .pipe(map((users: IUser[]) => this.userService.addUserToCollectionIfMissing<IUser>(users, this.task?.assignee, this.task?.reporter)))
      .subscribe((users: IUser[]) => this.usersSharedCollection.set(users));

    this.projectService
      .query()
      .pipe(map((res: HttpResponse<IProject[]>) => res.body ?? []))
      .pipe(map((projects: IProject[]) => this.projectService.addProjectToCollectionIfMissing<IProject>(projects, this.task?.project)))
      .subscribe((projects: IProject[]) => this.projectsSharedCollection.set(projects));

    this.sprintService
      .query()
      .pipe(map((res: HttpResponse<ISprint[]>) => res.body ?? []))
      .pipe(map((sprints: ISprint[]) => this.sprintService.addSprintToCollectionIfMissing<ISprint>(sprints, this.task?.sprint)))
      .subscribe((sprints: ISprint[]) => this.sprintsSharedCollection.set(sprints));
  }
}
