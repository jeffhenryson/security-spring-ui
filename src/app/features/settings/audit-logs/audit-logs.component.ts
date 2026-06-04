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
import { MatDatepickerModule } from '@angular/material/datepicker';
import { AuditLogsService, AuditLogResponse, AuditLogFilters } from '../../../core/admin/audit-logs.service';
import { PagedState } from '../../../core/admin/paged-state';
import { AUDIT_ACTION_COLORS, AUDIT_DEV_ONLY_EVENTS } from '../../../shared/audit-log.constants';
import { downloadCsv, csvEscape } from '../../../shared/csv-export';
import { AuditLogTableComponent } from '../../../shared/audit-log-table/audit-log-table.component';

const KNOWN_ACTIONS = Object.keys(AUDIT_ACTION_COLORS)
  .filter((a) => !AUDIT_DEV_ONLY_EVENTS.has(a))
  .sort();

@Component({
  selector: 'app-audit-logs',
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
    MatDatepickerModule,
    AuditLogTableComponent,
  ],
  template: `
    <div class="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Logs de auditoria</h3>
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
          <mat-label>Tipo de ação</mat-label>
          <mat-icon matPrefix class="!text-[var(--text-secondary)]">filter_list</mat-icon>
          <mat-select [formControl]="actionControl">
            <mat-option value="">Todas as ações</mat-option>
            @for (action of availableActions; track action) {
              <mat-option [value]="action">{{ action }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="w-full !pb-0 sm:col-span-2">
          <mat-label>Período</mat-label>
          <mat-date-range-input [formGroup]="dateRangeGroup" [rangePicker]="picker">
            <input matStartDate formControlName="start" placeholder="Data início" />
            <input matEndDate formControlName="end" placeholder="Data fim" />
          </mat-date-range-input>
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-date-range-picker #picker />
          @if (hasDateFilter()) {
            <button matSuffix mat-icon-button aria-label="Limpar datas" (click)="clearDateRange()">
              <mat-icon class="!text-[18px]">close</mat-icon>
            </button>
          }
        </mat-form-field>
      </div>

      <app-audit-log-table
        [rows]="paged.rows()"
        [loading]="paged.loading()"
        [total]="paged.total()"
        [pageSize]="paged.size()"
        ariaLabel="Logs de auditoria"
        (pageChange)="onPage($event)"
      />
    </div>
  `,
})
export class AuditLogsComponent implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly paged = new PagedState<AuditLogResponse>();
  readonly availableActions = KNOWN_ACTIONS;

  readonly userIdControl = this.fb.control('');
  readonly actionControl = this.fb.control('');
  readonly dateRangeGroup = this.fb.group({ start: [null as Date | null], end: [null as Date | null] });

  hasDateFilter(): boolean {
    return !!(this.dateRangeGroup.value.start || this.dateRangeGroup.value.end);
  }

  clearDateRange(): void {
    this.dateRangeGroup.reset();
  }

  ngOnInit(): void {
    this.paged.size.set(25);
    this.load();

    const withDebounce = (ctrl: ReturnType<typeof this.fb.control>) =>
      ctrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef));

    withDebounce(this.userIdControl).subscribe(() => { this.paged.page.set(0); this.load(); });
    withDebounce(this.actionControl).subscribe(() => { this.paged.page.set(0); this.load(); });

    // Date range fires only when both dates are filled or cleared
    this.dateRangeGroup.valueChanges.pipe(
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(({ start, end }) => {
      if ((start && end) || (!start && !end)) {
        this.paged.page.set(0);
        this.load();
      }
    });
  }

  private async load(): Promise<void> {
    this.paged.loading.set(true);
    const { start, end } = this.dateRangeGroup.value;
    const filters: AuditLogFilters = {
      action: this.actionControl.value?.trim() || undefined,
      userId: this.userIdControl.value?.trim() || undefined,
      from: start ? toStartOfDay(start) : undefined,
      to: end ? toEndOfDay(end) : undefined,
      excludeDevEvents: true,
    };
    try {
      const res = await this.auditLogsService.list(this.paged.page(), this.paged.size(), filters);
      this.paged.apply(res);
    } catch {
      this.snackBar.open('Erro ao carregar logs de auditoria.', 'OK', { duration: 3000 });
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
    const lines = rows.map(l =>
      [csvEscape(l.timestamp), csvEscape(l.action), csvEscape(l.who), csvEscape(l.target), csvEscape(l.ipAddress)].join(','),
    );
    downloadCsv(`audit-logs-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines].join('\n'));
  }
}

function toStartOfDay(d: Date): string {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy.toISOString();
}

function toEndOfDay(d: Date): string {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy.toISOString();
}
