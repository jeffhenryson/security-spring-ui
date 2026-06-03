import { Injectable, effect, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AuthStore } from './auth.store';

export const AVATAR_KEY_PREFIX = 'ss_avatar_';

@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly store = inject(AuthStore);
  private readonly http = inject(HttpClient);

  private readonly _avatarDataUrl = signal<string | null>(null);
  readonly currentAvatar = this._avatarDataUrl.asReadonly();

  constructor() {
    effect(() => {
      const user = this.store.currentUser();
      if (!user) {
        this._avatarDataUrl.set(null);
        return;
      }
      const key = `${AVATAR_KEY_PREFIX}${user.id}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        this._avatarDataUrl.set(cached);
      } else if (user.avatarUrl) {
        void this.fetchAndCache(user.avatarUrl, key);
      }
    });
  }

  private async fetchAndCache(url: string, key: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      await new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          localStorage.setItem(key, dataUrl);
          this._avatarDataUrl.set(dataUrl);
          resolve();
        };
        reader.onerror = () => resolve();
        reader.readAsDataURL(blob);
      });
    } catch {
      // Silent fail — shows initials instead
    }
  }

  setLocalAvatar(dataUrl: string): void {
    const userId = this.store.currentUser()?.id;
    if (!userId) return;
    localStorage.setItem(`${AVATAR_KEY_PREFIX}${userId}`, dataUrl);
    this._avatarDataUrl.set(dataUrl);
  }

  clearLocalAvatar(): void {
    const userId = this.store.currentUser()?.id;
    if (!userId) return;
    localStorage.removeItem(`${AVATAR_KEY_PREFIX}${userId}`);
    this._avatarDataUrl.set(null);
  }
}
