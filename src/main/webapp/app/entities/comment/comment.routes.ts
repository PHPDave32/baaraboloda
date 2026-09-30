import { Routes } from '@angular/router';

import { ASC } from 'app/config';
import { userRouteAccessService } from 'app/core/auth';

import CommentResolve from './route/comment-routing-resolve.service';

const commentRoute: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/comment').then(m => m.Comment),
    data: {
      defaultSort: `id,${ASC}`,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/view',
    loadComponent: () => import('./detail/comment-detail').then(m => m.CommentDetail),
    resolve: {
      comment: CommentResolve,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: 'new',
    loadComponent: () => import('./update/comment-update').then(m => m.CommentUpdate),
    resolve: {
      comment: CommentResolve,
    },
    canActivate: [userRouteAccessService],
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./update/comment-update').then(m => m.CommentUpdate),
    resolve: {
      comment: CommentResolve,
    },
    canActivate: [userRouteAccessService],
  },
];

export default commentRoute;
