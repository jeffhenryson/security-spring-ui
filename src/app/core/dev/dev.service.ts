import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';

export interface DevFirstCodeResponse {
  devToken: string;
  expiresIn: number;        // backend envia "expiresIn" (não "expiresInSeconds")
}

export interface DevTokenResponse {
  accessToken: string;      // backend envia "accessToken" (não "devAccessToken")
  expiresIn: number;
}

export interface HealthStatus {
  status: 'UP' | 'DOWN' | 'OUT_OF_SERVICE' | string;
  components?: Record<string, { status: string; details?: Record<string, unknown> }>;
}

@Injectable({ providedIn: 'root' })
export class DevService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  firstCode(totpCode: string): Promise<DevFirstCodeResponse> {
    return firstValueFrom(
      this.http.post<DevFirstCodeResponse>(`${this.config.rootUrl}/auth/dev/first-code`, { totpCode }),
    );
  }

  complete(devToken: string, totpCode: string): Promise<DevTokenResponse> {
    return firstValueFrom(
      this.http.post<DevTokenResponse>(`${this.config.rootUrl}/auth/dev/complete`, { devToken, totpCode }),
    );
  }

  health(): Promise<HealthStatus> {
    return firstValueFrom(
      this.http.get<HealthStatus>(`${this.config.rootUrl}/actuator/health`),
    );
  }
}
