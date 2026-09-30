import { HttpResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';

import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { Observable, finalize, map } from 'rxjs';

import { TaskService } from 'app/entities/task/service/task.service';
import { ITask } from 'app/entities/task/task.model';
import { UserService } from 'app/entities/user/service/user.service';
import { IUser } from 'app/entities/user/user.model';
import { AlertError } from 'app/shared/alert';
import { TranslateDirective } from 'app/shared/language';
import { IComment } from '../comment.model';
import { CommentService } from '../service/comment.service';

import { CommentFormGroup, CommentFormService } from './comment-form.service';

@Component({
  selector: 'jhi-comment-update',
  templateUrl: './comment-update.html',
  imports: [TranslateDirective, FontAwesomeModule, AlertError, ReactiveFormsModule],
})
export class CommentUpdate implements OnInit {
  readonly isSaving = signal(false);
  comment: IComment | null = null;

  usersSharedCollection = signal<IUser[]>([]);
  tasksSharedCollection = signal<ITask[]>([]);

  protected commentService = inject(CommentService);
  protected commentFormService = inject(CommentFormService);
  protected userService = inject(UserService);
  protected taskService = inject(TaskService);
  protected activatedRoute = inject(ActivatedRoute);

  // eslint-disable-next-line @typescript-eslint/member-ordering
  editForm: CommentFormGroup = this.commentFormService.createCommentFormGroup();

  compareUser = (o1: IUser | null, o2: IUser | null): boolean => this.userService.compareUser(o1, o2);

  compareTask = (o1: ITask | null, o2: ITask | null): boolean => this.taskService.compareTask(o1, o2);

  ngOnInit(): void {
    this.activatedRoute.data.subscribe(({ comment }) => {
      this.comment = comment;
      if (comment) {
        this.updateForm(comment);
      }

      this.loadRelationshipsOptions();
    });
  }

  previousState(): void {
    globalThis.history.back();
  }

  save(): void {
    this.isSaving.set(true);
    const comment = this.commentFormService.getComment(this.editForm);
    if (comment.id === null) {
      this.subscribeToSaveResponse(this.commentService.create(comment));
    } else {
      this.subscribeToSaveResponse(this.commentService.update(comment));
    }
  }

  protected subscribeToSaveResponse(result: Observable<IComment | null>): void {
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

  protected updateForm(comment: IComment): void {
    this.comment = comment;
    this.commentFormService.resetForm(this.editForm, comment);

    this.usersSharedCollection.update(users => this.userService.addUserToCollectionIfMissing<IUser>(users, comment.author));
    this.tasksSharedCollection.update(tasks => this.taskService.addTaskToCollectionIfMissing<ITask>(tasks, comment.task));
  }

  protected loadRelationshipsOptions(): void {
    this.userService
      .query()
      .pipe(map((res: HttpResponse<IUser[]>) => res.body ?? []))
      .pipe(map((users: IUser[]) => this.userService.addUserToCollectionIfMissing<IUser>(users, this.comment?.author)))
      .subscribe((users: IUser[]) => this.usersSharedCollection.set(users));

    this.taskService
      .query()
      .pipe(map((res: HttpResponse<ITask[]>) => res.body ?? []))
      .pipe(map((tasks: ITask[]) => this.taskService.addTaskToCollectionIfMissing<ITask>(tasks, this.comment?.task)))
      .subscribe((tasks: ITask[]) => this.tasksSharedCollection.set(tasks));
  }
}
