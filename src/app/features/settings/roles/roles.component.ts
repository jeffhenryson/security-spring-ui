import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { PermissionsAdminService } from '../../../core/admin/permissions-admin.service';
import { RolesAdminService, RoleResponse as Role } from '../../../core/admin/roles-admin.service';
import { runWithFeedback, httpErrMsg } from '../../../core/admin/admin-feedback';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/empty-state/empty-state.component';
import { PagedState } from '../../../core/admin/paged-state';
import { PERMISSIONS } from '../../../core/rbac/permissions.constants';
import { CreateRoleDialogComponent } from './dialogs/create-role.dialog';
import { ManageRolePermissionsDialogComponent } from './dialogs/manage-role-permissions.dialog';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatPaginatorModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Roles</h3>
        @if (canCreate()) {
          <button mat-flat-button (click)="openCreate()"><mat-icon>add</mat-icon> Nova role</button>
        }
      </div>

      <!-- Busca -->
      <mat-form-field appearance="outline" class="w-full !pb-0">
        <mat-label>Buscar por nome</mat-label>
        <mat-icon matPrefix class="!text-[var(--text-secondary)]">search</mat-icon>
        <input matInput [formControl]="searchControl" />
      </mat-form-field>

      <div
        class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden"
      >
        @if (paged.loading()) {
          <div class="divide-y divide-[var(--border-color)]">
            @for (i of skeletonRows; track i) {
              <div class="flex items-center gap-4 px-6 py-4">
                <div class="skeleton h-4 w-32 rounded"></div>
                <div class="flex gap-2 ml-6">
                  <div class="skeleton h-5 w-16 rounded-full"></div>
                  <div class="skeleton h-5 w-20 rounded-full"></div>
                </div>
                <div class="skeleton h-4 w-16 rounded ml-auto"></div>
              </div>
            }
          </div>
        } @else if (paged.rows().length === 0) {
          <app-empty-state message="Nenhuma role cadastrada." icon="admin_panel_settings" />
        } @else {
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="paged.rows()" class="w-full" aria-label="Tabela de roles">
              <ng-container matColumnDef="name">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs !pl-6"
                >
                  Nome
                </th>
                <td
                  mat-cell
                  *matCellDef="let r"
                  class="!text-[var(--text-primary)] !font-medium !pl-6"
                >
                  {{ r.name }}
                </td>
              </ng-container>

              <ng-container matColumnDef="permissions">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  Permissões
                </th>
                <td mat-cell *matCellDef="let r" class="!py-2">
                  @if (r.permissions.length === 0) {
                    <span class="text-[var(--text-muted)] text-xs">Nenhuma</span>
                  } @else {
                    <mat-chip-set>
                      @for (p of r.permissions.slice(0, 4); track p) {
                        <mat-chip class="!text-xs">{{ p }}</mat-chip>
                      }
                      @if (r.permissions.length > 4) {
                        <mat-chip
                          class="!text-xs bg-[var(--surface-hover)]"
                          [matTooltip]="r.permissions.slice(4).join(', ')"
                        >
                          +{{ r.permissions.length - 4 }}
                        </mat-chip>
                      }
                    </mat-chip-set>
                  }
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef class="!text-right !pr-4"></th>
                <td mat-cell *matCellDef="let r" class="!text-right !pr-2 whitespace-nowrap">
                  @if (canManagePermissions()) {
                    <button
                      mat-icon-button
                      (click)="openManagePermissions(r)"
                      class="!text-[var(--text-secondary)] hover:!text-cyan-400"
                      [matTooltip]="'Gerenciar permissões'"
                    >
                      <mat-icon>key</mat-icon>
                    </button>
                  }
                  @if (canDelete()) {
                    <button
                      mat-icon-button
                      (click)="delete(r)"
                      class="!text-[var(--text-secondary)] hover:!text-red-400"
                      [attr.aria-label]="'Excluir ' + r.name"
                    >
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
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
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPage($event)"
            class="border-t border-[var(--border-color)]"
          />
        }
      </div>
    </div>
  `,
})
export class RolesComponent implements OnInit {
  private readonly rolesService = inject(RolesAdminService);
  private readonly permissionsService = inject(PermissionsAdminService);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly cols = ['name', 'permissions', 'actions'];
  readonly paged = new PagedState<Role>();
  readonly allPermissions = signal<string[]>([]);
  readonly skeletonRows = Array(6).fill(0);
  readonly searchControl = this.fb.control('');

  readonly canCreate = computed(() => this.store.hasPermission(PERMISSIONS.ROLE_CREATE));
  readonly canDelete = computed(() => this.store.hasPermission(PERMISSIONS.ROLE_DELETE));
  readonly canManagePermissions = computed(() =>
    this.store.hasPermission(PERMISSIONS.ROLE_MANAGE_PERMISSIONS),
  );

  ngOnInit(): void {
    this.load();
    this.loadPermissions();
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.paged.page.set(0);
        this.load();
      });
  }

  private async loadPermissions(): Promise<void> {
    try {
      const perms = await this.permissionsService.listAll();
      this.allPermissions.set(perms.map((p) => p.name));
    } catch {
      /* silencioso — lista de permissões é auxiliar */
    }
  }

  private async load(): Promise<void> {
    this.paged.loading.set(true);
    const search = this.searchControl.value?.trim() ?? '';
    try {
      const res = await this.rolesService.list(this.paged.page(), this.paged.size(), search);
      this.paged.apply(res);
    } catch {
      this.snackBar.open('Erro ao carregar roles.', 'OK', { duration: 3000 });
    } finally {
      this.paged.loading.set(false);
    }
  }

  onPage(e: import('@angular/material/paginator').PageEvent): void {
    this.paged.onPage(e);
    this.load();
  }

  async openCreate(): Promise<void> {
    const name = await firstValueFrom(
      this.dialog.open(CreateRoleDialogComponent, { width: 'min(400px, 95vw)' }).afterClosed(),
    );
    if (!name) return;
    const ok = await runWithFeedback(
      () => this.rolesService.create(name),
      'Role criada!',
      httpErrMsg('Role já existe.', 'Erro ao criar role.'),
      this.snackBar,
    );
    if (ok) {
      this.paged.page.set(0);
      await this.load();
    }
  }

  async openManagePermissions(role: Role): Promise<void> {
    await firstValueFrom(
      this.dialog
        .open(ManageRolePermissionsDialogComponent, {
          width: 'min(520px, 95vw)',
          data: { role, allPermissions: this.allPermissions() },
        })
        .afterClosed(),
    );
    await this.load();
  }

  async delete(role: Role): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: 'min(400px, 95vw)',
          data: {
            title: 'Excluir role',
            message: `Excluir a role "${role.name}"? Usuários com esta role serão afetados.`,
            confirmLabel: 'Excluir',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (!confirmed) return;
    const ok = await runWithFeedback(
      () => this.rolesService.remove(role.name),
      'Role excluída.',
      'Erro ao excluir role.',
      this.snackBar,
    );
    if (ok !== null) await this.load();
  }
}
