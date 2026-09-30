import { Routes } from '@angular/router';

import { ASC } from 'app/config';
import { userRouteAccessService } from 'app/core/auth';

import ProjectResolve from './route/project-routing-resolve.service';

const projectRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/project').then(m => m.Project),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/project-detail').then(m => m.ProjectDetail),
    resolve: {
      project: ProjectResolve,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/board',
    loadComponent: () => import('app/features/projects/board/board'),
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/backlog',
    loadComponent: () => import('app/features/projects/backlog/backlog'),
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/sprints',
    loadComponent: () => import('app/features/projects/sprints/sprints'),
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/tasks/:taskId',
    loadComponent: () => import('app/features/projects/task-detail/task-detail'),
    canActivate: [userRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/project-update').then(m => m.ProjectUpdate),
    resolve: {
      project: ProjectResolve,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/project-update').then(m => m.ProjectUpdate),
    resolve: {
      project: ProjectResolve,
    },
    canActivate: [userRouteAccessService],
  },
];

export default projectRoute;
