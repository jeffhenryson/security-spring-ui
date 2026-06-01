import { ApplicationConfig, APP_INITIALIZER, ErrorHandler, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, TitleStrategy, withPreloading } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';
import { createErrorHandler } from '@sentry/angular';
import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { devAuthInterceptor } from './core/http/dev-auth.interceptor';
import { globalErrorInterceptor } from './core/http/global-error.interceptor';
import { AuthService } from './core/auth/auth.service';
import { ThemeService } from './core/theme/theme.service';
import { AppTitleStrategy } from './core/routing/title.strategy';
import { PermissionPreloadStrategy } from './core/routing/permission-preload.strategy';
import { provideApiConfiguration } from './api/api-configuration';
import { environment } from '../environments/environment';

function initSession(authService: AuthService) {
  return () => authService.initSession();
}

function initTheme(themeService: ThemeService) {
  return () => themeService.setTheme(themeService.theme());
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideApiConfiguration(environment.apiUrl),
    provideRouter(routes, withPreloading(PermissionPreloadStrategy)),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    provideAnimationsAsync(),
    provideHttpClient(
      withInterceptors([devAuthInterceptor, authInterceptor, globalErrorInterceptor]),
      withXsrfConfiguration({ cookieName: 'XSRF-TOKEN', headerName: 'X-XSRF-TOKEN' }),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: initSession,
      deps: [AuthService],
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true,
    },
    // A8 — Snackbars de erro devem ser anunciados imediatamente por leitores de tela.
    // 'assertive' garante isso; o padrão Angular é 'polite'.
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 4000, politeness: 'assertive' } },
    // AI6 — Override do ErrorHandler padrão pelo do Sentry (erros Angular não-HTTP).
    // Só ativo quando sentryDsn está configurado (Sentry.init() foi chamado em main.ts).
    ...(environment.sentryDsn ? [{ provide: ErrorHandler, useValue: createErrorHandler() }] : []),
  ],
};
