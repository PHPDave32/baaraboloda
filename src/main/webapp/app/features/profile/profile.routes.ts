import { Routes } from '@angular/router';

import { userRouteAccessService } from 'app/core/auth';

const profileRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./profile'),
    title: 'Profil',
    canActivate: [userRouteAccessService],
  },
];

export default profileRoutes;
