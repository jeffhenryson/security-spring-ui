import { Component, computed, inject, signal } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
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
  imports: [MatIconModule, MatButtonModule, MatTooltipModule, MatProgressSpinnerModule],
  template: `
    <header
      class="flex items-center h-14 px-4 border-b shrink-0"
      style="background:var(--bg-primary);border-color:var(--border-color)"
    >
      <h1 class="flex-1 text-base font-semibold m-0" style="color:var(--text-primary)">
        {{ pageTitle() }}
      </h1>

      <!-- Theme toggle — cycles dark → light → system → dark -->
      <!-- style overrides the MDC token that mat-icon-button uses for icon colour -->
      <button
        mat-icon-button
        type="button"
        (click)="toggleTheme()"
        [matTooltip]="themeTooltip()"
        [attr.aria-label]="themeTooltip()"
        class="topbar-action-btn"
        style="--mdc-icon-button-icon-color:var(--active-color);
               --mat-icon-button-icon-color:var(--active-color);
               color:var(--active-color)"
      >
        <mat-icon>{{ themeIcon() }}</mat-icon>
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
        style="--mdc-icon-button-icon-color:var(--text-primary);
               --mat-icon-button-icon-color:var(--text-primary);
               color:var(--text-primary)"
      >
        @if (loggingOut()) {
          <mat-spinner diameter="18" />
        } @else {
          <mat-icon>logout</mat-icon>
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
