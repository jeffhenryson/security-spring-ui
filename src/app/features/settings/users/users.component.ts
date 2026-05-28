import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';

interface User {
  id: number;
  username: string;
  email: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
}
interface Page<T> { content: T[]; totalElements: number; }

// ── Dialog: criar usuário ───────────────────────────────────────────────────
@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Novo usuário</h2>
    <mat-dialog-content class="!min-w-[400px]">
      <form [formGroup]="form" id="createUserForm" (ngSubmit)="submit()" class="flex flex-col gap-4 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Usuário</mat-label>
          <input matInput formControlName="username" autocomplete="off" />
          @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
            <mat-error>Campo obrigatório</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="off" />
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Senha</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" />
          @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
            <mat-error>Mínimo 6 caracteres</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Roles (opcional)</mat-label>
          <mat-select formControlName="roles" multiple>
            @if (loadingRoles()) {
              <mat-option disabled>Carregando...</mat-option>
            }
            @for (r of availableRoles(); track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-flat-button form="createUserForm" type="submit" [disabled]="form.invalid">Criar</button>
    </mat-dialog-actions>
  `,
})
export class CreateUserDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly api = environment.apiUrl;

  readonly availableRoles = signal<string[]>([]);
  readonly loadingRoles = signal(true);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    roles: [[] as string[]],
  });

  ngOnInit(): void { this.loadRoles(); }

  private async loadRoles(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<Page<{ name: string }>>(`${this.api}/roles?page=0&size=1000`)
      );
      this.availableRoles.set(res.content.map(r => r.name));
    } catch { /* silencioso */ } finally {
      this.loadingRoles.set(false);
    }
  }

  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue());
  }
}

// ── Dialog: editar usuário ──────────────────────────────────────────────────
@Component({
  selector: 'app-edit-user-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Editar usuário</h2>
    <mat-dialog-content class="!min-w-[400px]">
      <form [formGroup]="form" id="editUserForm" (ngSubmit)="submit()" class="flex flex-col gap-4 pt-2">
        <mat-form-field appearance="outline">
          <mat-label>Usuário</mat-label>
          <input matInput formControlName="username" />
          @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
            <mat-error>Campo obrigatório</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-flat-button form="editUserForm" type="submit" [disabled]="form.invalid">Salvar</button>
    </mat-dialog-actions>
  `,
})
export class EditUserDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditUserDialogComponent>);
  readonly data: { user: User } = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: [this.data.user.username, Validators.required],
    email: [this.data.user.email, [Validators.required, Validators.email]],
  });

  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue());
  }
}

// ── Dialog: atribuir role ───────────────────────────────────────────────────
@Component({
  selector: 'app-assign-role-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule, MatDialogModule, MatButtonModule,
    MatFormFieldModule, MatSelectModule, MatChipsModule, MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Atribuir role — {{ data.username }}</h2>
    <mat-dialog-content class="!min-w-[360px]">
      @if (data.currentRoles.length > 0) {
        <p class="text-slate-400 text-xs mb-2 mt-1">Roles atuais:</p>
        <mat-chip-set class="mb-4">
          @for (r of data.currentRoles; track r) {
            <mat-chip class="!text-xs">{{ r }}</mat-chip>
          }
        </mat-chip-set>
      }
      <form [formGroup]="form" id="assignRoleForm" (ngSubmit)="submit()" class="pt-2">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nova role</mat-label>
          <mat-select formControlName="role">
            @if (loadingRoles()) {
              <mat-option disabled>Carregando...</mat-option>
            }
            @for (r of availableRoles(); track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-flat-button form="assignRoleForm" type="submit" [disabled]="form.invalid">Atribuir</button>
    </mat-dialog-actions>
  `,
})
export class AssignRoleDialogComponent implements OnInit {
  readonly dialogRef = inject(MatDialogRef<AssignRoleDialogComponent>);
  readonly data: { username: string; currentRoles: string[] } = inject(MAT_DIALOG_DATA);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly api = environment.apiUrl;

  readonly availableRoles = signal<string[]>([]);
  readonly loadingRoles = signal(true);

  readonly form = this.fb.nonNullable.group({ role: ['', Validators.required] });

  ngOnInit(): void { this.loadRoles(); }

  private async loadRoles(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.http.get<Page<{ name: string }>>(`${this.api}/roles?page=0&size=1000`)
      );
      this.availableRoles.set(res.content.map(r => r.name));
    } catch { /* silencioso */ } finally {
      this.loadingRoles.set(false);
    }
  }

  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue().role);
  }
}

// ── Componente principal ────────────────────────────────────────────────────
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule, MatPaginatorModule, MatButtonModule,
    MatIconModule, MatChipsModule, MatProgressSpinnerModule, MatTooltipModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
  ],
  template: `
    <div class="p-6 max-w-5xl mx-auto flex flex-col gap-6">

      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-slate-200 m-0">Usuários</h3>
        @if (canCreate()) {
          <button mat-flat-button (click)="openCreate()">
            <mat-icon>add</mat-icon> Novo usuário
          </button>
        }
      </div>

      <!-- Filtros -->
      <div class="flex flex-wrap gap-3">
        <mat-form-field appearance="outline" class="flex-1 min-w-[200px] !pb-0">
          <mat-label>Buscar por nome ou email</mat-label>
          <mat-icon matPrefix class="!text-slate-400">search</mat-icon>
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

      <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        @if (loading()) {
          <div class="flex justify-center py-12"><mat-spinner diameter="32" /></div>
        } @else if (filteredRows().length === 0) {
          <p class="text-slate-500 text-sm text-center py-12 m-0">Nenhum usuário encontrado.</p>
        } @else {
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="filteredRows()" class="w-full">

              <ng-container matColumnDef="username">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs !pl-6">Usuário</th>
                <td mat-cell *matCellDef="let u" class="!text-slate-200 !font-medium !pl-6">{{ u.username }}</td>
              </ng-container>

              <ng-container matColumnDef="email">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">Email</th>
                <td mat-cell *matCellDef="let u" class="!text-slate-400 !text-sm">{{ u.email }}</td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">Status</th>
                <td mat-cell *matCellDef="let u">
                  <span class="px-2 py-0.5 rounded-full text-xs font-medium"
                        [class]="u.enabled
                          ? 'bg-emerald-900/80 text-emerald-300'
                          : 'bg-slate-700 text-slate-400'">
                    {{ u.enabled ? 'Ativo' : 'Inativo' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="roles">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">Roles</th>
                <td mat-cell *matCellDef="let u" class="!py-2">
                  @if (u.roles.length === 0) {
                    <span class="text-slate-500 text-xs">—</span>
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
                    <button mat-icon-button (click)="openEdit(u)"
                            [attr.aria-label]="'Editar ' + u.username"
                            matTooltip="Editar"
                            class="!text-slate-400 hover:!text-cyan-400">
                      <mat-icon>edit</mat-icon>
                    </button>
                  }
                  @if (canSetStatus()) {
                    <button mat-icon-button
                            [matTooltip]="u.enabled ? 'Desativar' : 'Ativar'"
                            [attr.aria-label]="(u.enabled ? 'Desativar ' : 'Ativar ') + u.username"
                            (click)="toggleStatus(u)"
                            class="!text-slate-400 hover:!text-yellow-400">
                      <mat-icon>{{ u.enabled ? 'block' : 'check_circle' }}</mat-icon>
                    </button>
                  }
                  @if (canAssignRole()) {
                    <button mat-icon-button (click)="openAssignRole(u)"
                            [attr.aria-label]="'Atribuir role a ' + u.username"
                            matTooltip="Atribuir role"
                            class="!text-slate-400 hover:!text-violet-400">
                      <mat-icon>admin_panel_settings</mat-icon>
                    </button>
                  }
                  @if (canDelete()) {
                    <button mat-icon-button (click)="delete(u)"
                            [attr.aria-label]="'Excluir ' + u.username"
                            matTooltip="Excluir"
                            class="!text-slate-400 hover:!text-red-400">
                      <mat-icon>delete</mat-icon>
                    </button>
                  }
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedCols()"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedCols();"
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
export class UsersComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly api = environment.apiUrl;

  readonly rows = signal<User[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(true);

  readonly searchControl = this.fb.control('');
  readonly statusControl = this.fb.control('');

  private readonly searchValue = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  private readonly statusValue = toSignal(this.statusControl.valueChanges, { initialValue: '' });

  readonly filteredRows = computed(() => {
    const search = (this.searchValue() ?? '').toLowerCase();
    const status = this.statusValue() ?? '';
    return this.rows().filter(u => {
      const matchesSearch = !search ||
        u.username.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search);
      const matchesStatus = !status ||
        (status === 'active' && u.enabled) ||
        (status === 'inactive' && !u.enabled);
      return matchesSearch && matchesStatus;
    });
  });

  readonly canCreate = computed(() => this.store.hasPermission('USER_CREATE'));
  readonly canUpdate = computed(() => this.store.hasPermission('USER_UPDATE'));
  readonly canDelete = computed(() => this.store.hasPermission('USER_DELETE'));
  readonly canSetStatus = computed(() => this.store.hasPermission('USER_STATUS'));
  readonly canAssignRole = computed(() => this.store.hasPermission('USER_ROLE_ASSIGN'));

  readonly displayedCols = computed(() => {
    const base = ['username', 'email', 'status', 'roles'];
    const hasActions = this.canUpdate() || this.canDelete() || this.canSetStatus() || this.canAssignRole();
    return hasActions ? [...base, 'actions'] : base;
  });

  ngOnInit(): void { this.load(); }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<Page<User>>(`${this.api}/users?page=${this.page()}&size=${this.size()}`)
      );
      this.rows.set(res.content);
      this.total.set(res.totalElements);
    } catch {
      this.snackBar.open('Erro ao carregar usuários.', 'OK', { duration: 3000 });
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
    const data = await firstValueFrom(
      this.dialog.open(CreateUserDialogComponent, { width: 'min(480px, 95vw)' }).afterClosed()
    );
    if (!data) return;
    try {
      await firstValueFrom(this.http.post(`${this.api}/users`, data));
      this.page.set(0);
      await this.load();
      this.snackBar.open('Usuário criado!', 'OK', { duration: 3000 });
    } catch (err: any) {
      if (err?.status === 409) {
        this.snackBar.open('Usuário ou email já existe.', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('Erro ao criar usuário.', 'OK', { duration: 3000 });
      }
    }
  }

  async openEdit(user: User): Promise<void> {
    const data = await firstValueFrom(
      this.dialog.open(EditUserDialogComponent, { width: 'min(480px, 95vw)', data: { user } }).afterClosed()
    );
    if (!data) return;
    try {
      await firstValueFrom(this.http.patch(`${this.api}/users/${user.id}`, data));
      await this.load();
      this.snackBar.open('Usuário atualizado!', 'OK', { duration: 3000 });
    } catch (err: any) {
      if (err?.status === 409) {
        this.snackBar.open('Usuário ou email já existe.', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('Erro ao atualizar usuário.', 'OK', { duration: 3000 });
      }
    }
  }

  async toggleStatus(user: User): Promise<void> {
    const action = user.enabled ? 'disable' : 'enable';
    const label = user.enabled ? 'Desativar' : 'Ativar';
    const ok = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        width: 'min(380px, 95vw)',
        data: {
          title: `${label} usuário`,
          message: `${label} a conta de "${user.username}"?`,
          confirmLabel: label,
          danger: user.enabled,
        },
      }).afterClosed()
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.http.put(`${this.api}/users/${user.id}/${action}`, {}));
      await this.load();
      this.snackBar.open(`Usuário ${user.enabled ? 'desativado' : 'ativado'}.`, 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erro ao alterar status.', 'OK', { duration: 3000 });
    }
  }

  async openAssignRole(user: User): Promise<void> {
    const roleName = await firstValueFrom(
      this.dialog.open(AssignRoleDialogComponent, {
        width: 'min(420px, 95vw)',
        data: { username: user.username, currentRoles: user.roles },
      }).afterClosed()
    );
    if (!roleName) return;
    try {
      await firstValueFrom(
        this.http.post(`${this.api}/users/${user.username}/roles/${roleName}`, {})
      );
      await this.load();
      this.snackBar.open(`Role "${roleName}" atribuída.`, 'OK', { duration: 3000 });
    } catch (err: any) {
      if (err?.status === 409) {
        this.snackBar.open('Usuário já possui esta role.', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('Erro ao atribuir role.', 'OK', { duration: 3000 });
      }
    }
  }

  async delete(user: User): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        width: 'min(400px, 95vw)',
        data: {
          title: 'Excluir usuário',
          message: `Excluir permanentemente "${user.username}"? Esta ação não pode ser desfeita.`,
          confirmLabel: 'Excluir',
          danger: true,
        },
      }).afterClosed()
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.http.delete(`${this.api}/users/${user.id}`));
      await this.load();
      this.snackBar.open('Usuário excluído.', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erro ao excluir usuário.', 'OK', { duration: 3000 });
    }
  }
}
