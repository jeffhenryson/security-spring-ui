import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../core/auth/auth.store';
import { AppConfigStore } from '../../core/config/app-config.store';
import { PERMISSIONS, ROLES } from '../../core/rbac/permissions.constants';
import { StatsService, StatsResponse } from '../../core/admin/stats.service';
import { AuditLogsService, AuditLogResponse } from '../../core/admin/audit-logs.service';
import { DateFormatPipe } from '../../shared/date-format.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, MatTooltipModule, MatButtonModule, DateFormatPipe],
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

      <!-- Seção exclusiva do usuário comum (sem permissões admin) -->
      @if (isRegularUser()) {
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <!-- Status da conta -->
          <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                 [class]="totpEnabled() ? 'bg-emerald-950' : 'bg-orange-950'">
              <mat-icon [class]="totpEnabled() ? 'text-emerald-400' : 'text-orange-400'">
                {{ totpEnabled() ? 'verified_user' : 'security' }}
              </mat-icon>
            </div>
            <div>
              <p class="text-xs text-[var(--text-secondary)] m-0">Autenticação 2FA</p>
              <p class="text-sm font-semibold m-0" [class]="totpEnabled() ? 'text-emerald-400' : 'text-orange-400'">
                {{ totpEnabled() ? 'Ativo' : 'Não configurado' }}
              </p>
            </div>
          </div>

          <!-- Status do email -->
          <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
                 [class]="emailVerified() ? 'bg-blue-950' : 'bg-yellow-950'">
              <mat-icon [class]="emailVerified() ? 'text-blue-400' : 'text-yellow-400'">
                {{ emailVerified() ? 'mark_email_read' : 'mark_email_unread' }}
              </mat-icon>
            </div>
            <div>
              <p class="text-xs text-[var(--text-secondary)] m-0">Email</p>
              <p class="text-sm font-semibold m-0" [class]="emailVerified() ? 'text-blue-400' : 'text-yellow-400'">
                {{ emailVerified() ? 'Verificado' : (hasEmail() ? 'Pendente' : 'Não cadastrado') }}
              </p>
            </div>
          </div>

          <!-- Suas permissões -->
          <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg shrink-0 bg-cyan-950 flex items-center justify-center">
              <mat-icon class="text-cyan-400">key</mat-icon>
            </div>
            <div>
              <p class="text-xs text-[var(--text-secondary)] m-0">Permissões</p>
              <p class="text-sm font-semibold text-[var(--text-primary)] m-0">{{ totalPermissions() }} ativas</p>
            </div>
          </div>
        </div>

        <!-- Ações rápidas para usuário comum -->
        <div class="mb-6">
          <h3 class="text-sm font-semibold text-[var(--text-primary)] mb-3">Configurações da conta</h3>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <a routerLink="/app/settings/profile"
               class="flex flex-col items-start gap-2 p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors no-underline">
              <mat-icon class="text-[var(--active-color)]">person</mat-icon>
              <span class="text-sm font-medium text-[var(--text-primary)]">Perfil</span>
              <span class="text-xs text-[var(--text-secondary)]">Nome, foto e email</span>
            </a>
            <a routerLink="/app/settings/security"
               class="flex flex-col items-start gap-2 p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors no-underline">
              <mat-icon class="text-violet-400">security</mat-icon>
              <span class="text-sm font-medium text-[var(--text-primary)]">Segurança</span>
              <span class="text-xs text-[var(--text-secondary)]">Senha e 2FA</span>
            </a>
            <a routerLink="/app/settings/theme"
               class="flex flex-col items-start gap-2 p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors no-underline">
              <mat-icon class="text-amber-400">palette</mat-icon>
              <span class="text-sm font-medium text-[var(--text-primary)]">Tema</span>
              <span class="text-xs text-[var(--text-secondary)]">Aparência do sistema</span>
            </a>
          </div>
        </div>
      }

      <!-- Cards de stats (admin/dev) -->
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
                    <span class="text-[var(--text-muted)] text-xs whitespace-nowrap">{{ log.timestamp | dateFormat:'rel' }}</span>
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
  private readonly configStore = inject(AppConfigStore);
  private readonly statsService = inject(StatsService);
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly username = computed(() => this.store.currentUser()?.username ?? '');
  readonly emailUnverified = computed(() =>
    !!this.store.currentUser()?.email && !this.store.isEmailVerified(),
  );
  readonly hasPendingEmail = computed(() => this.store.hasPendingEmail());
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');
  readonly totalPermissions = computed(() => this.store.permissions().length);

  readonly canReadUsers = computed(() => this.store.hasPermission(PERMISSIONS.USER_READ));
  readonly canReadRoles = computed(() => this.store.hasPermission(PERMISSIONS.ROLE_READ));
  readonly canReadAudit = computed(() => this.store.hasPermission(PERMISSIONS.AUDIT_READ));

  // User-level signals
  readonly isRegularUser = computed(() =>
    !this.store.hasRole(ROLES.ROLE_ADMIN) && !this.store.hasRole(ROLES.ROLE_DEV),
  );
  readonly totpEnabled = computed(() => !!this.store.currentUser()?.totpEnabled);
  readonly emailVerified = computed(() => this.store.isEmailVerified());
  readonly hasEmail = computed(() => !!this.store.currentUser()?.email);

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

}
