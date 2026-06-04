import { ChangeDetectionStrategy, Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Sort } from '@angular/material/sort';
import { PageEvent } from '@angular/material/paginator';
import { AuthStore } from '../../../core/auth/auth.store';
import { RolesAdminService } from '../../../core/admin/roles-admin.service';
import { UsersAdminService, UserResponse as User } from '../../../core/admin/users-admin.service';
import { runWithFeedback, httpErrMsg } from '../../../core/admin/admin-feedback';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { PagedState } from '../../../core/admin/paged-state';
import { PERMISSIONS, ROLES } from '../../../core/rbac/permissions.constants';
import { CreateUserDialogComponent } from './dialogs/create-user.dialog';
import { EditUserDialogComponent } from './dialogs/edit-user.dialog';
import { ManageRolesDialogComponent } from './dialogs/manage-roles.dialog';
import { UserTableComponent } from './user-table.component';
import { UsersFilterBarComponent, UserFilter } from './users-filter-bar.component';
import { downloadCsv, csvEscape } from '../../../shared/csv-export';

@Component({
  selector: 'app-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, UserTableComponent, UsersFilterBarComponent],
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

      <app-users-filter-bar (filterChange)="onFilterChange($event)" />

      <app-user-table
        [rows]="paged.rows()"
        [loading]="paged.loading()"
        [displayedCols]="displayedCols()"
        [total]="paged.total()"
        [pageSize]="paged.size()"
        [skeletonRows]="skeletonRows"
        [sortActive]="sortBy()"
        [sortDir]="sortDir()"
        [highlightedId]="highlightedId()"
        [canUpdate]="canUpdate()"
        [canDelete]="canDelete()"
        [canSetStatus]="canSetStatus()"
        [canAssignRole]="canAssignRole()"
        (sortChange)="onSort($event)"
        (pageChange)="onPage($event)"
        (editUser)="openEdit($event)"
        (toggleStatus)="toggleStatus($event)"
        (manageRoles)="openManageRoles($event)"
        (deleteUser)="delete($event)"
      />
    </div>
  `,
})
export class UsersComponent implements OnInit {
  private readonly usersService = inject(UsersAdminService);
  private readonly rolesService = inject(RolesAdminService);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);

  readonly paged = new PagedState<User>();
  readonly allRoles = signal<string[]>([]);
  readonly sortBy = signal<'id' | 'username' | 'email' | 'enabled' | 'createdAt'>('id');
  readonly sortDir = signal<'asc' | 'desc'>('asc');
  readonly skeletonRows = Array(10).fill(0);
  readonly highlightedId = signal<number | null>(null);
  private readonly activeFilter = signal<UserFilter>({ search: '', status: '' });
  private highlightTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.highlightTimer !== null) clearTimeout(this.highlightTimer);
    });
  }

  readonly canCreate = computed(() => this.store.hasPermission(PERMISSIONS.USER_CREATE));
  readonly canUpdate = computed(() => this.store.hasPermission(PERMISSIONS.USER_UPDATE));
  readonly canDelete = computed(() => this.store.hasPermission(PERMISSIONS.USER_DELETE));
  readonly canSetStatus = computed(() => this.store.hasPermission(PERMISSIONS.USER_STATUS));
  readonly canAssignRole = computed(() => this.store.hasPermission(PERMISSIONS.USER_ROLE_ASSIGN));

  readonly displayedCols = computed(() => {
    const base = ['username', 'email', 'status', 'roles', 'createdAt'];
    const hasActions =
      this.canUpdate() || this.canDelete() || this.canSetStatus() || this.canAssignRole();
    return hasActions ? [...base, 'actions'] : base;
  });

  ngOnInit(): void {
    this.load();
    this.loadRoles();
  }

  onFilterChange(filter: UserFilter): void {
    this.activeFilter.set(filter);
    this.paged.page.set(0);
    this.load();
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

  onSort(sort: Sort): void {
    const validCols = ['id', 'username', 'email', 'enabled', 'createdAt'] as const;
    type SortCol = typeof validCols[number];
    this.sortBy.set(validCols.includes(sort.active as SortCol) ? (sort.active as SortCol) : 'id');
    this.sortDir.set(sort.direction === 'desc' ? 'desc' : 'asc');
    this.paged.page.set(0);
    this.load();
  }

  private async load(): Promise<void> {
    this.paged.loading.set(true);
    const { search, status } = this.activeFilter();
    const filters = {
      ...(search ? { search } : {}),
      ...(status ? { enabled: status === 'active' } : {}),
      sortBy: this.sortBy(),
      sortDir: this.sortDir(),
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

  onPage(e: PageEvent): void {
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
    const availableRoles = this.allRoles().filter((r) => r !== ROLES.ROLE_DEV);
    const data = await firstValueFrom(
      this.dialog
        .open(CreateUserDialogComponent, { width: 'min(480px, 95vw)', data: { availableRoles } })
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
          data: {
            username: user.username,
            currentRoles: user.roles,
            allRoles: this.allRoles().filter((r) => r !== ROLES.ROLE_DEV),
          },
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
        `${u.id},${csvEscape(u.username)},${csvEscape(u.email)},${u.enabled ? 'ativo' : 'inativo'},${csvEscape(u.roles.join(';'))}`,
    );
    downloadCsv(`usuarios-${new Date().toISOString().slice(0, 10)}.csv`, [header, ...lines].join('\n'));
  }
}
