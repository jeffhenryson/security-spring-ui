import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthStore } from './auth.store';

export const AVATAR_KEY_PREFIX = 'ss_avatar_';

@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly store = inject(AuthStore);
  private readonly _tick = signal(0);

  // Prefere avatarUrl do backend; fallback para localStorage (cache local).
  readonly currentAvatar = computed(() => {
    this._tick();
    const user = this.store.currentUser();
    if (!user) return null;
    if (user.avatarUrl) return user.avatarUrl;
    return localStorage.getItem(`${AVATAR_KEY_PREFIX}${user.id}`);
  });

  setLocalAvatar(dataUrl: string): void {
    const userId = this.store.currentUser()?.id;
    if (!userId) return;
    localStorage.setItem(`${AVATAR_KEY_PREFIX}${userId}`, dataUrl);
    this._tick.update((n) => n + 1);
  }

  clearLocalAvatar(): void {
    const userId = this.store.currentUser()?.id;
    if (!userId) return;
    localStorage.removeItem(`${AVATAR_KEY_PREFIX}${userId}`);
    this._tick.update((n) => n + 1);
  }
}
