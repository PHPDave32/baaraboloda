import { Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'user-management',
    title: 'userManagement.home.title',
    loadChildren: () => import('./admin/user-management/user-management.routes'),
  },
  {
    path: 'authority',
    title: 'baaraBolodaApp.adminAuthority.home.title',
    loadChildren: () => import('./admin/authority/authority.routes'),
  },
  {
    path: 'project',
    title: 'baaraBolodaApp.project.home.title',
    loadChildren: () => import('./project/project.routes'),
  },
  {
    path: 'sprint',
    title: 'baaraBolodaApp.sprint.home.title',
    loadChildren: () => import('./sprint/sprint.routes'),
  },
  {
    path: 'task',
    title: 'baaraBolodaApp.task.home.title',
    loadChildren: () => import('./task/task.routes'),
  },
  {
    path: 'comment',
    title: 'baaraBolodaApp.comment.home.title',
    loadChildren: () => import('./comment/comment.routes'),
  },
  {
    path: 'label',
    title: 'baaraBolodaApp.label.home.title',
    loadChildren: () => import('./label/label.routes'),
  },
  // jhipster-needle-add-entity-route - JHipster will add entity modules routes here
];

export default routes;
