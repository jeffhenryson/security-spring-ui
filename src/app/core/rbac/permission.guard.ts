import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router } from '@angular/router';
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

// canMatch: o bundle da rota só é baixado se o guard passar,
// reduzindo o download de código para usuários sem a permissão.
export const permissionGuard =
  (permission: string): CanMatchFn =>
  () => {
    const store = inject(AuthStore);
    const router = inject(Router);
    if (!store.isAuthenticated()) return router.createUrlTree(['/auth/login']);
    if (store.hasPermission(permission)) return true;
    return router.createUrlTree(['/app/access-denied']);
  };
