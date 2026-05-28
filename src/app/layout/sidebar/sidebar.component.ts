import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../core/auth/auth.store';

interface ModuleItem {
  label: string;
  icon: string;
  route?: string;
  locked: boolean;
}

const MODULES: ModuleItem[] = [
  // Add application modules here as your system grows.
  // Set locked: false (or remove the property) to enable for all users.
  // Locked modules are only visible to users with the DEVELOPER role.
  { label: 'Módulo A', icon: 'widgets', locked: true },
  { label: 'Módulo B', icon: 'layers', locked: true },
];

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <aside class="flex flex-col h-full sidebar-bg border-r sidebar-border overflow-hidden shrink-0"
           style="transition: width 200ms ease"
           [style.width]="collapsed() ? '64px' : '240px'">

      <!-- Logo + toggle -->
      <div class="flex items-center h-14 px-2 border-b sidebar-border shrink-0">
        @if (!collapsed()) {
          <span class="flex-1 pl-2 text-sm font-semibold text-cyan-400 tracking-wider truncate">
            SecuritySpring
          </span>
        }
        <button mat-icon-button
                (click)="toggleCollapsed()"
                [attr.aria-label]="collapsed() ? 'Expandir menu' : 'Recolher menu'"
                [matTooltip]="collapsed() ? 'Expandir' : ''"
                matTooltipPosition="right"
                class="text-slate-400 shrink-0">
          <mat-icon>{{ collapsed() ? 'menu' : 'menu_open' }}</mat-icon>
        </button>
      </div>

      <!-- Nav -->
      <nav class="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        <!-- Dashboard -->
        <a routerLink="/app/dashboard"
           routerLinkActive="nav-active"
           [matTooltip]="collapsed() ? 'Dashboard' : ''"
           matTooltipPosition="right"
           class="nav-item flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg
                  nav-text no-underline hover:nav-text-hover hover:nav-hover-bg
                  transition-colors duration-150">
          <mat-icon class="shrink-0 !text-[20px] !w-5 !h-5 !leading-5">dashboard</mat-icon>
          @if (!collapsed()) {
            <span class="text-sm truncate">Dashboard</span>
          }
        </a>

        <!-- Module items (visible to ADMIN role) -->
        @if (canSeeModules()) {
          @if (!collapsed()) {
            <p class="px-5 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-widest sidebar-section-label">
              Módulos
            </p>
          }
          @for (mod of MODULES; track mod.label) {
            @if (mod.route) {
              <a [routerLink]="mod.route"
                 routerLinkActive="nav-active"
                 [matTooltip]="collapsed() ? mod.label : ''"
                 matTooltipPosition="right"
                 class="nav-item flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg
                        nav-text no-underline hover:nav-text-hover hover:nav-hover-bg
                        transition-colors duration-150">
                <mat-icon class="shrink-0 !text-[20px] !w-5 !h-5 !leading-5">{{ mod.icon }}</mat-icon>
                @if (!collapsed()) {
                  <span class="text-sm truncate">{{ mod.label }}</span>
                }
              </a>
            } @else {
              <!-- Module placeholder (no route yet) -->
              <div [matTooltip]="collapsed() ? mod.label + ' (em breve)' : 'Em breve'"
                   matTooltipPosition="right"
                   class="flex items-center gap-3 px-3 py-2.5 mx-2 my-0.5 rounded-lg
                          module-placeholder cursor-default select-none">
                <mat-icon class="shrink-0 !text-[20px] !w-5 !h-5 !leading-5">{{ mod.icon }}</mat-icon>
                @if (!collapsed()) {
                  <span class="text-sm truncate flex-1">{{ mod.label }}</span>
                  <span class="text-[10px] badge-soon px-1.5 py-0.5 rounded font-medium shrink-0">em breve</span>
                }
              </div>
            }
          }
        }
      </nav>

      <!-- User footer — clicável abre configurações -->
      <div class="border-t sidebar-border shrink-0 p-2">
        <a routerLink="/app/settings"
           routerLinkActive="user-footer-active"
           [matTooltip]="collapsed() ? username() + '\nConfigurações' : 'Configurações'"
           matTooltipPosition="right"
           class="user-footer flex items-center gap-3 px-2 py-2 rounded-lg min-w-0
                  no-underline transition-colors duration-150 w-full">
          <div class="w-8 h-8 rounded-full bg-cyan-700 flex items-center justify-center
                      shrink-0 text-xs font-bold text-white">
            {{ userInitials() }}
          </div>
          @if (!collapsed()) {
            <div class="flex-1 min-w-0">
              <p class="text-xs font-medium sidebar-username truncate leading-tight m-0">{{ username() }}</p>
              <p class="text-xs sidebar-email truncate leading-tight m-0">{{ userEmail() }}</p>
            </div>
            <mat-icon class="!text-[16px] !w-4 !h-4 shrink-0 sidebar-settings-icon">settings</mat-icon>
          }
        </a>
      </div>

    </aside>
  `,
  styles: [`
    .nav-active {
      color: rgb(34 211 238) !important;
      background-color: var(--active-bg) !important;
    }
    .nav-active mat-icon { color: rgb(34 211 238) !important; }

    aside { background: var(--bg-secondary); border-color: var(--border-color); }
    .sidebar-border { border-color: var(--border-color); }
    .nav-text { color: var(--text-muted); }
    .nav-text:hover { color: var(--text-primary); background: var(--surface-hover); }
    .sidebar-section-label { color: var(--text-secondary); }
    .sidebar-username { color: var(--text-primary); }
    .sidebar-email { color: var(--text-secondary); }
    .sidebar-settings-icon { color: var(--text-muted); transition: color 150ms; }

    .user-footer { color: inherit; }
    .user-footer:hover { background: var(--surface-hover); }
    .user-footer:hover .sidebar-settings-icon { color: var(--text-primary); }
    .user-footer-active { background: var(--active-bg) !important; }
    .user-footer-active .sidebar-username { color: rgb(34 211 238); }
    .user-footer-active .sidebar-settings-icon { color: rgb(34 211 238); }

    .module-placeholder { color: var(--text-muted); opacity: 0.6; }
    .badge-soon {
      background: rgb(34 211 238 / 0.12);
      color: rgb(34 211 238 / 0.7);
    }
  `]
})
export class SidebarComponent {
  private readonly store = inject(AuthStore);

  readonly MODULES = MODULES;
  readonly collapsed = signal(false);
  readonly canSeeModules = computed(() => this.store.hasRole('ADMIN'));

  readonly username = computed(() => this.store.currentUser()?.username ?? '');
  readonly userEmail = computed(() => this.store.currentUser()?.email ?? '');
  readonly userInitials = computed(() =>
    (this.store.currentUser()?.username ?? '').slice(0, 2).toUpperCase()
  );

  toggleCollapsed(): void {
    this.collapsed.update(v => !v);
  }
}
