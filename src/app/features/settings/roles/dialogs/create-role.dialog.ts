import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-create-role-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  template: `
    <h2 mat-dialog-title>Nova role</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="createRoleForm" (ngSubmit)="submit()" class="pt-2">
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Nome da role</mat-label>
          <input matInput formControlName="name" placeholder="Ex: MODERATOR" />
          @if (form.get('name')?.hasError('required') && form.get('name')?.touched) {
            <mat-error>Campo obrigatório</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button [mat-dialog-close]="null">Cancelar</button>
      <button mat-flat-button form="createRoleForm" type="submit" [disabled]="form.invalid">
        Criar
      </button>
    </mat-dialog-actions>
  `,
})
export class CreateRoleDialogComponent {
  readonly dialogRef = inject(MatDialogRef<CreateRoleDialogComponent>);
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({ name: ['', Validators.required] });
  submit(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue().name);
  }
}
