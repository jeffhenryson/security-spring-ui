import { Component, inject, computed, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthStore } from '../../../core/auth/auth.store';

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
  { label: 'Usuários', icon: 'group', route: 'users', permission: 'USER_READ' },
  { label: 'Roles', icon: 'admin_panel_settings', route: 'roles', permission: 'ROLE_READ' },
  { label: 'Permissões', icon: 'key', route: 'permissions', permission: 'PERMISSION_READ' },
];

@Component({
  selector: 'app-settings-shell',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, RouterOutlet, MatIconModule, MatButtonModule],
  template: `
    <!-- SettingsShellComponent — :host is display:flex so no wrapper div needed -->

    <!-- Mobile: botão hambúrguer + menu colapsável -->
    <div class="sm:hidden w-full border-b settings-nav shrink-0">
      <button mat-icon-button
              class="m-2"
              [attr.aria-label]="mobileOpen() ? 'Fechar menu' : 'Abrir menu de configurações'"
              (click)="mobileOpen.update(v => !v)">
        <mat-icon>{{ mobileOpen() ? 'close' : 'menu' }}</mat-icon>
      </button>
      @if (mobileOpen()) {
        <nav class="pb-2">
          @for (section of visibleSections(); track section.title) {
            <div class="mb-2">
              <p class="px-4 mb-1 text-[11px] font-semibold uppercase tracking-widest nav-section-label">
                {{ section.title }}
              </p>
              @for (item of section.items; track item.route) {
                <a [routerLink]="item.route"
                   routerLinkActive="settings-nav-active"
                   (click)="mobileOpen.set(false)"
                   class="settings-nav-item flex items-center gap-3 px-4 py-2 mx-2 rounded-lg
                          text-sm no-underline transition-colors duration-150">
                  <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">{{ item.icon }}</mat-icon>
                  <span>{{ item.label }}</span>
                </a>
              }
            </div>
          }
        </nav>
      }
    </div>

    <!-- Desktop: sidebar fixa -->
    <aside class="hidden sm:block w-56 shrink-0 border-r settings-nav overflow-y-auto py-4">
        @for (section of visibleSections(); track section.title) {
          <div class="mb-4">
            <p class="px-4 mb-1 text-[11px] font-semibold uppercase tracking-widest nav-section-label">
              {{ section.title }}
            </p>
            @for (item of section.items; track item.route) {
              <a [routerLink]="item.route"
                 routerLinkActive="settings-nav-active"
                 class="settings-nav-item flex items-center gap-3 px-4 py-2 mx-2 rounded-lg
                        text-sm no-underline transition-colors duration-150">
                <mat-icon class="!text-[18px] !w-[18px] !h-[18px]">{{ item.icon }}</mat-icon>
                <span>{{ item.label }}</span>
              </a>
            }
          </div>
        }
    </aside>

    <!-- Settings content -->
    <div class="flex-1 overflow-y-auto">
      <router-outlet />
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    @media (min-width: 640px) {
      :host { flex-direction: row; }
    }
    .settings-nav {
      background: var(--bg-secondary);
      border-color: var(--border-color);
    }
    .nav-section-label { color: var(--text-secondary); }
    .settings-nav-item { color: var(--text-muted); }
    .settings-nav-item:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }
    .settings-nav-active {
      color: rgb(34 211 238) !important;
      background: var(--active-bg) !important;
    }
    .settings-nav-active mat-icon { color: rgb(34 211 238) !important; }
  `]
})
export class SettingsShellComponent {
  private readonly store = inject(AuthStore);

  readonly mobileOpen = signal(false);

  readonly visibleSections = computed<SettingsSection[]>(() => {
    const adminItems = ADMIN_ITEMS.filter(
      item => !item.permission || this.store.hasPermission(item.permission)
    );

    const sections: SettingsSection[] = [
      { title: 'Conta', items: ACCOUNT_ITEMS },
    ];

    if (adminItems.length > 0) {
      sections.push({ title: 'Administração', items: adminItems });
    }

    return sections;
  });
}
