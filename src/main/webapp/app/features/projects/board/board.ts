import { PublicIdPipe } from 'app/core/identifiers/public-id.pipe';
import { NgbDropdown, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { CardDepthDirective } from 'app/shared/directives/card-depth.directive';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { AccountService } from 'app/core/auth';
import { IProject } from 'app/entities/project/project.model';
import { ISprint } from 'app/entities/sprint/sprint.model';
import { ITask } from 'app/entities/task/task.model';
import { BadgeComponent } from 'app/shared/components/badge/badge.component';
import { AvatarComponent } from 'app/shared/components/avatar/avatar.component';
import { FormsModule } from '@angular/forms';
import { WorkspaceService } from '../workspace.service';

type BoardStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';

@Component({
  selector: 'jhi-project-board',
  imports: [
    PublicIdPipe,
    NgbDropdownModule,
    NotificationCenterComponent,
    CardDepthDirective,
    RouterLink,
    BadgeComponent,
    AvatarComponent,
    FormsModule,
  ],
  templateUrl: './board.html',
  styleUrl: './board.scss',
})
export default class Board implements OnInit {
  readonly memberColors = ['#328cb1', '#4058bb', '#9466c2', '#b76c29', '#bc4858', '#258971'];
  readonly statusColumns: BoardStatus[] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];

  readonly columnLabels: Record<BoardStatus, string> = {
    TODO: 'À faire',
    IN_PROGRESS: 'En cours',
    IN_REVIEW: 'En révision',
    DONE: 'Terminé',
  };

  readonly columnDotColors: Record<BoardStatus, string> = {
    TODO: 'bg-gray-500',
    IN_PROGRESS: 'bg-[#328cb1]',
    IN_REVIEW: 'bg-purple-500',
    DONE: 'bg-green-500',
  };

  projectId = 0;
  readonly project = signal<IProject | null>(null);
  readonly tasks = signal<ITask[]>([]);
  readonly loading = signal(false);
  readonly draggingTaskId = signal<number | null>(null);
  readonly landedTaskId = signal<number | null>(null);
  readonly dragOverColumn = signal<BoardStatus | null>(null);

  readonly sprints = signal<ISprint[]>([]);
  readonly selectedSprintId = signal<number | 'ALL'>('ALL');
  readonly assignMenuTaskId = signal<number | null>(null);
  readonly assignSearch = signal('');
  readonly moveMenuTaskId = signal<number | null>(null);

  readonly selectedSprint = computed(() => {
    const id = this.selectedSprintId();
    if (id === 'ALL') {
      return null;
    }
    return this.sprints().find(s => s.id === id) ?? null;
  });

  readonly projectMembers = computed(() => this.project()?.memberses ?? []);

  readonly filteredMembers = computed(() => {
    const term = this.assignSearch().trim().toLowerCase();
    const members = this.projectMembers();
    if (!term) {
      return members;
    }
    return members.filter(m => (m.login ?? '').toLowerCase().includes(term));
  });

  readonly currentLogin = computed(() => this.accountService.account()?.login ?? '');

  readonly moveTargetSprints = computed(() => this.sprints().filter(s => s.status !== 'COMPLETED'));

  // ── Filtres & recherche ────────────────────────────────────────────────────
  readonly searchTerm = signal('');
  readonly filterAssignee = signal<number | 'ALL' | 'UNASSIGNED'>('ALL');
  readonly filterPriority = signal<string | 'ALL'>('ALL');
  readonly filterType = signal<string | 'ALL'>('ALL');

  readonly hasActiveFilters = computed(
    () =>
      this.searchTerm().trim() !== '' || this.filterAssignee() !== 'ALL' || this.filterPriority() !== 'ALL' || this.filterType() !== 'ALL',
  );

  readonly filteredTasks = computed(() => this.tasks().filter(t => this.matchesFilters(t)));

  readonly visibleTaskCount = computed(() => this.filteredTasks().length);

  private matchesFilters(task: ITask): boolean {
    const term = this.searchTerm().trim().toLowerCase();
    if (term) {
      const key = `${this.project()?.projectKey ?? ''}-${task.id}`.toLowerCase();
      const inTitle = (task.title ?? '').toLowerCase().includes(term);
      const inKey = key.includes(term);
      if (!inTitle && !inKey) return false;
    }

    const assignee = this.filterAssignee();
    if (assignee === 'UNASSIGNED') {
      if (task.assignee) return false;
    } else if (assignee !== 'ALL') {
      if (task.assignee?.id !== assignee) return false;
    }

    if (this.filterPriority() !== 'ALL' && task.priority !== this.filterPriority()) return false;
    if (this.filterType() !== 'ALL' && task.type !== this.filterType()) return false;

    return true;
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.filterAssignee.set('ALL');
    this.filterPriority.set('ALL');
    this.filterType.set('ALL');
  }

  onAssigneeFilterChange(value: string): void {
    this.filterAssignee.set(value === 'ALL' || value === 'UNASSIGNED' ? value : Number(value));
  }

  private activeAssignDropdown?: NgbDropdown;
  private readonly route = inject(ActivatedRoute);
  private readonly workspaceService = inject(WorkspaceService);
  private readonly accountService = inject(AccountService);

  get canEdit(): boolean {
    return this.project()?.status !== 'CLOSED';
  }

  private canAssign(): boolean {
    if (this.project()?.status === 'CLOSED') return false;
    const login = this.accountService.account()?.login;
    if (!login) return false;
    if (this.accountService.hasAnyAuthority('ROLE_ADMIN')) return true;
    return this.projectMembers().some(m => m.login === login) || this.project()?.owner?.login === login;
  }

  toggleAssignMenu(task: ITask, event: Event, dropdown: NgbDropdown): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.canAssignTask(task)) return;
    if (dropdown.isOpen()) {
      this.closeAssignMenu();
      return;
    }
    this.closeAssignMenu();
    this.activeAssignDropdown = dropdown;
    this.assignMenuTaskId.set(task.id);
    dropdown.open();
  }

  closeAssignMenu(): void {
    const dropdown = this.activeAssignDropdown;
    this.activeAssignDropdown = undefined;
    this.assignMenuTaskId.set(null);
    dropdown?.close();
    this.assignSearch.set('');
  }

  isAssignedTo(task: ITask, memberId: number): boolean {
    return task.assignee?.id === memberId;
  }

  assign(task: ITask, memberId: number | null): void {
    if (!this.canAssignTask(task) || (memberId !== null && !this.projectMembers().some(member => member.id === memberId))) return;
    this.closeAssignMenu();
    const member = memberId ? (this.projectMembers().find(m => m.id === memberId) ?? null) : null;
    const previous = task.assignee ?? null;
    this.tasks.update(list => list.map(t => (t.id === task.id ? { ...t, assignee: member } : t)));

    this.workspaceService.assignTask(task.id, memberId).subscribe({
      next: updated => {
        this.tasks.update(list => list.map(t => (t.id === task.id ? { ...t, assignee: updated.assignee ?? null } : t)));
      },
      error: () => {
        this.tasks.update(list => list.map(t => (t.id === task.id ? { ...t, assignee: previous } : t)));
      },
    });
  }

  toggleMoveMenu(task: ITask, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    if (!this.canMoveTask(task)) return;
    this.closeAssignMenu();
    this.moveMenuTaskId.set(this.moveMenuTaskId() === task.id ? null : task.id);
  }

  closeMoveMenu(): void {
    this.moveMenuTaskId.set(null);
  }

  isFromCompletedSprint(task: ITask): boolean {
    const sprintId = task.sprint?.id;
    if (!sprintId) return false;
    return this.sprints().find(s => s.id === sprintId)?.status === 'COMPLETED';
  }

  moveToIteration(task: ITask, sprintId: number | null): void {
    this.moveMenuTaskId.set(null);
    if ((task.sprint?.id ?? null) === sprintId) return;
    if (this.sprints().some(sprint => sprint.id === sprintId && sprint.status === 'COMPLETED')) return;

    if (this.isFromCompletedSprint(task) && sprintId !== null) {
      this.copyToIteration(task, sprintId);
      return;
    }

    const targetSprint = sprintId ? (this.sprints().find(s => s.id === sprintId) ?? null) : null;
    const previousSprint = task.sprint ?? null;

    this.tasks.update(list => list.map(t => (t.id === task.id ? { ...t, sprint: targetSprint } : t)));
    const filterId = this.selectedSprintId();
    if (filterId !== 'ALL' && filterId !== sprintId) {
      this.tasks.update(list => list.filter(t => t.id !== task.id));
    }

    this.workspaceService.moveTaskToSprint(task.id, sprintId).subscribe({
      error: () => {
        this.tasks.update(list =>
          list.some(t => t.id === task.id) ? list.map(t => (t.id === task.id ? { ...t, sprint: previousSprint } : t)) : list,
        );
        this.loadTasks();
      },
    });
  }

  private copyToIteration(task: ITask, sprintId: number): void {
    this.workspaceService.copyTaskToSprint(task.id, sprintId).subscribe({
      next: created => {
        if (this.selectedSprintId() === sprintId) {
          this.tasks.update(list => [...list, created]);
        }
      },
      error: () => this.loadTasks(),
    });
  }

  ngOnInit(): void {
    this.route.data.subscribe(data => {
      this.projectId = data['workspace'].projectId;
      if (this.projectId) {
        this.loadProject();
        this.loadSprints();
      }
    });
  }

  loadProject(): void {
    this.workspaceService.getProject(this.projectId).subscribe({
      next: project => this.project.set(project),
    });
  }

  loadSprints(): void {
    this.workspaceService.getSprints(this.projectId).subscribe({
      next: sprints => {
        const sorted = [...sprints].sort((a, b) => {
          const da = a.startDate ? new Date(String(a.startDate)).getTime() : 0;
          const db = b.startDate ? new Date(String(b.startDate)).getTime() : 0;
          return db - da;
        });
        this.sprints.set(sorted);
        const active = sorted.find(s => s.status === 'ACTIVE');
        this.selectedSprintId.set(active ? active.id : 'ALL');
        this.loadTasks();
      },
      error: () => {
        this.selectedSprintId.set('ALL');
        this.loadTasks();
      },
    });
  }

  onSprintChange(value: string): void {
    this.selectedSprintId.set(value === 'ALL' ? 'ALL' : Number(value));
    this.loadTasks();
  }

  loadTasks(): void {
    this.loading.set(true);
    const sprintId = this.selectedSprintId();
    const request$ =
      sprintId === 'ALL' ? this.workspaceService.getTasksByProject(this.projectId) : this.workspaceService.getTasksBySprint(sprintId);

    request$.subscribe({
      next: tasks => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  sprintLabel(sprint: ISprint): string {
    const statusLabels: Record<string, string> = {
      PLANNED: 'À venir',
      ACTIVE: 'En cours',
      COMPLETED: 'Terminé',
    };
    const status = sprint.status ? (statusLabels[sprint.status] ?? '') : '';
    return status ? `${sprint.name} · ${status}` : `${sprint.name}`;
  }

  getTasksByStatus(status: BoardStatus): ITask[] {
    return this.filteredTasks()
      .filter(t => t.status === status)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  }

  hasColumnMenu(status: BoardStatus): boolean {
    const id = this.assignMenuTaskId() ?? this.moveMenuTaskId();
    return id !== null && this.tasks().some(task => task.id === id && task.status === status);
  }

  finishArrival(event: AnimationEvent, taskId: number): void {
    if (event.animationName === 'board-arrive' && this.landedTaskId() === taskId) {
      (event.currentTarget as HTMLElement).style.animation = 'none';
      this.landedTaskId.set(null);
    }
  }

  canAssignTask(task: ITask): boolean {
    return this.canAssign() || (Boolean(this.currentLogin()) && task.reporter?.login === this.currentLogin());
  }

  canMoveTask(_task: ITask): boolean {
    if (this.project()?.status === 'CLOSED') return false;
    return this.canAssign();
  }

  onDragStart(event: DragEvent, task: ITask): void {
    if (!this.canMoveTask(task)) {
      event.preventDefault();
      return;
    }
    this.closeAssignMenu();
    this.closeMoveMenu();
    this.draggingTaskId.set(task.id);
    this.landedTaskId.set(null);
    event.dataTransfer?.setData('taskId', String(task.id));
    event.dataTransfer && (event.dataTransfer.effectAllowed = 'move');
  }

  onDragEnd(): void {
    this.draggingTaskId.set(null);
    this.dragOverColumn.set(null);
  }

  onDragOver(event: DragEvent, status: BoardStatus): void {
    event.preventDefault();
    this.dragOverColumn.set(status);
  }

  onDragLeave(event: DragEvent): void {
    const el = event.currentTarget as HTMLElement;
    if (!el.contains(event.relatedTarget as Node)) {
      this.dragOverColumn.set(null);
    }
  }

  onDrop(event: DragEvent, newStatus: BoardStatus): void {
    event.preventDefault();
    this.dragOverColumn.set(null);
    this.draggingTaskId.set(null);
    const taskId = parseInt(event.dataTransfer?.getData('taskId') ?? '0', 10);
    if (!taskId) return;

    const task = this.tasks().find(t => t.id === taskId);
    if (!task || task.status === newStatus || !this.canMoveTask(task)) return;

    this.draggingTaskId.set(null);
    this.landedTaskId.set(taskId);
    const previousStatus = task.status;
    this.tasks.update(list => list.map(t => (t.id === taskId ? { ...t, status: newStatus } : t)));

    this.workspaceService.updateTask({ ...task, status: newStatus }, newStatus).subscribe({
      error: () => {
        this.landedTaskId.set(null);
        this.tasks.update(list => list.map(t => (t.id === taskId ? { ...t, status: previousStatus } : t)));
      },
    });
  }
}
