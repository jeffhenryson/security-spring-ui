import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuditLogsService, AuditLogResponse, AuditLogFilters } from '../../../core/admin/audit-logs.service';
import { EmptyStateComponent } from '../../../shared/empty-state/empty-state.component';
import { PagedState } from '../../../core/admin/paged-state';
import { DateFormatPipe } from '../../../shared/date-format.pipe';
import { AUDIT_ACTION_COLORS, AUDIT_CRITICAL_EVENTS, auditBadgeClass } from '../../../shared/audit-log.constants';

const ALL_ACTIONS = Object.keys(AUDIT_ACTION_COLORS).sort();

@Component({
  selector: 'app-dev-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    EmptyStateComponent,
    DateFormatPipe,
  ],
  template: `
    <div class="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Logs técnicos</h3>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            DEV
          </span>
        </div>
        <button
          mat-stroked-button
          (click)="exportCsv()"
          [disabled]="paged.rows().length === 0"
          matTooltip="Exportar página atual como CSV"
        >
          <mat-icon>download</mat-icon>
          Exportar CSV
        </button>
      </div>

      <!-- Filtros -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <mat-form-field appearance="outline" class="w-full !pb-0">
          <mat-label>Filtrar por usuário</mat-label>
          <mat-icon matPrefix class="!text-[var(--text-secondary)]">person_search</mat-icon>
          <input matInput [formControl]="userIdControl" placeholder="Ex: admin" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full !pb-0">
          <mat-label>Tipo de evento</mat-label>
          <mat-icon matPrefix class="!text-[var(--text-secondary)]">filter_list</mat-icon>
          <mat-select [formControl]="actionControl">
            <mat-option value="">Todos os eventos</mat-option>
            @for (action of availableActions; track action) {
              <mat-option [value]="action">{{ action }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        @if (paged.loading()) {
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
        } @else if (paged.rows().length === 0) {
          <app-empty-state message="Nenhum log encontrado." icon="terminal" />
        } @else {
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="paged.rows()" class="w-full" aria-label="Logs técnicos">
              <ng-container matColumnDef="timestamp">
                <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs !pl-6">Data/hora</th>
                <td mat-cell *matCellDef="let l" class="!text-[var(--text-secondary)] !text-xs !pl-6 whitespace-nowrap">
                  {{ l.timestamp | dateFormat }}
                </td>
              </ng-container>

              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">Evento</th>
                <td mat-cell *matCellDef="let l" class="!py-2">
                  <div class="flex items-center gap-1.5">
                    @if (isCritical(l.action)) {
                      <mat-icon class="!text-[14px] !w-[14px] !h-[14px] text-red-400" matTooltip="Evento crítico de segurança">
                        warning
                      </mat-icon>
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
                <td
                  mat-cell
                  *matCellDef="let l"
                  class="!text-[var(--text-muted)] !text-xs max-w-xs truncate !pr-4"
                  [matTooltip]="l.ipAddress ?? ''"
                >
                  {{ l.ipAddress ?? '—' }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="cols"></tr>
              <tr
                mat-row
                *matRowDef="let row; columns: cols"
                [class]="isCritical(row.action) ? 'hover:bg-red-950/30 transition-colors' : 'hover:bg-[var(--surface-hover)] transition-colors'"
              ></tr>
            </table>
          </div>
          <mat-paginator
            [length]="paged.total()"
            [pageSize]="paged.size()"
            [pageSizeOptions]="[25, 50, 100]"
            (page)="onPage($event)"
            class="border-t border-[var(--border-color)]"
          />
        }
      </div>
    </div>
  `,
})
export class DevLogsComponent implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly cols = ['timestamp', 'action', 'who', 'target', 'ipAddress'];
  readonly paged = new PagedState<AuditLogResponse>();
  readonly skeletonRows = Array(8).fill(0);
  readonly availableActions = ALL_ACTIONS;

  readonly userIdControl = this.fb.control('');
  readonly actionControl = this.fb.control('');

  ngOnInit(): void {
    this.paged.size.set(25);
    this.load();

    const withDebounce = (ctrl: ReturnType<typeof this.fb.control>) =>
      ctrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef));

    withDebounce(this.userIdControl).subscribe(() => { this.paged.page.set(0); this.load(); });
    withDebounce(this.actionControl).subscribe(() => { this.paged.page.set(0); this.load(); });
  }

  private async load(): Promise<void> {
    this.paged.loading.set(true);
    const filters: AuditLogFilters = {
      action: this.actionControl.value?.trim() || undefined,
      userId: this.userIdControl.value?.trim() || undefined,
    };
    try {
      const res = await this.auditLogsService.list(this.paged.page(), this.paged.size(), filters);
      this.paged.apply(res);
    } catch {
      this.snackBar.open('Erro ao carregar logs técnicos.', 'OK', { duration: 3000 });
    } finally {
      this.paged.loading.set(false);
    }
  }

  onPage(e: import('@angular/material/paginator').PageEvent): void {
    this.paged.onPage(e);
    this.load();
  }

  isCritical(action: string): boolean {
    return AUDIT_CRITICAL_EVENTS.has(action);
  }

  badgeClass(action: string): string {
    return auditBadgeClass(action);
  }

  exportCsv(): void {
    const rows = this.paged.rows();
    if (!rows.length) return;
    const header = 'timestamp,action,who,target,ipAddress';
    const escape = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map((l) =>
      [escape(l.timestamp), escape(l.action), escape(l.who), escape(l.target), escape(l.ipAddress)].join(','),
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dev-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

}
