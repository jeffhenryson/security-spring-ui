import { Injectable, signal, computed } from '@angular/core';
import { CurrentUser } from './models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<CurrentUser | null>(null);
  private readonly _loading = signal(false);

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly loading = this._loading.asReadonly();

  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly permissions = computed(() => this._currentUser()?.permissions ?? []);
  readonly roles = computed(() => this._currentUser()?.roles ?? []);
  readonly hasPendingEmail = computed(() => !!this._currentUser()?.pendingEmail);
  readonly isEmailVerified = computed(() => this._currentUser()?.emailVerified ?? false);

  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  setAccessToken(token: string | null): void {
    this._accessToken.set(token);
  }

  setCurrentUser(user: CurrentUser | null): void {
    this._currentUser.set(user);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  clear(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    localStorage.removeItem('ss_refresh_token');
  }
}
