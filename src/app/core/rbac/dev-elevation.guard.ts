import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlSegment } from '@angular/router';
import { AuthStore } from '../auth/auth.store';

// Garante que o token DEV está ativo antes de acessar rotas da área DEV.
// Deve ser combinado com permissionGuard: [permissionGuard(PERM), devElevationGuard()].
export const devElevationGuard: CanMatchFn = (_route, segments: UrlSegment[]) => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (store.isDevElevated()) return true;
  const returnUrl = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(['/app/settings'], {
    queryParams: { devRequired: 'true', returnUrl },
  });
};
