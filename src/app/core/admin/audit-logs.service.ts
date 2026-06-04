import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { AuditLogResponse } from '../../api/models/audit-log-response';
import { PagedResponse } from './paged-state';
import { AUDIT_DEV_ONLY_EVENTS } from '../../shared/audit-log.constants';

export type { AuditLogResponse };

export interface AuditLogFilters {
  action?: string;
  userId?: string;
  excludeDevEvents?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuditLogsService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  list(page: number, size: number, filters?: AuditLogFilters): Promise<PagedResponse<AuditLogResponse>> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (filters?.action) params['action'] = filters.action;
    if (filters?.userId) params['userId'] = filters.userId;

    const excludeDev = filters?.excludeDevEvents ?? false;
    return firstValueFrom(
      this.http.get<PagedResponse<AuditLogResponse>>(`${this.config.rootUrl}/audit-logs`, { params }).pipe(
        map(res => excludeDev
          ? { ...res, content: res.content.filter(l => !AUDIT_DEV_ONLY_EVENTS.has(l.action)) }
          : res,
        ),
      ),
    );
  }
}
