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

const ACTION_COLORS: Record<string, string> = {
  USER_LOGGED_IN: 'bg-blue-950 text-blue-300',
  USER_LOGGED_OUT: 'bg-blue-950 text-blue-400',
  LOGIN_FAILED: 'bg-orange-950 text-orange-300',
  ACCOUNT_LOCKED: 'bg-red-950 text-red-300',
  TOKEN_THEFT_DETECTED: 'bg-red-950 text-red-300',
  USER_REGISTERED: 'bg-green-950 text-green-300',
  USER_CREATED: 'bg-green-950 text-green-300',
  USER_DELETED: 'bg-red-950 text-red-400',
  USER_UPDATED: 'bg-sky-950 text-sky-300',
  USER_ENABLED: 'bg-green-950 text-green-400',
  USER_DISABLED: 'bg-red-950 text-red-300',
  USER_ROLE_ASSIGNED: 'bg-violet-950 text-violet-300',
  USER_ROLE_REMOVED: 'bg-violet-950 text-violet-400',
  USER_PASSWORD_CHANGED: 'bg-yellow-950 text-yellow-300',
  USER_EMAIL_CHANGED: 'bg-yellow-950 text-yellow-300',
  USER_EMAIL_VERIFIED: 'bg-green-950 text-green-300',
  USER_SESSIONS_CLEARED: 'bg-orange-950 text-orange-300',
  ROLE_CREATED: 'bg-violet-950 text-violet-300',
  ROLE_DELETED: 'bg-red-950 text-red-300',
  PERMISSION_CREATED: 'bg-emerald-950 text-emerald-300',
  PERMISSION_DELETED: 'bg-red-950 text-red-300',
  PERMISSION_ASSIGNED_TO_ROLE: 'bg-emerald-950 text-emerald-300',
  PERMISSION_REMOVED_FROM_ROLE: 'bg-emerald-950 text-emerald-400',
  TOTP_ENABLED: 'bg-teal-950 text-teal-300',
  TOTP_DISABLED: 'bg-teal-950 text-teal-400',
  TOTP_BACKUP_CODES_REGENERATED: 'bg-teal-950 text-teal-300',
  TOTP_REPLACED: 'bg-teal-950 text-teal-300',
  PASSWORD_RESET_REQUESTED: 'bg-yellow-950 text-yellow-300',
  PASSWORD_RESET_COMPLETED: 'bg-green-950 text-green-300',
  EMAIL_CHANGE_REQUESTED: 'bg-yellow-950 text-yellow-300',
  EMAIL_CHANGE_CONFIRMED: 'bg-green-950 text-green-300',
  OAUTH_GOOGLE_LOGIN: 'bg-blue-950 text-blue-300',
  ACCESS_DENIED: 'bg-orange-950 text-orange-300',
  DEV_ELEVATION_COMPLETED: 'bg-amber-950 text-amber-300',
};

// Eventos exclusivos da view DEV — não aparecem no filtro do ADMIN
const DEV_ONLY_EVENTS = new Set([
  'LOGIN_FAILED',
  'ACCOUNT_LOCKED',
  'TOKEN_THEFT_DETECTED',
  'DEV_ELEVATION_COMPLETED',
]);

const KNOWN_ACTIONS = Object.keys(ACTION_COLORS)
  .filter((a) => !DEV_ONLY_EVENTS.has(a))
  .sort();

@Component({
  selector: 'app-audit-logs',
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
      </div>

      <div
        class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden"
      >
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
          <app-empty-state message="Nenhum log encontrado." icon="history" />
        } @else {
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="paged.rows()" class="w-full" aria-label="Logs de auditoria">
              <ng-container matColumnDef="timestamp">
                <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs !pl-6">
                  Data/hora
                </th>
                <td mat-cell *matCellDef="let l" class="!text-[var(--text-secondary)] !text-xs !pl-6 whitespace-nowrap">
                  {{ l.timestamp | dateFormat }}
                </td>
              </ng-container>

              <ng-container matColumnDef="action">
                <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                  Ação
                </th>
                <td mat-cell *matCellDef="let l" class="!py-2">
                  <span class="px-2 py-0.5 rounded text-xs font-mono font-medium {{ badgeClass(l.action) }}">
                    {{ l.action }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="who">
                <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                  Autor
                </th>
                <td mat-cell *matCellDef="let l" class="!text-[var(--text-primary)] !text-sm !font-medium">
                  {{ l.who }}
                </td>
              </ng-container>

              <ng-container matColumnDef="target">
                <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                  Alvo
                </th>
                <td mat-cell *matCellDef="let l" class="!text-[var(--text-secondary)] !text-sm">
                  {{ l.target ?? '—' }}
                </td>
              </ng-container>

              <ng-container matColumnDef="ipAddress">
                <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                  IP
                </th>
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
                class="hover:bg-[var(--surface-hover)] transition-colors"
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
export class AuditLogsComponent implements OnInit {
  private readonly auditLogsService = inject(AuditLogsService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly cols = ['timestamp', 'action', 'who', 'target', 'ipAddress'];
  readonly paged = new PagedState<AuditLogResponse>();
  readonly skeletonRows = Array(8).fill(0);
  readonly availableActions = KNOWN_ACTIONS;

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
      // Remove eventos exclusivos da área DEV — ADMIN não deve visualizá-los.
      res.content = res.content.filter((l) => !DEV_ONLY_EVENTS.has(l.action));
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

  badgeClass(action: string): string {
    return ACTION_COLORS[action] ?? 'bg-[var(--surface-hover)] text-[var(--text-primary)]';
  }

  exportCsv(): void {
    const rows = this.paged.rows();
    if (!rows.length) return;
    const header = 'timestamp,action,who,target,ipAddress';
    const escape = (v: string | null | undefined) => `"${(v ?? '').replace(/"/g, '""')}"`;
    const lines = rows.map(l =>
      [escape(l.timestamp), escape(l.action), escape(l.who), escape(l.target), escape(l.ipAddress)].join(','),
    );
    const blob = new Blob([[header, ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

}
