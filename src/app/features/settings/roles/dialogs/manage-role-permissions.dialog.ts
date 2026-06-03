import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../../core/auth/auth.store';
import { RolesAdminService, RoleResponse } from '../../../../core/admin/roles-admin.service';
import { PERMISSIONS } from '../../../../core/rbac/permissions.constants';

const DEV_ONLY_PERMISSIONS = new Set(['DEV_ROLE_MANAGE', 'DEV_PERMISSION_MANAGE']);

@Component({
  selector: 'app-manage-role-permissions-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2 mat-dialog-title>Permissões — {{ data.role.name }}</h2>
    <mat-dialog-content class="!min-w-[400px]">
      <p class="text-[var(--text-secondary)] text-sm mb-3 m-0">Permissões atribuídas:</p>
      <mat-chip-set class="mb-4 flex flex-wrap gap-1">
        @if (role().permissions.length === 0) {
          <span class="text-[var(--text-muted)] text-sm">Nenhuma permissão</span>
        }
        @for (perm of role().permissions; track perm) {
          <mat-chip [removable]="canRemove(perm)" (removed)="removePerm(perm)">
            {{ perm }}
            @if (canRemove(perm)) {
              <button matChipRemove><mat-icon>cancel</mat-icon></button>
            }
          </mat-chip>
        }
      </mat-chip-set>

      @if (canManage()) {
        <div class="flex items-center gap-2 pt-2">
          <mat-form-field appearance="outline" class="flex-1 !pb-0">
            <mat-label>Adicionar permissão</mat-label>
            <mat-select [value]="selectedPerm()" (selectionChange)="selectedPerm.set($event.value)">
              @for (p of availablePerms(); track p) {
                <mat-option [value]="p">{{ p }}</mat-option>
              }
              @if (availablePerms().length === 0) {
                <mat-option disabled>Todas as permissões já atribuídas</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button (click)="addPerm()" [disabled]="!selectedPerm() || submitting()">
            @if (submitting()) {
              <mat-spinner diameter="18" />
            } @else {
              Adicionar
            }
          </button>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Fechar</button>
    </mat-dialog-actions>
  `,
})
export class ManageRolePermissionsDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ManageRolePermissionsDialogComponent>);
  readonly data: { role: RoleResponse; allPermissions: string[] } = inject(MAT_DIALOG_DATA);
  private readonly rolesService = inject(RolesAdminService);
  private readonly store = inject(AuthStore);
  private readonly snackBar = inject(MatSnackBar);

  readonly role = signal<RoleResponse>({ ...this.data.role, permissions: [...this.data.role.permissions] });
  readonly allPermissions = signal<string[]>(this.data.allPermissions);
  readonly selectedPerm = signal('');
  readonly submitting = signal(false);

  readonly canManage = computed(() => this.store.hasPermission(PERMISSIONS.ROLE_MANAGE_PERMISSIONS));
  readonly canManageDev = computed(() => this.store.hasPermission(PERMISSIONS.DEV_ROLE_MANAGE));
  readonly availablePerms = computed(() => {
    const base = this.allPermissions().filter((p) => !this.role().permissions.includes(p));
    return this.canManageDev() ? base : base.filter((p) => !DEV_ONLY_PERMISSIONS.has(p));
  });

  canRemove(perm: string): boolean {
    if (!this.canManage()) return false;
    if (DEV_ONLY_PERMISSIONS.has(perm) && !this.canManageDev()) return false;
    return true;
  }

  async addPerm(): Promise<void> {
    const perm = this.selectedPerm();
    if (!perm) return;
    this.submitting.set(true);
    try {
      await this.rolesService.addPermission(this.role().name, perm);
      this.role.update((r) => ({ ...r, permissions: [...r.permissions, perm] }));
      this.selectedPerm.set('');
      this.snackBar.open('Permissão adicionada!', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erro ao adicionar permissão.', 'OK', { duration: 3000 });
    } finally {
      this.submitting.set(false);
    }
  }

  async removePerm(perm: string): Promise<void> {
    if (!this.canRemove(perm)) return;
    try {
      await this.rolesService.removePermission(this.role().name, perm);
      this.role.update((r) => ({ ...r, permissions: r.permissions.filter((p) => p !== perm) }));
      this.snackBar.open('Permissão removida.', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erro ao remover permissão.', 'OK', { duration: 3000 });
    }
  }
}
