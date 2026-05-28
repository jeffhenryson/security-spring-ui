import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface User {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
}

export interface Page<T> { content: T[]; totalElements: number; }

@Injectable({ providedIn: 'root' })
export class UsersAdminService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  list(page: number, size: number): Promise<Page<User>> {
    return firstValueFrom(
      this.http.get<Page<User>>(`${this.api}/users?page=${page}&size=${size}`)
    );
  }

  create(data: { username: string; email: string; password: string; roles: string[] }): Promise<User> {
    return firstValueFrom(this.http.post<User>(`${this.api}/users`, data));
  }

  update(id: number, data: { username: string; email: string }): Promise<User> {
    return firstValueFrom(this.http.patch<User>(`${this.api}/users/${id}`, data));
  }

  remove(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.api}/users/${id}`));
  }

  enable(id: number): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.api}/users/${id}/enable`, {}));
  }

  disable(id: number): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.api}/users/${id}/disable`, {}));
  }

  assignRole(username: string, roleName: string): Promise<void> {
    return firstValueFrom(
      this.http.post<void>(`${this.api}/users/${username}/roles/${roleName}`, {})
    );
  }
}
