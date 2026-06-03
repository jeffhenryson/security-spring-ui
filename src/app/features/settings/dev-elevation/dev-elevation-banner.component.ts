import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../../core/auth/auth.store';

const DEV_TTL_SECONDS = 3600;

@Component({
  selector: 'app-dev-elevation-banner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, MatButtonModule, MatProgressBarModule, MatTooltipModule],
  template: `
    @if (isDevElevated()) {
      <div class="flex flex-col gap-0 border-b border-green-500/30 bg-green-500/5">
        <div class="flex items-center gap-3 px-4 py-2">
          <mat-icon class="!text-[18px] !w-[18px] !h-[18px]" style="color:#4ade80">lock_open</mat-icon>
          <span class="text-sm font-medium flex-1" style="color:#4ade80">
            Modo DEV ativo —
            <span class="font-mono">{{ formattedTime() }}</span> restantes
          </span>
          <button
            mat-icon-button
            class="!w-7 !h-7 !min-w-0"
            (click)="revoke()"
            matTooltip="Encerrar sessão DEV"
          >
            <mat-icon class="!text-[16px]" style="color:#f87171">logout</mat-icon>
          </button>
        </div>
        <mat-progress-bar
          mode="determinate"
          [value]="progressPercent()"
          [color]="progressPercent() < 8 ? 'warn' : 'accent'"
        />
      </div>
    }
  `,
})
export class DevElevationBannerComponent {
  private readonly store = inject(AuthStore);

  private readonly _tick = toSignal(interval(1000), { initialValue: 0 });

  readonly isDevElevated = computed(() => this.store.isDevElevated());

  readonly devSecondsLeft = computed(() => {
    this._tick();
    return Math.max(0, Math.ceil((this.store.devTokenExpiresAt() - Date.now()) / 1000));
  });

  readonly progressPercent = computed(() => (this.devSecondsLeft() / DEV_TTL_SECONDS) * 100);

  readonly formattedTime = computed(() => {
    const s = this.devSecondsLeft();
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  });

  revoke(): void {
    this.store.clearDevToken();
  }
}
