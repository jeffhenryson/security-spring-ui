import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ButtonComponent } from '../../../shared/ui';

export interface PasswordConfirmData {
  totpCode?: string;
  revokeOtherSessions: boolean;
}

@Component({
  selector: 'app-change-password-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, ButtonComponent],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      (click)="cancelled.emit()"
    >
      <div
        class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4"
        (click)="$event.stopPropagation()"
      >
        <h4 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-4">
          Confirmar troca de senha
        </h4>

        @if (totpEnabled()) {
          <p class="text-sm text-[var(--text-secondary)] mb-3">
            Insira o código do seu app autenticador para confirmar.
          </p>
          <mat-form-field appearance="outline" class="cs-input w-full">
            <mat-label>Código 2FA (6 dígitos)</mat-label>
            <input
              matInput
              maxlength="6"
              inputmode="numeric"
              autocomplete="one-time-code"
              [value]="totpCode()"
              (input)="totpCode.set($any($event.target).value)"
            />
          </mat-form-field>
        }

        <mat-checkbox
          class="mt-2 mb-4"
          [checked]="revokeOtherSessions()"
          (change)="revokeOtherSessions.set($event.checked)"
        >
          <span class="text-sm text-[var(--text-primary)]">Encerrar sessão em outros dispositivos</span>
        </mat-checkbox>

        @if (error()) {
          <p class="text-red-400 text-sm mb-3">{{ error() }}</p>
        }

        <div class="flex gap-3 justify-end">
          <app-button variant="outlined" (clicked)="cancelled.emit()">Cancelar</app-button>
          <app-button [processing]="loading()" [disabled]="totpEnabled() && totpCode().length !== 6" (clicked)="submit()">Confirmar</app-button>
        </div>
      </div>
    </div>
  `,
})
export class ChangePasswordModalComponent {
  readonly totpEnabled = input.required<boolean>();
  readonly loading = input<boolean>(false);
  readonly error = input<string>('');

  readonly confirmed = output<PasswordConfirmData>();
  readonly cancelled = output<void>();

  readonly totpCode = signal('');
  readonly revokeOtherSessions = signal(false);

  submit(): void {
    if (this.totpEnabled() && this.totpCode().length !== 6) return;
    this.confirmed.emit({
      totpCode: this.totpEnabled() ? this.totpCode() : undefined,
      revokeOtherSessions: this.revokeOtherSessions(),
    });
  }
}
