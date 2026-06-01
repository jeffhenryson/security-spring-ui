import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService, Theme } from '../../core/theme/theme.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <header
      class="flex items-center h-14 px-4 border-b shrink-0"
      style="background:var(--bg-primary);border-color:var(--border-color)"
    >
      <h1 class="flex-1 text-base font-semibold m-0" style="color:var(--text-primary)">
        {{ pageTitle() }}
      </h1>

      <!-- Theme toggle — cycles dark → light → system → dark -->
      <button
        mat-icon-button
        type="button"
        (click)="toggleTheme()"
        [matTooltip]="themeTooltip()"
        [attr.aria-label]="themeTooltip()"
        class="topbar-action-btn"
        style="color:var(--active-color)"
      >
        @switch (currentTheme()) {
          @case ('dark') {
            <!-- Moon -->
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z"/>
            </svg>
          }
          @case ('light') {
            <!-- Sun -->
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 7a5 5 0 1 0 0 10A5 5 0 0 0 12 7zm0-5a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1zm0 17a1 1 0 0 1 1 1v1a1 1 0 0 1-2 0v-1a1 1 0 0 1 1-1zM4.22 4.22a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41zm13.44 13.44a1 1 0 0 1 1.41 0l.71.71a1 1 0 0 1-1.41 1.41l-.71-.71a1 1 0 0 1 0-1.41zM3 11a1 1 0 0 1 0 2H2a1 1 0 0 1 0-2h1zm19 0a1 1 0 0 1 0 2h-1a1 1 0 0 1 0-2h1zM5.64 17.66a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0zm13.44-13.44a1 1 0 0 1 0 1.41l-.71.71a1 1 0 0 1-1.41-1.41l.71-.71a1 1 0 0 1 1.41 0z"/>
            </svg>
          }
          @default {
            <!-- System / Monitor -->
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20 3H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h6l-2 3h8l-2-3h6a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 13H4V5h16v11z"/>
            </svg>
          }
        }
      </button>

      <!-- Logout button -->
      <button
        mat-icon-button
        type="button"
        (click)="logout()"
        [disabled]="loggingOut()"
        matTooltip="Sair"
        [attr.aria-label]="loggingOut() ? 'Saindo...' : 'Sair'"
        class="topbar-action-btn"
        style="color:var(--text-primary)"
      >
        @if (loggingOut()) {
          <mat-spinner diameter="18" />
        } @else {
          <!-- Logout arrow -->
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8v-2H4V5z"/>
          </svg>
        }
      </button>
    </header>
  `,
  styles: [`
    .topbar-action-btn:hover {
      background: var(--surface-hover) !important;
    }
  `],
})
export class TopbarComponent {
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);

  readonly pageTitle = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;
        return (route.snapshot.data['title'] as string | undefined) ?? 'SecuritySpring';
      }),
    ),
    { initialValue: '' },
  );

  readonly isDark = computed(() => this.themeService.resolvedTheme() === 'dark');
  readonly loggingOut = signal(false);
  readonly currentTheme = computed(() => this.themeService.theme());

  private readonly THEME_CYCLE: Record<Theme, Theme> = { dark: 'light', light: 'system', system: 'dark' };
  private readonly THEME_ICONS: Record<Theme, string> = { dark: 'dark_mode', light: 'light_mode', system: 'settings_brightness' };
  private readonly THEME_LABELS: Record<Theme, string> = {
    dark: 'Tema escuro — clique para claro',
    light: 'Tema claro — clique para sistema',
    system: 'Tema do sistema — clique para escuro',
  };

  readonly themeIcon = computed(() => this.THEME_ICONS[this.themeService.theme()]);
  readonly themeTooltip = computed(() => this.THEME_LABELS[this.themeService.theme()]);

  toggleTheme(): void {
    this.themeService.setTheme(this.THEME_CYCLE[this.themeService.theme()]);
  }

  async logout(): Promise<void> {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      await this.authService.logout();
    } finally {
      this.loggingOut.set(false);
    }
  }
}
