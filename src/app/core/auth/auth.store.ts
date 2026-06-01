import { Injectable, signal, computed } from '@angular/core';
import { CurrentUser } from './models/auth.models';
import { REFRESH_TOKEN_KEY, SESSION_MARKER_KEY } from './auth.constants';
import { AVATAR_KEY_PREFIX } from './avatar.service';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<CurrentUser | null>(null);
  private readonly _devAccessToken = signal<string | null>(null);
  private readonly _devTokenExpiresAt = signal<number>(0);

  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly devAccessToken = this._devAccessToken.asReadonly();
  readonly devTokenExpiresAt = this._devTokenExpiresAt.asReadonly();

  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly permissions = computed(() => this._currentUser()?.permissions ?? []);
  readonly roles = computed(() => this._currentUser()?.roles ?? []);
  readonly hasPendingEmail = computed(() => !!this._currentUser()?.pendingEmail);
  readonly isEmailVerified = computed(() => this._currentUser()?.emailVerified ?? false);
  readonly userInitials = computed(() => {
    const name = this._currentUser()?.username;
    return name ? name.slice(0, 2).toUpperCase() : '?';
  });

  readonly isDevElevated = computed(
    () => !!this._devAccessToken() && Date.now() < this._devTokenExpiresAt(),
  );

  readonly devSecondsLeft = computed(() =>
    Math.max(0, Math.ceil((this._devTokenExpiresAt() - Date.now()) / 1000)),
  );

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

  setDevToken(token: string, expiresIn: number): void {
    this._devAccessToken.set(token);
    this._devTokenExpiresAt.set(Date.now() + expiresIn * 1000);
  }

  clearDevToken(): void {
    this._devAccessToken.set(null);
    this._devTokenExpiresAt.set(0);
  }

  clear(): void {
    const userId = this._currentUser()?.id;
    if (userId) localStorage.removeItem(`${AVATAR_KEY_PREFIX}${userId}`);
    this._accessToken.set(null);
    this._currentUser.set(null);
    this._devAccessToken.set(null);
    this._devTokenExpiresAt.set(0);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(SESSION_MARKER_KEY);
  }
}
