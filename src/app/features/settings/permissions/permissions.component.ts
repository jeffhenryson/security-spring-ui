import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';

interface Permission { name: string; }
interface Page<T> { content: T[]; totalElements: number; }

@Component({
  selector: 'app-permissions',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatTableModule, MatPaginatorModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  template: `
    <div class="p-6 max-w-3xl mx-auto flex flex-col gap-6">

      <div class="flex items-center justify-between flex-wrap gap-4">
        <h3 class="text-base font-semibold text-slate-200 m-0">Permissões</h3>
        @if (canCreate()) {
          <form [formGroup]="createForm" (ngSubmit)="create()" class="flex items-center gap-2">
            <mat-form-field appearance="outline" style="width:220px" class="!pb-0">
              <mat-label>Nome da permissão</mat-label>
              <input matInput formControlName="name" placeholder="Ex: REPORT_READ" />
            </mat-form-field>
            <button mat-flat-button type="submit" [disabled]="creating() || createForm.invalid">
              @if (creating()) {
                <mat-spinner diameter="18" />
              } @else {
                <mat-icon>add</mat-icon>
              }
            </button>
          </form>
        }
      </div>

      <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        @if (loading()) {
          <div class="flex justify-center py-12"><mat-spinner diameter="32" /></div>
        } @else if (rows().length === 0) {
          <p class="text-slate-500 text-sm text-center py-12 m-0">Nenhuma permissão cadastrada.</p>
        } @else {
          <table mat-table [dataSource]="rows()" class="w-full">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs !pl-6">Nome</th>
              <td mat-cell *matCellDef="let p" class="!text-slate-200 !text-sm !font-mono !pl-6">{{ p.name }}</td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="!text-right !pr-4"></th>
              <td mat-cell *matCellDef="let p" class="!text-right !pr-2">
                @if (canDelete()) {
                  <button mat-icon-button (click)="delete(p)"
                          class="!text-slate-500 hover:!text-red-400">
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"
                class="hover:!bg-slate-800/50 transition-colors"></tr>
          </table>
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
export class PermissionsComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);
  private readonly api = environment.apiUrl;

  readonly cols = ['name', 'actions'];
  readonly rows = signal<Permission[]>([]);
  readonly total = signal(0);
  readonly page = signal(0);
  readonly size = signal(10);
  readonly loading = signal(true);
  readonly creating = signal(false);

  readonly canCreate = computed(() => this.store.hasPermission('PERMISSION_CREATE'));
  readonly canDelete = computed(() => this.store.hasPermission('PERMISSION_DELETE'));

  readonly createForm = this.fb.nonNullable.group({ name: ['', Validators.required] });

  ngOnInit(): void { this.load(); }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      const res = await firstValueFrom(
        this.http.get<Page<Permission>>(
          `${this.api}/permissions?page=${this.page()}&size=${this.size()}`
        )
      );
      this.rows.set(res.content);
      this.total.set(res.totalElements);
    } catch {
      this.snackBar.open('Erro ao carregar permissões.', 'OK', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onPage(e: PageEvent): void {
    this.page.set(e.pageIndex);
    this.size.set(e.pageSize);
    this.load();
  }

  async create(): Promise<void> {
    if (this.createForm.invalid) return;
    this.creating.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${this.api}/permissions`, this.createForm.getRawValue())
      );
      this.createForm.reset();
      this.page.set(0);
      await this.load();
      this.snackBar.open('Permissão criada!', 'OK', { duration: 3000 });
    } catch (err: any) {
      if (err?.status === 409) {
        this.snackBar.open('Permissão já existe.', 'OK', { duration: 3000 });
      } else {
        this.snackBar.open('Erro ao criar permissão.', 'OK', { duration: 3000 });
      }
    } finally {
      this.creating.set(false);
    }
  }

  async delete(p: Permission): Promise<void> {
    const ok = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        width: 'min(400px, 95vw)',
        data: {
          title: 'Excluir permissão',
          message: `Excluir "${p.name}"? Roles que possuem esta permissão serão afetadas.`,
          confirmLabel: 'Excluir',
          danger: true,
        },
      }).afterClosed()
    );
    if (!ok) return;
    try {
      await firstValueFrom(this.http.delete(`${this.api}/permissions/${p.name}`));
      await this.load();
      this.snackBar.open('Permissão excluída.', 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erro ao excluir permissão.', 'OK', { duration: 3000 });
    }
  }
}
