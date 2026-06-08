import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-totp-regen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ButtonComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4 max-w-xs">
      <p class="text-[var(--text-primary)] text-sm m-0">
        Confirme sua senha para gerar novos backup codes. Os códigos atuais serão invalidados.
      </p>

      <mat-form-field appearance="outline" class="cs-input">
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
        <app-button type="submit" [processing]="loading()" [disabled]="form.invalid">Regenerar</app-button>
        <app-button variant="outlined" (clicked)="cancelled.emit()">Cancelar</app-button>
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
