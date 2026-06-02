import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { passwordPolicyValidator } from '../../../../core/validators/password.validators';
import { PasswordStrengthComponent } from '../../../../shared/password-strength/password-strength.component';

@Component({
  selector: 'app-create-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    PasswordStrengthComponent,
  ],
  template: `
    <h2 mat-dialog-title>Novo usuário</h2>
    <mat-dialog-content class="!min-w-[400px]">
      <form
        [formGroup]="form"
        id="createUserForm"
        (ngSubmit)="submit()"
        class="flex flex-col gap-4 pt-2"
      >
        <mat-form-field appearance="outline">
          <mat-label>Usuário</mat-label>
          <input matInput formControlName="username" autocomplete="off" />
          @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
            <mat-error>Campo obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email (opcional)</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="off" />
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Senha</mat-label>
          <input
            matInput
            [type]="showPassword ? 'text' : 'password'"
            formControlName="password"
            autocomplete="new-password"
          />
          <button mat-icon-button matSuffix type="button"
                  (mousedown)="showPassword = true"
                  (mouseup)="showPassword = false"
                  (mouseleave)="showPassword = false"
                  aria-label="Mostrar senha">
            <mat-icon class="!text-[18px]">{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (
            (form.get('password')?.hasError('minlength') || form.get('password')?.hasError('passwordPolicy')) &&
            form.get('password')?.touched
          ) {
            <mat-error>Mín. 8 chars com maiúscula, dígito e caractere especial</mat-error>
          }
        </mat-form-field>

        <app-password-strength [password]="form.get('password')?.value ?? null" />

        <mat-form-field appearance="outline">
          <mat-label>Roles (opcional)</mat-label>
          <mat-select formControlName="roles" multiple>
            @for (r of data.availableRoles; track r) {
              <mat-option [value]="r">{{ r }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-flat-button form="createUserForm" type="submit" [disabled]="form.invalid">
        Criar
      </button>
    </mat-dialog-actions>
  `,
})
export class CreateUserDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateUserDialogComponent>);
  readonly data: { availableRoles: string[] } = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  showPassword = false;

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', Validators.email],
    password: ['', [Validators.required, passwordPolicyValidator]],
    roles: [[] as string[]],
  });

  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue());
  }
}
