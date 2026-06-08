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
import { UsersAdminService } from '../../../../core/admin/users-admin.service';
import { PERMISSIONS, ROLES } from '../../../../core/rbac/permissions.constants';

@Component({
  selector: 'app-manage-roles-dialog',
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
    <h2 mat-dialog-title>Roles — {{ data.username }}</h2>
    <mat-dialog-content class="!min-w-[380px]">
      <p class="text-[var(--text-secondary)] text-sm mb-3 mt-1">Roles atribuídas:</p>
      <mat-chip-set class="mb-4 flex flex-wrap gap-1">
        @if (currentRoles().length === 0) {
          <span class="text-[var(--text-muted)] text-sm">Nenhuma role</span>
        }
        @for (r of currentRoles(); track r) {
          <mat-chip [removable]="canAssign() && pendingRemove() !== r" (removed)="pendingRemove.set(r)"
                    [class.opacity-50]="pendingRemove() === r">
            {{ r }}
            @if (canAssign() && pendingRemove() !== r) {
              <button matChipRemove><mat-icon>cancel</mat-icon></button>
            }
          </mat-chip>
        }
      </mat-chip-set>

      @if (pendingRemove(); as role) {
        <div class="flex items-center gap-2 mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/50">
          <mat-icon class="text-red-400 shrink-0 !text-[18px]">warning</mat-icon>
          <span class="text-red-300 text-sm flex-1">Remover <strong>{{ role }}</strong>?</span>
          <button mat-stroked-button class="!text-xs !h-7" (click)="pendingRemove.set(null)">
            Cancelar
          </button>
          <button mat-flat-button color="warn" class="!text-xs !h-7"
                  [disabled]="submitting()" (click)="confirmRemoveRole(role)">
            @if (submitting()) { <mat-spinner diameter="14" /> } @else { Remover }
          </button>
        </div>
      }

      @if (canAssign()) {
        <div class="flex items-center gap-2 pt-2">
          <mat-form-field appearance="outline" class="cs-input flex-1 !pb-0">
            <mat-label>Adicionar role</mat-label>
            <mat-select [value]="selectedRole()" (selectionChange)="selectedRole.set($event.value)">
              @for (r of availableRoles(); track r) {
                <mat-option [value]="r">{{ r }}</mat-option>
              }
              @if (availableRoles().length === 0) {
                <mat-option disabled>Todas as roles já atribuídas</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <button mat-flat-button (click)="addRole()" [disabled]="!selectedRole() || submitting()">
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
      <button mat-stroked-button [mat-dialog-close]="changed()">Fechar</button>
    </mat-dialog-actions>
  `,
})
export class ManageRolesDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ManageRolesDialogComponent>);
  readonly data: { username: string; currentRoles: string[]; allRoles: string[] } =
    inject(MAT_DIALOG_DATA);
  private readonly usersService = inject(UsersAdminService);
  private readonly store = inject(AuthStore);
  private readonly snackBar = inject(MatSnackBar);

  readonly currentRoles = signal<string[]>([...this.data.currentRoles]);
  readonly selectedRole = signal('');
  readonly submitting = signal(false);
  readonly changed = signal(false);
  readonly pendingRemove = signal<string | null>(null);

  readonly canAssign = computed(() => this.store.hasPermission(PERMISSIONS.USER_ROLE_ASSIGN));
  readonly canManageDev = computed(() => this.store.hasPermission(PERMISSIONS.DEV_ROLE_MANAGE));
  readonly availableRoles = computed(() => {
    const base = this.data.allRoles.filter((r) => !this.currentRoles().includes(r));
    return this.canManageDev() ? base : base.filter((r) => r !== ROLES.ROLE_DEV);
  });

  async addRole(): Promise<void> {
    const role = this.selectedRole();
    if (!role) return;
    this.submitting.set(true);
    try {
      await this.usersService.assignRole(this.data.username, role);
      this.currentRoles.update((roles) => [...roles, role]);
      this.selectedRole.set('');
      this.changed.set(true);
      this.snackBar.open(`Role "${role}" atribuída.`, 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erro ao atribuir role.', 'OK', { duration: 3000 });
    } finally {
      this.submitting.set(false);
    }
  }

  async confirmRemoveRole(role: string): Promise<void> {
    this.submitting.set(true);
    try {
      await this.usersService.removeRole(this.data.username, role);
      this.currentRoles.update((roles) => roles.filter((r) => r !== role));
      this.pendingRemove.set(null);
      this.changed.set(true);
      this.snackBar.open(`Role "${role}" removida.`, 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erro ao remover role.', 'OK', { duration: 3000 });
    } finally {
      this.submitting.set(false);
    }
  }
}
