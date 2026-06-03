import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-totp-setup-qr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="flex flex-col gap-5">
      <p class="text-[var(--text-primary)] text-sm m-0">
        Escaneie o QR code abaixo com seu aplicativo autenticador, ou insira a chave manualmente.
      </p>

      @if (qrDataUrl()) {
        <img [src]="qrDataUrl()" alt="QR Code 2FA" class="w-52 h-52 rounded-lg self-start bg-white p-2" />
      }

      <div class="bg-[var(--surface-hover)] rounded-lg px-4 py-2 flex items-center gap-2 max-w-sm">
        <span class="text-xs text-[var(--text-secondary)] shrink-0">Chave:</span>
        <code class="text-cyan-300 text-xs font-mono break-all select-all flex-1">{{ secret() }}</code>
        <button mat-icon-button class="!text-[var(--text-secondary)] hover:!text-cyan-400 shrink-0"
                matTooltip="Copiar chave" aria-label="Copiar chave TOTP" type="button"
                (click)="copySecret.emit()">
          <mat-icon>{{ secretCopied() ? 'check' : 'content_copy' }}</mat-icon>
        </button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onConfirm()" class="flex flex-col gap-4 max-w-xs">
        <mat-form-field appearance="outline">
          <mat-label>Código TOTP (6 dígitos)</mat-label>
          <input matInput formControlName="code" maxlength="6" autocomplete="one-time-code" />
        </mat-form-field>

        @if (error()) {
          <p class="text-red-400 text-sm m-0">{{ error() }}</p>
        }

        <div class="flex gap-3">
          <button mat-flat-button type="submit" [disabled]="loading() || form.invalid">
            @if (loading()) { <mat-spinner diameter="18" class="mr-2" /> }
            Confirmar
          </button>
          <button mat-stroked-button type="button" (click)="cancelled.emit()">Cancelar</button>
        </div>
      </form>
    </div>
  `,
})
export class TotpSetupQrComponent {
  readonly qrDataUrl = input('');
  readonly secret = input('');
  readonly loading = input(false);
  readonly error = input('');
  readonly secretCopied = input(false);

  readonly confirmed = output<string>();
  readonly cancelled = output<void>();
  readonly copySecret = output<void>();

  readonly form = new FormBuilder().nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  onConfirm(): void {
    if (this.form.invalid) return;
    this.confirmed.emit(this.form.getRawValue().code);
    this.form.reset();
  }
}
