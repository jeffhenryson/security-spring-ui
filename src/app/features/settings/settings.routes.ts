import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/rbac/permission.guard';

export const settingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./settings-shell/settings-shell.component').then(m => m.SettingsShellComponent),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        data: { title: 'Perfil' },
        loadComponent: () =>
          import('./profile/profile.component').then(m => m.ProfileComponent),
      },
      {
        path: 'security',
        data: { title: 'Segurança' },
        loadComponent: () =>
          import('./security/security.component').then(m => m.SecurityComponent),
      },
      {
        path: 'theme',
        data: { title: 'Tema' },
        loadComponent: () =>
          import('./theme/theme.component').then(m => m.ThemeSettingsComponent),
      },
      {
        path: 'users',
        canActivate: [permissionGuard('USER_READ')],
        data: { title: 'Usuários' },
        loadComponent: () =>
          import('./users/users.component').then(m => m.UsersComponent),
      },
      {
        path: 'roles',
        canActivate: [permissionGuard('ROLE_READ')],
        data: { title: 'Roles' },
        loadComponent: () =>
          import('./roles/roles.component').then(m => m.RolesComponent),
      },
      {
        path: 'permissions',
        canActivate: [permissionGuard('PERMISSION_READ')],
        data: { title: 'Permissões' },
        loadComponent: () =>
          import('./permissions/permissions.component').then(m => m.PermissionsComponent),
      },
      { path: '**', redirectTo: 'profile' },
    ],
  },
];
