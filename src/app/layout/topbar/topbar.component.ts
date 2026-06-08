import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute, RouterLink } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatIconModule } from '@angular/material/icon';
import { toSignal, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, startWith, interval, switchMap, EMPTY } from 'rxjs';
import { AuthStore } from '../../core/auth/auth.store';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService, Theme } from '../../core/theme/theme.service';


@Component({
  selector: 'app-topbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule, MatIconModule, RouterLink],
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
    .btn-logout { color: var(--cs-danger); }
    .btn-logout:hover {
      background: var(--cs-danger-10);
      border-color: rgb(251 12 77 / 0.3);
    }

    .hdr-icon-svg {
      width: 18px; height: 18px;
      display: block;
      flex-shrink: 0;
      font-size: 18px !important;
      line-height: 18px !important;
    }
  `],
  template: `
    @if (hasPendingEmail()) {
      <div
        class="flex items-center gap-2 px-4 py-1.5 text-xs shrink-0"
        style="background:rgb(253 114 50/0.08);color:var(--cs-warning);border-bottom:1px solid rgb(253 114 50/0.25)"
      >
        <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">mark_email_unread</mat-icon>
        <span>
          Confirmação pendente para <strong>{{ pendingEmail() }}</strong>.
          Verifique sua caixa de entrada.
        </span>
        <a routerLink="/app/settings/profile" class="ml-auto underline" style="color:var(--cs-warning)">
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
          style="border-color:rgb(19 182 215/0.35);background:rgb(19 182 215/0.08);color:var(--cs-success)"
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
            <mat-icon class="hdr-icon-svg">dark_mode</mat-icon>
          }
          @case ('light') {
            <mat-icon class="hdr-icon-svg">light_mode</mat-icon>
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
          <mat-icon class="cs-spinner" style="font-size:14px;width:14px;height:14px">autorenew</mat-icon>
        } @else {
          <mat-icon class="hdr-icon-svg">logout</mat-icon>
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
        return (route.snapshot.data['title'] as string | undefined) ?? 'CERNE.SECURITY';
      }),
    ),
    { initialValue: '' },
  );

  private readonly _tick = toSignal(
    toObservable(this.store.isDevElevated).pipe(
      switchMap(elevated => elevated ? interval(1000) : EMPTY),
      takeUntilDestroyed(),
    ),
    { initialValue: 0 },
  );

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
