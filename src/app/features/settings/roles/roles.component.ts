import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';

interface Role { name: string; permissions: string[]; }
interface Page<T> { content: T[]; totalElements: number; }

// ── Dialog: criar role ──────────────────────────────────────────────────────
@Component({
  selector: 'app-create-role-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>Nova role</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="createRoleForm" (ngSubmit)="submit()" class="pt-2">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nome da role</mat-label>
          <input matInput formControlName="name" placeholder="Ex: MODERATOR" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Campo obrigatório</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-flat-button form="createRoleForm" type="submit" [disabled]="form.invalid">Criar</button>
    </mat-dialog-actions>
  `,
})
export class CreateRoleDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateRoleDialogComponent>);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({ name: ['', Validators.required] });
  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue().name);
  }
}

// ── Dialog: gerenciar permissões de uma role ────────────────────────────────
@Component({
  selector: 'app-manage-role-permissions-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatChipsModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Permissões — {{ data.role.name }}</h2>
    <mat-dialog-content class="!min-w-[400px]">

      <p class="text-slate-400 text-sm mb-3 m-0">Permissões atribuídas:</p>
      <mat-chip-set class="mb-4 flex flex-wrap gap-1">
        @if (role().permissions.length === 0) {
          <span class="text-slate-500 text-sm">Nenhuma permissão</span>
        }
        @for (perm of role().permissions; track perm) {
          <mat-chip [removable]="canManage()" (removed)="removePerm(perm)">
            {{ perm }}
            @if (canManage()) {
              <button matChipRemove><mat-icon>cancel</mat-icon></button>
            }
          </mat-chip>
        }
      </mat-chip-set>

      @if (canManage()) {
        <div class="flex items-center gap-2 pt-2">
          <mat-form-field appearance="outline" class="flex-1 !pb-0">
            <mat-label>Adicionar permissão</mat-label>
            <mat-select [value]="selectedPerm()"
                        (selectionChange)="selectedPerm.set($event.value)">
              @for (p of availablePerms(); track p) {
                <mat-option [value]="p">{{ p }}</mat-option>
              }
              @if (availablePerms().length === 0) {
                <mat-option disabled>Todas as permissões já atribuídas</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button
                  (click)="addPerm()"
                  [disabled]="!selectedPerm() || adding()">
            @if (adding()) { <mat-spinner diameter="18" /> } @else { Adicionar }
          </button>
        </div>
      }

    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Fechar</button>
    </mat-dialog-actions>
  `,
})
export class ManageRolePermissionsDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<ManageRolePermissionsDialogComponent>);
  readonly data: { role: Role } = inject(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly api = environment.apiUrl;

  readonly role = signal<Role>({ ...this.data.role, permissions: [...this.data.role.permissions] });
  readonly allPermissions = signal<string[]>([]);
  readonly selectedPerm = signal('');
  readonly adding = signal(false);

  readonly canManage = computed(() => this.store.hasPermission('ROLE_MANAGE_PERMISSIONS'));
  readonly availablePerms = computed(() =>
    this.allPermissions().filter(p => !this.role().permissions.includes(p))
  );

  ngOnInit(): void { this.loadAllPermissions(); }

  private async loadAllPermissions(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<Page<{ name: string }>>(`${this.api}/permissions?page=0&size=1000`)
      );
      this.allPermissions.set(res.content.map(p => p.name));
    } catch { /* silencioso */ }
  }

  async addPerm(): Promise<void> {
    const perm = this.selectedPerm();
    if (!perm) return;
    this.adding.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${this.api}/roles/${this.role().name}/permissions/${perm}`, {})
      );
      this.role.update(r => ({ ...r, permissions: [...r.permissions, perm] }));
      this.selectedPerm.set('');
      this.snackBar.open('Permissão adicionada!', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erro ao adicionar permissão.', 'OK', { duration: 3000 });
    } finally {
      this.adding.set(false);
    }
  }

  async removePerm(perm: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.delete(`${this.api}/roles/${this.role().name}/permissions/${perm}`)
      );
      this.role.update(r => ({ ...r, permissions: r.permissions.filter(p => p !== perm) }));
      this.snackBar.open('Permissão removida.', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erro ao remover permissão.', 'OK', { duration: 3000 });
    }
  }
}

// ── Componente principal ────────────────────────────────────────────────────
@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
  ],
  template: `
    <div class="p-6 max-w-4xl mx-auto flex flex-col gap-6">

      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-200 m-0">Roles</h3>
        @if (canCreate()) {
          <button mat-flat-button (click)="openCreate()">
            <mat-icon>add</mat-icon> Nova role
          </button>
        }
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        @if (loading()) {
          <div class="flex justify-center py-12"><mat-spinner diameter="32" /></div>
        } @else if (rows().length === 0) {
          <p class="text-slate-500 text-sm text-center py-12 m-0">Nenhuma role cadastrada.</p>
        } @else {
          <div class="overflow-x-auto">
          <table mat-table [dataSource]="rows()" class="w-full">

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs !pl-6">Nome</th>
              <td mat-cell *matCellDef="let r" class="!text-slate-200 !font-medium !pl-6">{{ r.name }}</td>
            </ng-container>

            <ng-container matColumnDef="permissions">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">Permissões</th>
              <td mat-cell *matCellDef="let r" class="!py-2">
                @if (r.permissions.length === 0) {
                  <span class="text-slate-500 text-xs">Nenhuma</span>
                } @else {
                  <mat-chip-set>
                    @for (p of r.permissions.slice(0, 4); track p) {
                      <mat-chip class="!text-xs">{{ p }}</mat-chip>
                    }
                    @if (r.permissions.length > 4) {
                      <mat-chip class="!text-xs !bg-slate-700"
                                [matTooltip]="r.permissions.slice(4).join(', ')">
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
                  <button mat-icon-button (click)="openManagePermissions(r)"
                          class="!text-slate-400 hover:!text-cyan-400"
                          [matTooltip]="'Gerenciar permissões'">
                    <mat-icon>key</mat-icon>
                  </button>
                }
                @if (canDelete()) {
                  <button mat-icon-button (click)="delete(r)"
                          class="!text-slate-400 hover:!text-red-400">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"
                class="hover:!bg-slate-800/50 transition-colors"></tr>
          </table>
          </div>
          <mat-paginator
            [length]="total()"
            [pageSize]="size()"
            [pageSizeOptions]="[10, 25, 50]"
            (page)="onPage($event)"
            class="border-t border-slate-800" />
        }
      </div>
    </div>
  `,
})
export class RolesComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly api = environment.apiUrl;

  readonly cols = ['name', 'permissions', 'actions'];
  readonly rows = signal<Role[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(true);

  readonly canCreate = computed(() => this.store.hasPermission('ROLE_CREATE'));
  readonly canDelete = computed(() => this.store.hasPermission('ROLE_DELETE'));
  readonly canManagePermissions = computed(() => this.store.hasPermission('ROLE_MANAGE_PERMISSIONS'));

  ngOnInit(): void { this.load(); }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<Page<Role>>(`${this.api}/roles?page=${this.page()}&size=${this.size()}`)
      );
      this.rows.set(res.content);
      this.total.set(res.totalElements);
    } catch {
      this.snackBar.open('Erro ao carregar roles.', 'OK', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
    this.load();
  }

  async openCreate(): Promise<void> {
    const name = await firstValueFrom(
      this.dialog.open(CreateRoleDialogComponent, { width: 'min(400px, 95vw)' }).afterClosed()
    );
    if (!name) return;
    try {
      await firstValueFrom(this.http.post(`${this.api}/roles`, { name }));
      this.page.set(0);
      await this.load();
      this.snackBar.open('Role criada!', 'OK', { duration: 3000 });
    } catch (err: any) {
      if (err?.status === 409) {
        this.snackBar.open('Role já existe.', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('Erro ao criar role.', 'OK', { duration: 3000 });
      }
    }
  }

  async openManagePermissions(role: Role): Promise<void> {
    await firstValueFrom(
      this.dialog.open(ManageRolePermissionsDialogComponent, {
        width: 'min(520px, 95vw)',
        data: { role },
      }).afterClosed()
    );
    await this.load();
  }

  async delete(role: Role): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        width: 'min(400px, 95vw)',
        data: {
          title: 'Excluir role',
          message: `Excluir a role "${role.name}"? Usuários com esta role serão afetados.`,
          confirmLabel: 'Excluir',
          danger: true,
        },
      }).afterClosed()
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.http.delete(`${this.api}/roles/${role.name}`));
      await this.load();
      this.snackBar.open('Role excluída.', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erro ao excluir role.', 'OK', { duration: 3000 });
    }
  }
}
