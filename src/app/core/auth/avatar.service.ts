import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthStore } from './auth.store';

export const AVATAR_KEY_PREFIX = 'ss_avatar_';

@Injectable({ providedIn: 'root' })
export class AvatarService {
  private readonly store = inject(AuthStore);
  private readonly _tick = signal(0);

  readonly currentAvatar = computed(() => {
    this._tick();
    const userId = this.store.currentUser()?.id;
    if (!userId) return null;
    return localStorage.getItem(`${AVATAR_KEY_PREFIX}${userId}`);
  });

  setAvatar(dataUrl: string): void {
    const userId = this.store.currentUser()?.id;
    if (!userId) return;
    localStorage.setItem(`${AVATAR_KEY_PREFIX}${userId}`, dataUrl);
    this._tick.update((n) => n + 1);
  }

  removeAvatar(): void {
    const userId = this.store.currentUser()?.id;
    if (!userId) return;
    localStorage.removeItem(`${AVATAR_KEY_PREFIX}${userId}`);
    this._tick.update((n) => n + 1);
  }
}
