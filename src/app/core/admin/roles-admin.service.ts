import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { RoleResponse } from '../../api/models/role-response';
import { PagedResponse } from './paged-state';
import { ListAllLoader } from './list-all-loader';

export type { RoleResponse };

@Injectable({ providedIn: 'root' })
export class RolesAdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);
  private readonly allLoader: ListAllLoader<RoleResponse>;

  constructor() {
    this.allLoader = new ListAllLoader(this.http, `${this.config.rootUrl}/roles`);
  }

  list(page: number, size: number, search = ''): Promise<PagedResponse<RoleResponse>> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (search) params['search'] = search;
    return firstValueFrom(
      this.http.get<PagedResponse<RoleResponse>>(`${this.config.rootUrl}/roles`, { params }),
    );
  }

  listAll(): Promise<RoleResponse[]> {
    return this.allLoader.load();
  }

  invalidateCache(): void {
    this.allLoader.invalidate();
  }

  create(name: string): Promise<RoleResponse> {
    this.invalidateCache();
    return firstValueFrom(
      this.http.post<RoleResponse>(`${this.config.rootUrl}/roles`, { name }),
    );
  }

  remove(name: string): Promise<void> {
    this.invalidateCache();
    return firstValueFrom(this.http.delete<void>(`${this.config.rootUrl}/roles/${name}`));
  }

  addPermission(roleName: string, permName: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(
        `${this.config.rootUrl}/roles/${roleName}/permissions/${permName}`,
        {},
      ),
    );
  }

  removePermission(roleName: string, permName: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(
        `${this.config.rootUrl}/roles/${roleName}/permissions/${permName}`,
      ),
    );
  }
}
