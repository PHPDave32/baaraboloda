import { DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
  imports: [ReactiveFormsModule, RouterLink, DatePipe, BadgeComponent, AvatarComponent, ModalComponent],
  templateUrl: './backlog.html',
})
export default class Backlog implements OnInit {
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
      this.sprints = sprints.sort((a: ISprint, b: ISprint) => {
        const dateA = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
        const dateB = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
        return dateB - dateA;
      });
      const expanded = new Set<number>();
      sprints.forEach((sprint: ISprint) => {
        expanded.add(sprint.id);
        this.planningService.getTasksBySprint(sprint.id).subscribe((tasks: ITask[]) => {
          this.sprintTasks = new Map(this.sprintTasks).set(sprint.id, tasks);
          this.cdr.detectChanges();
        });
      });
      this.expandedSprints = expanded;
      this.cdr.detectChanges();
    });
  }

  private computeCanManage(project: IProject | null): boolean {
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

  get canManageSprints(): boolean {
    return this.canManage && this.accountService.hasAnyAuthority(['ROLE_ADMIN', 'PERM_SPRINT_MANAGE']);
  }

  getSprintTasks(sprintId: number): ITask[] {
    return this.sprintTasks.get(sprintId) ?? [];
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
    this.showTaskForm = false;
    this.taskForm.reset({ priority: 'MEDIUM', type: 'TASK', sprintId: null });
  }

  closeSprintForm(): void {
    this.showSprintForm = false;
    this.editingSprint = null;
    this.sprintForm.reset();
  }

  submitTask(): void {
    if (this.taskForm.invalid || this.loading) return;
    this.loading = true;
    this.error = '';
    const login = this.accountService.account()?.login ?? '';
    this.planningService
      .createTask(this.projectId, login, {
        title: this.taskForm.value.title,
        description: this.taskForm.value.description,
        priority: this.taskForm.value.priority,
        type: this.taskForm.value.type,
        storyPoints: this.taskForm.value.storyPoints,
        sprintId: this.taskForm.value.sprintId ?? null,
      })
      .subscribe({
        next: () => {
          this.showTaskForm = false;
          this.taskForm.reset({ priority: 'MEDIUM', type: 'TASK', sprintId: null });
          this.loading = false;
          this.loadAll();
        },
        error: () => {
          this.error = 'Erreur lors de la création de la tâche';
          this.loading = false;
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
    this.planningService.updateTask(task, { sprintId }).subscribe({
      next: () => this.loadAll(),
      error: () => (this.error = 'Le déplacement a échoué.'),
    });
  }

  moveToBacklog(task: ITask): void {
    this.planningService.updateTask(task, { sprintId: null }).subscribe({
      next: () => this.loadAll(),
      error: () => (this.error = 'Le déplacement a échoué.'),
    });
  }

  deleteTask(id: number): void {
    if (!this.canManage) {
      this.error = 'Vous devez appartenir au projet pour supprimer une tâche.';
      return;
    }
    const all = [...this.backlogTasks, ...Array.from(this.sprintTasks.values()).flat()];
    this.taskToDelete = all.find(t => t.id === id) ?? ({ id } as ITask);
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

  onDragStart(event: DragEvent, task: ITask): void {
    event.dataTransfer?.setData('taskId', String(task.id));
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.add('ring-2', 'ring-indigo-500/50');
  }

  onDropToSprint(event: DragEvent, sprintId: number): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-indigo-500/50');
    const taskId = parseInt(event.dataTransfer?.getData('taskId') ?? '0', 10);
    if (!taskId) return;
    const allTasks = [...this.backlogTasks, ...Array.from(this.sprintTasks.values()).flat()];
    const task = allTasks.find(t => t.id === taskId);
    if (task) this.moveToSprint(task, sprintId);
  }

  onDropToBacklog(event: DragEvent): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement).classList.remove('ring-2', 'ring-indigo-500/50');
    const taskId = parseInt(event.dataTransfer?.getData('taskId') ?? '0', 10);
    if (!taskId) return;
    const allTasks = [...this.backlogTasks, ...Array.from(this.sprintTasks.values()).flat()];
    const task = allTasks.find(t => t.id === taskId);
    if (task) this.moveToBacklog(task);
  }
}
