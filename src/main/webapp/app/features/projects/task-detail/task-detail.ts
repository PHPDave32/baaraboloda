import { TaskDocuments } from '../documents/preview/task-documents';
import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { ImageAttachment, ImageAttachmentsComponent } from 'app/shared/components/image-attachments/image-attachments';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AccountService } from 'app/core/auth';
import { ITask } from 'app/entities/task/task.model';
import { PlanningService, TaskComment } from '../planning.service';
import { BadgeComponent } from 'app/shared/components/badge/badge.component';
import { AvatarComponent } from 'app/shared/components/avatar/avatar.component';
import { ModalComponent } from 'app/shared/components/modal/modal.component';

@Component({
  selector: 'jhi-task-detail',
  imports: [
    TaskDocuments,
    NotificationCenterComponent,
    ImageAttachmentsComponent,
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    DatePipe,
    BadgeComponent,
    AvatarComponent,
    ModalComponent,
  ],
  templateUrl: './task-detail.html',
  styleUrl: './task-detail.scss',
})
export default class TaskDetail implements OnInit {
  projectId = 0;
  taskId = 0;
  task: ITask | null = null;
  loading = true;
  saving = false;
  error = '';
  comments: TaskComment[] = [];
  canManage = false;
  canManageProject = false;

  commentToEdit: TaskComment | null = null;
  editCommentContent = '';
  commentToDelete: TaskComment | null = null;
  savingComment = false;
  commentDraft = '';
  captures: ImageAttachment[] = [];
  captureError = '';
  readingCapture = false;
  sendingComment = false;
  expandedCapture: string | null = null;

  readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    status: ['TODO'],
    priority: ['MEDIUM'],
    type: ['TASK'],
    dueDate: [''],
  });

  private readonly route = inject(ActivatedRoute);
  private readonly planningService = inject(PlanningService);
  private readonly accountService = inject(AccountService);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.projectId = Number(params.get('id'));
      this.taskId = Number(params.get('taskId'));
      this.load();
    });
  }

  load(): void {
    this.loading = true;
    this.planningService.getTask(this.taskId).subscribe({
      next: task => {
        this.task = task;
        this.loadMembership();
        this.planningService.getComments(this.taskId).subscribe({
          next: comments => {
            this.comments = comments;
            this.cdr.markForCheck();
          },
        });
        this.form.patchValue({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          type: task.type,
          dueDate: task.dueDate?.format('YYYY-MM-DD'),
        });
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'La t\u00e2che n\u2019a pas pu \u00eatre charg\u00e9e.';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  save(): void {
    if (!this.canManage) {
      this.error = 'Vous devez être le rapporteur de cette tâche ou appartenir au projet pour la modifier.';
      return;
    }
    if (!this.task || this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving = true;
    const value = this.form.getRawValue();
    this.planningService
      .updateTask(this.task, {
        title: value.title,
        description: value.description,
        status: this.canManageProject ? (value.status as ITask['status']) : this.task.status,
        priority: value.priority as ITask['priority'],
        type: value.type as ITask['type'],
        dueDate: value.dueDate ? undefined : null,
      })
      .subscribe({
        next: task => {
          this.task = task;
          this.saving = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'La t\u00e2che n\u2019a pas pu \u00eatre enregistr\u00e9e.';
          this.saving = false;
          this.cdr.markForCheck();
        },
      });
  }

  captureUrl(image: string, type: string): string {
    return `data:${type === 'image/jpeg' ? 'image/jpeg' : 'image/png'};base64,${image}`;
  }

  addComment(): void {
    const value = this.commentDraft.trim();
    if ((!value && !this.captures.length) || !this.canManage || this.sendingComment || this.readingCapture) return;
    if (value.length > 5000) {
      this.captureError = 'Le commentaire doit contenir au maximum 5 000 caractères.';
      return;
    }
    this.sendingComment = true;
    this.captureError = '';
    this.planningService.createComment(this.taskId, value, this.captures).subscribe({
      next: comment => {
        this.comments = [...this.comments, comment];
        this.commentDraft = '';
        this.captures = [];
        this.sendingComment = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.captureError = 'Le commentaire n’a pas pu être envoyé. Vérifiez la capture et réessayez.';
        this.sendingComment = false;
        this.cdr.markForCheck();
      },
    });
  }

  canManageComment(comment: TaskComment): boolean {
    return this.canManage && (comment.author?.login === this.accountService.account()?.login || this.canManageProject);
  }

  editComment(comment: TaskComment): void {
    this.commentToEdit = comment;
    this.editCommentContent = comment.content;
    this.cdr.markForCheck();
  }

  closeEditComment(): void {
    this.commentToEdit = null;
    this.editCommentContent = '';
    this.cdr.markForCheck();
  }

  confirmEditComment(): void {
    const comment = this.commentToEdit;
    const content = this.editCommentContent.trim();
    if (!comment || !content || content === comment.content) {
      this.closeEditComment();
      return;
    }
    this.savingComment = true;
    this.planningService.updateComment(comment, content).subscribe({
      next: updated => {
        this.comments = this.comments.map(item => (item.id === updated.id ? updated : item));
        this.savingComment = false;
        this.closeEditComment();
      },
      error: () => {
        this.error = 'Le commentaire n\u2019a pas pu \u00eatre modifi\u00e9.';
        this.savingComment = false;
        this.closeEditComment();
      },
    });
  }

  deleteComment(comment: TaskComment): void {
    this.commentToDelete = comment;
    this.cdr.markForCheck();
  }

  closeDeleteComment(): void {
    this.commentToDelete = null;
    this.cdr.markForCheck();
  }

  confirmDeleteComment(): void {
    const comment = this.commentToDelete;
    if (!comment) return;
    this.planningService.deleteComment(comment.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(item => item.id !== comment.id);
        this.commentToDelete = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.error = 'Le commentaire n\u2019a pas pu \u00eatre supprim\u00e9.';
        this.commentToDelete = null;
        this.cdr.markForCheck();
      },
    });
  }
  /**
   * Détermine si l'utilisateur courant peut modifier cette tâche et ses commentaires :
   * admin, propriétaire du projet, ou membre du projet.
   */
  private loadMembership(): void {
    this.canManageProject = false;
    this.form.controls.status.disable();
    this.canManage = Boolean(this.accountService.account()?.login) && this.task?.reporter?.login === this.accountService.account()?.login;
    const projectId = this.task?.project?.id ?? this.projectId;
    if (!projectId) {
      this.canManage = false;
      this.cdr.markForCheck();
      return;
    }

    this.planningService.getProject(projectId).subscribe({
      next: project => {
        if (project.status === 'CLOSED') {
          this.canManage = false;
          this.canManageProject = false;
          this.cdr.markForCheck();
          return;
        }
        const login = this.accountService.account()?.login;
        const isOwner = project.owner?.login === login;
        const isMember = project.memberses?.some(member => member.login === login) ?? false;
        this.canManageProject = this.accountService.hasAnyAuthority('ROLE_ADMIN') || (Boolean(login) && (isOwner || isMember));
        if (this.canManageProject) this.form.controls.status.enable();
        this.canManage = this.canManageProject || (Boolean(login) && this.task?.reporter?.login === login);
        this.cdr.markForCheck();
      },
      error: () => {
        this.canManageProject = false;
        this.cdr.markForCheck();
      },
    });
  }
}
