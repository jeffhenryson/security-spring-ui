import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { RolesAdminService } from '../../../core/admin/roles-admin.service';
import { UsersAdminService, UserResponse as User } from '../../../core/admin/users-admin.service';
import { runWithFeedback, httpErrMsg } from '../../../core/admin/admin-feedback';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/empty-state/empty-state.component';
import { PagedState } from '../../../core/admin/paged-state';
import { PERMISSIONS } from '../../../core/rbac/permissions.constants';
import { CreateUserDialogComponent } from './dialogs/create-user.dialog';
import { EditUserDialogComponent } from './dialogs/edit-user.dialog';
import { ManageRolesDialogComponent } from './dialogs/manage-roles.dialog';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    EmptyStateComponent,
  ],
  styles: [`
    @keyframes row-flash {
      0%   { background-color: color-mix(in srgb, var(--active-color) 18%, transparent); }
      100% { background-color: transparent; }
    }
    .row-flash { animation: row-flash 1.4s ease-out; }
  `],
  template: `
    <div class="p-6 max-w-5xl mx-auto flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Usuários</h3>
        <div class="flex gap-2">
          @if (canCreate()) {
            <button mat-flat-button (click)="openCreate()">
              <mat-icon>add</mat-icon> Novo usuário
            </button>
          }
          <button mat-stroked-button (click)="exportCsv()" matTooltip="Exportar página atual como CSV">
            <mat-icon>download</mat-icon> Exportar CSV
          </button>
        </div>
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap gap-3">
        <mat-form-field appearance="outline" class="flex-1 min-w-[200px] !pb-0">
          <mat-label>Buscar por nome ou email</mat-label>
          <mat-icon matPrefix class="!text-[var(--text-secondary)]">search</mat-icon>
          <input matInput [formControl]="searchControl" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="w-40 !pb-0">
          <mat-label>Status</mat-label>
          <mat-select [formControl]="statusControl">
            <mat-option value="">Todos</mat-option>
            <mat-option value="active">Ativo</mat-option>
            <mat-option value="inactive">Inativo</mat-option>
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
        } @else if (paged.rows().length === 0) {
          <app-empty-state message="Nenhum usuário encontrado." icon="group" />
        } @else {
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="paged.rows()" class="w-full" aria-label="Tabela de usuários">
              <ng-container matColumnDef="username">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs !pl-6"
                >
                  Usuário
                </th>
                <td
                  mat-cell
                  *matCellDef="let u"
                  class="!text-[var(--text-primary)] !font-medium !pl-6"
                >
                  {{ u.username }}
                </td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  Email
                </th>
                <td mat-cell *matCellDef="let u" class="!text-[var(--text-secondary)] !text-sm">
                  {{ u.email }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  Status
                </th>
                <td mat-cell *matCellDef="let u">
                  <span
                    class="px-2 py-0.5 rounded-full text-xs font-medium"
                    [class]="
                      u.enabled
                        ? 'bg-emerald-900/80 text-emerald-300'
                        : 'bg-[var(--border-color)] text-[var(--text-secondary)]'
                    "
                  >
                    {{ u.enabled ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="roles">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  Roles
                </th>
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

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="!text-right !pr-4"></th>
                <td mat-cell *matCellDef="let u" class="!text-right !pr-2 whitespace-nowrap">
                  @if (canUpdate()) {
                    <button
                      mat-icon-button
                      (click)="openEdit(u)"
                      [attr.aria-label]="'Editar ' + u.username"
                      matTooltip="Editar"
                      class="!text-[var(--text-secondary)] hover:!text-cyan-400"
                    >
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                  @if (canSetStatus()) {
                    <button
                      mat-icon-button
                      [matTooltip]="u.enabled ? 'Desativar' : 'Ativar'"
                      [attr.aria-label]="(u.enabled ? 'Desativar ' : 'Ativar ') + u.username"
                      (click)="toggleStatus(u)"
                      class="!text-[var(--text-secondary)] hover:!text-yellow-400"
                    >
                      <mat-icon>{{ u.enabled ? 'block' : 'check_circle' }}</mat-icon>
                    </button>
                  }
                  @if (canAssignRole()) {
                    <button
                      mat-icon-button
                      (click)="openManageRoles(u)"
                      [attr.aria-label]="'Gerenciar roles de ' + u.username"
                      matTooltip="Gerenciar roles"
                      class="!text-[var(--text-secondary)] hover:!text-violet-400"
                    >
                      <mat-icon>admin_panel_settings</mat-icon>
                    </button>
                  }
                  @if (canDelete()) {
                    <button
                      mat-icon-button
                      (click)="delete(u)"
                      [attr.aria-label]="'Excluir ' + u.username"
                      matTooltip="Excluir"
                      class="!text-[var(--text-secondary)] hover:!text-red-400"
                    >
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
            [length]="paged.total()"
            [pageSize]="paged.size()"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPage($event)"
            class="border-t border-[var(--border-color)]"
          />
        }
      </div>
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersAdminService);
  private readonly rolesService = inject(RolesAdminService);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly paged = new PagedState<User>();
  readonly allRoles = signal<string[]>([]);
  readonly skeletonRows = Array(8).fill(0);
  readonly highlightedId = signal<number | null>(null);
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.highlightTimer !== null) clearTimeout(this.highlightTimer);
    });
  }

  readonly searchControl = this.fb.control('');
  readonly statusControl = this.fb.control('');

  readonly canCreate = computed(() => this.store.hasPermission(PERMISSIONS.USER_CREATE));
  readonly canUpdate = computed(() => this.store.hasPermission(PERMISSIONS.USER_UPDATE));
  readonly canDelete = computed(() => this.store.hasPermission(PERMISSIONS.USER_DELETE));
  readonly canSetStatus = computed(() => this.store.hasPermission(PERMISSIONS.USER_STATUS));
  readonly canAssignRole = computed(() => this.store.hasPermission(PERMISSIONS.USER_ROLE_ASSIGN));

  readonly displayedCols = computed(() => {
    const base = ['username', 'email', 'status', 'roles'];
    const hasActions =
      this.canUpdate() || this.canDelete() || this.canSetStatus() || this.canAssignRole();
    return hasActions ? [...base, 'actions'] : base;
  });

  ngOnInit(): void {
    this.load();
    this.loadRoles();
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.paged.page.set(0);
        this.load();
      });
    this.statusControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.paged.page.set(0);
        this.load();
      });
  }

  private async loadRoles(): Promise<void> {
    try {
      const roles = await this.rolesService.listAll();
      this.allRoles.set(roles.map((r) => r.name));
    } catch {
      this.snackBar.open(
        'Aviso: lista de roles indisponível. Dialogs de atribuição podem estar incompletos.',
        'OK',
        { duration: 4000 },
      );
    }
  }

  private async load(): Promise<void> {
    this.paged.loading.set(true);
    const search = this.searchControl.value?.trim() ?? '';
    const status = this.statusControl.value ?? '';
    const filters = {
      ...(search ? { search } : {}),
      ...(status ? { enabled: status === 'active' } : {}),
    };
    try {
      const res = await this.usersService.list(this.paged.page(), this.paged.size(), filters);
      this.paged.apply(res);
    } catch {
      this.snackBar.open('Erro ao carregar usuários.', 'OK', { duration: 3000 });
    } finally {
      this.paged.loading.set(false);
    }
  }

  onPage(e: import('@angular/material/paginator').PageEvent): void {
    this.paged.onPage(e);
    this.load();
  }

  private flashRow(id: number): void {
    if (this.highlightTimer) clearTimeout(this.highlightTimer);
    this.highlightedId.set(id);
    this.highlightTimer = setTimeout(() => this.highlightedId.set(null), 1500);
  }

  private isSelf(user: User): boolean {
    return user.username === this.store.currentUser()?.username;
  }

  async openCreate(): Promise<void> {
    const data = await firstValueFrom(
      this.dialog
        .open(CreateUserDialogComponent, {
          width: 'min(480px, 95vw)',
          data: { availableRoles: this.allRoles() },
        })
        .afterClosed(),
    );
    if (!data) return;
    const created = await runWithFeedback(
      () => this.usersService.create(data),
      'Usuário criado!',
      httpErrMsg('Usuário ou email já existe.', 'Erro ao criar usuário.'),
      this.snackBar,
    );
    if (created) {
      this.paged.page.set(0);
      await this.load();
      const newUser = this.paged.rows().find((u) => u.username === data.username);
      if (newUser) this.flashRow(newUser.id);
    }
  }

  async openEdit(user: User): Promise<void> {
    const data = await firstValueFrom(
      this.dialog
        .open(EditUserDialogComponent, { width: 'min(480px, 95vw)', data: { user } })
        .afterClosed(),
    );
    if (!data) return;
    const ok = await runWithFeedback(
      () => this.usersService.update(user.id, data),
      'Usuário atualizado!',
      httpErrMsg('Usuário ou email já existe.', 'Erro ao atualizar usuário.'),
      this.snackBar,
    );
    if (ok) {
      await this.load();
      this.flashRow(user.id);
    }
  }

  async toggleStatus(user: User): Promise<void> {
    const label = user.enabled ? 'Desativar' : 'Ativar';
    const selfWarning = this.isSelf(user)
      ? '\n\nAtenção: você está alterando o status da sua própria conta.'
      : '';
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: 'min(380px, 95vw)',
          data: {
            title: `${label} usuário`,
            message: `${label} a conta de "${user.username}"?${selfWarning}`,
            confirmLabel: label,
            danger: user.enabled,
          },
        })
        .afterClosed(),
    );
    if (!confirmed) return;
    const action = user.enabled
      ? () => this.usersService.disable(user.id)
      : () => this.usersService.enable(user.id);
    const ok = await runWithFeedback(
      action,
      `Usuário ${user.enabled ? 'desativado' : 'ativado'}.`,
      'Erro ao alterar status.',
      this.snackBar,
    );
    if (ok !== null) await this.load();
  }

  async openManageRoles(user: User): Promise<void> {
    const changed = await firstValueFrom(
      this.dialog
        .open(ManageRolesDialogComponent, {
          width: 'min(480px, 95vw)',
          data: { username: user.username, currentRoles: user.roles, allRoles: this.allRoles() },
        })
        .afterClosed(),
    );
    if (changed) await this.load();
  }

  async delete(user: User): Promise<void> {
    const selfWarning = this.isSelf(user)
      ? '\n\nAtenção: você está excluindo a sua própria conta. Isso encerrará sua sessão.'
      : '';
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: 'min(400px, 95vw)',
          data: {
            title: 'Excluir usuário',
            message: `Excluir permanentemente "${user.username}"? Esta ação não pode ser desfeita.${selfWarning}`,
            confirmLabel: 'Excluir',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (!confirmed) return;
    const ok = await runWithFeedback(
      () => this.usersService.remove(user.id),
      'Usuário excluído.',
      'Erro ao excluir usuário.',
      this.snackBar,
    );
    if (ok !== null) await this.load();
  }

  exportCsv(): void {
    const rows = this.paged.rows();
    if (rows.length === 0) {
      this.snackBar.open('Nenhum usuário para exportar.', 'OK', { duration: 2000 });
      return;
    }
    const header = 'id,username,email,status,roles';
    const lines = rows.map(
      (u) =>
        `${u.id},"${u.username}","${u.email}",${u.enabled ? 'ativo' : 'inativo'},"${u.roles.join(';')}"`,
    );
    const csv = [header, ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
