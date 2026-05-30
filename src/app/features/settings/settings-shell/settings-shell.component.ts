import { Component, inject, computed, signal, ChangeDetectionStrategy } from '@angular/core';
import {
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
  Router,
  NavigationEnd,
  ActivatedRoute,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore } from '../../../core/auth/auth.store';
import { PERMISSIONS } from '../../../core/rbac/permissions.constants';

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
  { label: 'Permissões', icon: 'key', route: 'permissions', permission: PERMISSIONS.PERMISSION_READ },
  { label: 'Logs de auditoria', icon: 'history', route: 'audit-logs', permission: PERMISSIONS.AUDIT_READ },
];

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, MatButtonModule],
  template: `
    <!-- SettingsShellComponent — :host is display:flex so no wrapper div needed -->

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
        [style.maxHeight]="mobileOpen() ? '600px' : '0'"
        style="transition: max-height 250ms ease"
      >
        <nav class="pb-2">
          @for (section of visibleSections(); track section.title) {
            <div class="mb-2">
              <p
                class="px-4 mb-1 text-[11px] font-semibold uppercase tracking-widest nav-section-label"
              >
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
        </nav>
      </div>
    </div>

    <!-- Desktop: sidebar fixa -->
    <aside class="hidden sm:block w-56 shrink-0 border-r settings-nav overflow-y-auto py-4">
      @for (section of visibleSections(); track section.title) {
        <div class="mb-4">
          <p
            class="px-4 mb-1 text-[11px] font-semibold uppercase tracking-widest nav-section-label"
          >
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
    </aside>

    <!-- Settings content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Breadcrumb -->
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

  readonly mobileOpen = signal(false);

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
    // Leitura direta do signal garante que Angular rastreie a dependência corretamente
    // no modo zoneless. Não delegar para métodos que leem signals internamente.
    const perms = this.store.permissions();
    const sections: SettingsSection[] = [{ title: 'Conta', items: ACCOUNT_ITEMS }];

    const adminItems = ADMIN_ITEMS.filter(
      (item) => !item.permission || perms.includes(item.permission),
    );
    if (adminItems.length > 0) {
      sections.push({ title: 'Administração', items: adminItems });
    }

    return sections;
  });
}
