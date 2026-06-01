import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthStore } from '../../../../core/auth/auth.store';
import { SecurityService } from '../../../../core/security/security.service';
import { SessionInfo } from '../../../../core/auth/models/auth.models';
import { ConfirmDialogComponent } from '../../../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-sessions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
      <div class="flex items-start justify-between mb-5">
        <div>
          <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-1">
            Sessões ativas
          </h3>
          <p class="text-[var(--text-secondary)] text-sm m-0">
            Dispositivos com sua conta logada.
          </p>
        </div>
        <button
          mat-stroked-button
          class="!text-red-400 !border-red-900 shrink-0"
          (click)="terminateAll()"
          [disabled]="terminatingAll() || loading()"
        >
          @if (terminatingAll()) {
            <mat-spinner diameter="18" class="mr-2" />
          }
          Encerrar todas
        </button>
      </div>

      @if (loading()) {
        <div class="divide-y divide-[var(--border-color)]">
          @for (i of skeletonRows; track i) {
            <div class="flex items-center gap-4 py-3">
              <div class="skeleton h-3.5 w-28 rounded"></div>
              <div class="skeleton h-3.5 w-28 rounded"></div>
              <div class="skeleton h-3.5 w-20 rounded font-mono"></div>
              <div class="skeleton h-3.5 flex-1 rounded"></div>
              <div class="skeleton h-7 w-7 rounded-full ml-auto"></div>
            </div>
          }
        </div>
      } @else if (sessions().length === 0) {
        <p class="text-[var(--text-muted)] text-sm text-center py-8 m-0">
          Nenhuma sessão ativa encontrada.
        </p>
      } @else {
        <div class="overflow-x-auto">
          <table mat-table [dataSource]="sessions()" class="w-full" aria-label="Sessões ativas">
            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                Criado em
              </th>
              <td mat-cell *matCellDef="let s" class="!text-[var(--text-primary)] !text-sm">
                {{ fmt(s.createdAt) }}
              </td>
            </ng-container>
            <ng-container matColumnDef="expiresAt">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                Expira em
              </th>
              <td mat-cell *matCellDef="let s" class="!text-[var(--text-primary)] !text-sm">
                {{ fmt(s.expiresAt) }}
              </td>
            </ng-container>
            <ng-container matColumnDef="ipAddress">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                IP
              </th>
              <td mat-cell *matCellDef="let s" class="!text-[var(--text-primary)] !text-sm !font-mono">
                {{ s.ipAddress }}
              </td>
            </ng-container>
            <ng-container matColumnDef="userAgent">
              <th mat-header-cell *matHeaderCellDef class="!text-[var(--text-secondary)] !text-xs">
                Dispositivo
              </th>
              <td mat-cell *matCellDef="let s" class="!text-[var(--text-secondary)] !text-xs max-w-xs truncate">
                {{ s.userAgent }}
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef class="!text-right !pr-2"></th>
              <td mat-cell *matCellDef="let s" class="!text-right !pr-2">
                <button
                  mat-icon-button
                  class="!text-[var(--text-secondary)] hover:!text-red-400"
                  matTooltip="Encerrar sessão"
                  [attr.aria-label]="'Encerrar sessão ' + s.id"
                  [disabled]="revokingId() === s.id"
                  (click)="terminateOne(s)"
                >
                  @if (revokingId() === s.id) {
                    <mat-spinner diameter="18" />
                  } @else {
                    <mat-icon>logout</mat-icon>
                  }
                </button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols"></tr>
          </table>
        </div>
      }
    </section>
  `,
})
export class SessionsComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly securityService = inject(SecurityService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  readonly cols = ['createdAt', 'expiresAt', 'ipAddress', 'userAgent', 'actions'];
  readonly skeletonRows = Array(3).fill(0);

  readonly sessions = signal<SessionInfo[]>([]);
  readonly loading = signal(true);
  readonly terminatingAll = signal(false);
  readonly revokingId = signal<number | null>(null);

  ngOnInit(): void {
    void this.load();
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    try {
      this.sessions.set(await this.securityService.loadSessions());
    } catch {
      this.sessions.set([]);
      this.snackBar.open('Não foi possível carregar as sessões ativas.', 'OK', { duration: 4000 });
    } finally {
      this.loading.set(false);
    }
  }

  async terminateAll(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog
        .open(ConfirmDialogComponent, {
          width: 'min(400px, 95vw)',
          data: {
            title: 'Encerrar todas as sessões',
            message:
              'Isso vai deslogar você de todos os dispositivos, incluindo este. Deseja continuar?',
            confirmLabel: 'Encerrar',
            danger: true,
          },
        })
        .afterClosed(),
    );
    if (!confirmed) return;
    this.terminatingAll.set(true);
    try {
      await this.securityService.terminateAllSessions();
      this.store.clear();
      this.router.navigate(['/auth/login']);
    } catch {
      this.snackBar.open('Erro ao encerrar sessões. Tente novamente.', 'OK', { duration: 3000 });
    } finally {
      this.terminatingAll.set(false);
    }
  }

  async terminateOne(session: SessionInfo): Promise<void> {
    this.revokingId.set(session.id);
    try {
      await this.securityService.terminateSession(session.id);
      this.sessions.update((list) => list.filter((s) => s.id !== session.id));
      this.snackBar.open('Sessão encerrada.', 'OK', { duration: 2000 });
    } catch {
      this.snackBar.open('Erro ao encerrar sessão. Tente novamente.', 'OK', { duration: 3000 });
    } finally {
      this.revokingId.set(null);
    }
  }

  fmt(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
