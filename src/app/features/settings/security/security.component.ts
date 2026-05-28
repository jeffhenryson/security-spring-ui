import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as QRCode from 'qrcode';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { SessionInfo, TotpSetupResponse, TotpConfirmResponse } from '../../../core/auth/models/auth.models';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { environment } from '../../../../environments/environment';

type TotpView = 'idle' | 'setup-qr' | 'backup-codes' | 'disable-form';

@Component({
  selector: 'app-security',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatProgressSpinnerModule, MatIconModule, MatTableModule,
  ],
  template: `
    <div class="p-6 max-w-3xl mx-auto flex flex-col gap-6">

      <!-- Seção 1: 2FA -->
      <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 class="text-base font-semibold text-slate-200 mt-0 mb-1">Autenticação em dois fatores (2FA)</h3>
        <p class="text-slate-400 text-sm mb-6 m-0">
          Use um aplicativo autenticador (Google Authenticator, Authy) para maior segurança.
        </p>

        @switch (totpView()) {

          @case ('idle') {
            <div class="flex flex-wrap gap-3">
              <button mat-flat-button (click)="startSetup()" [disabled]="totpLoading()">
                @if (totpLoading()) { <mat-spinner diameter="18" class="mr-2" /> }
                Configurar 2FA
              </button>
              <button mat-stroked-button (click)="totpView.set('disable-form')">
                Desabilitar 2FA
              </button>
            </div>
          }

          @case ('setup-qr') {
            <div class="flex flex-col gap-5">
              <p class="text-slate-300 text-sm m-0">
                Escaneie o QR code abaixo com seu aplicativo autenticador, ou insira a chave manualmente.
              </p>
              @if (qrDataUrl()) {
                <img [src]="qrDataUrl()" alt="QR Code 2FA"
                     class="w-52 h-52 rounded-lg self-start bg-white p-2" />
              }
              <div class="bg-slate-800 rounded-lg px-4 py-2 flex items-center gap-2 max-w-sm">
                <span class="text-xs text-slate-400 shrink-0">Chave:</span>
                <code class="text-cyan-300 text-xs font-mono break-all select-all flex-1">{{ totpSecret() }}</code>
                <button mat-icon-button class="!text-slate-400 hover:!text-cyan-400 shrink-0"
                        matTooltip="Copiar chave"
                        aria-label="Copiar chave TOTP"
                        type="button"
                        (click)="copySecret()">
                  <mat-icon>{{ secretCopied() ? 'check' : 'content_copy' }}</mat-icon>
                </button>
              </div>
              <form [formGroup]="confirmForm" (ngSubmit)="confirmSetup()" class="flex flex-col gap-4 max-w-xs">
                <mat-form-field appearance="outline">
                  <mat-label>Código TOTP (6 dígitos)</mat-label>
                  <input matInput formControlName="code" maxlength="6" autocomplete="one-time-code" />
                </mat-form-field>
                @if (totpError()) {
                  <p class="text-red-400 text-sm m-0">{{ totpError() }}</p>
                }
                <div class="flex gap-3">
                  <button mat-flat-button type="submit" [disabled]="totpLoading() || confirmForm.invalid">
                    @if (totpLoading()) { <mat-spinner diameter="18" class="mr-2" /> }
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
                  <p class="text-yellow-300 text-sm font-semibold m-0">Guarde estes códigos em lugar seguro!</p>
                </div>
                <p class="text-yellow-400/70 text-xs m-0">
                  São exibidos uma única vez. Use-os para acessar a conta caso perca o dispositivo autenticador.
                </p>
              </div>
              <div class="grid grid-cols-2 gap-2 max-w-xs">
                @for (code of backupCodes(); track code) {
                  <code class="bg-slate-800 rounded px-3 py-2 text-sm font-mono text-cyan-300 text-center">
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
                <button mat-flat-button (click)="totpView.set('idle')" type="button">Entendido</button>
              </div>
            </div>
          }

          @case ('disable-form') {
            <form [formGroup]="disableForm" (ngSubmit)="disableTotp()" class="flex flex-col gap-4 max-w-xs">
              <p class="text-slate-300 text-sm m-0">
                Informe sua senha atual e o código TOTP para desabilitar o 2FA.
              </p>
              <mat-form-field appearance="outline">
                <mat-label>Senha atual</mat-label>
                <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Código TOTP</mat-label>
                <input matInput formControlName="code" maxlength="6" autocomplete="one-time-code" />
              </mat-form-field>
              @if (totpError()) {
                <p class="text-red-400 text-sm m-0">{{ totpError() }}</p>
              }
              <div class="flex gap-3">
                <button mat-flat-button type="submit"
                        class="!bg-red-700 hover:!bg-red-600"
                        [disabled]="totpLoading() || disableForm.invalid">
                  @if (totpLoading()) { <mat-spinner diameter="18" class="mr-2" /> }
                  Desabilitar 2FA
                </button>
                <button mat-stroked-button type="button" (click)="totpView.set('idle')">Cancelar</button>
              </div>
            </form>
          }

        }
      </section>

      <!-- Seção 2: Sessões ativas -->
      <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div class="flex items-start justify-between mb-5">
          <div>
            <h3 class="text-base font-semibold text-slate-200 mt-0 mb-1">Sessões ativas</h3>
            <p class="text-slate-400 text-sm m-0">Dispositivos com sua conta logada.</p>
          </div>
          <button mat-stroked-button
                  class="!text-red-400 !border-red-900 shrink-0"
                  (click)="terminateAllSessions()"
                  [disabled]="terminatingAll() || loadingSessions()">
            @if (terminatingAll()) { <mat-spinner diameter="18" class="mr-2" /> }
            Encerrar todas
          </button>
        </div>

        @if (loadingSessions()) {
          <div class="flex justify-center py-8"><mat-spinner diameter="32" /></div>
        } @else if (sessions().length === 0) {
          <p class="text-slate-500 text-sm text-center py-8 m-0">Nenhuma sessão ativa encontrada.</p>
        } @else {
          <div class="overflow-x-auto">
            <table mat-table [dataSource]="sessions()" class="w-full">
              <ng-container matColumnDef="createdAt">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">Criado em</th>
                <td mat-cell *matCellDef="let s" class="!text-slate-300 !text-sm">{{ fmt(s.createdAt) }}</td>
              </ng-container>
              <ng-container matColumnDef="expiresAt">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">Expira em</th>
                <td mat-cell *matCellDef="let s" class="!text-slate-300 !text-sm">{{ fmt(s.expiresAt) }}</td>
              </ng-container>
              <ng-container matColumnDef="ipAddress">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">IP</th>
                <td mat-cell *matCellDef="let s" class="!text-slate-300 !text-sm !font-mono">{{ s.ipAddress }}</td>
              </ng-container>
              <ng-container matColumnDef="userAgent">
                <th mat-header-cell *matHeaderCellDef class="!text-slate-400 !text-xs">Dispositivo</th>
                <td mat-cell *matCellDef="let s"
                    class="!text-slate-400 !text-xs max-w-xs truncate">{{ s.userAgent }}</td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="sessionCols"></tr>
              <tr mat-row *matRowDef="let row; columns: sessionCols;"></tr>
            </table>
          </div>
        }
      </section>

    </div>
  `,
})
export class SecurityComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly store = inject(AuthStore);
  private readonly dialog = inject(MatDialog);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly api = environment.apiUrl;

  readonly sessionCols = ['createdAt', 'expiresAt', 'ipAddress', 'userAgent'];

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

  readonly confirmForm = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  readonly disableForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  ngOnInit(): void { this.loadSessions(); }

  async startSetup(): Promise<void> {
    this.totpLoading.set(true);
    this.totpError.set('');
    try {
      const res = await firstValueFrom(
        this.http.post<TotpSetupResponse>(`${this.api}/auth/2fa/setup`, {})
      );
      this.totpSecret.set(res.secret);
      this.qrDataUrl.set(await QRCode.toDataURL(res.otpauthUri, { width: 200, margin: 1 }));
      this.totpView.set('setup-qr');
    } catch {
      this.totpError.set('Erro ao iniciar configuração. Tente novamente.');
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
      const res = await firstValueFrom(
        this.http.post<TotpConfirmResponse>(`${this.api}/auth/2fa/confirm`, this.confirmForm.getRawValue())
      );
      this.backupCodes.set(res.backupCodes);
      this.confirmForm.reset();
      this.totpView.set('backup-codes');
      this.snackBar.open('2FA habilitado com sucesso!', 'OK', { duration: 3000 });
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
      await firstValueFrom(
        this.http.delete(`${this.api}/auth/2fa`, { body: this.disableForm.getRawValue() })
      );
      this.disableForm.reset();
      this.totpView.set('idle');
      this.snackBar.open('2FA desabilitado.', 'OK', { duration: 3000 });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
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
      const sessions = await firstValueFrom(
        this.http.get<SessionInfo[]>(`${this.api}/auth/sessions`)
      );
      this.sessions.set(sessions);
    } catch {
      this.sessions.set([]);
    } finally {
      this.loadingSessions.set(false);
    }
  }

  async terminateAllSessions(): Promise<void> {
    const confirmed = await firstValueFrom(
      this.dialog.open(ConfirmDialogComponent, {
        width: 'min(400px, 95vw)',
        data: {
          title: 'Encerrar todas as sessões',
          message: 'Isso vai deslogar você de todos os dispositivos, incluindo este. Deseja continuar?',
          confirmLabel: 'Encerrar',
          danger: true,
        },
      }).afterClosed()
    );
    if (!confirmed) return;
    this.terminatingAll.set(true);
    try {
      await firstValueFrom(this.http.delete(`${this.api}/auth/sessions`));
      this.store.clear();
      this.router.navigate(['/auth/login']);
    } catch {
      this.snackBar.open('Erro ao encerrar sessões. Tente novamente.', 'OK', { duration: 3000 });
    } finally {
      this.terminatingAll.set(false);
    }
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.totpSecret()).then(() => {
      this.secretCopied.set(true);
      setTimeout(() => this.secretCopied.set(false), 2000);
    });
  }

  copyBackupCodes(): void {
    navigator.clipboard.writeText(this.backupCodes().join('\n')).then(() => {
      this.backupCopied.set(true);
      setTimeout(() => this.backupCopied.set(false), 2000);
    });
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
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
