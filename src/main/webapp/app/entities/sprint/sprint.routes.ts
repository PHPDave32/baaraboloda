import { Routes } from '@angular/router';

import { ASC } from 'app/config';
import { userRouteAccessService } from 'app/core/auth';

import SprintResolve from './route/sprint-routing-resolve.service';

const sprintRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/sprint').then(m => m.Sprint),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/sprint-detail').then(m => m.SprintDetail),
    resolve: {
      sprint: SprintResolve,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/sprint-update').then(m => m.SprintUpdate),
    resolve: {
      sprint: SprintResolve,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/sprint-update').then(m => m.SprintUpdate),
    resolve: {
      sprint: SprintResolve,
    },
    canActivate: [userRouteAccessService],
  },
];

export default sprintRoute;
