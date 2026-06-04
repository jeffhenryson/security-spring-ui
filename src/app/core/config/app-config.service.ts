import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, catchError, of } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { AppConfigStore } from './app-config.store';

@Injectable({ providedIn: 'root' })
export class AppConfigService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(ApiConfiguration);
  private readonly store = inject(AppConfigStore);

  async loadPublic(): Promise<void> {
    const result = await firstValueFrom(
      this.http
        .get<Record<string, string>>(`${this.config.rootUrl}/system/config/public`)
        .pipe(catchError(() => of({} as Record<string, string>))),
    );
    this.store.setConfig(result);
  }

  // Não silencia erros — o componente precisa saber quando a carga falhou.
  async loadAll(): Promise<void> {
    const result = await firstValueFrom(
      this.http.get<Record<string, string>>(`${this.config.rootUrl}/system/config`),
    );
    this.store.setConfig(result);
  }

  async set(key: string, value: string): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.config.rootUrl}/system/config/${key}`, { value }),
    );
    this.store.updateKey(key, value);
  }
}
