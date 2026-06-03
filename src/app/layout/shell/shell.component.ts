import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet, Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { trigger, transition, style, animate, query } from '@angular/animations';
import { toSignal, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { DevElevationBannerComponent } from '../../features/settings/dev-elevation/dev-elevation-banner.component';
import { AuthStore } from '../../core/auth/auth.store';

@Component({
  selector: 'app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, SidebarComponent, TopbarComponent, DevElevationBannerComponent, MatIconModule, MatProgressBarModule],
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(6px)' }),
          animate('180ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
        ], { optional: true }),
      ]),
    ]),
  ],
  template: `
    <div class="flex flex-col h-screen overflow-hidden">
      <app-topbar />
      <app-dev-elevation-banner />

      @if (navigating()) {
        <mat-progress-bar mode="indeterminate" class="shrink-0" />
      }

      @if (showEmailBanner() && !emailBannerDismissed()) {
        <div class="flex items-center gap-2 px-4 py-1.5 text-xs shrink-0"
             style="background:#1c1917;color:#fcd34d;border-bottom:1px solid #44403c">
          <mat-icon class="!text-[14px] !w-[14px] !h-[14px]" style="color:#fbbf24">mail_outline</mat-icon>
          <span>
            @if (emailNotVerified()) {
              Email cadastrado mas ainda não verificado. Verifique sua caixa de entrada.
            } @else {
              Nenhum email cadastrado. Cadastre um email para recuperar o acesso à conta.
            }
          </span>
          <a routerLink="/app/settings/profile" class="underline ml-4" style="color:#fcd34d">
            Configurar
          </a>
          <button
            type="button"
            class="ml-1 flex items-center justify-center w-5 h-5 rounded opacity-70 hover:opacity-100 transition-opacity"
            style="color:#fcd34d;background:transparent;border:none;cursor:pointer;flex-shrink:0"
            aria-label="Fechar notificação"
            (click)="emailBannerDismissed.set(true)"
          >
            <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">close</mat-icon>
          </button>
        </div>
      }

      <div class="flex flex-1 min-h-0 overflow-hidden">
        <app-sidebar />
        <main class="flex-1 overflow-y-auto flex flex-col" [@routeAnimations]="getAnimation(outlet)">
          <router-outlet #outlet="outlet" />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  private readonly store = inject(AuthStore);

  readonly emailBannerDismissed = signal(false);

  readonly navigating = toSignal(
    inject(Router).events.pipe(
      filter(e => e instanceof NavigationStart || e instanceof NavigationEnd ||
                  e instanceof NavigationCancel || e instanceof NavigationError),
      map(e => e instanceof NavigationStart),
      takeUntilDestroyed(),
    ),
    { initialValue: false },
  );

  readonly showEmailBanner = computed(() => {
    const user = this.store.currentUser();
    if (!user) return false;
    // Show if no email OR email exists but not verified
    return !user.email || !user.emailVerified;
  });

  readonly emailNotVerified = computed(() => {
    const user = this.store.currentUser();
    return !!user?.email && !user.emailVerified;
  });

  getAnimation(outlet: RouterOutlet): string {
    return outlet?.activatedRouteData?.['title'] ?? '';
  }
}
