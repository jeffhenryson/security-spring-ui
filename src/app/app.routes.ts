import { Routes } from '@angular/router';
import { authGuard, alreadyAuthGuard } from './core/rbac/permission.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [alreadyAuthGuard],
    loadComponent: () =>
      import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.authRoutes),
  },
  {
    path: 'app',
    loadComponent: () => import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        data: { title: 'Dashboard' },
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.settingsRoutes),
      },
      {
        path: 'template',
        data: { title: 'Template' },
        loadComponent: () =>
          import('./features/template/template.component').then((m) => m.TemplateComponent),
      },
      {
        path: 'access-denied',
        data: { title: 'Acesso negado' },
        loadComponent: () =>
          import('./features/access-denied/access-denied.component').then(
            (m) => m.AccessDeniedComponent,
          ),
      },
      { path: '**', redirectTo: 'dashboard' },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
];
