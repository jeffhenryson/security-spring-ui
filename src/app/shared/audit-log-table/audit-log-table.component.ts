import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditLogResponse } from '../../core/admin/audit-logs.service';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { DateFormatPipe } from '../date-format.pipe';
import { auditBadgeClass, AUDIT_CRITICAL_EVENTS } from '../audit-log.constants';

@Component({
  selector: 'app-audit-log-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatPaginatorModule, MatIconModule, MatTooltipModule, EmptyStateComponent, DateFormatPipe],
  template: `
    <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      @if (loading()) {
        <div class="divide-y divide-[var(--border-color)]">
          @for (i of skeletonRows; track i) {
            <div class="flex items-center gap-4 px-6 py-4">
              <div class="skeleton h-3.5 w-32 rounded"></div>
              <div class="skeleton h-5 w-36 rounded-full"></div>
              <div class="skeleton h-3.5 w-20 rounded ml-2"></div>
              <div class="skeleton h-3.5 flex-1 rounded ml-2"></div>
            </div>
          }
        </div>
      } @else if (rows().length === 0) {
        <app-empty-state [message]="emptyMessage()" icon="history" />
      } @else {
        <div class="overflow-x-auto">
          <table mat-table [dataSource]="rows()" class="w-full" [attr.aria-label]="ariaLabel()">
            <ng-container matColumnDef="timestamp">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs !pl-6">Data/hora</th>
              <td mat-cell *matCellDef="let l" class="!text-[var(--text-secondary)] !text-xs !pl-6 whitespace-nowrap">
                {{ l.timestamp | dateFormat }}
              </td>
            </ng-container>

            <ng-container matColumnDef="action">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                {{ showCriticalBadge() ? 'Evento' : 'Ação' }}
              </th>
              <td mat-cell *matCellDef="let l" class="!py-2">
                <div class="flex items-center gap-1.5">
                  @if (showCriticalBadge() && isCritical(l.action)) {
                    <mat-icon class="!text-[14px] !w-[14px] !h-[14px] text-red-400"
                              matTooltip="Evento crítico de segurança">warning</mat-icon>
                  }
                  <span class="px-2 py-0.5 rounded text-xs font-mono font-medium {{ badgeClass(l.action) }}">
                    {{ l.action }}
                  </span>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="who">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">Autor</th>
              <td mat-cell *matCellDef="let l" class="!text-[var(--text-primary)] !text-sm !font-medium">
                {{ l.who }}
              </td>
            </ng-container>

            <ng-container matColumnDef="target">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">Alvo</th>
              <td mat-cell *matCellDef="let l" class="!text-[var(--text-secondary)] !text-sm">
                {{ l.target ?? '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="ipAddress">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">IP</th>
              <td mat-cell *matCellDef="let l"
                  class="!text-[var(--text-muted)] !text-xs max-w-xs truncate !pr-4"
                  [matTooltip]="l.ipAddress ?? ''">
                {{ l.ipAddress ?? '—' }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"
                [class]="rowClass(row.action)"
                class="transition-colors">
            </tr>
          </table>
        </div>
        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="pageSizeOptions()"
          (page)="pageChange.emit($event)"
          class="border-t border-[var(--border-color)]"
        />
      }
    </div>
  `,
})
export class AuditLogTableComponent {
  readonly rows = input.required<AuditLogResponse[]>();
  readonly loading = input.required<boolean>();
  readonly total = input.required<number>();
  readonly pageSize = input(25);
  readonly pageSizeOptions = input([25, 50, 100]);
  readonly showCriticalBadge = input(false);
  readonly emptyMessage = input('Nenhum log encontrado.');
  readonly ariaLabel = input('Logs de auditoria');

  readonly pageChange = output<PageEvent>();

  readonly cols = ['timestamp', 'action', 'who', 'target', 'ipAddress'];
  readonly skeletonRows = Array(8).fill(0);

  isCritical(action: string): boolean {
    return AUDIT_CRITICAL_EVENTS.has(action);
  }

  badgeClass(action: string): string {
    return auditBadgeClass(action);
  }

  rowClass(action: string): string {
    if (this.showCriticalBadge() && this.isCritical(action)) {
      return 'hover:bg-red-950/30';
    }
    return 'hover:bg-[var(--surface-hover)]';
  }
}
