import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface DevStats {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
}

@Component({
  selector: 'app-dev-stats-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  styles: [`
    .stat-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      padding: 16px 8px;
      border-radius: 12px;
      border: 1px solid var(--border-color);
      background: var(--surface-color);
      text-align: center;
    }
    .stat-value {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1;
    }
    .stat-label {
      font-size: 0.7rem;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
  `],
  template: `
    <section>
      <h4 class="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-widest mb-3">
        Estatísticas
      </h4>
      @if (loading()) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton h-20 rounded-xl"></div>
          }
        </div>
      } @else if (stats()) {
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="stat-card">
            <mat-icon class="!text-blue-400 !text-[20px]">group</mat-icon>
            <span class="stat-value">{{ stats()!.totalUsers }}</span>
            <span class="stat-label">Usuários totais</span>
          </div>
          <div class="stat-card">
            <mat-icon class="!text-green-400 !text-[20px]">check_circle</mat-icon>
            <span class="stat-value">{{ stats()!.activeUsers }}</span>
            <span class="stat-label">Ativos</span>
          </div>
          <div class="stat-card">
            <mat-icon class="!text-violet-400 !text-[20px]">admin_panel_settings</mat-icon>
            <span class="stat-value">{{ stats()!.totalRoles }}</span>
            <span class="stat-label">Roles</span>
          </div>
          <div class="stat-card">
            <mat-icon class="!text-emerald-400 !text-[20px]">key</mat-icon>
            <span class="stat-value">{{ stats()!.totalPermissions }}</span>
            <span class="stat-label">Permissões</span>
          </div>
        </div>
      }
    </section>
  `,
})
export class DevStatsSectionComponent {
  readonly stats = input<DevStats | null>(null);
  readonly loading = input(false);
}
