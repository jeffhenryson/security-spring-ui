import { Routes } from '@angular/router';
import { alreadyAuthGuard } from '../../core/rbac/permission.guard';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [alreadyAuthGuard],
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '2fa',
    loadComponent: () =>
      import('./two-factor/two-factor.component').then(m => m.TwoFactorComponent),
  },
  {
    path: 'register',
    canActivate: [alreadyAuthGuard],
    loadComponent: () =>
      import('./register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'confirm-email-change',
    loadComponent: () =>
      import('./confirm-email-change/confirm-email-change.component').then(m => m.ConfirmEmailChangeComponent),
  },
  { path: '**', redirectTo: 'login' },
];
