export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Envolve valor em aspas duplas e escapa aspas internas e quebras de linha. */
export function csvEscape(v: string | null | undefined): string {
  return `"${(v ?? '').replace(/"/g, '""').replace(/[\r\n]+/g, ' ')}"`;
}
