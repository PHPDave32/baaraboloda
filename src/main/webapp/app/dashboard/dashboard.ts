import { NotificationCenterComponent } from 'app/shared/components/notifications/notification-center.component';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { IProject } from 'app/entities/project/project.model';
import { ProjectService } from 'app/entities/project/service/project.service';
import { ITask } from 'app/entities/task/task.model';
import { TaskService } from 'app/entities/task/service/task.service';

import { DashboardDepthDirective } from './dashboard-depth.directive';

interface DashboardStats {
  totalProjects: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  reviewTasks: number;
}

@Component({
  selector: 'jhi-dashboard',
  imports: [NotificationCenterComponent, RouterLink, FormsModule, DashboardDepthDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export default class Dashboard implements OnInit {
  projects: IProject[] = [];
  actionProjectId: number | null = null;
  search = '';
  selectedStatus = '';
  tasks: ITask[] = [];
  loading = true;
  error = false;
  stats: DashboardStats = {
    totalProjects: 0,
    totalTasks: 0,
    activeTasks: 0,
    completedTasks: 0,
    reviewTasks: 0,
  };

  private readonly projectService = inject(ProjectService);
  private readonly taskService = inject(TaskService);
  private readonly cdr: ChangeDetectorRef = inject(ChangeDetectorRef);

  get completionPercent(): number {
    return this.stats.totalTasks ? Math.round((this.stats.completedTasks / this.stats.totalTasks) * 100) : 0;
  }

  get visibleProjects(): IProject[] {
    return this.projects.filter(
      project =>
        (project.name ?? '').toLocaleLowerCase().includes(this.search.toLocaleLowerCase()) &&
        (!this.selectedStatus || this.tasks.some(task => task.project?.id === project.id && task.status === this.selectedStatus)),
    );
  }

  selectStatus(status: string): void {
    this.selectedStatus = this.selectedStatus === status ? '' : status;
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.projectService.query({ size: 1000 }).subscribe({
      next: response => {
        this.projects = response.body ?? [];
        this.stats.totalProjects = this.projects.length;
        if (!this.projects.length) {
          this.loading = false;
          this.cdr.markForCheck();
          return;
        }

        forkJoin(this.projects.map(project => this.taskService.query({ 'projectId.equals': project.id, size: 1000 }))).subscribe({
          next: responses => {
            const tasks: ITask[] = responses.flatMap(taskResponse => taskResponse.body ?? []);
            this.tasks = tasks;
            this.stats = {
              totalProjects: this.projects.length,
              totalTasks: tasks.length,
              activeTasks: tasks.filter((task: ITask) => task.status === 'IN_PROGRESS').length,
              completedTasks: tasks.filter((task: ITask) => task.status === 'DONE').length,
              reviewTasks: tasks.filter((task: ITask) => task.status === 'IN_REVIEW').length,
            };
            this.loading = false;
            this.cdr.markForCheck();
          },
          error: () => {
            this.error = true;
            this.loading = false;
            this.cdr.markForCheck();
          },
        });
      },
      error: () => {
        this.error = true;
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  trackProject(_: number, project: IProject): number {
    return project.id;
  }
}
