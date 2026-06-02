import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import type { TokenPairResponse } from '../../api/models/token-pair-response';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class GoogleAuthService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  get isConfigured(): boolean {
    return !!environment.googleClientId;
  }

  /** Abre o seletor de conta Google e resolve com o credential (ID token) */
  promptForToken(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.isConfigured) {
        reject(new Error('GOOGLE_CLIENT_ID não configurado'));
        return;
      }

      // O tipo global `google` é declarado pelo @types/google.accounts (namespace global).
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (response: google.accounts.id.CredentialResponse) => {
          if (response.credential) {
            resolve(response.credential);
          } else {
            reject(new Error('Nenhuma credencial retornada pelo Google'));
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true,
        ux_mode: 'popup',
      });

      google.accounts.id.prompt((notification: google.accounts.id.PromptMomentNotification) => {
        if (notification.isNotDisplayed()) {
          reject(new Error('popup_not_displayed'));
        } else if (notification.isDismissedMoment()) {
          reject(new Error('popup_dismissed'));
        }
      });
    });
  }

  /** Envia o ID token para o backend e retorna o par de tokens JWT */
  exchangeToken(idToken: string): Promise<TokenPairResponse> {
    return firstValueFrom(
      this.http.post<TokenPairResponse>(
        `${this.config.rootUrl}/auth/oauth2/google`,
        { idToken },
        { withCredentials: true },
      ),
    );
  }
}
