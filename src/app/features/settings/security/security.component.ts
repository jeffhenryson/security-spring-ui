import { Component, OnInit, computed, inject, signal, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { SessionInfo } from '../../../core/auth/models/auth.models';
import { SecurityService } from '../../../core/security/security.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';

type TotpView = 'idle' | 'setup-qr' | 'backup-codes' | 'disable-form' | 'regen-form';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatTableModule,
  ],
  template: `
    <div class="p-6 max-w-3xl mx-auto flex flex-col gap-6">
      <!-- Seção 1: 2FA -->
      <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
        <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-1">
          Autenticação em dois fatores (2FA)
        </h3>
        <p class="text-[var(--text-secondary)] text-sm mb-6 m-0">
          Use um aplicativo autenticador (Google Authenticator, Authy) para maior segurança.
        </p>

        @switch (totpView()) {
          @case ('idle') {
            <div class="flex items-center gap-2 mb-5">
              @if (totpEnabled() === true) {
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                             bg-emerald-900/60 text-emerald-300"
                >
                  <mat-icon class="!text-[14px] !w-3.5 !h-3.5">check_circle</mat-icon>
                  2FA ativado
                </span>
              } @else if (totpEnabled() === false) {
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                             bg-orange-900/60 text-orange-300"
                >
                  <mat-icon class="!text-[14px] !w-3.5 !h-3.5">warning</mat-icon>
                  2FA não configurado
                </span>
              }
            </div>
            @if (totpError()) {
              <p class="text-red-400 text-sm mb-4">{{ totpError() }}</p>
            }
            <div class="flex flex-wrap gap-3">
              @if (totpEnabled() !== true) {
                <button mat-flat-button (click)="startSetup()" [disabled]="totpLoading()">
                  @if (totpLoading()) {
                    <mat-spinner diameter="18" class="mr-2" />
                  }
                  Configurar 2FA
                </button>
              }
              @if (totpEnabled() === true) {
                <button
                  mat-stroked-button
                  (click)="totpView.set('regen-form'); totpError.set('')"
                  [disabled]="totpLoading()"
                >
                  Regenerar backup codes
                </button>
                <button mat-stroked-button (click)="totpView.set('disable-form')">
                  Desabilitar 2FA
                </button>
              }
            </div>
          }

          @case ('setup-qr') {
            <div class="flex flex-col gap-5">
              <p class="text-[var(--text-primary)] text-sm m-0">
                Escaneie o QR code abaixo com seu aplicativo autenticador, ou insira a chave
                manualmente.
              </p>
              @if (qrDataUrl()) {
                <img
                  [src]="qrDataUrl()"
                  alt="QR Code 2FA"
                  class="w-52 h-52 rounded-lg self-start bg-white p-2"
                />
              }
              <div
                class="bg-[var(--surface-hover)] rounded-lg px-4 py-2 flex items-center gap-2 max-w-sm"
              >
                <span class="text-xs text-[var(--text-secondary)] shrink-0">Chave:</span>
                <code class="text-cyan-300 text-xs font-mono break-all select-all flex-1">{{
                  totpSecret()
                }}</code>
                <button
                  mat-icon-button
                  class="!text-[var(--text-secondary)] hover:!text-cyan-400 shrink-0"
                  matTooltip="Copiar chave"
                  aria-label="Copiar chave TOTP"
                  type="button"
                  (click)="copySecret()"
                >
                  <mat-icon>{{ secretCopied() ? 'check' : 'content_copy' }}</mat-icon>
                </button>
              </div>
              <form
                [formGroup]="confirmForm"
                (ngSubmit)="confirmSetup()"
                class="flex flex-col gap-4 max-w-xs"
              >
                <mat-form-field appearance="outline">
                  <mat-label>Código TOTP (6 dígitos)</mat-label>
                  <input
                    matInput
                    formControlName="code"
                    maxlength="6"
                    autocomplete="one-time-code"
                  />
                </mat-form-field>
                @if (totpError()) {
                  <p class="text-red-400 text-sm m-0">{{ totpError() }}</p>
                }
                <div class="flex gap-3">
                  <button
                    mat-flat-button
                    type="submit"
                    [disabled]="totpLoading() || confirmForm.invalid"
                  >
                    @if (totpLoading()) {
                      <mat-spinner diameter="18" class="mr-2" />
                    }
                    Confirmar
                  </button>
                  <button mat-stroked-button type="button" (click)="cancelSetup()">Cancelar</button>
                </div>
              </form>
            </div>
          }

          @case ('backup-codes') {
            <div class="flex flex-col gap-4">
              <div class="p-4 bg-yellow-950/60 border border-yellow-600/50 rounded-xl">
                <div class="flex items-center gap-2 mb-2">
                  <mat-icon class="text-yellow-400 shrink-0">warning</mat-icon>
                  <p class="text-yellow-300 text-sm font-semibold m-0">
                    Guarde estes códigos em lugar seguro!
                  </p>
                </div>
                <p class="text-yellow-400/70 text-xs m-0">
                  São exibidos uma única vez. Use-os para acessar a conta caso perca o dispositivo
                  autenticador.
                </p>
              </div>
              <div class="grid grid-cols-2 gap-2 max-w-xs">
                @for (code of backupCodes(); track code) {
                  <code
                    class="bg-[var(--surface-hover)] rounded px-3 py-2 text-sm font-mono text-cyan-300 text-center"
                  >
                    {{ code }}
                  </code>
                }
              </div>
              <div class="flex gap-2 flex-wrap">
                <button mat-stroked-button (click)="copyBackupCodes()" type="button">
                  <mat-icon>{{ backupCopied() ? 'check' : 'content_copy' }}</mat-icon>
                  {{ backupCopied() ? 'Copiado!' : 'Copiar todos' }}
                </button>
                <button mat-stroked-button (click)="downloadBackupCodes()" type="button">
                  <mat-icon>download</mat-icon>
                  Baixar .txt
                </button>
                <button mat-flat-button (click)="totpView.set('idle')" type="button">
                  Entendido
                </button>
              </div>
            </div>
          }

          @case ('disable-form') {
            <form
              [formGroup]="disableForm"
              (ngSubmit)="disableTotp()"
              class="flex flex-col gap-4 max-w-xs"
            >
              <p class="text-[var(--text-primary)] text-sm m-0">
                Informe sua senha atual e o código TOTP para desabilitar o 2FA.
              </p>
              <mat-form-field appearance="outline">
                <mat-label>Senha atual</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Código TOTP</mat-label>
                <input matInput formControlName="code" maxlength="6" autocomplete="one-time-code" />
              </mat-form-field>
              @if (totpError()) {
                <p class="text-red-400 text-sm m-0">{{ totpError() }}</p>
              }
              <div class="flex gap-3">
                <button
                  mat-flat-button
                  type="submit"
                  class="!bg-red-700 hover:!bg-red-600"
                  [disabled]="totpLoading() || disableForm.invalid"
                >
                  @if (totpLoading()) {
                    <mat-spinner diameter="18" class="mr-2" />
                  }
                  Desabilitar 2FA
                </button>
                <button mat-stroked-button type="button" (click)="totpView.set('idle')">
                  Cancelar
                </button>
              </div>
            </form>
          }

          @case ('regen-form') {
            <form
              [formGroup]="regenForm"
              (ngSubmit)="confirmRegenBackupCodes()"
              class="flex flex-col gap-4 max-w-xs"
            >
              <p class="text-[var(--text-primary)] text-sm m-0">
                Confirme sua senha para gerar novos backup codes. Os códigos atuais serão invalidados.
              </p>
              <mat-form-field appearance="outline">
                <mat-label>Senha atual</mat-label>
                <input
                  matInput
                  type="password"
                  formControlName="currentPassword"
                  autocomplete="current-password"
                />
              </mat-form-field>
              @if (totpError()) {
                <p class="text-red-400 text-sm m-0">{{ totpError() }}</p>
              }
              <div class="flex gap-3">
                <button
                  mat-flat-button
                  type="submit"
                  [disabled]="totpLoading() || regenForm.invalid"
                >
                  @if (totpLoading()) {
                    <mat-spinner diameter="18" class="mr-2" />
                  }
                  Regenerar
                </button>
                <button mat-stroked-button type="button" (click)="totpView.set('idle')">
                  Cancelar
                </button>
              </div>
            </form>
          }
        }
      </section>

      <!-- Seção 2: Sessões ativas -->
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
            (click)="terminateAllSessions()"
            [disabled]="terminatingAll() || loadingSessions()"
          >
            @if (terminatingAll()) {
              <mat-spinner diameter="18" class="mr-2" />
            }
            Encerrar todas
          </button>
        </div>

        @if (loadingSessions()) {
          <div class="divide-y divide-[var(--border-color)]">
            @for (i of sessionSkeletonRows; track i) {
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
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  Criado em
                </th>
                <td mat-cell *matCellDef="let s" class="!text-[var(--text-primary)] !text-sm">
                  {{ fmt(s.createdAt) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="expiresAt">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  Expira em
                </th>
                <td mat-cell *matCellDef="let s" class="!text-[var(--text-primary)] !text-sm">
                  {{ fmt(s.expiresAt) }}
                </td>
              </ng-container>
              <ng-container matColumnDef="ipAddress">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  IP
                </th>
                <td
                  mat-cell
                  *matCellDef="let s"
                  class="!text-[var(--text-primary)] !text-sm !font-mono"
                >
                  {{ s.ipAddress }}
                </td>
              </ng-container>
              <ng-container matColumnDef="userAgent">
                <th
                  mat-header-cell
                  *matHeaderCellDef
                  class="!text-[var(--text-secondary)] !text-xs"
                >
                  Dispositivo
                </th>
                <td
                  mat-cell
                  *matCellDef="let s"
                  class="!text-[var(--text-secondary)] !text-xs max-w-xs truncate"
                >
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
                    (click)="terminateSession(s)"
                  >
                    @if (revokingId() === s.id) {
                      <mat-spinner diameter="18" />
                    } @else {
                      <mat-icon>logout</mat-icon>
                    }
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="sessionCols"></tr>
              <tr mat-row *matRowDef="let row; columns: sessionCols"></tr>
            </table>
          </div>
        }
      </section>
    </div>
  `,
})
export class SecurityComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly securityService = inject(SecurityService);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  private secretCopiedTimer: ReturnType<typeof setTimeout> | null = null;
  private backupCopiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.secretCopiedTimer !== null) clearTimeout(this.secretCopiedTimer);
      if (this.backupCopiedTimer !== null) clearTimeout(this.backupCopiedTimer);
    });
  }

  readonly sessionCols = ['createdAt', 'expiresAt', 'ipAddress', 'userAgent', 'actions'];
  readonly sessionSkeletonRows = Array(3).fill(0);

  readonly totpEnabled = computed(() => this.store.currentUser()?.totpEnabled);

  readonly totpView = signal<TotpView>('idle');
  readonly totpLoading = signal(false);
  readonly totpError = signal('');
  readonly qrDataUrl = signal('');
  readonly totpSecret = signal('');
  readonly backupCodes = signal<string[]>([]);
  readonly secretCopied = signal(false);
  readonly backupCopied = signal(false);

  readonly sessions = signal<SessionInfo[]>([]);
  readonly loadingSessions = signal(true);
  readonly terminatingAll = signal(false);
  readonly revokingId = signal<number | null>(null);

  readonly confirmForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  readonly disableForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  readonly regenForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
  });

  ngOnInit(): void {
    this.loadSessions();
  }

  async startSetup(): Promise<void> {
    this.totpLoading.set(true);
    this.totpError.set('');
    try {
      const res = await this.securityService.startTotpSetup();
      this.totpSecret.set(res.secret);
      let qrUrl: string;
      try {
        const QRCode = await import('qrcode');
        qrUrl = await QRCode.toDataURL(res.otpauthUri, { width: 200, margin: 1 });
      } catch {
        qrUrl = '';
      }
      this.qrDataUrl.set(qrUrl);
      this.totpView.set('setup-qr');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.totpError.set('2FA já está ativado. Desative-o antes de reconfigurar.');
      } else {
        this.totpError.set('Erro ao iniciar configuração. Tente novamente.');
      }
    } finally {
      this.totpLoading.set(false);
    }
  }

  cancelSetup(): void {
    this.totpView.set('idle');
    this.confirmForm.reset();
    this.totpError.set('');
    this.qrDataUrl.set('');
    this.totpSecret.set('');
  }

  async confirmSetup(): Promise<void> {
    if (this.confirmForm.invalid) return;
    this.totpLoading.set(true);
    this.totpError.set('');
    try {
      const res = await this.securityService.confirmTotpSetup(this.confirmForm.getRawValue().code);
      this.backupCodes.set(res.backupCodes);
      this.confirmForm.reset();
      this.totpView.set('backup-codes');
      this.snackBar.open('2FA habilitado com sucesso!', 'OK', { duration: 3000 });
      try {
        await this.authService.loadCurrentUser();
      } catch {}
    } catch {
      this.totpError.set('Código inválido ou expirado. Tente novamente.');
    } finally {
      this.totpLoading.set(false);
    }
  }

  async disableTotp(): Promise<void> {
    if (this.disableForm.invalid) return;
    this.totpLoading.set(true);
    this.totpError.set('');
    try {
      await this.securityService.disableTotp(this.disableForm.getRawValue());
      this.disableForm.reset();
      this.totpView.set('idle');
      this.snackBar.open('2FA desabilitado.', 'OK', { duration: 3000 });
      try {
        await this.authService.loadCurrentUser();
      } catch {}
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.totpError.set('Senha ou código inválido.');
      } else {
        this.totpError.set('Erro ao desabilitar. Tente novamente.');
      }
    } finally {
      this.totpLoading.set(false);
    }
  }

  private async loadSessions(): Promise<void> {
    this.loadingSessions.set(true);
    try {
      this.sessions.set(await this.securityService.loadSessions());
    } catch {
      this.sessions.set([]);
      this.snackBar.open('Não foi possível carregar as sessões ativas.', 'OK', { duration: 4000 });
    } finally {
      this.loadingSessions.set(false);
    }
  }

  async terminateAllSessions(): Promise<void> {
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

  async confirmRegenBackupCodes(): Promise<void> {
    if (this.regenForm.invalid) return;
    this.totpLoading.set(true);
    this.totpError.set('');
    try {
      const { currentPassword } = this.regenForm.getRawValue();
      const res = await this.securityService.regenerateBackupCodes(currentPassword);
      this.regenForm.reset();
      this.backupCodes.set(res.backupCodes);
      this.totpView.set('backup-codes');
      this.snackBar.open('Novos backup codes gerados!', 'OK', { duration: 3000 });
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.totpError.set('Senha incorreta.');
      } else {
        this.totpError.set('Erro ao regenerar backup codes. Tente novamente.');
      }
    } finally {
      this.totpLoading.set(false);
    }
  }

  async terminateSession(session: SessionInfo): Promise<void> {
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

  copySecret(): void {
    navigator.clipboard.writeText(this.totpSecret()).then(
      () => {
        this.secretCopied.set(true);
        if (this.secretCopiedTimer !== null) clearTimeout(this.secretCopiedTimer);
        this.secretCopiedTimer = setTimeout(() => this.secretCopied.set(false), 2000);
      },
      () => this.snackBar.open('Não foi possível copiar.', 'OK', { duration: 2000 }),
    );
  }

  copyBackupCodes(): void {
    navigator.clipboard.writeText(this.backupCodes().join('\n')).then(
      () => {
        this.backupCopied.set(true);
        if (this.backupCopiedTimer !== null) clearTimeout(this.backupCopiedTimer);
        this.backupCopiedTimer = setTimeout(() => this.backupCopied.set(false), 2000);
      },
      () => this.snackBar.open('Não foi possível copiar.', 'OK', { duration: 2000 }),
    );
  }

  downloadBackupCodes(): void {
    const content = this.backupCodes().join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
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
