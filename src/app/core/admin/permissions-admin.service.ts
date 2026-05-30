import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { PermissionResponse } from '../../api/models/permission-response';
import { PagedResponse } from './paged-state';
import { ListAllLoader } from './list-all-loader';

export type { PermissionResponse };

@Injectable({ providedIn: 'root' })
export class PermissionsAdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);
  private readonly allLoader: ListAllLoader<PermissionResponse>;

  constructor() {
    this.allLoader = new ListAllLoader(this.http, `${this.config.rootUrl}/permissions`);
  }

  list(page: number, size: number, search?: string): Promise<PagedResponse<PermissionResponse>> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (search) params['search'] = search;
    return firstValueFrom(
      this.http.get<PagedResponse<PermissionResponse>>(`${this.config.rootUrl}/permissions`, { params }),
    );
  }

  listAll(): Promise<PermissionResponse[]> {
    return this.allLoader.load();
  }

  invalidateCache(): void {
    this.allLoader.invalidate();
  }

  create(name: string): Promise<PermissionResponse> {
    this.invalidateCache();
    return firstValueFrom(
      this.http.post<PermissionResponse>(`${this.config.rootUrl}/permissions`, { name }),
    );
  }

  remove(name: string): Promise<void> {
    this.invalidateCache();
    return firstValueFrom(this.http.delete<void>(`${this.config.rootUrl}/permissions/${name}`));
  }
}
