import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from './auth.store';
import { environment } from '../../../environments/environment';
import {
  LoginRequest, LoginResponse, TokenPairResponse, TotpVerifyRequest,
  CurrentUser, isTwoFactorChallenge
} from './models/auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly api = environment.apiUrl;

  async login(req: LoginRequest): Promise<LoginResponse> {
    const res = await firstValueFrom(
      this.http.post<LoginResponse>(`${this.api}/auth/login`, req)
    );
    if (!isTwoFactorChallenge(res)) {
      await this.handleTokenPair(res);
    }
    return res;
  }

  async verify2FA(req: TotpVerifyRequest): Promise<void> {
    const pair = await firstValueFrom(
      this.http.post<TokenPairResponse>(`${this.api}/auth/2fa/verify`, req)
    );
    await this.handleTokenPair(pair);
  }

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem('ss_refresh_token');
    try {
      if (refreshToken) {
        await firstValueFrom(
          this.http.post(`${this.api}/auth/logout`, { refreshToken })
        );
      }
    } finally {
      this.store.clear();
      this.router.navigate(['/auth/login']);
    }
  }

  async initSession(): Promise<void> {
    const refreshToken = localStorage.getItem('ss_refresh_token');
    if (!refreshToken) return;
    try {
      const pair = await firstValueFrom(
        this.http.post<TokenPairResponse>(`${this.api}/auth/refresh`, { refreshToken })
      );
      await this.handleTokenPair(pair);
    } catch {
      this.store.clear();
    }
  }

  async handleTokenPair(pair: TokenPairResponse): Promise<void> {
    this.store.setAccessToken(pair.accessToken);
    localStorage.setItem('ss_refresh_token', pair.refreshToken);
    await this.loadCurrentUser();
  }

  async loadCurrentUser(): Promise<void> {
    const user = await firstValueFrom(
      this.http.get<CurrentUser>(`${this.api}/users/me`)
    );
    this.store.setCurrentUser(user);
  }
}
