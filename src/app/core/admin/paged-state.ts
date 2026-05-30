import { signal } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
}

export class PagedState<T> {
  readonly rows = signal<T[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(true);

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
  }

  apply(res: PagedResponse<T>): void {
    this.rows.set(res.content);
    this.total.set(res.totalElements);
  }
}
