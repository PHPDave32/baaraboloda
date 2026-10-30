import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import { ResolveFn, RedirectCommand, Router } from '@angular/router';
import { catchError, forkJoin, map, of } from 'rxjs';
import { serverApiUrl } from 'app/config';
import { IProject } from 'app/entities/project/project.model';
import { ITask } from 'app/entities/task/task.model';

export interface WorkspaceIdentifiers {
  projectId: number;
  taskId?: number;
}

export const workspaceResolve: ResolveFn<WorkspaceIdentifiers> = (route, state) => {
  const http = inject(HttpClient);
  const router = inject(Router);
  const projectRef = route.paramMap.get('id')!;
  const taskRef = route.paramMap.get('taskId');
  return forkJoin({
    project: http.get<IProject>(`${serverApiUrl}api/projects/${encodeURIComponent(projectRef)}`),
    task: taskRef ? http.get<ITask>(`${serverApiUrl}api/tasks/${encodeURIComponent(taskRef)}`) : of(null),
  }).pipe(
    map(({ project, task }) => {
      if (task && task.project?.id !== project.id) return new RedirectCommand(router.parseUrl('/404'));
      const url = router.parseUrl(state.url);
      const segments = url.root.children['primary']?.segments ?? [];
      // Canonicalize old bookmarks while keeping query parameters and fragment.
      let changed = false;
      for (let index = 0; index < segments.length; index++) {
        if (
          ['projects', 'project'].includes(segments[index].path) &&
          segments[index + 1] &&
          project.uuid &&
          segments[index + 1].path !== project.uuid
        ) {
          segments[index + 1].path = project.uuid;
          changed = true;
        }
        if (segments[index].path === 'tasks' && segments[index + 1] && task?.uuid && segments[index + 1].path !== task.uuid) {
          segments[index + 1].path = task.uuid;
          changed = true;
        }
      }
      return changed ? new RedirectCommand(url, { replaceUrl: true }) : { projectId: project.id, taskId: task?.id };
    }),
    catchError(() => of(new RedirectCommand(router.parseUrl('/404')))),
  );
};
