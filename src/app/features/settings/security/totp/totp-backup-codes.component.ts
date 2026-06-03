import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-totp-backup-codes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="flex flex-col gap-4">
      <div class="p-4 bg-yellow-950/60 border border-yellow-600/50 rounded-xl">
        <div class="flex items-center gap-2 mb-2">
          <mat-icon class="text-yellow-400 shrink-0">warning</mat-icon>
          <p class="text-yellow-300 text-sm font-semibold m-0">Guarde estes códigos em lugar seguro!</p>
        </div>
        <p class="text-yellow-400/70 text-xs m-0">
          São exibidos uma única vez. Use-os para acessar a conta caso perca o dispositivo autenticador.
        </p>
      </div>

      <div class="grid grid-cols-2 gap-2 max-w-xs">
        @for (code of backupCodes(); track code) {
          <code class="bg-[var(--surface-hover)] rounded px-3 py-2 text-sm font-mono text-cyan-300 text-center">
            {{ code }}
          </code>
        }
      </div>

      <div class="flex gap-2 flex-wrap">
        <button mat-stroked-button (click)="copy.emit()" type="button">
          <mat-icon>{{ backupCopied() ? 'check' : 'content_copy' }}</mat-icon>
          {{ backupCopied() ? 'Copiado!' : 'Copiar todos' }}
        </button>
        <button mat-stroked-button (click)="download.emit()" type="button">
          <mat-icon>download</mat-icon>
          Baixar .txt
        </button>
        <button mat-flat-button (click)="done.emit()" type="button">Entendido</button>
      </div>
    </div>
  `,
})
export class TotpBackupCodesComponent {
  readonly backupCodes = input<string[]>([]);
  readonly backupCopied = input(false);

  readonly done = output<void>();
  readonly copy = output<void>();
  readonly download = output<void>();
}
