import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { UserUpdateRequest } from '../../api/models/user-update-request';
import { ChangePasswordRequest } from '../../api/models/change-password-request';

export type { UserUpdateRequest, ChangePasswordRequest };

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);

  updateProfile(data: UserUpdateRequest): Promise<void> {
    return firstValueFrom(this.http.patch<void>(`${this.config.rootUrl}/users/me`, data));
  }

  changePassword(data: ChangePasswordRequest): Promise<void> {
    return firstValueFrom(this.http.put<void>(`${this.config.rootUrl}/users/me/password`, data));
  }

  uploadAvatar(file: Blob): Promise<void> {
    const form = new FormData();
    form.append('file', file, 'avatar.jpg');
    return firstValueFrom(this.http.post<void>(`${this.config.rootUrl}/users/me/avatar`, form));
  }

  deleteAvatar(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.config.rootUrl}/users/me/avatar`));
  }
}
