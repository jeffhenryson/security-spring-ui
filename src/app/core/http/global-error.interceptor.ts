import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as Sentry from '@sentry/angular';
import { catchError, throwError } from 'rxjs';

export const globalErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const snackBar = inject(MatSnackBar);
  const router = inject(Router);
  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        if (err.status === 403) {
          // GET 403 = acesso à página/recurso negado → redireciona para access-denied.
          // Exceção: endpoints DEV (/system/config, /system/info, /auth/dev/*) têm guards próprios
          // que controlam o acesso — redirecionar aqui causaria loop ou UX quebrada.
          const isDevEndpoint =
            req.url.includes('/system/config') ||
            req.url.includes('/system/info') ||
            req.url.includes('/actuator/');
          if (req.method === 'GET' && !isDevEndpoint) {
            router.navigate(['/app/access-denied']);
          } else if (!isDevEndpoint) {
            snackBar.open('Sem permissão para realizar esta ação.', 'Fechar', { duration: 4000 });
          }
        } else if (err.status === 404) {
          snackBar.open('Recurso não encontrado.', 'Fechar', { duration: 4000 });
        } else if (err.status >= 500) {
          snackBar.open('Erro no servidor. Tente novamente em alguns instantes.', 'OK', {
            duration: 5000,
          });
          Sentry.captureException(err);
        }
      }
      return throwError(() => err);
    }),
  );
};
