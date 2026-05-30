import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { PagedResponse } from './paged-state';

const PAGE_SIZE = 100;
const DEFAULT_TTL = 30_000;

/**
 * Encapsula o padrão de carregar todos os itens paginados de um endpoint
 * com cache TTL. Evita duplicação entre serviços admin que precisam de listAll().
 */
export class ListAllLoader<T> {
  private cache: { data: T[]; loadedAt: number } | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly url: string,
    private readonly ttl = DEFAULT_TTL,
  ) {}

  async load(): Promise<T[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.loadedAt < this.ttl) {
      return this.cache.data;
    }
    const first = await firstValueFrom(
      this.http.get<PagedResponse<T>>(this.url, { params: { page: '0', size: String(PAGE_SIZE) } }),
    );
    const items = [...first.content];
    const totalPages = Math.ceil(first.totalElements / PAGE_SIZE);
    if (totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) =>
          firstValueFrom(
            this.http.get<PagedResponse<T>>(this.url, {
              params: { page: String(i + 1), size: String(PAGE_SIZE) },
            }),
          ),
        ),
      );
      rest.forEach((p) => items.push(...p.content));
    }
    this.cache = { data: items, loadedAt: now };
    return items;
  }

  invalidate(): void {
    this.cache = null;
  }
}
