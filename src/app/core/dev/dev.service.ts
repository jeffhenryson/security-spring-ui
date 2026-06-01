import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';

export interface DevFirstCodeResponse {
  devToken: string;
  expiresInSeconds: number;
}

export interface DevTokenResponse {
  devAccessToken: string;
  expiresIn: number;
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
}
