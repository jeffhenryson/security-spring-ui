import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../core/auth/auth.store';
import { PERMISSIONS, ROLES } from '../../core/rbac/permissions.constants';
import { StatsService, StatsResponse } from '../../core/admin/stats.service';
import { AuditLogsService, AuditLogResponse } from '../../core/admin/audit-logs.service';
import { DashboardUserSectionComponent } from './dashboard-user-section.component';
import { DashboardAdminSectionComponent } from './dashboard-admin-section.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule, DashboardUserSectionComponent, DashboardAdminSectionComponent],
  template: `
    <div class="p-6 max-w-5xl mx-auto">
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-[var(--text-primary)]">Olá, {{ username() }}!</h2>
        <p class="text-[var(--text-secondary)] text-sm mt-1">Bem-vindo ao painel de controle.</p>
      </div>

      @if (emailUnverified()) {
        <div class="mb-4 flex items-start gap-3 p-4 bg-yellow-950/60 border border-yellow-600/50 rounded-xl">
          <mat-icon class="text-yellow-400 shrink-0 mt-0.5">warning</mat-icon>
          <div class="flex-1 min-w-0">
            <p class="text-yellow-300 text-sm font-medium">Email não verificado</p>
            <p class="text-yellow-400/70 text-xs mt-0.5">Verifique seu email para ativar todos os recursos da conta.</p>
          </div>
          <a routerLink="/auth/verify-email"
             class="text-yellow-400 text-xs font-medium hover:underline whitespace-nowrap mt-0.5">
            Verificar agora →
          </a>
        </div>
      }

      @if (hasPendingEmail()) {
        <div class="mb-4 flex items-start gap-3 p-4 bg-blue-950/60 border border-blue-600/50 rounded-xl">
          <mat-icon class="text-blue-400 shrink-0 mt-0.5">mail</mat-icon>
          <div class="flex-1 min-w-0">
            <p class="text-blue-300 text-sm font-medium">Confirmação de email pendente</p>
            <p class="text-blue-400/70 text-xs mt-0.5">
              Confirme a troca para
              <span class="font-medium text-blue-300">{{ pendingEmail() }}</span>. Verifique sua caixa de entrada.
            </p>
          </div>
        </div>
      }

      @if (isRegularUser()) {
        <app-dashboard-user-section
          [totpEnabled]="totpEnabled()"
          [emailVerified]="emailVerified()"
          [hasEmail]="hasEmail()"
          [totalPermissions]="totalPermissions()"
        />
      }

      <app-dashboard-admin-section
        [canReadUsers]="canReadUsers()"
        [canReadRoles]="canReadRoles()"
        [canReadAudit]="canReadAudit()"
        [stats]="stats()"
        [statsLoading]="statsLoading()"
        [statsError]="statsError()"
        [disabledUsers]="disabledUsers()"
        [totalPermissions]="totalPermissions()"
        [recentActivity]="recentActivity()"
        [activityLoading]="activityLoading()"
        [activitySkeletons]="activitySkeletons"
        (retryStats)="retryStats()"
      />
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly statsService = inject(StatsService);
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly username = computed(() => this.store.currentUser()?.username ?? '');
  readonly emailUnverified = computed(() => !!this.store.currentUser()?.email && !this.store.isEmailVerified());
  readonly hasPendingEmail = computed(() => this.store.hasPendingEmail());
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');
  readonly totalPermissions = computed(() => this.store.permissions().length);

  readonly canReadUsers = computed(() => this.store.hasPermission(PERMISSIONS.USER_READ));
  readonly canReadRoles = computed(() => this.store.hasPermission(PERMISSIONS.ROLE_READ));
  readonly canReadAudit = computed(() => this.store.hasPermission(PERMISSIONS.AUDIT_READ));

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
      this.stats.set(await this.statsService.get());
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
}
