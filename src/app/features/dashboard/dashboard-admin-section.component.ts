import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../shared/ui';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditLogResponse } from '../../core/admin/audit-logs.service';
import { StatsResponse } from '../../core/admin/stats.service';
import { DateFormatPipe } from '../../shared/date-format.pipe';

@Component({
  selector: 'app-dashboard-admin-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatTooltipModule, DateFormatPipe, ButtonComponent],
  template: `
    <!-- Stats cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
      @if (canReadUsers()) {
        <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-cyan-950 flex items-center justify-center shrink-0">
              <mat-icon class="text-cyan-400">group</mat-icon>
            </div>
            <span class="text-[var(--text-secondary)] text-sm flex-1">Total de usuários</span>
            @if (statsError()) {
              <mat-icon class="text-yellow-400 !text-[18px]"
                        matTooltip="Falha ao carregar. Tente recarregar a página.">warning</mat-icon>
            }
          </div>
          @if (statsLoading()) {
            <div class="skeleton h-8 w-16 rounded mb-1"></div>
            <div class="skeleton h-3 w-24 rounded"></div>
          } @else {
            <p class="text-3xl font-bold text-[var(--text-primary)] leading-none">
              {{ stats()?.totalUsers ?? '—' }}
            </p>
            @if (stats(); as s) {
              <p class="text-xs text-[var(--text-muted)] mt-1">{{ s.activeUsers }} ativos</p>
            }
          }
        </div>

        <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-red-950 flex items-center justify-center shrink-0">
              <mat-icon class="text-red-400">person_off</mat-icon>
            </div>
            <span class="text-[var(--text-secondary)] text-sm flex-1">Desabilitados</span>
            @if (statsError()) {
              <mat-icon class="text-yellow-400 !text-[18px]"
                        matTooltip="Falha ao carregar. Tente recarregar a página.">warning</mat-icon>
            }
          </div>
          @if (statsLoading()) {
            <div class="skeleton h-8 w-16 rounded mb-1"></div>
            <div class="skeleton h-3 w-24 rounded"></div>
          } @else {
            <p class="text-3xl font-bold leading-none"
               [class.text-red-400]="(disabledUsers() ?? 0) > 0"
               [class.text-[var(--text-primary)]]="(disabledUsers() ?? 0) === 0">
              {{ disabledUsers() ?? '—' }}
            </p>
            @if (disabledUsers() !== null) {
              <p class="text-xs text-[var(--text-muted)] mt-1">
                {{ disabledUsers() === 0 ? 'Nenhum desabilitado' : 'contas inativas' }}
              </p>
            }
          }
        </div>
      }

      @if (canReadRoles()) {
        <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-violet-950 flex items-center justify-center shrink-0">
              <mat-icon class="text-violet-400">admin_panel_settings</mat-icon>
            </div>
            <span class="text-[var(--text-secondary)] text-sm flex-1">Total de roles</span>
            @if (statsError()) {
              <mat-icon class="text-yellow-400 !text-[18px]"
                        matTooltip="Falha ao carregar. Tente recarregar a página.">warning</mat-icon>
            }
          </div>
          @if (statsLoading()) {
            <div class="skeleton h-8 w-16 rounded"></div>
          } @else {
            <p class="text-3xl font-bold text-[var(--text-primary)] leading-none">
              {{ stats()?.totalRoles ?? '—' }}
            </p>
          }
        </div>
      }

      <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center shrink-0">
            <mat-icon class="text-emerald-400">key</mat-icon>
          </div>
          <span class="text-[var(--text-secondary)] text-sm">Suas permissões</span>
        </div>
        <p class="text-3xl font-bold text-[var(--text-primary)] leading-none">{{ totalPermissions() }}</p>
      </div>
    </div>

    @if (statsError() && !statsLoading()) {
      <div class="mt-3 flex items-center gap-2">
        <app-button variant="outlined" icon="refresh" (clicked)="retryStats.emit()">Tentar novamente</app-button>
      </div>
    }

    @if (canReadAudit()) {
      <div class="mt-6">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold text-[var(--text-primary)] m-0">Atividade recente</h3>
          <a routerLink="/app/settings/audit-logs" class="text-xs text-[var(--active-color)] hover:underline">
            Ver todos →
          </a>
        </div>
        <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          @if (activityLoading()) {
            <div class="divide-y divide-[var(--border-color)]">
              @for (i of activitySkeletons(); track i) {
                <div class="flex items-center gap-3 px-4 py-3">
                  <div class="skeleton h-4 w-36 rounded-full"></div>
                  <div class="skeleton h-3.5 w-20 rounded ml-2"></div>
                  <div class="skeleton h-3 w-24 rounded ml-auto"></div>
                </div>
              }
            </div>
          } @else if (recentActivity().length === 0) {
            <p class="text-[var(--text-muted)] text-sm text-center py-6">Nenhuma atividade registrada.</p>
          } @else {
            <div class="divide-y divide-[var(--border-color)]">
              @for (log of recentActivityWithBadge(); track log.id) {
                <div class="flex items-center gap-3 px-4 py-3">
                  <span class="shrink-0 {{ log.badgeClass }}">
                    {{ log.action }}
                  </span>
                  <span class="text-[var(--text-secondary)] text-sm truncate flex-1">{{ log.who }}</span>
                  <span class="text-[var(--text-muted)] text-xs whitespace-nowrap">
                    {{ log.timestamp | dateFormat:'rel' }}
                  </span>
                </div>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class DashboardAdminSectionComponent {
  readonly canReadUsers = input.required<boolean>();
  readonly canReadRoles = input.required<boolean>();
  readonly canReadAudit = input.required<boolean>();
  readonly stats = input<StatsResponse | null>(null);
  readonly statsLoading = input.required<boolean>();
  readonly statsError = input.required<boolean>();
  readonly disabledUsers = input<number | null>(null);
  readonly totalPermissions = input.required<number>();
  readonly recentActivity = input<AuditLogResponse[]>([]);
  readonly activityLoading = input.required<boolean>();
  readonly activitySkeletons = input<unknown[]>([]);

  readonly retryStats = output<void>();

  readonly recentActivityWithBadge = computed(() =>
    this.recentActivity().map((log) => ({ ...log, badgeClass: badgeFor(log.action) })),
  );
}

export function badgeFor(action: string): string {
  if (/TOTP|BACKUP/.test(action)) return 'cs-badge cs-badge--success';
  if (/DELETED|REMOVED|LOCKED|THEFT|FAILED|DISABLED/.test(action)) return 'cs-badge cs-badge--danger';
  if (/CREATED|ENABLED|VERIFIED|REGISTERED|ASSIGNED|CONFIRMED|COMPLETED/.test(action)) return 'cs-badge cs-badge--success';
  if (/LOGGED_IN|LOGGED_OUT|SESSIONS/.test(action)) return 'cs-badge cs-badge--info';
  if (/RESET|PASSWORD|CHANGE|EMAIL/.test(action)) return 'cs-badge cs-badge--warning';
  return 'cs-badge cs-badge--default';
}
