import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { serverApiUrl } from 'app/config';
import { IProject } from 'app/entities/project/project.model';
import { ISprint } from 'app/entities/sprint/sprint.model';
import { ITask } from 'app/entities/task/task.model';

@Injectable({ providedIn: 'root' })
export class WorkspaceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${serverApiUrl}api`;

  getProject(id: number): Observable<IProject> {
    return this.http.get<IProject>(`${this.apiUrl}/projects/${id}`);
  }

  getTasksByProject(projectId: number): Observable<ITask[]> {
    return this.http.get<ITask[]>(`${this.apiUrl}/tasks/projects/${projectId}/tasks`);
  }

  getSprints(projectId: number): Observable<ISprint[]> {
    return this.http.get<ISprint[]>(`${this.apiUrl}/sprints`, {
      params: { 'projectId.equals': projectId, size: 1000 },
    });
  }

  getTasksBySprint(sprintId: number): Observable<ITask[]> {
    return this.http.get<ITask[]>(`${this.apiUrl}/tasks/sprints/${sprintId}/tasks`);
  }

  updateTask(task: ITask, status: NonNullable<ITask['status']>): Observable<ITask> {
    return this.http.patch<ITask>(`${this.apiUrl}/tasks/${task.id}`, { id: task.id, status });
  }

  assignTask(taskId: number, userId: number | null): Observable<ITask> {
    return this.http.patch<ITask>(`${this.apiUrl}/tasks/${taskId}/assignee`, { userId });
  }

  moveTaskToSprint(taskId: number, sprintId: number | null): Observable<ITask> {
    return this.http.patch<ITask>(`${this.apiUrl}/tasks/${taskId}/sprint`, { sprintId });
  }

  copyTaskToSprint(taskId: number, sprintId: number): Observable<ITask> {
    return this.http.post<ITask>(`${this.apiUrl}/tasks/${taskId}/copy-to-sprint`, { sprintId });
  }
}
