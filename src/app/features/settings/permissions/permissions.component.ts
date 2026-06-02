import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { PermissionsAdminService, PermissionResponse as Permission } from '../../../core/admin/permissions-admin.service';
import { runWithFeedback, httpErrMsg } from '../../../core/admin/admin-feedback';
import { PERMISSIONS } from '../../../core/rbac/permissions.constants';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/empty-state/empty-state.component';

@Component({
  selector: 'app-permissions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    EmptyStateComponent,
  ],
  template: `
    <div class="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Permissões</h3>
        @if (canCreate()) {
          <form [formGroup]="createForm" (ngSubmit)="create()" class="flex items-center gap-2 flex-wrap">
            <mat-form-field appearance="outline" class="flex-1 sm:w-[220px] !pb-0">
              <mat-label>Nome da permissão</mat-label>
              <input matInput formControlName="name" placeholder="Ex: REPORT_READ" required />
              @if (createForm.get('name')?.hasError('required') && createForm.get('name')?.touched) {
                <mat-error>Campo obrigatório</mat-error>
              }
            </mat-form-field>
            <button mat-flat-button type="submit" [disabled]="loading() || submitting() || createForm.invalid">
              @if (submitting()) {
                <mat-spinner diameter="18" />
              } @else {
                <mat-icon>add</mat-icon>
              }
            </button>
          </form>
        }
      </div>

      <!-- Busca client-side -->
      <mat-form-field appearance="outline" class="w-full !pb-0">
        <mat-label>Buscar permissão</mat-label>
        <mat-icon matPrefix class="!text-[var(--text-secondary)]">search</mat-icon>
        <input matInput [formControl]="searchControl" placeholder="Ex: USER_READ" />
        @if (searchTerm()) {
          <button mat-icon-button matSuffix type="button" (click)="searchControl.reset()" aria-label="Limpar busca">
            <mat-icon class="!text-[18px]">close</mat-icon>
          </button>
        }
      </mat-form-field>

      <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        @if (loading()) {
          <div class="divide-y divide-[var(--border-color)]">
            @for (i of skeletonRows; track i) {
              <div class="flex items-center gap-4 px-6 py-4">
                <div class="skeleton h-4 w-48 rounded"></div>
                <div class="skeleton h-4 w-8 rounded ml-auto"></div>
              </div>
            }
          </div>
        } @else if (filtered().length === 0) {
          <app-empty-state [message]="emptyMessage()" icon="key" />
        } @else {
          <table mat-table [dataSource]="filtered()" class="w-full" aria-label="Tabela de permissões">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs !pl-6">
                Nome
                <span class="ml-2 text-[var(--text-muted)] font-normal">({{ filtered().length }})</span>
              </th>
              <td mat-cell *matCellDef="let p" class="!text-[var(--text-primary)] !text-sm !font-mono !pl-6">
                {{ p.name }}
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="!text-right !pr-4"></th>
              <td mat-cell *matCellDef="let p" class="!text-right !pr-2">
                @if (canDelete()) {
                  <button
                    mat-icon-button
                    (click)="delete(p)"
                    [attr.aria-label]="'Excluir ' + p.name"
                    matTooltip="Excluir"
                    class="!text-[var(--text-muted)] hover:!text-red-400"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols" class="hover:bg-[var(--surface-hover)] transition-colors"></tr>
          </table>
        }
      </div>
    </div>
  `,
})
export class PermissionsComponent {
  private readonly permissionsService = inject(PermissionsAdminService);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly cols = ['name', 'actions'];
  readonly skeletonRows = Array(6).fill(0);
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly allPermissions = signal<Permission[]>([]);

  readonly canCreate = computed(() => this.store.hasPermission(PERMISSIONS.PERMISSION_CREATE));
  readonly canDelete = computed(() => this.store.hasPermission(PERMISSIONS.PERMISSION_DELETE));

  readonly createForm = this.fb.nonNullable.group({ name: ['', Validators.required] });
  readonly searchControl = this.fb.control('');

  readonly searchTerm = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  readonly filtered = computed(() => {
    const term = (this.searchTerm() ?? '').trim().toLowerCase();
    const all = this.allPermissions();
    return term ? all.filter((p) => p.name.toLowerCase().includes(term)) : all;
  });

  readonly emptyMessage = computed(() => {
    const term = (this.searchTerm() ?? '').trim();
    return term
      ? `Nenhuma permissão encontrada para "${term}".`
      : 'Nenhuma permissão cadastrada.';
  });

  constructor() {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const all = await this.permissionsService.listAll();
      this.allPermissions.set(all);
    } catch {
      this.snackBar.open('Erro ao carregar permissões.', 'OK', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  async create(): Promise<void> {
    if (this.createForm.invalid) return;
    this.submitting.set(true);
    const { name } = this.createForm.getRawValue();
    const ok = await runWithFeedback(
      () => this.permissionsService.create(name),
      'Permissão criada!',
      httpErrMsg('Permissão já existe.', 'Erro ao criar permissão.'),
      this.snackBar,
    );
    if (ok) {
      this.createForm.reset();
      await this.load();
    }
    this.submitting.set(false);
  }

  async delete(p: Permission): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: 'min(400px, 95vw)',
          data: {
            title: 'Excluir permissão',
            message: `Excluir "${p.name}"? Roles que possuem esta permissão serão afetadas.`,
            confirmLabel: 'Excluir',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (!confirmed) return;
    const ok = await runWithFeedback(
      () => this.permissionsService.remove(p.name),
      'Permissão excluída.',
      'Erro ao excluir permissão.',
      this.snackBar,
    );
    if (ok !== null) await this.load();
  }
}
