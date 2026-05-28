import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (store.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};

export const alreadyAuthGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (store.isAuthenticated()) return router.createUrlTree(['/app/dashboard']);
  return true;
};

export const permissionGuard = (permission: string): CanActivateFn => () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (!store.isAuthenticated()) return router.createUrlTree(['/auth/login']);
  if (store.hasPermission(permission)) return true;
  return router.createUrlTree(['/app/dashboard']);
};
