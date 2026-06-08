import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EmptyStateComponent } from '../../../shared/empty-state/empty-state.component';
import { DateFormatPipe } from '../../../shared/date-format.pipe';
import { UserResponse as User } from '../../../core/admin/users-admin.service';

@Component({
  selector: 'app-user-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    EmptyStateComponent,
    DateFormatPipe,
  ],
  styles: [`
    @keyframes row-flash {
      0%   { background-color: color-mix(in srgb, var(--active-color) 18%, transparent); }
      100% { background-color: transparent; }
    }
    .row-flash { animation: row-flash 1.4s ease-out; }
  `],
  template: `
    <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
      @if (loading()) {
        <div class="divide-y divide-[var(--border-color)]">
          @for (i of skeletonRows(); track i) {
            <div class="flex items-center gap-4 px-6 py-4">
              <div class="skeleton h-4 w-28 rounded"></div>
              <div class="skeleton h-4 w-40 rounded ml-6"></div>
              <div class="skeleton h-5 w-12 rounded-full ml-6"></div>
              <div class="flex gap-2 ml-6">
                <div class="skeleton h-5 w-16 rounded-full"></div>
              </div>
              <div class="skeleton h-4 w-16 rounded ml-auto"></div>
            </div>
          }
        </div>
      } @else if (rows().length === 0) {
        <app-empty-state message="Nenhum usuário encontrado." icon="group" />
      } @else {
        <div class="overflow-x-auto">
          <table
            mat-table
            matSort
            [matSortActive]="sortActive()"
            [matSortDirection]="sortDir()"
            (matSortChange)="sortChange.emit($event)"
            [dataSource]="rows()"
            class="cs-table w-full"
            aria-label="Tabela de usuários"
          >
            <ng-container matColumnDef="username">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!text-[var(--text-secondary)] !text-xs !pl-6">
                Usuário
              </th>
              <td mat-cell *matCellDef="let u" class="!text-[var(--text-primary)] !font-medium !pl-6">
                {{ u.username }}
              </td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!text-[var(--text-secondary)] !text-xs">
                Email
              </th>
              <td mat-cell *matCellDef="let u" class="!text-[var(--text-secondary)] !text-sm">
                {{ u.email }}
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">Status</th>
              <td mat-cell *matCellDef="let u">
                <span [class]="u.enabled ? 'cs-badge cs-badge--success' : 'cs-badge cs-badge--default'">
                  {{ u.enabled ? 'Ativo' : 'Inativo' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="roles">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">Roles</th>
              <td mat-cell *matCellDef="let u" class="!py-2">
                @if (u.roles.length === 0) {
                  <span class="text-[var(--text-muted)] text-xs">—</span>
                } @else {
                  <mat-chip-set>
                    @for (r of u.roles; track r) {
                      <mat-chip class="!text-xs">{{ r }}</mat-chip>
                    }
                  </mat-chip-set>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef mat-sort-header class="!text-[var(--text-secondary)] !text-xs">Criado em</th>
              <td mat-cell *matCellDef="let u" class="!text-[var(--text-secondary)] !text-sm whitespace-nowrap">
                {{ u.createdAt ? (u.createdAt | dateFormat) : '—' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="!text-right !pr-4"></th>
              <td mat-cell *matCellDef="let u" class="!text-right !pr-2 whitespace-nowrap">
                @if (canUpdate()) {
                  <button mat-icon-button (click)="editUser.emit(u)"
                    [attr.aria-label]="'Editar ' + u.username" matTooltip="Editar"
                    class="!text-[var(--text-secondary)] hover:!text-cyan-400">
                    <mat-icon>edit</mat-icon>
                  </button>
                }
                @if (canSetStatus()) {
                  <button mat-icon-button
                    [matTooltip]="u.enabled ? 'Desativar' : 'Ativar'"
                    [attr.aria-label]="(u.enabled ? 'Desativar ' : 'Ativar ') + u.username"
                    (click)="toggleStatus.emit(u)"
                    class="!text-[var(--text-secondary)] hover:!text-yellow-400">
                    <mat-icon>{{ u.enabled ? 'block' : 'check_circle' }}</mat-icon>
                  </button>
                }
                @if (canAssignRole()) {
                  <button mat-icon-button (click)="manageRoles.emit(u)"
                    [attr.aria-label]="'Gerenciar roles de ' + u.username" matTooltip="Gerenciar roles"
                    class="!text-[var(--text-secondary)] hover:!text-violet-400">
                    <mat-icon>admin_panel_settings</mat-icon>
                  </button>
                }
                @if (canDelete()) {
                  <button mat-icon-button (click)="deleteUser.emit(u)"
                    [attr.aria-label]="'Excluir ' + u.username" matTooltip="Excluir"
                    class="!text-[var(--text-secondary)] hover:!text-red-400">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedCols()"></tr>
            <tr
              mat-row
              *matRowDef="let row; columns: displayedCols()"
              [class.row-flash]="highlightedId() === row.id"
              class="hover:bg-[var(--surface-hover)] transition-colors"
            ></tr>
          </table>
        </div>
        <mat-paginator
          [length]="total()"
          [pageSize]="pageSize()"
          [pageSizeOptions]="[10, 25, 50]"
          (page)="pageChange.emit($event)"
          class="border-t border-[var(--border-color)]"
        />
      }
    </div>
  `,
})
export class UserTableComponent {
  readonly rows = input.required<User[]>();
  readonly loading = input.required<boolean>();
  readonly displayedCols = input.required<string[]>();
  readonly total = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly skeletonRows = input<unknown[]>([]);
  readonly sortActive = input<string>('id');
  readonly sortDir = input<'asc' | 'desc' | ''>('asc');
  readonly highlightedId = input<number | null>(null);
  readonly canUpdate = input<boolean>(false);
  readonly canDelete = input<boolean>(false);
  readonly canSetStatus = input<boolean>(false);
  readonly canAssignRole = input<boolean>(false);

  readonly sortChange = output<Sort>();
  readonly pageChange = output<PageEvent>();
  readonly editUser = output<User>();
  readonly toggleStatus = output<User>();
  readonly manageRoles = output<User>();
  readonly deleteUser = output<User>();
}
