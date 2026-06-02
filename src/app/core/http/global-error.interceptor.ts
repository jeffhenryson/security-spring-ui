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
          // Permissão revogada mid-session: redireciona sem exibir snackbar genérico.
          // O authInterceptor já trata 401 (token expirado), portanto aqui chegam apenas
          // respostas 403 reais (usuário autenticado mas sem permissão para o recurso).
          router.navigate(['/app/access-denied']);
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
