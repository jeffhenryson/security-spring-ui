import {
  Component,
  DestroyRef,
  inject,
  computed,
  signal,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { NgTemplateOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
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
  { label: 'Permissões', icon: 'key', route: 'permissions', permission: PERMISSIONS.DEV_PERMISSION_MANAGE },
  { label: 'Logs técnicos', icon: 'terminal', route: 'dev-logs', permission: PERMISSIONS.DEV_LOGS_TECHNICAL },
  { label: 'Sistema', icon: 'settings_applications', route: 'dev-system', permission: PERMISSIONS.DEV_SYSTEM_CONFIG },
];

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NgTemplateOutlet,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    DevElevationModalComponent,
  ],
  template: `
    <!-- SettingsShellComponent -->

    <!-- DEV Elevation Modal -->
    @if (showElevationModal()) {
      <app-dev-elevation-modal
        (close)="showElevationModal.set(false)"
        (elevated)="onElevated()"
      />
    }

    <!-- Mobile: botão hambúrguer + menu colapsável -->
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
              <ng-container *ngTemplateOutlet="devButton" />
            </div>
          }
        </nav>
      </div>
    </div>

    <!-- Desktop: sidebar fixa -->
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
          <ng-container *ngTemplateOutlet="devButton" />
        </div>
      }
    </aside>

    <!-- DEV button template (reutilizado mobile + desktop) -->
    <ng-template #devButton>
      @if (!isDevElevated()) {
        <button
          class="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                 text-amber-400 border border-amber-500/30 bg-amber-500/5
                 hover:bg-amber-500/15 transition-colors cursor-pointer"
          (click)="showElevationModal.set(true)"
        >
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">lock</mat-icon>
          <span>Elevar para DEV</span>
        </button>
      } @else {
        <div class="flex items-center gap-2 px-3 py-2 rounded-lg border
                    border-green-500/30 bg-green-500/5">
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px] text-green-400">lock_open</mat-icon>
          <span class="text-xs text-green-400 flex-1">
            DEV — ⏱ {{ devMinutesLeft() }}min
          </span>
          <button
            mat-icon-button
            class="!w-6 !h-6 !min-w-0"
            (click)="revokeDevAccess()"
            matTooltip="Revogar acesso DEV"
          >
            <mat-icon class="!text-[14px] !text-red-400">logout</mat-icon>
          </button>
        </div>
      }
    </ng-template>

    <!-- Settings content -->
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
        flex-direction: column;
        flex: 1;
        min-height: 0;
      }
      @media (min-width: 640px) {
        :host {
          flex-direction: row;
        }
      }
      .settings-nav {
        background: var(--bg-secondary);
        border-color: var(--border-color);
      }
      .nav-section-label {
        color: var(--text-secondary);
      }
      .settings-nav-item {
        color: var(--text-secondary);
      }
      .settings-nav-item:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
      .settings-nav-active {
        color: var(--active-color) !important;
        background: var(--active-bg) !important;
      }
      .settings-nav-active mat-icon {
        color: var(--active-color) !important;
      }
    `,
  ],
})
export class SettingsShellComponent {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly mobileOpen = signal(false);
  readonly showElevationModal = signal(false);

  readonly isRoleDev = computed(() => this.store.hasRole(ROLES.ROLE_DEV));
  readonly isDevElevated = computed(() => this.store.isDevElevated());

  // Tick local para atualizar o timer do DEV token a cada segundo
  private readonly _devTick = signal(0);
  readonly devSecondsLeft = computed(() => {
    this._devTick();
    return Math.max(0, Math.ceil((this.store.devTokenExpiresAt() - Date.now()) / 1000));
  });
  readonly devMinutesLeft = computed(() => Math.ceil(this.devSecondsLeft() / 60));

  private devTimerInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Inicia/para o ticker do timer DEV quando o estado de elevação muda
    effect(() => {
      if (this.store.isDevElevated()) {
        this.devTimerInterval = setInterval(
          () => this._devTick.update((n) => n + 1),
          1000,
        );
        this.destroyRef.onDestroy(() => this.stopDevTimer());
      } else {
        this.stopDevTimer();
      }
    });

    // Abre o modal automaticamente se a rota pediu elevação DEV
    effect(() => {
      const query = this.activatedRoute.snapshot.queryParamMap.get('devRequired');
      if (query === 'true' && this.isRoleDev() && !this.isDevElevated()) {
        this.showElevationModal.set(true);
      }
    });
  }

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
    const sections: SettingsSection[] = [{ title: 'Conta', items: ACCOUNT_ITEMS }];

    const adminItems = ADMIN_ITEMS.filter(
      (item) => !item.permission || perms.includes(item.permission),
    );
    if (adminItems.length > 0) {
      sections.push({ title: 'Administração', items: adminItems });
    }

    // Itens DEV só aparecem quando o token DEV estiver ativo
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

  onElevated(): void {
    this.showElevationModal.set(false);
  }

  revokeDevAccess(): void {
    this.store.clearDevToken();
    this.router.navigate(['/app/settings/profile']);
  }

  private stopDevTimer(): void {
    if (this.devTimerInterval !== null) {
      clearInterval(this.devTimerInterval);
      this.devTimerInterval = null;
    }
  }
}
