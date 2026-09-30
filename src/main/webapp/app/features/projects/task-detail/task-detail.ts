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
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterLink, DatePipe, BadgeComponent, AvatarComponent, ModalComponent],
  templateUrl: './task-detail.html',
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

  commentToEdit: TaskComment | null = null;
  editCommentContent = '';
  commentToDelete: TaskComment | null = null;
  savingComment = false;

  readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(200)]],
    description: [''],
    status: ['TODO'],
    priority: ['MEDIUM'],
    type: ['TASK'],
    storyPoints: [null as number | null],
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
          storyPoints: task.storyPoints,
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

  /**
   * Détermine si l'utilisateur courant peut modifier cette tâche et ses commentaires :
   * admin, propriétaire du projet, ou membre du projet.
   */
  private loadMembership(): void {
    if (this.accountService.hasAnyAuthority('ROLE_ADMIN')) {
      this.canManage = true;
      this.cdr.markForCheck();
      return;
    }

    const projectId = this.task?.project?.id ?? this.projectId;
    if (!projectId) {
      this.canManage = false;
      this.cdr.markForCheck();
      return;
    }

    this.planningService.getProject(projectId).subscribe({
      next: project => {
        const login = this.accountService.account()?.login;
        const isOwner = project.owner?.login === login;
        const isMember = project.memberses?.some(member => member.login === login) ?? false;
        this.canManage = Boolean(login) && (isOwner || isMember);
        this.cdr.markForCheck();
      },
      error: () => {
        this.canManage = false;
        this.cdr.markForCheck();
      },
    });
  }

  save(): void {
    if (!this.canManage) {
      this.error = 'Vous devez appartenir au projet pour modifier cette tâche.';
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
        status: value.status as ITask['status'],
        priority: value.priority as ITask['priority'],
        type: value.type as ITask['type'],
        storyPoints: value.storyPoints,
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

  addComment(content: string): void {
    const value = content.trim();
    if (!value) return;
    this.planningService.createComment(this.taskId, value).subscribe({
      next: comment => {
        this.comments = [...this.comments, comment];
        this.cdr.markForCheck();
      },
      error: () => (this.error = 'Le commentaire n\u2019a pas pu \u00eatre ajout\u00e9.'),
    });
  }

  canManageComment(_comment: TaskComment): boolean {
    // Aligné sur la règle backend : appartenir au projet (membre/owner) ou être admin.
    return this.canManage;
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
}
