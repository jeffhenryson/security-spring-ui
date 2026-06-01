import { Injectable, inject } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of } from 'rxjs';
import { AuthStore } from '../auth/auth.store';

// Pré-carrega apenas rotas cujo canMatch permissionGuard o usuário atual satisfaz.
// Rotas sem `data.preloadPermission` são pré-carregadas normalmente (landing, auth, dashboard).
// Isso evita que bundles admin sejam baixados por usuários sem a permissão correspondente.
@Injectable({ providedIn: 'root' })
export class PermissionPreloadStrategy implements PreloadingStrategy {
  private readonly store = inject(AuthStore);

  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    const permission = route.data?.['preloadPermission'] as string | undefined;
    if (!permission) return load();
    return this.store.hasPermission(permission) ? load() : of(null);
  }
}
