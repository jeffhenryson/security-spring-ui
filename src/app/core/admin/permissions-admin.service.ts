import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Permission { id: number; name: string; }
export interface Page<T> { content: T[]; totalElements: number; }

@Injectable({ providedIn: 'root' })
export class PermissionsAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(page: number, size: number): Promise<Page<Permission>> {
    return firstValueFrom(
      this.http.get<Page<Permission>>(`${this.api}/permissions?page=${page}&size=${size}`)
    );
  }

  listAll(): Promise<Permission[]> {
    return firstValueFrom(
      this.http.get<Page<Permission>>(`${this.api}/permissions?page=0&size=1000`)
    ).then(r => r.content);
  }

  create(name: string): Promise<Permission> {
    return firstValueFrom(this.http.post<Permission>(`${this.api}/permissions`, { name }));
  }

  remove(name: string): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/permissions/${name}`));
  }
}
