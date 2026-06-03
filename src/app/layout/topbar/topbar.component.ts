import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map, startWith, interval } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService, Theme } from '../../core/theme/theme.service';


@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule, MatProgressSpinnerModule, MatIconModule, RouterLink],
  styles: [`
    .hdr-btn {
      width: 36px; height: 36px;
      border: 1px solid transparent;
      cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      border-radius: 50%;
      transition: background 150ms, color 150ms, border-color 150ms;
      padding: 0; flex-shrink: 0;
      background: transparent;
    }
    .hdr-btn:disabled { opacity: 0.4; cursor: default; pointer-events: none; }

    .btn-theme { color: var(--text-secondary); }
    .btn-theme:hover {
      background: var(--surface-color);
      color: var(--text-primary);
      border-color: var(--border-color);
    }
    .btn-logout { color: #dc2626; }
    .btn-logout:hover {
      background: rgba(220, 38, 38, 0.1);
      border-color: rgba(220, 38, 38, 0.3);
    }

    .hdr-icon-svg {
      width: 18px; height: 18px;
      display: block;
      flex-shrink: 0;
    }
  `],
  template: `
    @if (hasPendingEmail()) {
      <div
        class="flex items-center gap-2 px-4 py-1.5 text-xs shrink-0"
        style="background:#78350f;color:#fef3c7;border-bottom:1px solid #92400e"
      >
        <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">mark_email_unread</mat-icon>
        <span>
          Confirmação pendente para <strong>{{ pendingEmail() }}</strong>.
          Verifique sua caixa de entrada.
        </span>
        <a routerLink="/app/settings/profile" class="ml-auto underline" style="color:#fde68a">
          Ver perfil
        </a>
      </div>
    }

    <header
      class="flex items-center h-14 px-4 border-b shrink-0 gap-1"
      style="background:var(--bg-primary);border-color:var(--border-color)"
    >
      <h1 class="flex-1 text-base font-semibold m-0" style="color:var(--text-primary)">
        {{ pageTitle() }}
      </h1>

      @if (isDevElevated()) {
        <div
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border mr-1"
          style="border-color:rgba(34,197,94,.35);background:rgba(34,197,94,.08);color:#4ade80"
          [matTooltip]="'Acesso DEV ativo — ' + devSecondsLeft() + 's restantes'"
        >
          <span class="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shrink-0"></span>
          DEV ⏱ {{ devTimeLabel() }}
        </div>
      }

      <button
        class="hdr-btn btn-theme"
        type="button"
        (click)="toggleTheme()"
        [matTooltip]="themeTooltip()"
        [attr.aria-label]="themeTooltip()"
      >
        @switch (currentTheme()) {
          @case ('dark') {
            <svg class="hdr-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.5373 21.3065 11.4608 21.0672 11.8568C19.9289 13.7406 17.8615 15 15.5 15C11.9101 15 9 12.0899 9 8.5C9 6.13845 10.2594 4.07105 12.1432 2.93276C12.5392 2.69347 12.4627 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"/>
            </svg>
          }
          @case ('light') {
            <svg class="hdr-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6C15.3137 6 18 8.68629 18 12Z"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 1.25C12.4142 1.25 12.75 1.58579 12.75 2V3C12.75 3.41421 12.4142 3.75 12 3.75C11.5858 3.75 11.25 3.41421 11.25 3V2C11.25 1.58579 11.5858 1.25 12 1.25ZM4.39861 4.39861C4.6915 4.10572 5.16638 4.10572 5.45927 4.39861L5.85211 4.79145C6.145 5.08434 6.145 5.55921 5.85211 5.85211C5.55921 6.145 5.08434 6.145 4.79145 5.85211L4.39861 5.45927C4.10572 5.16638 4.10572 4.6915 4.39861 4.39861ZM19.6011 4.39887C19.894 4.69176 19.894 5.16664 19.6011 5.45953L19.2083 5.85237C18.9154 6.14526 18.4405 6.14526 18.1476 5.85237C17.8547 5.55947 17.8547 5.0846 18.1476 4.79171L18.5405 4.39887C18.8334 4.10598 19.3082 4.10598 19.6011 4.39887ZM1.25 12C1.25 11.5858 1.58579 11.25 2 11.25H3C3.41421 11.25 3.75 11.5858 3.75 12C3.75 12.4142 3.41421 12.75 3 12.75H2C1.58579 12.75 1.25 12.4142 1.25 12ZM20.25 12C20.25 11.5858 20.5858 11.25 21 11.25H22C22.4142 11.25 22.75 11.5858 22.75 12C22.75 12.4142 22.4142 12.75 22 12.75H21C20.5858 12.75 20.25 12.4142 20.25 12ZM18.1476 18.1476C18.4405 17.8547 18.9154 17.8547 19.2083 18.1476L19.6011 18.5405C19.894 18.8334 19.894 19.3082 19.6011 19.6011C19.3082 19.894 18.8334 19.894 18.5405 19.6011L18.1476 19.2083C17.8547 18.9154 17.8547 18.4405 18.1476 18.1476ZM5.85211 18.1479C6.145 18.4408 6.145 18.9157 5.85211 19.2086L5.45927 19.6014C5.16638 19.8943 4.6915 19.8943 4.39861 19.6014C4.10572 19.3085 4.10572 18.8336 4.39861 18.5407L4.79145 18.1479C5.08434 17.855 5.55921 17.855 5.85211 18.1479ZM12 20.25C12.4142 20.25 12.75 20.5858 12.75 21V22C12.75 22.4142 12.4142 22.75 12 22.75C11.5858 22.75 11.25 22.4142 11.25 22V21C11.25 20.5858 11.5858 20.25 12 20.25Z"/>
            </svg>
          }
          @default {
            <svg class="hdr-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" fill="currentColor">
              <path d="M772.672 575.808V448.192l70.848-70.848a370.688 370.688 0 0 0-56.512-97.664l-96.64 25.92-110.528-63.808-25.92-96.768a374.72 374.72 0 0 0-112.832 0l-25.92 96.768-110.528 63.808-96.64-25.92c-23.68 29.44-42.816 62.4-56.576 97.664l70.848 70.848v127.616l-70.848 70.848c13.76 35.264 32.832 68.16 56.576 97.664l96.64-25.92 110.528 63.808 25.92 96.768a374.72 374.72 0 0 0 112.832 0l25.92-96.768 110.528-63.808 96.64 25.92c23.68-29.44 42.816-62.4 56.512-97.664l-70.848-70.848z m39.744 254.848l-111.232-29.824-55.424 32-29.824 111.36c-37.76 10.24-77.44 15.808-118.4 15.808-41.024 0-80.768-5.504-118.464-15.808l-29.888-111.36-55.424-32-111.168 29.824A447.552 447.552 0 0 1 64 625.472L145.472 544v-64L64 398.528A447.552 447.552 0 0 1 182.592 193.28l111.168 29.824 55.424-32 29.888-111.36A448.512 448.512 0 0 1 497.472 64c41.024 0 80.768 5.504 118.464 15.808l29.824 111.36 55.424 32 111.232-29.824c56.32 55.68 97.92 126.144 118.592 205.184L849.472 480v64l81.536 81.472a447.552 447.552 0 0 1-118.592 205.184zM497.536 627.2a115.2 115.2 0 1 0 0-230.4 115.2 115.2 0 0 0 0 230.4z m0 76.8a192 192 0 1 1 0-384 192 192 0 0 1 0 384z"/>
            </svg>
          }
        }
      </button>

      <button
        class="hdr-btn btn-logout"
        type="button"
        (click)="logout()"
        [disabled]="loggingOut()"
        matTooltip="Sair"
        aria-label="Sair"
      >
        @if (loggingOut()) {
          <mat-spinner diameter="14" />
        } @else {
          <svg class="hdr-icon-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 16.5V19C15 20.1046 14.1046 21 13 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3H13C14.1046 3 15 3.89543 15 5V8.0625M11 12H21M21 12L18.5 9.5M21 12L18.5 14.5"/>
          </svg>
        }
      </button>
    </header>
  `,
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

  private readonly _tick = toSignal(interval(1000).pipe(takeUntilDestroyed()), { initialValue: 0 });

  readonly loggingOut = signal(false);
  readonly hasPendingEmail = computed(() => this.store.hasPendingEmail());
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');
  readonly currentTheme = computed(() => this.themeService.theme());
  readonly isDevElevated = computed(() => this.store.isDevElevated());

  readonly devSecondsLeft = computed(() => {
    this._tick();
    return Math.max(0, Math.ceil((this.store.devTokenExpiresAt() - Date.now()) / 1000));
  });

  readonly devTimeLabel = computed(() => {
    const s = this.devSecondsLeft();
    const m = Math.floor(s / 60);
    return m > 0 ? `${m}m ${s % 60}s` : `${s}s`;
  });

  private readonly THEME_LABELS: Record<Theme, string> = {
    dark:   'Tema escuro — clique para claro',
    light:  'Tema claro — clique para sistema',
    system: 'Tema do sistema — clique para escuro',
  };
  private readonly THEME_CYCLE: Record<Theme, Theme> = {
    dark: 'light', light: 'system', system: 'dark',
  };

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
