import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ButtonComponent } from '../ui/button/button.component';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatDialogModule, ButtonComponent],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="text-[var(--text-primary)] m-0">{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <app-button variant="outlined" (clicked)="close(false)">Cancelar</app-button>
      <app-button [danger]="data.danger ?? false" (clicked)="close(true)">
        {{ data.confirmLabel ?? 'Confirmar' }}
      </app-button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialogComponent {
  readonly data: ConfirmDialogData = inject(MAT_DIALOG_DATA);
  private readonly dialogRef = inject(MatDialogRef<ConfirmDialogComponent>);

  close(result: boolean): void {
    this.dialogRef.close(result);
  }
}
