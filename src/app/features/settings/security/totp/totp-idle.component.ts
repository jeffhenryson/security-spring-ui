import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonComponent } from '../../../../shared/ui/button/button.component';

@Component({
  selector: 'app-totp-idle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, ButtonComponent],
  template: `
    <div class="flex items-center gap-2 mb-5">
      @if (totpEnabled() === true) {
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                     bg-emerald-900/60 text-emerald-300">
          <mat-icon class="!text-[14px] !w-3.5 !h-3.5">check_circle</mat-icon>
          2FA ativado
        </span>
        <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
          <mat-icon class="!text-[14px] !w-3.5 !h-3.5">key</mat-icon>
          {{ backupCodesRemaining() }} de 8 backup codes restantes
        </span>
      } @else if (totpEnabled() === false) {
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium
                     bg-orange-900/60 text-orange-300">
          <mat-icon class="!text-[14px] !w-3.5 !h-3.5">warning</mat-icon>
          2FA não configurado
        </span>
      }
    </div>

    @if (error()) {
      <p class="text-red-400 text-sm mb-4">{{ error() }}</p>
    }

    <div class="flex flex-wrap gap-3">
      @if (totpEnabled() !== true) {
        <app-button [processing]="loading()" (clicked)="setupRequested.emit()">Configurar 2FA</app-button>
      }
      @if (totpEnabled() === true) {
        <app-button variant="outlined" [disabled]="loading()" (clicked)="replaceRequested.emit()">Trocar dispositivo</app-button>
        <app-button variant="outlined" [disabled]="loading()" (clicked)="regenRequested.emit()">Regenerar backup codes</app-button>
        <app-button variant="outlined" (clicked)="disableRequested.emit()">Desabilitar 2FA</app-button>
      }
    </div>
  `,
})
export class TotpIdleComponent {
  readonly totpEnabled = input<boolean | undefined>(undefined);
  readonly backupCodesRemaining = input(0);
  readonly loading = input(false);
  readonly error = input('');

  readonly setupRequested = output<void>();
  readonly replaceRequested = output<void>();
  readonly regenRequested = output<void>();
  readonly disableRequested = output<void>();
}
