import { Injectable, signal, computed, effect } from '@angular/core';

export type Theme = 'dark' | 'light' | 'system';

const STORAGE_KEY = 'ss_theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<Theme>(this.loadSavedTheme());
  private readonly _osPrefersDark = signal(
    window.matchMedia('(prefers-color-scheme: dark)').matches,
  );

  readonly theme = this._theme.asReadonly();

  readonly resolvedTheme = computed<'dark' | 'light'>(() => {
    const t = this._theme();
    if (t === 'system') return this._osPrefersDark() ? 'dark' : 'light';
    return t;
  });

  constructor() {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e) => this._osPrefersDark.set(e.matches));

    effect(() => {
      this.applyTheme(this.resolvedTheme());
    });
  }

  setTheme(theme: Theme): void {
    localStorage.setItem(STORAGE_KEY, theme);
    this._theme.set(theme);
  }

  private loadSavedTheme(): Theme {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return saved ?? 'dark';
  }

  private applyTheme(resolved: 'dark' | 'light'): void {
    const html = document.documentElement;
    if (resolved === 'light') {
      html.classList.add('theme-light');
      html.classList.remove('theme-dark');
    } else {
      html.classList.add('theme-dark');
      html.classList.remove('theme-light');
    }
  }
}
