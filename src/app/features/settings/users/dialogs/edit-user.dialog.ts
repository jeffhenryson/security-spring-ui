import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { UserResponse } from '../../../../core/admin/users-admin.service';

@Component({
  selector: 'app-edit-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Editar usuário</h2>
    <mat-dialog-content class="!min-w-[400px]">
      <form
        [formGroup]="form"
        id="editUserForm"
        (ngSubmit)="submit()"
        class="flex flex-col gap-4 pt-2"
      >
        <mat-form-field appearance="outline" class="cs-input">
          <mat-label>Usuário</mat-label>
          <input matInput formControlName="username" />
          @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
            <mat-error>Campo obrigatório</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" class="cs-input">
          <mat-label>Email (opcional)</mat-label>
          <input matInput type="email" formControlName="email" />
          @if (form.get('email')?.hasError('email') && form.get('email')?.touched) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-flat-button form="editUserForm" type="submit" [disabled]="form.invalid">
        Salvar
      </button>
    </mat-dialog-actions>
  `,
})
export class EditUserDialogComponent {
  readonly dialogRef = inject(MatDialogRef<EditUserDialogComponent>);
  readonly data: { user: UserResponse } = inject(MAT_DIALOG_DATA);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: [this.data.user.username, Validators.required],
    email: [this.data.user.email ?? '', Validators.email],
  });

  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue());
  }
}
