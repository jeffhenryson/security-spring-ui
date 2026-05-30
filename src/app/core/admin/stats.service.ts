import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { StatsResponse } from '../../api/models/stats-response';

export type { StatsResponse };

@Injectable({ providedIn: 'root' })
export class StatsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  get(): Promise<StatsResponse> {
    return firstValueFrom(this.http.get<StatsResponse>(`${this.config.rootUrl}/stats`));
  }
}
