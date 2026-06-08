import {
  ChangeDetectionStrategy,
  Component,
  TemplateRef,
  computed,
  effect,
  input,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { EmptyStateComponent } from '../../empty-state/empty-state.component';

export interface TableColumn<T = Record<string, unknown>> {
  key: string;
  label: string;
  sortable?: boolean;
  cellTemplate?: TemplateRef<{ row: T; value: unknown }>;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTableModule, MatPaginatorModule, NgTemplateOutlet, EmptyStateComponent],
  template: `
    <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      @if (loading()) {
        <div class="divide-y divide-[var(--border-color)]">
          @for (i of skeletonRowsArr(); track i) {
            <div class="flex items-center gap-4 px-6 py-4">
              @for (col of columns(); track col.key; let first = $first; let last = $last) {
                <div
                  class="skeleton h-4 rounded"
                  [style.width.rem]="first ? 8 : last ? 4 : 6"
                  [class.ml-auto]="last"
                ></div>
              }
            </div>
          }
        </div>
      } @else if (dataSource.data.length === 0) {
        <app-empty-state [message]="emptyMessage()" [icon]="emptyIcon()" />
      } @else {
        <div class="overflow-x-auto">
          <table
            mat-table
            [dataSource]="dataSource"
            class="cs-table w-full"
            [attr.aria-label]="ariaLabel()"
          >
            @for (col of columns(); track col.key; let first = $first) {
              <ng-container [matColumnDef]="col.key">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                  [class.!pl-6]="first"
                >
                  {{ col.label }}
                </th>
                <td mat-cell *matCellDef="let row" [class.!pl-6]="first">
                  @if (col.cellTemplate) {
                    <ng-template
                      [ngTemplateOutlet]="col.cellTemplate"
                      [ngTemplateOutletContext]="{ row: row, value: row[col.key] }"
                    />
                  } @else {
                    {{ row[col.key] }}
                  }
                </td>
              </ng-container>
            }

            <tr mat-header-row *matHeaderRowDef="columnKeys()"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: columnKeys()"
              class="hover:bg-[var(--surface-hover)] transition-colors"
            ></tr>
          </table>
        </div>

        @if (paginate()) {
          <mat-paginator
            [pageSize]="pageSize()"
            [pageSizeOptions]="pageSizeOptions()"
            class="cs-table-paginator border-t border-[var(--border-color)]"
          />
        }
      }
    </div>
  `,
})
export class DataTableComponent<T extends Record<string, unknown>> {
  readonly rows            = input.required<T[]>();
  readonly columns         = input.required<TableColumn<T>[]>();
  readonly loading         = input<boolean>(false);
  readonly emptyMessage    = input<string>('Nenhum registro encontrado.');
  readonly emptyIcon       = input<string>('table_rows');
  readonly ariaLabel       = input<string>('Tabela de dados');
  readonly paginate        = input<boolean>(true);
  readonly pageSize        = input<number>(10);
  readonly pageSizeOptions = input<number[]>([10, 25, 50]);
  readonly skeletonCount   = input<number>(8);

  private readonly paginatorRef = viewChild(MatPaginator);

  readonly dataSource = new MatTableDataSource<T>([]);

  readonly columnKeys      = computed(() => this.columns().map((c) => c.key));
  readonly skeletonRowsArr = computed(() => Array(this.skeletonCount()).fill(0));

  constructor() {
    effect(() => {
      this.dataSource.data = this.rows();
    });
    effect(() => {
      const p = this.paginatorRef();
      if (p) this.dataSource.paginator = p;
    });
  }
}
