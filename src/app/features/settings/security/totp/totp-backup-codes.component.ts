import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-totp-backup-codes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ButtonComponent],
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
        <app-button variant="outlined" [icon]="backupCopied() ? 'check' : 'content_copy'" (clicked)="copy.emit()">{{ backupCopied() ? 'Copiado!' : 'Copiar todos' }}</app-button>
        <app-button variant="outlined" icon="download" (clicked)="download.emit()">Baixar .txt</app-button>
        <app-button (clicked)="done.emit()">Entendido</app-button>
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
