import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-totp-regen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4 max-w-xs">
      <p class="text-[var(--text-primary)] text-sm m-0">
        Confirme sua senha para gerar novos backup codes. Os códigos atuais serão invalidados.
      </p>

      <mat-form-field appearance="outline">
        <mat-label>Senha atual</mat-label>
        <input matInput [type]="showPwd() ? 'text' : 'password'" formControlName="currentPassword"
               autocomplete="current-password" />
        <button mat-icon-button matSuffix type="button"
                (mousedown)="showPwd.set(true)" (mouseup)="showPwd.set(false)"
                (mouseleave)="showPwd.set(false)" aria-label="Mostrar senha">
          <mat-icon class="!text-[18px]">{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
        </button>
      </mat-form-field>

      @if (error()) {
        <p class="text-red-400 text-sm m-0">{{ error() }}</p>
      }

      <div class="flex gap-3">
        <button mat-flat-button type="submit" [disabled]="loading() || form.invalid">
          @if (loading()) { <mat-spinner diameter="18" class="mr-2" /> }
          Regenerar
        </button>
        <button mat-stroked-button type="button" (click)="cancelled.emit()">Cancelar</button>
      </div>
    </form>
  `,
})
export class TotpRegenComponent {
  readonly loading = input(false);
  readonly error = input('');

  readonly submitted = output<string>();
  readonly cancelled = output<void>();

  readonly showPwd = signal(false);

  readonly form = new FormBuilder().nonNullable.group({
    currentPassword: ['', Validators.required],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    this.submitted.emit(this.form.getRawValue().currentPassword);
    this.form.reset();
  }
}
