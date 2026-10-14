import { Routes } from '@angular/router';
import { userRouteAccessService } from 'app/core/auth';
/* jhipster-needle-add-admin-module-import - JHipster will add admin modules imports here */

const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('../features/admin/admin'),
    title: 'Administration',
  },
  {
    path: 'docs',
    loadComponent: () => import('./docs/docs'),
    title: 'global.menu.admin.apidocs',
  },
  {
    path: 'configuration',
    loadComponent: () => import('./configuration/configuration'),
    title: 'configuration.title',
  },
  {
    path: 'access-profiles',
    loadComponent: () => import('../entities/admin/access-profile/access-profile.component'),
    title: 'Profils et permissions',
    data: { authorities: ['ROLE_SUPER_ADMIN'] },
    canActivate: [userRouteAccessService],
  },
  {
    path: 'health',
    loadComponent: () => import('./health/health'),
    title: 'health.title',
  },
  {
    path: 'logs',
    loadComponent: () => import('./logs/logs'),
    title: 'logs.title',
  },
  {
    path: 'metrics',
    loadComponent: () => import('./metrics/metrics'),
    title: 'metrics.title',
  },
  // jhipster-needle-add-admin-route - JHipster will add admin routes here
];

export default routes;
