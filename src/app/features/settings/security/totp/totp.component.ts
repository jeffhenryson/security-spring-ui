import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../../core/auth/auth.store';
import { AuthService } from '../../../../core/auth/auth.service';
import { SecurityService } from '../../../../core/security/security.service';
import { TotpIdleComponent } from './totp-idle.component';
import { TotpSetupQrComponent } from './totp-setup-qr.component';
import { TotpBackupCodesComponent } from './totp-backup-codes.component';
import { TotpDisableComponent, DisableTotpData } from './totp-disable.component';
import { TotpRegenComponent } from './totp-regen.component';
import { TotpReplaceComponent } from './totp-replace.component';

type TotpView = 'idle' | 'setup-qr' | 'backup-codes' | 'disable-form' | 'regen-form' | 'replace-form';

@Component({
  selector: 'app-totp',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    TotpIdleComponent,
    TotpSetupQrComponent,
    TotpBackupCodesComponent,
    TotpDisableComponent,
    TotpRegenComponent,
    TotpReplaceComponent,
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
          <app-totp-idle
            [totpEnabled]="totpEnabled()"
            [backupCodesRemaining]="backupCodesRemaining()"
            [loading]="loading()"
            [error]="error()"
            (setupRequested)="startSetup()"
            (replaceRequested)="view.set('replace-form'); error.set('')"
            (regenRequested)="view.set('regen-form'); error.set('')"
            (disableRequested)="view.set('disable-form'); error.set('')"
          />
        }
        @case ('setup-qr') {
          <app-totp-setup-qr
            [qrDataUrl]="qrDataUrl()"
            [secret]="secret()"
            [loading]="loading()"
            [error]="error()"
            [secretCopied]="secretCopied()"
            (confirmed)="confirmSetup($event)"
            (cancelled)="cancelSetup()"
            (copySecret)="copySecret()"
          />
        }
        @case ('backup-codes') {
          <app-totp-backup-codes
            [backupCodes]="backupCodes()"
            [backupCopied]="backupCopied()"
            (done)="view.set('idle')"
            (copy)="copyBackupCodes()"
            (download)="downloadBackupCodes()"
          />
        }
        @case ('disable-form') {
          <app-totp-disable
            [loading]="loading()"
            [error]="error()"
            (submitted)="disableTotp($event)"
            (cancelled)="view.set('idle')"
          />
        }
        @case ('regen-form') {
          <app-totp-regen
            [loading]="loading()"
            [error]="error()"
            (submitted)="confirmRegenBackupCodes($event)"
            (cancelled)="view.set('idle')"
          />
        }
        @case ('replace-form') {
          <app-totp-replace
            [loading]="loading()"
            [error]="error()"
            (submitted)="replaceTotp($event)"
            (cancelled)="view.set('idle'); error.set('')"
          />
        }
      }
    </section>
  `,
})
export class TotpComponent {
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly securityService = inject(SecurityService);
  private readonly snackBar = inject(MatSnackBar);

  private secretCopiedTimer: ReturnType<typeof setTimeout> | null = null;
  private backupCopiedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.secretCopiedTimer !== null) clearTimeout(this.secretCopiedTimer);
      if (this.backupCopiedTimer !== null) clearTimeout(this.backupCopiedTimer);
    });
    this.refreshTotpStatus();
  }

  private async refreshTotpStatus(): Promise<void> {
    try {
      const status = await this.securityService.loadTotpStatus();
      const u = this.store.currentUser();
      if (u) this.store.setCurrentUser({ ...u, totpEnabled: status.enabled, backupCodesRemaining: status.backupCodesRemaining });
    } catch {
      // silently ignore — store already has last known value
    }
  }

  readonly totpEnabled = computed(() => this.store.currentUser()?.totpEnabled);
  readonly backupCodesRemaining = computed(() => this.store.currentUser()?.backupCodesRemaining ?? 0);

  readonly view = signal<TotpView>('idle');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly qrDataUrl = signal('');
  readonly secret = signal('');
  readonly backupCodes = signal<string[]>([]);
  readonly secretCopied = signal(false);
  readonly backupCopied = signal(false);

  async startSetup(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.securityService.startTotpSetup();
      this.secret.set(res.secret);
      try {
        const QRCode = await import('qrcode');
        this.qrDataUrl.set(await QRCode.toDataURL(res.otpauthUri, { width: 200, margin: 1 }));
      } catch {
        this.qrDataUrl.set('');
      }
      this.view.set('setup-qr');
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && err.status === 409
          ? '2FA já está ativado. Desative-o antes de reconfigurar.'
          : 'Erro ao iniciar configuração. Tente novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  cancelSetup(): void {
    this.view.set('idle');
    this.error.set('');
    this.qrDataUrl.set('');
    this.secret.set('');
  }

  async confirmSetup(code: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.securityService.confirmTotpSetup(code);
      this.backupCodes.set(res.backupCodes);
      this.view.set('backup-codes');
      this.snackBar.open('2FA habilitado com sucesso!', 'OK', { duration: 3000 });
      const u = this.store.currentUser();
      if (u) this.store.setCurrentUser({ ...u, totpEnabled: true, backupCodesRemaining: res.backupCodes.length });
    } catch {
      this.error.set('Código inválido ou expirado. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  async disableTotp(data: DisableTotpData): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.securityService.disableTotp(data);
      this.view.set('idle');
      this.snackBar.open('2FA desabilitado.', 'OK', { duration: 3000 });
      const u = this.store.currentUser();
      if (u) this.store.setCurrentUser({ ...u, totpEnabled: false, backupCodesRemaining: 0 });
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)
          ? 'Senha ou código inválido.'
          : 'Erro ao desabilitar. Tente novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async replaceTotp(currentTotpCode: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.securityService.replaceTotp(currentTotpCode);
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
      this.error.set(
        err instanceof HttpErrorResponse && err.status === 400
          ? 'Código inválido. Verifique seu app autenticador.'
          : 'Erro ao trocar dispositivo. Tente novamente.',
      );
    } finally {
      this.loading.set(false);
    }
  }

  async confirmRegenBackupCodes(currentPassword: string): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.securityService.regenerateBackupCodes(currentPassword);
      this.backupCodes.set(res.backupCodes);
      this.view.set('backup-codes');
      this.snackBar.open('Novos backup codes gerados!', 'OK', { duration: 3000 });
      const u = this.store.currentUser();
      if (u) this.store.setCurrentUser({ ...u, backupCodesRemaining: res.backupCodes.length });
    } catch (err) {
      this.error.set(
        err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)
          ? 'Senha incorreta.'
          : 'Erro ao regenerar backup codes. Tente novamente.',
      );
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
    const blob = new Blob([this.backupCodes().join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }
}
