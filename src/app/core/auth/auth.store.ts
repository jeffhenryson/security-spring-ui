import { Injectable, signal, computed } from '@angular/core';
import { CurrentUser } from './models/auth.models';
import { REFRESH_TOKEN_KEY, SESSION_MARKER_KEY } from './auth.constants';
import { AVATAR_KEY_PREFIX } from './avatar.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<CurrentUser | null>(null);

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();

  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly permissions = computed(() => this._currentUser()?.permissions ?? []);
  readonly roles = computed(() => this._currentUser()?.roles ?? []);
  readonly hasPendingEmail = computed(() => !!this._currentUser()?.pendingEmail);
  readonly isEmailVerified = computed(() => this._currentUser()?.emailVerified ?? false);
  readonly userInitials = computed(() => {
    const name = this._currentUser()?.username;
    return name ? name.slice(0, 2).toUpperCase() : '?';
  });

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

  clear(): void {
    const userId = this._currentUser()?.id;
    if (userId) localStorage.removeItem(`${AVATAR_KEY_PREFIX}${userId}`);
    this._accessToken.set(null);
    this._currentUser.set(null);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_MARKER_KEY);
  }
}
