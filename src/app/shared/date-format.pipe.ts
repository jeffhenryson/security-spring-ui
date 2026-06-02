import { Pipe, PipeTransform } from '@angular/core';

/**
 * Formats ISO timestamps for display. Mode 'abs' (default) shows the full
 * date/time; mode 'rel' shows a human-readable relative string ("há 5 min").
 */
@Pipe({ name: 'dateFormat', standalone: true, pure: true })
export class DateFormatPipe implements PipeTransform {
  transform(iso: string | null | undefined, mode: 'abs' | 'rel' = 'abs'): string {
    if (!iso) return '—';
    const date = new Date(iso);
    if (isNaN(date.getTime())) return '—';
    if (mode === 'rel') return this.relative(date);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private relative(date: Date): string {
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.floor(diffMs / 60_000);
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays}d`;
  }
}
