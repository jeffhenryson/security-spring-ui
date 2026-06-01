import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../core/auth/auth.store';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { StatsService, StatsResponse } from '../../core/admin/stats.service';
import { AuditLogsService, AuditLogResponse } from '../../core/admin/audit-logs.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatTooltipModule, MatButtonModule],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <!-- Saudação -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-[var(--text-primary)]">Olá, {{ username() }}!</h2>
        <p class="text-[var(--text-secondary)] text-sm mt-1">Bem-vindo ao painel de controle.</p>
      </div>

      <!-- Banner: email não verificado -->
      @if (emailUnverified()) {
        <div
          class="mb-4 flex items-start gap-3 p-4 bg-yellow-950/60 border border-yellow-600/50 rounded-xl"
        >
          <mat-icon class="text-yellow-400 shrink-0 mt-0.5">warning</mat-icon>
          <div class="flex-1 min-w-0">
            <p class="text-yellow-300 text-sm font-medium">Email não verificado</p>
            <p class="text-yellow-400/70 text-xs mt-0.5">
              Verifique seu email para ativar todos os recursos da conta.
            </p>
          </div>
          <a
            routerLink="/auth/verify-email"
            class="text-yellow-400 text-xs font-medium hover:underline whitespace-nowrap mt-0.5"
          >
            Verificar agora →
          </a>
        </div>
      }

      <!-- Banner: troca de email pendente -->
      @if (hasPendingEmail()) {
        <div
          class="mb-4 flex items-start gap-3 p-4 bg-blue-950/60 border border-blue-600/50 rounded-xl"
        >
          <mat-icon class="text-blue-400 shrink-0 mt-0.5">mail</mat-icon>
          <div class="flex-1 min-w-0">
            <p class="text-blue-300 text-sm font-medium">Confirmação de email pendente</p>
            <p class="text-blue-400/70 text-xs mt-0.5">
              Confirme a troca para
              <span class="font-medium text-blue-300">{{ pendingEmail() }}</span
              >. Verifique sua caixa de entrada.
            </p>
          </div>
        </div>
      }

      <!-- Cards de stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" aria-live="polite">
        <!-- Card: Total de usuários (só com USER_READ) -->
        @if (canReadUsers()) {
          <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-10 h-10 rounded-lg bg-cyan-950 flex items-center justify-center shrink-0"
              >
                <mat-icon class="text-cyan-400">group</mat-icon>
              </div>
              <span class="text-[var(--text-secondary)] text-sm flex-1">Total de usuários</span>
              @if (statsError()) {
                <mat-icon
                  class="text-yellow-400 !text-[18px]"
                  matTooltip="Falha ao carregar. Tente recarregar a página."
                  >warning</mat-icon
                >
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

          <!-- Card: Usuários desabilitados (só com USER_READ) -->
          <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-10 h-10 rounded-lg bg-red-950 flex items-center justify-center shrink-0"
              >
                <mat-icon class="text-red-400">person_off</mat-icon>
              </div>
              <span class="text-[var(--text-secondary)] text-sm flex-1">Desabilitados</span>
              @if (statsError()) {
                <mat-icon
                  class="text-yellow-400 !text-[18px]"
                  matTooltip="Falha ao carregar. Tente recarregar a página."
                  >warning</mat-icon
                >
              }
            </div>
            @if (statsLoading()) {
              <div class="skeleton h-8 w-16 rounded mb-1"></div>
              <div class="skeleton h-3 w-24 rounded"></div>
            } @else {
              <p
                class="text-3xl font-bold leading-none"
                [class.text-red-400]="(disabledUsers() ?? 0) > 0"
                [class.text-[var(--text-primary)]]="(disabledUsers() ?? 0) === 0"
              >
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

        <!-- Card: Total de roles (só com ROLE_READ) -->
        @if (canReadRoles()) {
          <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-10 h-10 rounded-lg bg-violet-950 flex items-center justify-center shrink-0"
              >
                <mat-icon class="text-violet-400">admin_panel_settings</mat-icon>
              </div>
              <span class="text-[var(--text-secondary)] text-sm flex-1">Total de roles</span>
              @if (statsError()) {
                <mat-icon
                  class="text-yellow-400 !text-[18px]"
                  matTooltip="Falha ao carregar. Tente recarregar a página."
                  >warning</mat-icon
                >
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

        <!-- Card: Suas permissões (sempre visível) -->
        <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <div
              class="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center shrink-0"
            >
              <mat-icon class="text-emerald-400">key</mat-icon>
            </div>
            <span class="text-[var(--text-secondary)] text-sm">Suas permissões</span>
          </div>
          <p class="text-3xl font-bold text-[var(--text-primary)] leading-none">{{ totalPermissions() }}</p>
        </div>
      </div>

      <!-- Retry quando as stats falharam -->
      @if (statsError() && !statsLoading()) {
        <div class="mt-3 flex items-center gap-2">
          <button mat-stroked-button (click)="retryStats()">
            <mat-icon>refresh</mat-icon>
            Tentar novamente
          </button>
        </div>
      }

      <!-- Feed de atividade recente (só com AUDIT_READ) -->
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
                @for (i of activitySkeletons; track i) {
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
                @for (log of recentActivity(); track log.id) {
                  <div class="flex items-center gap-3 px-4 py-3">
                    <span class="px-2 py-0.5 rounded text-xs font-mono font-medium shrink-0 {{ activityBadge(log.action) }}">
                      {{ log.action }}
                    </span>
                    <span class="text-[var(--text-secondary)] text-sm truncate flex-1">{{ log.who }}</span>
                    <span class="text-[var(--text-muted)] text-xs whitespace-nowrap">{{ fmtRelative(log.timestamp) }}</span>
                  </div>
                }
              </div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly statsService = inject(StatsService);
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly username = computed(() => this.store.currentUser()?.username ?? '');
  readonly emailUnverified = computed(() => !this.store.isEmailVerified());
  readonly hasPendingEmail = computed(() => this.store.hasPendingEmail());
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');
  readonly totalPermissions = computed(() => this.store.permissions().length);

  readonly canReadUsers = computed(() => this.store.hasPermission(PERMISSIONS.USER_READ));
  readonly canReadRoles = computed(() => this.store.hasPermission(PERMISSIONS.ROLE_READ));
  readonly canReadAudit = computed(() => this.store.hasPermission(PERMISSIONS.AUDIT_READ));

  readonly disabledUsers = computed(() => {
    const s = this.stats();
    return s ? s.totalUsers - s.activeUsers : null;
  });

  readonly statsLoading = signal(true);
  readonly statsError = signal(false);
  readonly stats = signal<StatsResponse | null>(null);

  readonly activityLoading = signal(false);
  readonly recentActivity = signal<AuditLogResponse[]>([]);
  readonly activitySkeletons = Array(5).fill(0);

  ngOnInit(): void {
    if (this.canReadUsers() || this.canReadRoles()) this.fetchStats();
    if (this.canReadAudit()) void this.fetchActivity();
  }

  retryStats(): void {
    void this.fetchStats();
  }

  private async fetchStats(): Promise<void> {
    this.statsLoading.set(true);
    this.statsError.set(false);
    try {
      const res = await this.statsService.get();
      this.stats.set(res);
    } catch {
      this.stats.set(null);
      this.statsError.set(true);
      this.snackBar.open('Erro ao carregar estatísticas.', 'OK', { duration: 3000 });
    } finally {
      this.statsLoading.set(false);
    }
  }

  private async fetchActivity(): Promise<void> {
    this.activityLoading.set(true);
    try {
      const res = await this.auditLogsService.list(0, 5);
      this.recentActivity.set(res.content);
    } catch {
      // silencioso — feed é secundário
    } finally {
      this.activityLoading.set(false);
    }
  }

  activityBadge(action: string): string {
    if (/DELETED|REMOVED|LOCKED|THEFT|FAILED|DISABLED/.test(action)) return 'bg-red-950 text-red-300';
    if (/CREATED|ENABLED|VERIFIED|REGISTERED|ASSIGNED|CONFIRMED|COMPLETED/.test(action)) return 'bg-green-950 text-green-300';
    if (/LOGGED_IN|LOGGED_OUT|SESSIONS/.test(action)) return 'bg-blue-950 text-blue-300';
    if (/TOTP|BACKUP/.test(action)) return 'bg-teal-950 text-teal-300';
    if (/RESET|PASSWORD|CHANGE|EMAIL/.test(action)) return 'bg-yellow-950 text-yellow-300';
    return 'bg-[var(--surface-hover)] text-[var(--text-primary)]';
  }

  fmtRelative(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return `${m}min atrás`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h atrás`;
    return `${Math.floor(h / 24)}d atrás`;
  }
}
