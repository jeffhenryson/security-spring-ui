import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Role { name: string; permissions: string[]; }
export interface Page<T> { content: T[]; totalElements: number; }

@Injectable({ providedIn: 'root' })
export class RolesAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(page: number, size: number): Promise<Page<Role>> {
    return firstValueFrom(
      this.http.get<Page<Role>>(`${this.api}/roles?page=${page}&size=${size}`)
    );
  }

  listAll(): Promise<Role[]> {
    return firstValueFrom(
      this.http.get<Page<Role>>(`${this.api}/roles?page=0&size=1000`)
    ).then(r => r.content);
  }

  create(name: string): Promise<Role> {
    return firstValueFrom(this.http.post<Role>(`${this.api}/roles`, { name }));
  }

  remove(name: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/roles/${name}`));
  }

  addPermission(roleName: string, permName: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.api}/roles/${roleName}/permissions/${permName}`, {})
    );
  }

  removePermission(roleName: string, permName: string): Promise<void> {
    return firstValueFrom(
      this.http.delete<void>(`${this.api}/roles/${roleName}/permissions/${permName}`)
    );
  }
}
