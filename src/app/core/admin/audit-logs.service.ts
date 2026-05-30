import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { AuditLogResponse } from '../../api/models/audit-log-response';
import { PagedResponse } from './paged-state';

export type { AuditLogResponse };

export interface AuditLogFilters {
  action?: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  list(page: number, size: number, filters?: AuditLogFilters): Promise<PagedResponse<AuditLogResponse>> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (filters?.action) params['action'] = filters.action;
    if (filters?.userId) params['userId'] = filters.userId;
    return firstValueFrom(
      this.http.get<PagedResponse<AuditLogResponse>>(`${this.config.rootUrl}/audit-logs`, { params }),
    );
  }
}
