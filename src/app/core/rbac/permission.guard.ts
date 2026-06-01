import { inject } from '@angular/core';
import { CanActivateFn, CanMatchFn, Router, RouterStateSnapshot, UrlSegment } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

export const authGuard: CanActivateFn = (_route, state: RouterStateSnapshot) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (store.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
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
  (_route, segments: UrlSegment[]) => {
    const store = inject(AuthStore);
    const router = inject(Router);
    if (!store.isAuthenticated()) {
      const returnUrl = '/' + segments.map(s => s.path).join('/');
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl } });
    }
    if (store.hasPermission(permission)) return true;
    return router.createUrlTree(['/app/access-denied']);
  };
