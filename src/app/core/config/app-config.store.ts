import { Injectable, computed, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AppConfigStore {
  private readonly _config = signal<Record<string, string>>({});

  readonly config = this._config.asReadonly();

  readonly googleEnabled = computed(() => this._config()['auth.google.enabled'] !== 'false');
  readonly googleRegisterEnabled = computed(
    () => this._config()['auth.google.register.enabled'] !== 'false',
  );
  readonly registrationEnabled = computed(
    () => this._config()['auth.registration.enabled'] !== 'false',
  );
  readonly forgotPasswordEnabled = computed(
    () => this._config()['auth.forgot-password.enabled'] !== 'false',
  );

  setConfig(config: Record<string, string>): void {
    this._config.set(config);
  }

  updateKey(key: string, value: string): void {
    this._config.update((current) => ({ ...current, [key]: value }));
  }
}
