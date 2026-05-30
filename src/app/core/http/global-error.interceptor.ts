import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as Sentry from '@sentry/angular';
import { catchError, throwError } from 'rxjs';

export const globalErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status >= 500) {
        snackBar.open('Erro no servidor. Tente novamente em alguns instantes.', 'OK', {
          duration: 5000,
        });
        Sentry.captureException(err);
      }
      return throwError(() => err);
    }),
  );
};
