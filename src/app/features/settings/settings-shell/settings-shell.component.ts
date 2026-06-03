import {
  Component,
  inject,
  computed,
  signal,
  ChangeDetectionStrategy,
  afterNextRender,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { interval, switchMap, EMPTY } from 'rxjs';
import { toSignal, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { filter, map, startWith, take } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { PERMISSIONS, ROLES } from '../../../core/rbac/permissions.constants';
import { DevElevationModalComponent } from '../dev-elevation/dev-elevation-modal.component';

interface SettingsSection {
  title: string;
  items: SettingsNavItem[];
}

interface SettingsNavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;
}

const ACCOUNT_ITEMS: SettingsNavItem[] = [
  { label: 'Perfil', icon: 'person', route: 'profile' },
  { label: 'Segurança', icon: 'security', route: 'security' },
  { label: 'Tema', icon: 'palette', route: 'theme' },
];

const ADMIN_ITEMS: SettingsNavItem[] = [
  { label: 'Usuários', icon: 'group', route: 'users', permission: PERMISSIONS.USER_READ },
  { label: 'Roles', icon: 'admin_panel_settings', route: 'roles', permission: PERMISSIONS.ROLE_READ },
  { label: 'Logs de auditoria', icon: 'history', route: 'audit-logs', permission: PERMISSIONS.AUDIT_READ },
];

const DEV_ITEMS: SettingsNavItem[] = [
  { label: 'Logs técnicos', icon: 'terminal', route: 'dev-logs', permission: PERMISSIONS.AUDIT_READ },
  { label: 'Sistema', icon: 'settings_applications', route: 'dev-system' },
  { label: 'Usuários DEV', icon: 'admin_panel_settings', route: 'dev-users' },
  { label: 'Config. Sistema', icon: 'tune', route: 'system-config' },
];

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    DevElevationModalComponent,
  ],
  template: `
    @if (showElevationModal()) {
      <app-dev-elevation-modal
        (dismissed)="showElevationModal.set(false)"
        (elevated)="onElevated()"
      />
    }

    <!-- Mobile: hambúrguer -->
    <div class="sm:hidden w-full border-b settings-nav shrink-0">
      <button
        mat-icon-button
        class="m-2"
        [attr.aria-label]="mobileOpen() ? 'Fechar menu' : 'Abrir menu de configurações'"
        (click)="mobileOpen.update((v) => !v)"
      >
        <mat-icon>{{ mobileOpen() ? 'close' : 'menu' }}</mat-icon>
      </button>
      <div
        class="overflow-hidden"
        [style.maxHeight]="mobileOpen() ? '700px' : '0'"
        style="transition: max-height 250ms ease"
      >
        <nav class="pb-2">
          @for (section of visibleSections(); track section.title) {
            <div class="mb-2">
              <p class="px-4 mb-1 text-[11px] font-semibold uppercase tracking-widest nav-section-label">
                {{ section.title }}
              </p>
              @for (item of section.items; track item.route) {
                <a
                  [routerLink]="item.route"
                  routerLinkActive="settings-nav-active"
                  (click)="mobileOpen.set(false)"
                  class="settings-nav-item flex items-center gap-3 px-4 py-2 mx-2 rounded-lg
                          text-sm no-underline transition-colors duration-150"
                >
                  <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">{{ item.icon }}</mat-icon>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }
          @if (isRoleDev()) {
            <div class="px-2 pt-1 pb-2">
              @if (!isDevElevated()) {
                <button
                  class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                         text-amber-400 border border-amber-500/30 bg-amber-500/5
                         hover:bg-amber-500/15 transition-colors cursor-pointer"
                  (click)="tryElevate()"
                >
                  <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">lock</mat-icon>
                  <span>Elevar para DEV</span>
                </button>
              } @else {
                <div class="flex items-center gap-2 px-3 py-2 rounded-lg border
                            border-green-500/30 bg-green-500/5">
                  <mat-icon class="!text-[18px] !w-[18px] !h-[18px]" style="color:#4ade80">lock_open</mat-icon>
                  <span class="text-xs flex-1" style="color:#4ade80">DEV — ⏱ {{ devMinutesLeft() }}min</span>
                  <button mat-icon-button class="!w-6 !h-6 !min-w-0"
                          (click)="revokeDevAccess()" matTooltip="Revogar acesso DEV">
                    <mat-icon class="!text-[14px]" style="color:#f87171">logout</mat-icon>
                  </button>
                </div>
              }
            </div>
          }
        </nav>
      </div>
    </div>

    <!-- Desktop: sidebar -->
    <aside class="hidden sm:flex sm:flex-col w-56 shrink-0 border-r settings-nav overflow-y-auto py-4">
      <div class="flex-1">
        @for (section of visibleSections(); track section.title) {
          <div class="mb-4">
            <p class="px-4 mb-1 text-[11px] font-semibold uppercase tracking-widest nav-section-label">
              {{ section.title }}
            </p>
            @for (item of section.items; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="settings-nav-active"
                class="settings-nav-item flex items-center gap-3 px-4 py-2 mx-2 rounded-lg
                          text-sm no-underline transition-colors duration-150"
              >
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">{{ item.icon }}</mat-icon>
                <span>{{ item.label }}</span>
              </a>
            }
          </div>
        }
      </div>

      @if (isRoleDev()) {
        <div class="mt-auto px-2 pb-2 pt-2 border-t border-[var(--border-color)]">
          @if (!isDevElevated()) {
            <button
              class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                     text-amber-400 border border-amber-500/30 bg-amber-500/5
                     hover:bg-amber-500/15 transition-colors cursor-pointer"
              (click)="tryElevate()"
            >
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">lock</mat-icon>
              <span>Elevar para DEV</span>
            </button>
          } @else {
            <div class="flex items-center gap-2 px-3 py-2 rounded-lg border
                        border-green-500/30 bg-green-500/5">
              <mat-icon class="!text-[18px] !w-[18px] !h-[18px]" style="color:#4ade80">lock_open</mat-icon>
              <span class="text-xs flex-1" style="color:#4ade80">DEV — ⏱ {{ devMinutesLeft() }}min</span>
              <button mat-icon-button class="!w-6 !h-6 !min-w-0"
                      (click)="revokeDevAccess()" matTooltip="Revogar acesso DEV">
                <mat-icon class="!text-[14px]" style="color:#f87171">logout</mat-icon>
              </button>
            </div>
          }
        </div>
      }
    </aside>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      @if (activeSection()) {
        <nav
          class="px-6 pt-4 pb-0 flex items-center gap-1 text-xs text-[var(--text-muted)]"
          aria-label="Navegação de caminho"
        >
          <span>Configurações</span>
          <mat-icon class="!text-[14px] !w-[14px] !h-[14px]">chevron_right</mat-icon>
          <span class="text-[var(--text-secondary)]" aria-current="page">{{ activeSection() }}</span>
        </nav>
      }
      <router-outlet />
    </div>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex: 1;
        min-height: 0;
        flex-direction: column;
      }
      @media (min-width: 640px) {
        :host { flex-direction: row; }
      }
      .settings-nav { background: var(--bg-secondary); border-color: var(--border-color); }
      .nav-section-label { color: var(--text-secondary); }
      .settings-nav-item { color: var(--text-secondary); }
      .settings-nav-item:hover { background: var(--surface-hover); color: var(--text-primary); }
      .settings-nav-active { color: var(--active-color) !important; background: var(--active-bg) !important; }
      .settings-nav-active mat-icon { color: var(--active-color) !important; }
    `,
  ],
})
export class SettingsShellComponent {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  readonly mobileOpen = signal(false);
  readonly showElevationModal = signal(false);
  private readonly pendingReturnUrl = signal<string | null>(null);

  constructor() {
    const qp = this.activatedRoute.snapshot.queryParamMap;
    const devRequired = qp.get('devRequired') === 'true';
    const returnUrl = qp.get('returnUrl') ?? '';
    if (returnUrl) this.pendingReturnUrl.set(returnUrl);
    if (devRequired && !this.store.isDevElevated()) {
      afterNextRender(() => this.tryElevate());
    }
  }

  readonly isRoleDev = computed(() => this.store.hasRole(ROLES.ROLE_DEV));
  readonly isDevElevated = computed(() => this.store.isDevElevated());

  private readonly _tick = toSignal(
    toObservable(this.store.isDevElevated).pipe(
      switchMap(elevated => elevated ? interval(1000) : EMPTY),
      takeUntilDestroyed(),
    ),
    { initialValue: 0 },
  );

  readonly devMinutesLeft = computed(() => {
    this._tick(); // garante reavaliação a cada segundo
    return Math.max(0, Math.ceil((this.store.devTokenExpiresAt() - Date.now()) / 60_000));
  });

  readonly activeSection = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let route = this.activatedRoute;
        while (route.firstChild) route = route.firstChild;
        return (route.snapshot.data['title'] as string | undefined) ?? null;
      }),
    ),
    { initialValue: null as string | null },
  );

  readonly visibleSections = computed<SettingsSection[]>(() => {
    const perms = this.store.permissions();
    const elevated = this.store.isDevElevated();
    const isAdminOrDev = this.store.hasRole(ROLES.ROLE_ADMIN) || this.store.hasRole(ROLES.ROLE_DEV);
    const sections: SettingsSection[] = [{ title: 'Conta', items: ACCOUNT_ITEMS }];

    if (isAdminOrDev) {
      const adminItems = ADMIN_ITEMS.filter(
        (item) => !item.permission || perms.includes(item.permission),
      );
      if (adminItems.length > 0) {
        sections.push({ title: 'Administração', items: adminItems });
      }
    }

    if (elevated) {
      const devItems = DEV_ITEMS.filter(
        (item) => !item.permission || perms.includes(item.permission),
      );
      if (devItems.length > 0) {
        sections.push({ title: 'Desenvolvedor', items: devItems });
      }
    }

    return sections;
  });

  tryElevate(): void {
    if (!this.store.currentUser()?.totpEnabled) {
      const ref = this.snackBar.open(
        '2FA não configurado. É obrigatório para elevar o acesso DEV.',
        'Configurar agora',
        { duration: 6000 },
      );
      ref.onAction().pipe(take(1)).subscribe(() => this.router.navigate(['/app/settings/security']));
      return;
    }
    this.showElevationModal.set(true);
  }

  onElevated(): void {
    this.showElevationModal.set(false);
    const dest = this.pendingReturnUrl();
    if (dest) {
      this.pendingReturnUrl.set(null);
      this.router.navigateByUrl(dest);
    }
  }

  revokeDevAccess(): void {
    this.store.clearDevToken();
    this.router.navigate(['/app/settings/profile']);
  }
}
