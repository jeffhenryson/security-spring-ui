import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';

// Quando o token DEV está ativo, substitui o Bearer token normal pelo devAccessToken
// em todas as chamadas à API. O devAccessToken contém as mesmas claims do token normal
// mais o claim dev_elevated: true, necessário para endpoints da área DEV.
export const devAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const devToken = store.isDevElevated() ? store.devAccessToken() : null;
  if (!devToken) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${devToken}` } }));
};
