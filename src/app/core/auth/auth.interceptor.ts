import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, from } from 'rxjs';
import { AuthStore } from './auth.store';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = store.accessToken();
  const authReq = token
    ? req.clone({
        setHeaders: { Authorization: `Bearer ${token}` },
      })
    : req;

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/')) {
        return from(authService.initSession()).pipe(
          switchMap(() => {
            const newToken = store.accessToken();
            if (!newToken) {
              router.navigate(['/auth/login']);
              return throwError(() => err);
            }
            return next(
              req.clone({
                setHeaders: { Authorization: `Bearer ${newToken}` },
              }),
            );
          }),
          catchError(() => {
            store.clear();
            router.navigate(['/auth/login']);
            return throwError(() => err);
          }),
        );
      }
      return throwError(() => err);
    }),
  );
};
