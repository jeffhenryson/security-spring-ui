import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { UserResponse } from '../../api/models/user-response';
import { PagedResponse } from './paged-state';

export type { UserResponse };

export interface UserListFilters {
  search?: string;
  enabled?: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsersAdminService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  list(page: number, size: number, filters: UserListFilters = {}): Promise<PagedResponse<UserResponse>> {
    const params: Record<string, string> = { page: String(page), size: String(size) };
    if (filters.search) params['search'] = filters.search;
    if (filters.enabled !== undefined) params['enabled'] = String(filters.enabled);
    return firstValueFrom(this.http.get<PagedResponse<UserResponse>>(`${this.config.rootUrl}/users`, { params }));
  }

  create(data: {
    username: string;
    email: string;
    password: string;
    roles: string[];
  }): Promise<UserResponse> {
    return firstValueFrom(this.http.post<UserResponse>(`${this.config.rootUrl}/users`, data));
  }

  update(id: number, data: { username: string; email: string }): Promise<UserResponse> {
    return firstValueFrom(this.http.patch<UserResponse>(`${this.config.rootUrl}/users/${id}`, data));
  }

  remove(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.rootUrl}/users/${id}`));
  }

  enable(id: number): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.config.rootUrl}/users/${id}/enable`, {}));
  }

  disable(id: number): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.config.rootUrl}/users/${id}/disable`, {}));
  }

  assignRole(username: string, roleName: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.config.rootUrl}/users/${username}/roles/${roleName}`, {}),
    );
  }

  removeRole(username: string, roleName: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.config.rootUrl}/users/${username}/roles/${roleName}`),
    );
  }
}
