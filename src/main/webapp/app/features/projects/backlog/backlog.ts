import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { ProjectMembersComponent } from 'app/shared/components/project-members/project-members';
import { ImageAttachment, ImageAttachmentsComponent } from 'app/shared/components/image-attachments/image-attachments';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { forkJoin, of } from 'rxjs';

import { AccountService } from 'app/core/auth';
import { IProject } from 'app/entities/project/project.model';
import { ISprint } from 'app/entities/sprint/sprint.model';
import { ITask } from 'app/entities/task/task.model';
import { TaskService } from 'app/entities/task/service/task.service';
import { AvatarComponent } from 'app/shared/components/avatar/avatar.component';
import { BadgeComponent } from 'app/shared/components/badge/badge.component';
import { ModalComponent } from 'app/shared/components/modal/modal.component';
import { ToastService } from 'app/shared/toast/toast.service';
import { PlanningService } from '../planning.service';

@Component({
  selector: 'jhi-project-backlog',
  imports: [
    NotificationCenterComponent,
    ProjectMembersComponent,
    ImageAttachmentsComponent,
    ReactiveFormsModule,
    FormsModule,
    RouterLink,
    DatePipe,
    NgTemplateOutlet,
    BadgeComponent,
    AvatarComponent,
    ModalComponent,
  ],
  templateUrl: './backlog.html',
  styleUrl: './backlog.scss',
})
export default class Backlog implements OnInit {
  taskImages: ImageAttachment[] = [];
  readingImages = false;
  projectId = 0;
  project: IProject | null = null;
  backlogTasks: ITask[] = [];
  sprints: ISprint[] = [];
  sprintTasks: Map<number, ITask[]> = new Map();
  currentUser: any = null;

  taskForm!: FormGroup;
  sprintForm!: FormGroup;
  showTaskForm = false;
  showSprintForm = false;
  showSprintAccessModal = false;
  taskToDelete: ITask | null = null;
  sprintToDelete: ISprint | null = null;
  editingSprint: ISprint | null = null;
  targetSprintId: number | null = null;
  loading = false;
  error = '';

  expandedSprints: Set<number> = new Set();
  /** true si l'utilisateur courant appartient au projet (membre/owner) ou est admin. */
  canManage = false;

  dragOverSprintId: number | null = null;
  dragOverBacklog = false;
  draggingTaskId: number | null = null;

  searchTerm = '';
  filterAssignee: number | 'ALL' | 'UNASSIGNED' = 'ALL';
  filterPriority: string | 'ALL' = 'ALL';
  filterType: string | 'ALL' = 'ALL';

  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private planningService = inject(PlanningService);
  private accountService = inject(AccountService);
  private taskService = inject(TaskService);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.taskForm = this.fb.group({
      title: ['', Validators.required],
      description: [''],
      priority: ['MEDIUM'],
      type: ['TASK'],
      storyPoints: [null],
      sprintId: [null],
      assigneeId: [null],
    });

    this.sprintForm = this.fb.group({
      name: ['', Validators.required],
      goal: [''],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
    });

    this.currentUser = this.accountService.account();

    this.route.paramMap.subscribe(params => {
      this.projectId = Number(params.get('id'));
      if (this.projectId) {
        this.loadAll();
      }
    });
  }

  loadAll(): void {
    this.loading = true;
    this.sprintTasks = new Map();
    this.expandedSprints = new Set();

    this.planningService.getProject(this.projectId).subscribe(p => {
      this.project = p;
      this.canManage = this.computeCanManage(p);
      this.cdr.detectChanges();
    });

    this.planningService.getBacklog(this.projectId).subscribe(tasks => {
      this.backlogTasks = tasks;
      this.loading = false;
      this.cdr.detectChanges();
    });

    this.planningService.getSprints(this.projectId).subscribe(sprints => {
      this.sprints = [...sprints].sort((a: ISprint, b: ISprint) => {
        const dateA = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
        const dateB = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
        return dateB - dateA;
      });
      this.expandedSprints = new Set(sprints.map(s => s.id));

      if (!sprints.length) {
        this.sprintTasks = new Map();
        this.cdr.detectChanges();
        return;
      }

      // Charger toutes les tâches de sprint en une seule passe pour éviter
      // les écrasements concurrents de la Map (source du "déplacement à faire deux fois").
      forkJoin(sprints.map(sprint => (sprint.id ? this.planningService.getTasksBySprint(sprint.id) : of([] as ITask[])))).subscribe(
        results => {
          const map = new Map<number, ITask[]>();
          sprints.forEach((sprint, i) => map.set(sprint.id, results[i] ?? []));
          this.sprintTasks = map;
          this.cdr.detectChanges();
        },
      );
    });
  }

  private computeCanManage(project: IProject | null): boolean {
    if (project?.status === 'CLOSED') return false;
    if (this.accountService.hasAnyAuthority('ROLE_ADMIN')) {
      return true;
    }
    const login = this.accountService.account()?.login;
    if (!login || !project) {
      return false;
    }
    const isOwner = project.owner?.login === login;
    const isMember = project.memberses?.some(member => member.login === login) ?? false;
    return isOwner || isMember;
  }

  get orderedSprints(): ISprint[] {
    const rank: Record<string, number> = { ACTIVE: 0, PLANNED: 1, COMPLETED: 2 };
    return [...this.sprints].sort(
      (a, b) =>
        rank[a.status ?? 'PLANNED'] - rank[b.status ?? 'PLANNED'] ||
        String(this.fmtDate(b.startDate) ?? '').localeCompare(String(this.fmtDate(a.startDate) ?? '')),
    );
  }

  get availableSprints(): ISprint[] {
    return this.sprints.filter(sprint => sprint.status !== 'COMPLETED');
  }

  private isCompletedSprint(sprintId: number | null): boolean {
    return this.sprints.some(sprint => sprint.id === sprintId && sprint.status === 'COMPLETED');
  }

  get canManageSprints(): boolean {
    return this.canManage && this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_SPRINT_MANAGE']);
  }

  getSprintTasks(sprintId: number): ITask[] {
    return this.sprintTasks.get(sprintId) ?? [];
  }

  get projectMembers(): any[] {
    return this.project?.memberses ?? [];
  }

  get hasActiveFilters(): boolean {
    return this.searchTerm.trim() !== '' || this.filterAssignee !== 'ALL' || this.filterPriority !== 'ALL' || this.filterType !== 'ALL';
  }

  private matchesFilters(task: ITask): boolean {
    const term = this.searchTerm.trim().toLowerCase();
    if (term) {
      const key = `${this.project?.projectKey ?? ''}-${task.id}`.toLowerCase();
      if (!(task.title ?? '').toLowerCase().includes(term) && !key.includes(term)) return false;
    }
    if (this.filterAssignee === 'UNASSIGNED') {
      if (task.assignee) return false;
    } else if (this.filterAssignee !== 'ALL') {
      if (task.assignee?.id !== this.filterAssignee) return false;
    }
    if (this.filterPriority !== 'ALL' && task.priority !== this.filterPriority) return false;
    if (this.filterType !== 'ALL' && task.type !== this.filterType) return false;
    return true;
  }

  displayedSprintTasks(sprintId: number): ITask[] {
    return this.getSprintTasks(sprintId).filter(t => this.matchesFilters(t));
  }

  get displayedBacklogTasks(): ITask[] {
    return this.backlogTasks.filter(t => this.matchesFilters(t));
  }

  onAssigneeFilterChange(value: string): void {
    this.filterAssignee = value === 'ALL' || value === 'UNASSIGNED' ? value : Number(value);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.filterAssignee = 'ALL';
    this.filterPriority = 'ALL';
    this.filterType = 'ALL';
  }

  toggleSprint(id: number): void {
    const next = new Set(this.expandedSprints);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.expandedSprints = next;
    this.cdr.detectChanges();
  }

  isExpanded(id: number): boolean {
    return this.expandedSprints.has(id);
  }

  openTaskForm(sprintId: number | null = null): void {
    if (this.isCompletedSprint(sprintId)) return;
    this.taskImages = [];
    this.targetSprintId = sprintId;
    this.showTaskForm = true;
    this.showSprintForm = false;
    this.taskForm.reset({ priority: 'MEDIUM', type: 'TASK', sprintId });
  }

  openSprintForm(): void {
    if (!this.canManageSprints) {
      this.showSprintAccessModal = true;
      return;
    }
    this.editingSprint = null;
    this.showSprintForm = true;
    this.taskImages = [];
    this.showTaskForm = false;
    this.sprintForm.reset();
  }

  canEditSprint(sprint: ISprint): boolean {
    return this.canManageSprints && sprint.status === 'PLANNED';
  }

  openEditSprintForm(sprint: ISprint): void {
    if (!this.canEditSprint(sprint)) {
      this.showSprintAccessModal = true;
      return;
    }
    this.editingSprint = sprint;
    this.showSprintForm = true;
    this.taskImages = [];
    this.showTaskForm = false;
    this.sprintForm.reset({
      name: sprint.name ?? '',
      goal: sprint.goal ?? '',
      startDate: this.toDateInput(sprint.startDate),
      endDate: this.toDateInput(sprint.endDate),
    });
  }

  private toDateInput(value: unknown): string {
    if (!value) return '';
    if (typeof (value as any).format === 'function') return (value as any).format('YYYY-MM-DD');
    return String(value).slice(0, 10);
  }

  closeSprintAccessModal(): void {
    this.showSprintAccessModal = false;
  }

  closeTaskForm(): void {
    this.taskImages = [];
    this.showTaskForm = false;
    this.taskForm.reset({ priority: 'MEDIUM', type: 'TASK', sprintId: null });
  }

  closeSprintForm(): void {
    this.showSprintForm = false;
    this.editingSprint = null;
    this.sprintForm.reset();
  }

  submitTask(): void {
    if (this.taskForm.invalid || this.loading || this.readingImages) return;
    if (this.isCompletedSprint(this.taskForm.value.sprintId)) {
      this.error = 'Impossible d’ajouter une tâche à un sprint terminé.';
      return;
    }
    this.loading = true;
    this.error = '';
    const login = this.accountService.account()?.login ?? '';
    this.planningService
      .createTask(this.projectId, login, {
        assigneeId: this.taskForm.value.assigneeId ?? null,
        images: this.taskImages,
        title: this.taskForm.value.title,
        description: this.taskForm.value.description,
        priority: this.taskForm.value.priority,
        type: this.taskForm.value.type,
        storyPoints: this.taskForm.value.storyPoints,
        sprintId: this.taskForm.value.sprintId ?? null,
      })
      .subscribe({
        next: () => {
          this.taskImages = [];
          this.showTaskForm = false;
          this.taskForm.reset({ priority: 'MEDIUM', type: 'TASK', sprintId: null });
          this.loading = false;
          this.cdr.markForCheck();
          this.loadAll();
        },
        error: (response: any) => {
          this.error = response.error?.detail || response.error?.message || 'Erreur lors de la création de la tâche. Réessayez.';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  submitSprint(): void {
    if (!this.canManageSprints) {
      this.error = 'Vous n’avez pas la permission de gérer les sprints.';
      return;
    }
    if (this.sprintForm.invalid || this.loading) return;
    this.loading = true;
    this.error = '';

    const payload = {
      name: this.sprintForm.value.name,
      goal: this.sprintForm.value.goal,
      startDate: this.sprintForm.value.startDate,
      endDate: this.sprintForm.value.endDate,
    };

    const sprint = this.editingSprint;
    if (sprint) {
      if (sprint.status !== 'PLANNED') {
        this.loading = false;
        this.error = 'Seul un sprint non démarré peut être modifié.';
        return;
      }
      this.planningService.updateSprint(sprint, payload).subscribe({
        next: () => {
          this.showSprintForm = false;
          this.editingSprint = null;
          this.sprintForm.reset();
          this.loading = false;
          this.loadAll();
        },
        error: err => {
          this.loading = false;
          if (err?.status === 403) {
            this.showSprintForm = false;
            this.showSprintAccessModal = true;
          } else {
            this.error = 'Erreur lors de la modification du sprint';
          }
        },
      });
      return;
    }

    this.planningService.createSprint(this.projectId, payload).subscribe({
      next: () => {
        this.showSprintForm = false;
        this.sprintForm.reset();
        this.loading = false;
        this.loadAll();
      },
      error: err => {
        this.loading = false;
        if (err?.status === 403) {
          this.showSprintForm = false;
          this.showSprintAccessModal = true;
        } else {
          this.error = 'Erreur lors de la création du sprint';
        }
      },
    });
  }

  moveToSprint(task: ITask, sprintId: number): void {
    if (!this.canManage) return;
    if (task.sprint?.id === sprintId || this.isCompletedSprint(sprintId)) return;
    const targetSprint = this.sprints.find(s => s.id === sprintId) ?? null;
    this.applyLocalMove(task, targetSprint ? { id: sprintId, name: targetSprint.name } : { id: sprintId });

    this.planningService.updateTask(task, { sprintId }).subscribe({
      error: () => {
        this.error = 'Le déplacement a échoué.';
        this.loadAll();
      },
    });
  }

  moveToBacklog(task: ITask): void {
    if (!this.canManage) return;
    if (!task.sprint) return;
    this.applyLocalMove(task, null);

    this.planningService.updateTask(task, { sprintId: null }).subscribe({
      error: () => {
        this.error = 'Le déplacement a échoué.';
        this.loadAll();
      },
    });
  }

  /** Déplace immédiatement la tâche entre backlog et sprints côté UI (mise à jour optimiste). */
  private applyLocalMove(task: ITask, targetSprint: { id: number; name?: string | null } | null): void {
    const fromSprintId = task.sprint?.id ?? null;

    // Retirer de la source
    if (fromSprintId != null) {
      const current = this.sprintTasks.get(fromSprintId) ?? [];
      this.sprintTasks = new Map(this.sprintTasks).set(
        fromSprintId,
        current.filter(t => t.id !== task.id),
      );
    } else {
      this.backlogTasks = this.backlogTasks.filter(t => t.id !== task.id);
    }

    // Mettre à jour la tâche
    const moved: ITask = { ...task, sprint: targetSprint as ITask['sprint'] };

    // Ajouter à la cible
    if (targetSprint) {
      const dest = this.sprintTasks.get(targetSprint.id) ?? [];
      this.sprintTasks = new Map(this.sprintTasks).set(targetSprint.id, [...dest, moved]);
    } else {
      this.backlogTasks = [...this.backlogTasks, moved];
    }

    this.cdr.detectChanges();
  }

  canManageTask(task: ITask): boolean {
    if (this.project?.status === 'CLOSED') return false;
    const login = this.accountService.account()?.login;
    return this.canManage || (Boolean(login) && task.reporter?.login === login);
  }

  deleteTask(id: number): void {
    const all = [...this.backlogTasks, ...Array.from(this.sprintTasks.values()).flat()];
    const task = all.find(t => t.id === id);
    if (!task || !this.canManageTask(task)) {
      this.error = 'Vous devez être le rapporteur ou appartenir au projet pour supprimer cette tâche.';
      return;
    }
    this.taskToDelete = task;
    this.cdr.detectChanges();
  }

  closeDeleteTaskModal(): void {
    this.taskToDelete = null;
    this.cdr.detectChanges();
  }

  confirmDeleteTask(): void {
    const task = this.taskToDelete;
    if (!task) return;
    this.taskService.delete(task.id).subscribe({
      next: () => {
        this.taskToDelete = null;
        this.loadAll();
      },
      error: () => {
        this.error = 'La suppression a échoué.';
        this.taskToDelete = null;
        this.cdr.detectChanges();
      },
    });
  }

  activateSprint(sprint: ISprint): void {
    const alreadyActive = this.sprints.find(s => s.id !== sprint.id && s.status === 'ACTIVE');
    if (alreadyActive) {
      this.toast.warning(`Le sprint « ${alreadyActive.name} » est déjà en cours. Terminez-le avant d'en activer un autre.`);
      return;
    }
    this.planningService.updateSprint(sprint, { status: 'ACTIVE' }).subscribe({
      next: () => {
        this.toast.success(`Le sprint « ${sprint.name} » est maintenant en cours.`);
        this.loadAll();
      },
      error: () => {
        this.toast.error('Impossible d’activer ce sprint : un sprint est déjà en cours pour ce projet.');
      },
    });
  }

  completeSprint(sprint: ISprint): void {
    this.planningService.updateSprint(sprint, { status: 'COMPLETED' }).subscribe({
      next: () => {
        this.toast.success(`Le sprint « ${sprint.name} » a été terminé.`);
        this.loadAll();
      },
      error: () => this.toast.error('Impossible de terminer le sprint.'),
    });
  }

  deleteSprint(id: number): void {
    if (!this.canManageSprints) {
      this.showSprintAccessModal = true;
      return;
    }
    this.sprintToDelete = this.sprints.find(s => s.id === id) ?? ({ id } as ISprint);
    this.cdr.detectChanges();
  }

  closeDeleteSprintModal(): void {
    this.sprintToDelete = null;
    this.cdr.detectChanges();
  }

  confirmDeleteSprint(): void {
    const sprint = this.sprintToDelete;
    if (!sprint) return;
    this.planningService.deleteSprint(sprint.id).subscribe({
      next: () => {
        this.sprintToDelete = null;
        this.loadAll();
      },
      error: err => {
        this.sprintToDelete = null;
        if (err?.status === 403) {
          this.showSprintAccessModal = true;
        } else {
          this.error = 'La suppression du sprint a échoué.';
        }
        this.cdr.detectChanges();
      },
    });
  }

  fmtDate(value: unknown): string | null {
    if (!value) return null;
    if (typeof (value as any).toISOString === 'function') return (value as any).toISOString();
    return String(value);
  }

  getSprintStatusColor(status: string): string {
    const colors: Record<string, string> = {
      PLANNED: 'text-slate-600 bg-slate-200',
      ACTIVE: 'text-green-700 bg-green-100',
      COMPLETED: 'text-[#1e6f8e] bg-[#d9eef6]',
    };
    return colors[status] ?? 'text-slate-600 bg-slate-200';
  }

  totalPoints(tasks: ITask[]): number {
    return tasks.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0);
  }

  doneCount(tasks: ITask[]): number {
    return tasks.filter(t => t.status === 'DONE').length;
  }

  sprintProgress(sprintId: number): number {
    const tasks = this.getSprintTasks(sprintId);
    if (!tasks.length) return 0;
    return Math.round((this.doneCount(tasks) / tasks.length) * 100);
  }

  sprintStatusLabel(status: string | null | undefined): string {
    const labels: Record<string, string> = { PLANNED: 'Planifié', ACTIVE: 'Actif', COMPLETED: 'Terminé' };
    return labels[status ?? ''] ?? 'Planifié';
  }

  sprintAccent(status: string | null | undefined): string {
    const map: Record<string, string> = {
      ACTIVE: 'border-l-green-500',
      PLANNED: 'border-l-slate-300',
      COMPLETED: 'border-l-[#328cb1]',
    };
    return map[status ?? ''] ?? 'border-l-slate-300';
  }

  onDragStart(event: DragEvent, task: ITask): void {
    event.dataTransfer?.setData('taskId', String(task.id));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
    if (!this.canManage) {
      event.preventDefault();
      return;
    }
    this.draggingTaskId = task.id;
  }

  onDragEnd(): void {
    this.draggingTaskId = null;
    this.dragOverSprintId = null;
    this.dragOverBacklog = false;
  }

  onSprintDragOver(event: DragEvent, sprintId: number): void {
    if (this.isCompletedSprint(sprintId)) return;
    event.preventDefault();
    this.dragOverSprintId = sprintId;
    this.dragOverBacklog = false;
  }

  onBacklogDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOverBacklog = true;
    this.dragOverSprintId = null;
  }

  onDragLeaveZone(): void {
    this.dragOverSprintId = null;
    this.dragOverBacklog = false;
  }

  onDropToSprint(event: DragEvent, sprintId: number): void {
    event.preventDefault();
    this.dragOverSprintId = null;
    this.draggingTaskId = null;
    const taskId = parseInt(event.dataTransfer?.getData('taskId') ?? '0', 10);
    if (!taskId) return;
    const task = this.findTask(taskId);
    if (task && task.sprint?.id !== sprintId) this.moveToSprint(task, sprintId);
  }

  onDropToBacklog(event: DragEvent): void {
    event.preventDefault();
    this.dragOverBacklog = false;
    this.draggingTaskId = null;
    const taskId = parseInt(event.dataTransfer?.getData('taskId') ?? '0', 10);
    if (!taskId) return;
    const task = this.findTask(taskId);
    if (task && task.sprint) this.moveToBacklog(task);
  }

  private findTask(taskId: number): ITask | undefined {
    return [...this.backlogTasks, ...Array.from(this.sprintTasks.values()).flat()].find(t => t.id === taskId);
  }
}
