import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from './auth.store';
import { ApiConfiguration } from '../../api/api-configuration';
import {
  LoginRequest,
  LoginResponse,
  TokenPairResponse,
  TotpVerifyRequest,
  CurrentUser,
  isTwoFactorChallenge,
} from './models/auth.models';
import { REFRESH_TOKEN_KEY, SESSION_MARKER_KEY } from './auth.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly config = inject(ApiConfiguration);
  private get api(): string { return this.config.rootUrl; }

  private _refreshing: Promise<void> | null = null;
  private _pendingChallengeToken: string | null = null;

  setPendingChallengeToken(token: string): void {
    this._pendingChallengeToken = token;
  }

  consumePendingChallengeToken(): string | null {
    const token = this._pendingChallengeToken;
    this._pendingChallengeToken = null;
    return token;
  }

  async login(req: LoginRequest): Promise<LoginResponse> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.api}/auth/login`, req, { withCredentials: true }),
    );
    if (!isTwoFactorChallenge(res)) {
      await this.handleTokenPair(res);
    }
    return res;
  }

  async verify2FA(req: TotpVerifyRequest): Promise<void> {
    const pair = await firstValueFrom(
      this.http.post<TokenPairResponse>(`${this.api}/auth/2fa/verify`, req, {
        withCredentials: true,
      }),
    );
    await this.handleTokenPair(pair);
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const hasSession = !!refreshToken || !!localStorage.getItem(SESSION_MARKER_KEY);
    try {
      if (hasSession) {
        await firstValueFrom(
          this.http.post(`${this.api}/auth/logout`, { refreshToken }, { withCredentials: true }),
        );
      }
    } catch {
      // server-side logout failed — still clean up local state below
    } finally {
      this.store.clear();
      this.router.navigate(['/auth/login']);
    }
  }

  // Deduplicates concurrent refresh calls: if a refresh is already in flight,
  // all callers share the same promise instead of issuing parallel requests
  // (which would consume the refresh token and leave subsequent calls with an invalid token).
  initSession(): Promise<void> {
    if (!this._refreshing) {
      this._refreshing = this._doRefresh().finally(() => {
        this._refreshing = null;
      });
    }
    return this._refreshing;
  }

  private async _doRefresh(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const hasSession = !!refreshToken || !!localStorage.getItem(SESSION_MARKER_KEY);
    if (!hasSession) return;
    try {
      const pair = await firstValueFrom(
        this.http.post<TokenPairResponse>(
          `${this.api}/auth/refresh`,
          refreshToken ? { refreshToken } : {},
          { withCredentials: true },
        ),
      );
      await this.handleTokenPair(pair);
    } catch {
      this.store.clear();
    }
  }

  async handleTokenPair(pair: TokenPairResponse): Promise<void> {
    this.store.setAccessToken(pair.accessToken);
    if (pair.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, pair.refreshToken);
    } else {
      // Modo cookie HttpOnly — o token não vem no body; marca que há sessão ativa
      // para que _doRefresh e logout saibam tentar o endpoint mesmo sem token em localStorage.
      localStorage.setItem(SESSION_MARKER_KEY, '1');
    }
    await this.loadCurrentUser();
  }

  async loadCurrentUser(): Promise<void> {
    const [user, totp] = await Promise.all([
      firstValueFrom(this.http.get<CurrentUser>(`${this.api}/users/me`)),
      firstValueFrom(this.http.get<{ enabled: boolean; backupCodesRemaining: number }>(`${this.api}/auth/2fa/status`))
        .catch(() => ({ enabled: false, backupCodesRemaining: 0 })),
    ]);
    this.store.setCurrentUser({
      ...user,
      totpEnabled: totp.enabled,
      backupCodesRemaining: totp.backupCodesRemaining,
    });
  }

  /** Garante que o usuário esteja carregado no store antes de continuar. Usado como route resolver. */
  async ensureLoaded(): Promise<CurrentUser> {
    const current = this.store.currentUser();
    if (current) return current;
    await this.loadCurrentUser();
    return this.store.currentUser()!;
  }

  async register(username: string, email: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.api}/auth/register`, { username, email, password }),
    );
  }

  // Silencioso por segurança — nunca revelar se o email está cadastrado ou não.
  async forgotPassword(email: string): Promise<void> {
    try {
      await firstValueFrom(this.http.post(`${this.api}/auth/forgot-password`, { email }));
    } catch {
      // intentional no-op
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await firstValueFrom(
      this.http.post(`${this.api}/auth/reset-password`, { token, newPassword }),
    );
  }

  async verifyEmail(code: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/auth/verify-email`, { code }));
  }

  async resendVerification(email: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/auth/resend-verification`, { email }));
  }

  async confirmEmailChange(code: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.api}/auth/confirm-email-change`, { code }));
  }
}
