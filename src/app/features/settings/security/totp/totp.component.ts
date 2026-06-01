import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { AuthStore } from '../../../../core/auth/auth.store';
import { AuthService } from '../../../../core/auth/auth.service';
import { SecurityService } from '../../../../core/security/security.service';

type TotpView = 'idle' | 'setup-qr' | 'backup-codes' | 'disable-form' | 'regen-form' | 'replace-form';

@Component({
  selector: 'app-totp',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
      <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-1">
        Autenticação em dois fatores (2FA)
      </h3>
      <p class="text-[var(--text-secondary)] text-sm mb-6 m-0">
        Use um aplicativo autenticador (Google Authenticator, Authy) para maior segurança.
      </p>

      @switch (view()) {
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
          @if (error()) {
            <p class="text-red-400 text-sm mb-4">{{ error() }}</p>
          }
          <div class="flex flex-wrap gap-3">
            @if (totpEnabled() !== true) {
              <button mat-flat-button (click)="startSetup()" [disabled]="loading()">
                @if (loading()) {
                  <mat-spinner diameter="18" class="mr-2" />
                }
                Configurar 2FA
              </button>
            }
            @if (totpEnabled() === true) {
              <button
                mat-stroked-button
                (click)="view.set('replace-form'); error.set('')"
                [disabled]="loading()"
              >
                Trocar dispositivo
              </button>
              <button
                mat-stroked-button
                (click)="view.set('regen-form'); error.set('')"
                [disabled]="loading()"
              >
                Regenerar backup codes
              </button>
              <button mat-stroked-button (click)="view.set('disable-form'); error.set('')">
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
                secret()
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
              @if (error()) {
                <p class="text-red-400 text-sm m-0">{{ error() }}</p>
              }
              <div class="flex gap-3">
                <button
                  mat-flat-button
                  type="submit"
                  [disabled]="loading() || confirmForm.invalid"
                >
                  @if (loading()) {
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
              <button mat-flat-button (click)="view.set('idle')" type="button">
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
                [type]="showDisablePwd() ? 'text' : 'password'"
                formControlName="currentPassword"
                autocomplete="current-password"
              />
              <button mat-icon-button matSuffix type="button"
                      (mousedown)="showDisablePwd.set(true)"
                      (mouseup)="showDisablePwd.set(false)"
                      (mouseleave)="showDisablePwd.set(false)"
                      aria-label="Mostrar senha">
                <mat-icon class="!text-[18px]">{{ showDisablePwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Código TOTP</mat-label>
              <input matInput formControlName="code" maxlength="6" autocomplete="one-time-code" />
            </mat-form-field>
            @if (error()) {
              <p class="text-red-400 text-sm m-0">{{ error() }}</p>
            }
            <div class="flex gap-3">
              <button
                mat-flat-button
                type="submit"
                class="!bg-red-700 hover:!bg-red-600"
                [disabled]="loading() || disableForm.invalid"
              >
                @if (loading()) {
                  <mat-spinner diameter="18" class="mr-2" />
                }
                Desabilitar 2FA
              </button>
              <button mat-stroked-button type="button" (click)="view.set('idle')">
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
                [type]="showRegenPwd() ? 'text' : 'password'"
                formControlName="currentPassword"
                autocomplete="current-password"
              />
              <button mat-icon-button matSuffix type="button"
                      (mousedown)="showRegenPwd.set(true)"
                      (mouseup)="showRegenPwd.set(false)"
                      (mouseleave)="showRegenPwd.set(false)"
                      aria-label="Mostrar senha">
                <mat-icon class="!text-[18px]">{{ showRegenPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>
            @if (error()) {
              <p class="text-red-400 text-sm m-0">{{ error() }}</p>
            }
            <div class="flex gap-3">
              <button
                mat-flat-button
                type="submit"
                [disabled]="loading() || regenForm.invalid"
              >
                @if (loading()) {
                  <mat-spinner diameter="18" class="mr-2" />
                }
                Regenerar
              </button>
              <button mat-stroked-button type="button" (click)="view.set('idle')">
                Cancelar
              </button>
            </div>
          </form>
        }

        @case ('replace-form') {
          <form
            [formGroup]="replaceForm"
            (ngSubmit)="replaceTotp()"
            class="flex flex-col gap-4 max-w-xs"
          >
            <p class="text-[var(--text-primary)] text-sm m-0">
              Insira o código atual do seu app autenticador para gerar um novo QR code e
              vincular um novo dispositivo.
            </p>
            <mat-form-field appearance="outline">
              <mat-label>Código TOTP atual</mat-label>
              <input matInput formControlName="currentTotpCode" maxlength="6" autocomplete="one-time-code" />
            </mat-form-field>
            @if (error()) {
              <p class="text-red-400 text-sm m-0">{{ error() }}</p>
            }
            <div class="flex gap-3">
              <button
                mat-flat-button
                type="submit"
                [disabled]="loading() || replaceForm.invalid"
              >
                @if (loading()) {
                  <mat-spinner diameter="18" class="mr-2" />
                }
                Trocar dispositivo
              </button>
              <button mat-stroked-button type="button" (click)="view.set('idle'); error.set('')">
                Cancelar
              </button>
            </div>
          </form>
        }
      }
    </section>
  `,
})
export class TotpComponent {
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly securityService = inject(SecurityService);
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

  readonly totpEnabled = computed(() => this.store.currentUser()?.totpEnabled);

  readonly view = signal<TotpView>('idle');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showDisablePwd = signal(false);
  readonly showRegenPwd = signal(false);
  readonly qrDataUrl = signal('');
  readonly secret = signal('');
  readonly backupCodes = signal<string[]>([]);
  readonly secretCopied = signal(false);
  readonly backupCopied = signal(false);

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

  readonly replaceForm = this.fb.nonNullable.group({
    currentTotpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  async startSetup(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.securityService.startTotpSetup();
      this.secret.set(res.secret);
      let qrUrl: string;
      try {
        const QRCode = await import('qrcode');
        qrUrl = await QRCode.toDataURL(res.otpauthUri, { width: 200, margin: 1 });
      } catch {
        qrUrl = '';
      }
      this.qrDataUrl.set(qrUrl);
      this.view.set('setup-qr');
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.error.set('2FA já está ativado. Desative-o antes de reconfigurar.');
      } else {
        this.error.set('Erro ao iniciar configuração. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  cancelSetup(): void {
    this.view.set('idle');
    this.confirmForm.reset();
    this.error.set('');
    this.qrDataUrl.set('');
    this.secret.set('');
  }

  async confirmSetup(): Promise<void> {
    if (this.confirmForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.securityService.confirmTotpSetup(this.confirmForm.getRawValue().code);
      this.backupCodes.set(res.backupCodes);
      this.confirmForm.reset();
      this.view.set('backup-codes');
      this.snackBar.open('2FA habilitado com sucesso!', 'OK', { duration: 3000 });
      // Atualiza o store diretamente — não depende de um re-fetch que pode falhar.
      const u = this.store.currentUser();
      if (u) this.store.setCurrentUser({ ...u, totpEnabled: true });
    } catch {
      this.error.set('Código inválido ou expirado. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  async disableTotp(): Promise<void> {
    if (this.disableForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      await this.securityService.disableTotp(this.disableForm.getRawValue());
      this.disableForm.reset();
      this.view.set('idle');
      this.snackBar.open('2FA desabilitado.', 'OK', { duration: 3000 });
      const u = this.store.currentUser();
      if (u) this.store.setCurrentUser({ ...u, totpEnabled: false });
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.error.set('Senha ou código inválido.');
      } else {
        this.error.set('Erro ao desabilitar. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async replaceTotp(): Promise<void> {
    if (this.replaceForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.securityService.replaceTotp(this.replaceForm.getRawValue().currentTotpCode);
      this.replaceForm.reset();
      this.secret.set(res.secret);
      try {
        const QRCode = await import('qrcode');
        this.qrDataUrl.set(await QRCode.toDataURL(res.otpauthUri, { width: 200, margin: 1 }));
      } catch {
        this.qrDataUrl.set('');
      }
      this.view.set('setup-qr');
      this.snackBar.open('Código válido. Escaneie o novo QR code.', 'OK', { duration: 3000 });
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 400) {
        this.error.set('Código inválido. Verifique seu app autenticador.');
      } else {
        this.error.set('Erro ao trocar dispositivo. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  async confirmRegenBackupCodes(): Promise<void> {
    if (this.regenForm.invalid) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const { currentPassword } = this.regenForm.getRawValue();
      const res = await this.securityService.regenerateBackupCodes(currentPassword);
      this.regenForm.reset();
      this.backupCodes.set(res.backupCodes);
      this.view.set('backup-codes');
      this.snackBar.open('Novos backup codes gerados!', 'OK', { duration: 3000 });
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.error.set('Senha incorreta.');
      } else {
        this.error.set('Erro ao regenerar backup codes. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }

  copySecret(): void {
    navigator.clipboard.writeText(this.secret()).then(
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
}
