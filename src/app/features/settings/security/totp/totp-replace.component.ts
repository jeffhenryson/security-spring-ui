import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-totp-replace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4 max-w-xs">
      <p class="text-[var(--text-primary)] text-sm m-0">
        Insira o código atual do seu app autenticador para gerar um novo QR code e vincular um novo dispositivo.
      </p>

      <mat-form-field appearance="outline">
        <mat-label>Código TOTP atual</mat-label>
        <input matInput formControlName="currentTotpCode" maxlength="6" autocomplete="one-time-code" />
      </mat-form-field>

      @if (error()) {
        <p class="text-red-400 text-sm m-0">{{ error() }}</p>
      }

      <div class="flex gap-3">
        <button mat-flat-button type="submit" [disabled]="loading() || form.invalid">
          @if (loading()) { <mat-spinner diameter="18" class="mr-2" /> }
          Trocar dispositivo
        </button>
        <button mat-stroked-button type="button" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
})
export class TotpReplaceComponent {
  readonly loading = input(false);
  readonly error = input('');

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  readonly form = new FormBuilder().nonNullable.group({
    currentTotpCode: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitted.emit(this.form.getRawValue().currentTotpCode);
    this.form.reset();
  }
}
