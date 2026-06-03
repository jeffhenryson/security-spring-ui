import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { SessionInfo } from '../../api/models/session-info';
import { TotpSetupResponse } from '../../api/models/totp-setup-response';
import { TotpConfirmResponse } from '../../api/models/totp-confirm-response';
import { TotpDisableRequest } from '../../api/models/totp-disable-request';

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  loadSessions(): Promise<SessionInfo[]> {
    return firstValueFrom(this.http.get<SessionInfo[]>(`${this.config.rootUrl}/auth/sessions`));
  }

  terminateAllSessions(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.rootUrl}/auth/sessions`));
  }

  terminateSession(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.rootUrl}/auth/sessions/${id}`));
  }

  loadTotpStatus(): Promise<{ enabled: boolean; backupCodesRemaining: number }> {
    return firstValueFrom(
      this.http.get<{ enabled: boolean; backupCodesRemaining: number }>(`${this.config.rootUrl}/auth/2fa/status`),
    );
  }

  startTotpSetup(): Promise<TotpSetupResponse> {
    return firstValueFrom(this.http.post<TotpSetupResponse>(`${this.config.rootUrl}/auth/2fa/setup`, {}));
  }

  confirmTotpSetup(code: string): Promise<TotpConfirmResponse> {
    return firstValueFrom(
      this.http.post<TotpConfirmResponse>(`${this.config.rootUrl}/auth/2fa/confirm`, { code }),
    );
  }

  disableTotp(data: TotpDisableRequest): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.rootUrl}/auth/2fa`, { body: data }));
  }

  regenerateBackupCodes(currentPassword: string): Promise<TotpConfirmResponse> {
    return firstValueFrom(
      this.http.post<TotpConfirmResponse>(`${this.config.rootUrl}/auth/2fa/backup-codes/regenerate`, { currentPassword }),
    );
  }

  replaceTotp(currentTotpCode: string): Promise<TotpSetupResponse> {
    return firstValueFrom(
      this.http.post<TotpSetupResponse>(`${this.config.rootUrl}/auth/2fa/replace`, { currentTotpCode }),
    );
  }
}
