import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-totp-idle',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatProgressSpinnerModule, MatIconModule],
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
        <button mat-flat-button (click)="setupRequested.emit()" [disabled]="loading()">
          @if (loading()) { <mat-spinner diameter="18" class="mr-2" /> }
          Configurar 2FA
        </button>
      }
      @if (totpEnabled() === true) {
        <button mat-stroked-button (click)="replaceRequested.emit()" [disabled]="loading()">
          Trocar dispositivo
        </button>
        <button mat-stroked-button (click)="regenRequested.emit()" [disabled]="loading()">
          Regenerar backup codes
        </button>
        <button mat-stroked-button (click)="disableRequested.emit()">
          Desabilitar 2FA
        </button>
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
