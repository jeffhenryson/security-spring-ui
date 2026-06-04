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
        this._avatarDataUrl.set(null);
        void this.fetchAndCache(user.avatarUrl, key);
      } else {
        this._avatarDataUrl.set(null);
      }
    });
  }

  private async fetchAndCache(url: string, key: string): Promise<void> {
    try {
      const blob = await firstValueFrom(this.http.get(url, { responseType: 'blob' }));
      const dataUrl = await resizeToDataUrl(blob, 200);
      localStorage.setItem(key, dataUrl);
      this._avatarDataUrl.set(dataUrl);
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

function resizeToDataUrl(blob: Blob, size: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const scale = Math.max(size / img.width, size / img.height);
      const sw = size / scale;
      const sh = size / scale;
      ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, size, size);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load')); };
    img.src = url;
  });
}
