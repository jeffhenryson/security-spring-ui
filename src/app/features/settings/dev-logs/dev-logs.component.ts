import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuditLogsService, AuditLogResponse, AuditLogFilters } from '../../../core/admin/audit-logs.service';
import { PagedState } from '../../../core/admin/paged-state';
import { AUDIT_ACTION_COLORS } from '../../../shared/audit-log.constants';
import { downloadCsv, csvEscape } from '../../../shared/csv-export';
import { AuditLogTableComponent } from '../../../shared/audit-log-table/audit-log-table.component';

const ALL_ACTIONS = Object.keys(AUDIT_ACTION_COLORS).sort();

@Component({
  selector: 'app-dev-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    AuditLogTableComponent,
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

      <app-audit-log-table
        [rows]="paged.rows()"
        [loading]="paged.loading()"
        [total]="paged.total()"
        [pageSize]="paged.size()"
        [showCriticalBadge]="true"
        ariaLabel="Logs técnicos"
        emptyMessage="Nenhum log encontrado."
        (pageChange)="onPage($event)"
      />
    </div>
  `,
})
export class DevLogsComponent implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly paged = new PagedState<AuditLogResponse>();
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

  exportCsv(): void {
    const rows = this.paged.rows();
    if (!rows.length) return;
    const header = 'timestamp,action,who,target,ipAddress';
    const lines = rows.map((l) =>
      [csvEscape(l.timestamp), csvEscape(l.action), csvEscape(l.who), csvEscape(l.target), csvEscape(l.ipAddress)].join(','),
    );
    downloadCsv(`dev-logs-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines].join('\n'));
  }
}
