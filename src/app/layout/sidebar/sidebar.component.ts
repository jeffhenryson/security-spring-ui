import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../core/auth/auth.store';
import { AvatarService } from '../../core/auth/avatar.service';
import { PERMISSIONS, ROLES } from '../../core/rbac/permissions.constants';
import { HasPermissionDirective } from '../../core/rbac/has-permission.directive';

interface ModuleItem {
  label: string;
  icon: string;
  route: string;
}

// Add modules here as the application grows.
// Each entry requires a registered route in app.routes.ts and a nav link in the sidebar.
const MODULES: ModuleItem[] = [];

const SIDEBAR_COLLAPSE_KEY = 'ss_sidebar_collapsed';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule, HasPermissionDirective],
  template: `
    <aside
      class="flex flex-col h-full sidebar-bg border-r sidebar-border overflow-hidden shrink-0"
      style="transition: width 200ms ease"
      [style.width]="collapsed() ? '64px' : '302px'"
    >
      <!-- Logo + toggle -->
      <div class="flex items-center h-14 px-2 border-b sidebar-border shrink-0">
        @if (!collapsed()) {
          <span class="flex-1 pl-2 text-sm font-semibold tracking-wider truncate"
                style="color: var(--cs-primary); font-family: var(--cs-font-primary)">
            CERNE.SECURITY
          </span>
        }
        <button
          mat-icon-button
          (click)="toggleCollapsed()"
          [attr.aria-label]="collapsed() ? 'Expandir menu' : 'Recolher menu'"
          [matTooltip]="collapsed() ? 'Expandir' : ''"
          matTooltipPosition="right"
          class="text-[var(--text-muted)] shrink-0"
        >
          <mat-icon>{{ collapsed() ? 'menu' : 'menu_open' }}</mat-icon>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-2 overflow-y-auto overflow-x-hidden" aria-label="Navegação principal">
        <!-- Dashboard -->
        <a
          routerLink="/app/dashboard"
          routerLinkActive="nav-active"
          [matTooltip]="collapsed() ? 'Dashboard' : ''"
          matTooltipPosition="right"
          class="nav-item flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg
                  nav-text no-underline hover:nav-text-hover hover:nav-hover-bg
                  transition-colors duration-150"
        >
          <mat-icon class="shrink-0 !text-[20px] !w-5 !h-5 !leading-5">dashboard</mat-icon>
          @if (!collapsed()) {
            <span class="text-sm truncate">Dashboard</span>
          }
        </a>

        <!-- Template — visível apenas para quem tem DEV_ROLE_MANAGE -->
        <ng-template [hasPermission]="PERMISSIONS.DEV_ROLE_MANAGE">
          <a
            routerLink="/app/template"
            routerLinkActive="nav-active"
            [matTooltip]="collapsed() ? 'Template' : ''"
            matTooltipPosition="right"
            class="nav-item flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg
                    nav-text no-underline hover:nav-text-hover hover:nav-hover-bg
                    transition-colors duration-150"
          >
            <mat-icon class="shrink-0 !text-[20px] !w-5 !h-5 !leading-5"
              >dashboard_customize</mat-icon
            >
            @if (!collapsed()) {
              <span class="text-sm truncate">Template</span>
            }
          </a>
        </ng-template>

        <!-- Module items — adicionar entradas ao array MODULES conforme o sistema cresce -->
        @if (canSeeModules() && MODULES.length > 0) {
          @if (!collapsed()) {
            <p
              class="px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest sidebar-section-label"
            >
              Módulos
            </p>
          }
          @for (mod of MODULES; track mod.label) {
            <a
              [routerLink]="mod.route"
              routerLinkActive="nav-active"
              [matTooltip]="collapsed() ? mod.label : ''"
              matTooltipPosition="right"
              class="nav-item flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg
                      nav-text no-underline hover:nav-text-hover hover:nav-hover-bg
                      transition-colors duration-150"
            >
              <mat-icon class="shrink-0 !text-[20px] !w-5 !h-5 !leading-5">{{ mod.icon }}</mat-icon>
              @if (!collapsed()) {
                <span class="text-sm truncate">{{ mod.label }}</span>
              }
            </a>
          }
        }
      </nav>

      <!-- User footer — clicável abre configurações -->
      <div class="border-t sidebar-border shrink-0 p-2">
        <a
          routerLink="/app/settings"
          routerLinkActive="user-footer-active"
          [matTooltip]="
            collapsed()
              ? username() +
                '
Configurações'
              : 'Configurações'
          "
          matTooltipPosition="right"
          class="user-footer flex items-center gap-3 px-2 py-2 rounded-lg min-w-0
                  no-underline transition-colors duration-150 w-full"
        >
          <div
            class="w-8 h-8 rounded-full flex items-center justify-center shrink-0
                      text-xs font-bold text-white overflow-hidden"
            style="background: var(--cs-primary)"
          >
            @if (avatar()) {
              <img [src]="avatar()" alt="avatar" class="w-full h-full object-cover" />
            } @else {
              {{ userInitials() }}
            }
          </div>
          @if (!collapsed()) {
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium sidebar-username truncate leading-tight m-0">
                {{ username() }}
              </p>
              <p class="text-xs sidebar-email truncate leading-tight m-0">{{ userEmail() }}</p>
            </div>
            <mat-icon class="!text-[16px] !w-4 !h-4 shrink-0 sidebar-settings-icon"
              >settings</mat-icon
            >
          }
        </a>
      </div>
    </aside>
  `,
  styles: [
    `
      .nav-active {
        color: var(--cs-primary) !important;
        background-color: var(--cs-primary-10) !important;
      }
      .nav-active mat-icon {
        color: var(--cs-primary) !important;
      }

      aside {
        background: var(--bg-secondary);
        border-color: var(--border-color);
        font-family: var(--cs-font-primary);
      }
      .sidebar-border {
        border-color: var(--border-color);
      }
      .nav-text {
        color: var(--text-muted);
      }
      .nav-text:hover {
        color: var(--text-primary);
        background: var(--surface-hover);
      }
      .sidebar-section-label {
        color: var(--text-secondary);
      }
      .sidebar-username {
        color: var(--text-primary);
      }
      .sidebar-email {
        color: var(--text-secondary);
      }
      .sidebar-settings-icon {
        color: var(--text-muted);
        transition: color 150ms;
      }

      .user-footer {
        color: inherit;
      }
      .user-footer:hover {
        background: var(--surface-hover);
      }
      .user-footer:hover .sidebar-settings-icon {
        color: var(--text-primary);
      }
      .user-footer-active {
        background: var(--cs-primary-10) !important;
      }
      .user-footer-active .sidebar-username {
        color: var(--cs-primary);
      }
      .user-footer-active .sidebar-settings-icon {
        color: var(--cs-primary);
      }
    `,
  ],
})
export class SidebarComponent {
  private readonly store = inject(AuthStore);
  private readonly avatarService = inject(AvatarService);

  readonly MODULES = MODULES;
  readonly PERMISSIONS = PERMISSIONS;
  readonly collapsed = signal(localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1');
  readonly canSeeModules = computed(() => this.store.hasRole(ROLES.ROLE_ADMIN));

  readonly username = computed(() => this.store.currentUser()?.username ?? '');
  readonly userEmail = computed(() => this.store.currentUser()?.email ?? '');
  readonly userInitials = this.store.userInitials;
  readonly avatar = this.avatarService.currentAvatar;

  toggleCollapsed(): void {
    this.collapsed.update((v) => {
      const next = !v;
      localStorage.setItem(SIDEBAR_COLLAPSE_KEY, next ? '1' : '0');
      return next;
    });
  }
}
