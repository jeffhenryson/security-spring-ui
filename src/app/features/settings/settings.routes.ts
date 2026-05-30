import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/rbac/permission.guard';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

export const settingsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./settings-shell/settings-shell.component').then((m) => m.SettingsShellComponent),
    children: [
      { path: '', redirectTo: 'profile', pathMatch: 'full' },
      {
        path: 'profile',
        data: { title: 'Perfil' },
        loadComponent: () => import('./profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'security',
        data: { title: 'Segurança' },
        loadComponent: () =>
          import('./security/security.component').then((m) => m.SecurityComponent),
      },
      {
        path: 'theme',
        data: { title: 'Tema' },
        loadComponent: () =>
          import('./theme/theme.component').then((m) => m.ThemeSettingsComponent),
      },
      {
        path: 'users',
        canMatch: [permissionGuard(PERMISSIONS.USER_READ)],
        data: { title: 'Usuários' },
        loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'roles',
        canMatch: [permissionGuard(PERMISSIONS.ROLE_READ)],
        data: { title: 'Roles' },
        loadComponent: () => import('./roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'permissions',
        canMatch: [permissionGuard(PERMISSIONS.PERMISSION_READ)],
        data: { title: 'Permissões' },
        loadComponent: () =>
          import('./permissions/permissions.component').then((m) => m.PermissionsComponent),
      },
      {
        path: 'audit-logs',
        canMatch: [permissionGuard(PERMISSIONS.AUDIT_READ)],
        data: { title: 'Logs de auditoria' },
        loadComponent: () =>
          import('./audit-logs/audit-logs.component').then((m) => m.AuditLogsComponent),
      },
      { path: '**', redirectTo: 'profile' },
    ],
  },
];
