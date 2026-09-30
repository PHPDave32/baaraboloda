import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { serverApiUrl } from 'app/config';
import { IProject } from 'app/entities/project/project.model';
import { ISprint } from 'app/entities/sprint/sprint.model';
import { ITask } from 'app/entities/task/task.model';

export interface TaskComment {
  id: number;
  content: string;
  createdAt?: string;
  author?: { id?: number; login?: string };
}

@Injectable({ providedIn: 'root' })
export class PlanningService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${serverApiUrl}api`;

  // ── Projet ────────────────────────────────────────────────────────────────

  getProject(id: number): Observable<IProject> {
    return this.http.get<IProject>(`${this.apiUrl}/projects/${id}`);
  }

  // ── Sprints ───────────────────────────────────────────────────────────────

  /**
   * GET /api/sprints?projectId.equals={id}&size=1000
   * Le backend JHipster expose uniquement GET /api/sprints avec filtres criteria.
   */
  getSprints(projectId: number): Observable<ISprint[]> {
    return this.http.get<ISprint[]>(`${this.apiUrl}/sprints`, {
      params: { 'projectId.equals': projectId, size: 1000 },
    });
  }

  /**
   * POST /api/sprints
   * SprintDTO requiert : name (@NotNull), status (@NotNull), project (@NotNull avec id).
   */
  createSprint(projectId: number, sprint: Pick<ISprint, 'name' | 'goal' | 'startDate' | 'endDate'>): Observable<ISprint> {
    return this.http.post<ISprint>(`${this.apiUrl}/sprints`, {
      name: sprint.name,
      goal: sprint.goal ?? null,
      startDate: sprint.startDate,
      endDate: sprint.endDate,
      status: 'PLANNED',
      project: { id: projectId },
    });
  }

  /**
   * PATCH /api/sprints/{id}
   * SprintDTO partiel — id obligatoire dans le body.
   */
  updateSprint(sprint: ISprint, changes: Partial<ISprint>): Observable<ISprint> {
    return this.http.patch<ISprint>(`${this.apiUrl}/sprints/${sprint.id}`, {
      id: sprint.id,
      ...changes,
    });
  }

  deleteSprint(id: number): Observable<undefined> {
    return this.http.delete<undefined>(`${this.apiUrl}/sprints/${id}`);
  }

  // ── Tâches ────────────────────────────────────────────────────────────────

  getTasksByProject(projectId: number): Observable<ITask[]> {
    return this.http.get<ITask[]>(`${this.apiUrl}/tasks/projects/${projectId}/tasks`);
  }

  /**
   * GET /api/tasks/projects/{id}/backlog
   */
  getBacklog(projectId: number): Observable<ITask[]> {
    return this.http.get<ITask[]>(`${this.apiUrl}/tasks/projects/${projectId}/backlog`);
  }

  /**
   * GET /api/tasks/sprints/{id}/tasks
   */
  getTasksBySprint(sprintId: number): Observable<ITask[]> {
    return this.http.get<ITask[]>(`${this.apiUrl}/tasks/sprints/${sprintId}/tasks`);
  }

  /**
   * POST /api/tasks
   * TaskDTO requiert : title, status, priority, type (@NotNull), project (@NotNull avec id).
   * Le reporter est auto-rempli côté backend via SecurityUtils.getCurrentUserLogin().
   */
  createTask(
    projectId: number,
    reporterLogin: string,
    task: Pick<ITask, 'title' | 'description' | 'priority' | 'type' | 'storyPoints'> & { sprintId?: number | null },
  ): Observable<ITask> {
    return this.http.post<ITask>(`${this.apiUrl}/tasks`, {
      title: task.title,
      description: task.description ?? null,
      status: 'TODO',
      priority: task.priority ?? 'MEDIUM',
      type: task.type ?? 'TASK',
      storyPoints: task.storyPoints ?? null,
      project: { id: projectId },
      sprint: task.sprintId ? { id: task.sprintId } : null,
      reporter: { login: reporterLogin },
    });
  }

  /**
   * PATCH /api/tasks/{id}/sprint
   * Endpoint dédié au déplacement de tâche — évite le bug Hibernate sur le PATCH générique.
   * sprintId = null → backlog, sprintId = number → sprint cible
   */
  moveTaskToSprint(taskId: number, sprintId: number | null): Observable<ITask> {
    return this.http.patch<ITask>(`${this.apiUrl}/tasks/${taskId}/sprint`, { sprintId });
  }

  /**
   * PATCH /api/tasks/{id}
   * TaskDTO partiel — id obligatoire dans le body.
   * sprint est un objet imbriqué {id}, pas un champ plat sprintId.
   * NE PAS utiliser pour déplacer les sprints — utiliser moveTaskToSprint à la place.
   */
  updateTask(task: ITask, changes: Partial<ITask> & { sprintId?: number | null }): Observable<ITask> {
    // Si seul le sprint change → utiliser l'endpoint dédié qui évite le bug Hibernate
    if ('sprintId' in changes && Object.keys(changes).length === 1) {
      return this.moveTaskToSprint(task.id, changes.sprintId ?? null);
    }

    const payload: Record<string, unknown> = { id: task.id };

    if (changes.status !== undefined) payload['status'] = changes.status;
    if (changes.priority !== undefined) payload['priority'] = changes.priority;
    if (changes.type !== undefined) payload['type'] = changes.type;
    if (changes.title !== undefined) payload['title'] = changes.title;
    if (changes.description !== undefined) payload['description'] = changes.description;
    if (changes.storyPoints !== undefined) payload['storyPoints'] = changes.storyPoints;
    if (changes.position !== undefined) payload['position'] = changes.position;

    // Si sprint change en même temps que d'autres champs, passer par l'endpoint dédié
    if ('sprintId' in changes) {
      return this.moveTaskToSprint(task.id, changes.sprintId ?? null);
    }

    return this.http.patch<ITask>(`${this.apiUrl}/tasks/${task.id}`, payload);
  }

  getTask(id: number): Observable<ITask> {
    return this.http.get<ITask>(`${this.apiUrl}/tasks/${id}`);
  }

  // ── Commentaires ──────────────────────────────────────────────────────────

  getComments(taskId: number): Observable<TaskComment[]> {
    return this.http.get<TaskComment[]>(`${this.apiUrl}/comments`, { params: { 'taskId.equals': taskId, size: 1000 } });
  }

  createComment(taskId: number, content: string): Observable<TaskComment> {
    return this.http.post<TaskComment>(`${this.apiUrl}/comments`, { content, task: { id: taskId } });
  }

  updateComment(comment: TaskComment, content: string): Observable<TaskComment> {
    return this.http.patch<TaskComment>(`${this.apiUrl}/comments/${comment.id}`, { id: comment.id, content });
  }

  deleteComment(id: number): Observable<undefined> {
    return this.http.delete<undefined>(`${this.apiUrl}/comments/${id}`);
  }
}
