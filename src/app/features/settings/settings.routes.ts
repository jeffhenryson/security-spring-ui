import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/rbac/permission.guard';
import { devElevationGuard } from '../../core/rbac/dev-elevation.guard';
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
        data: { title: 'Usuários', preloadPermission: PERMISSIONS.USER_READ },
        loadComponent: () => import('./users/users.component').then((m) => m.UsersComponent),
      },
      {
        path: 'roles',
        canMatch: [permissionGuard(PERMISSIONS.ROLE_READ)],
        data: { title: 'Roles', preloadPermission: PERMISSIONS.ROLE_READ },
        loadComponent: () => import('./roles/roles.component').then((m) => m.RolesComponent),
      },
      {
        path: 'permissions',
        canMatch: [permissionGuard(PERMISSIONS.DEV_PERMISSION_MANAGE), devElevationGuard],
        data: { title: 'Permissões', preloadPermission: PERMISSIONS.DEV_PERMISSION_MANAGE },
        loadComponent: () =>
          import('./permissions/permissions.component').then((m) => m.PermissionsComponent),
      },
      {
        path: 'audit-logs',
        canMatch: [permissionGuard(PERMISSIONS.AUDIT_READ)],
        data: { title: 'Logs de auditoria', preloadPermission: PERMISSIONS.AUDIT_READ },
        loadComponent: () =>
          import('./audit-logs/audit-logs.component').then((m) => m.AuditLogsComponent),
      },
      // Rotas exclusivas da área DEV — exigem elevação ativa (devElevationGuard)
      {
        path: 'dev-logs',
        canMatch: [permissionGuard(PERMISSIONS.DEV_LOGS_TECHNICAL), devElevationGuard],
        data: { title: 'Logs técnicos', preloadPermission: PERMISSIONS.DEV_LOGS_TECHNICAL },
        loadComponent: () =>
          import('./dev-logs/dev-logs.component').then((m) => m.DevLogsComponent),
      },
      {
        path: 'dev-system',
        canMatch: [permissionGuard(PERMISSIONS.DEV_SYSTEM_CONFIG), devElevationGuard],
        data: { title: 'Sistema', preloadPermission: PERMISSIONS.DEV_SYSTEM_CONFIG },
        loadComponent: () =>
          import('./dev-system/dev-system.component').then((m) => m.DevSystemComponent),
      },
      { path: '**', redirectTo: 'profile' },
    ],
  },
];
