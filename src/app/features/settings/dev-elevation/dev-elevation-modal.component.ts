import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  output,
  signal,
  computed,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { DevService } from '../../../core/dev/dev.service';
import { AuthStore } from '../../../core/auth/auth.store';

@Component({
  selector: 'app-dev-elevation-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <!-- Backdrop -->
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      (click)="onBackdropClick()"
    >
      <div
        class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4"
        (click)="$event.stopPropagation()"
      >
        <!-- Header -->
        <div class="flex items-center gap-3 mb-5">
          <div class="w-9 h-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <mat-icon class="!text-amber-400 !text-[20px]">lock</mat-icon>
          </div>
          <div>
            <h4 class="text-base font-semibold text-[var(--text-primary)] m-0">Elevar para DEV</h4>
            <p class="text-xs text-[var(--text-secondary)] m-0">
              Etapa {{ step() === 'step1' ? '1' : '2' }} de 2
            </p>
          </div>
        </div>

        @switch (step()) {
          @case ('step1') {
            <p class="text-sm text-[var(--text-secondary)] mb-4">
              Insira o código atual do seu app autenticador para iniciar a elevação.
            </p>
            <mat-form-field appearance="outline" class="w-full">
              <mat-label>Código TOTP (6 dígitos)</mat-label>
              <input
                matInput
                maxlength="6"
                inputmode="numeric"
                autocomplete="one-time-code"
                [value]="code1()"
                (input)="code1.set($any($event.target).value)"
                (keyup.enter)="submitStep1()"
              />
            </mat-form-field>

            @if (error()) {
              <p class="text-red-400 text-sm mb-3">{{ error() }}</p>
            }

            <div class="flex gap-3 mt-2">
              <button mat-stroked-button class="flex-1" type="button" (click)="dismissed.emit()">
                Cancelar
              </button>
              <button
                mat-flat-button
                class="flex-1"
                type="button"
                [disabled]="loading() || code1().length !== 6"
                (click)="submitStep1()"
              >
                @if (loading()) {
                  <mat-spinner diameter="18" />
                } @else {
                  Próximo
                }
              </button>
            </div>
          }

          @case ('step2') {
            <p class="text-sm text-[var(--text-secondary)] mb-1">
              Agora aguarde o código <strong>girar</strong> no app autenticador e insira o
              <strong>próximo código</strong> (novo ciclo de 30s).
            </p>

            <!-- Countdown do código TOTP e expiração do devToken -->
            <div class="flex items-center gap-2 mb-4 flex-wrap">
              <div class="text-xs px-2 py-1 rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
                🔄 Próximo código em: {{ totpSecondsUntilChange() }}s
              </div>
              <div
                class="text-xs px-2 py-1 rounded-full border"
                [class]="step2SecondsLeft() > 20
                  ? 'border-amber-500/40 text-amber-400 bg-amber-500/10'
                  : 'border-red-500/40 text-red-400 bg-red-500/10'"
              >
                ⏱ Sessão expira em: {{ step2SecondsLeft() }}s
              </div>
            </div>

            @if (step2Expired()) {
              <p class="text-red-400 text-sm mb-3">
                Tempo expirado. Clique em "Recomeçar" para tentar novamente.
              </p>
            } @else {
              <mat-form-field appearance="outline" class="w-full">
                <mat-label>Próximo código TOTP (6 dígitos)</mat-label>
                <input
                  matInput
                  maxlength="6"
                  inputmode="numeric"
                  autocomplete="one-time-code"
                  [value]="code2()"
                  (input)="code2.set($any($event.target).value)"
                  (keyup.enter)="submitStep2()"
                />
              </mat-form-field>

              @if (error()) {
                <p class="text-red-400 text-sm mb-3">{{ error() }}</p>
              }
            }

            <div class="flex gap-3 mt-2">
              @if (step2Expired()) {
                <button mat-stroked-button class="flex-1" type="button" (click)="reset()">
                  Recomeçar
                </button>
              } @else {
                <button mat-stroked-button class="flex-1" type="button" (click)="reset()">
                  Voltar
                </button>
                <button
                  mat-flat-button
                  class="flex-1"
                  type="button"
                  [disabled]="loading() || code2().length !== 6"
                  (click)="submitStep2()"
                >
                  @if (loading()) {
                    <mat-spinner diameter="18" />
                  } @else {
                    Confirmar elevação
                  }
                </button>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class DevElevationModalComponent {
  readonly dismissed = output<void>();
  readonly elevated = output<void>();

  private readonly devService = inject(DevService);
  private readonly store = inject(AuthStore);
  private readonly destroyRef = inject(DestroyRef);

  readonly step = signal<'step1' | 'step2'>('step1');
  readonly code1 = signal('');
  readonly code2 = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly devToken = signal('');
  readonly step2SecondsLeft = signal(90);
  readonly step2Expired = computed(() => this.step2SecondsLeft() <= 0);

  private readonly _tick = toSignal(interval(1000), { initialValue: 0 });
  readonly totpSecondsUntilChange = computed(() => {
    this._tick();
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  });

  private step2Timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.stopStep2Timer());
  }

  onBackdropClick(): void {
    if (!this.loading()) this.dismissed.emit();
  }

  async submitStep1(): Promise<void> {
    if (this.code1().length !== 6 || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.devService.firstCode(this.code1());
      this.devToken.set(res.devToken);
      this.step2SecondsLeft.set(Number.isFinite(res.expiresIn) ? res.expiresIn : 90);
      this.step.set('step2');
      this.startStep2Timer();
    } catch {
      this.error.set('Código inválido ou expirado. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  async submitStep2(): Promise<void> {
    if (this.code2().length !== 6 || this.loading() || this.step2Expired()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.devService.complete(this.devToken(), this.code2());
      this.store.setDevToken(res.accessToken, Number.isFinite(res.expiresIn) ? res.expiresIn : 3600);
      this.stopStep2Timer();
      this.elevated.emit();
    } catch {
      this.error.set('Código inválido ou não consecutivo. Aguarde o próximo ciclo.');
      this.code2.set('');
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    this.stopStep2Timer();
    this.step.set('step1');
    this.code1.set('');
    this.code2.set('');
    this.error.set('');
    this.devToken.set('');
    this.step2SecondsLeft.set(90);
  }

  private startStep2Timer(): void {
    this.stopStep2Timer();
    this.step2Timer = setInterval(() => {
      const left = this.step2SecondsLeft() - 1;
      this.step2SecondsLeft.set(left);
      if (left <= 0) this.stopStep2Timer();
    }, 1000);
  }

  private stopStep2Timer(): void {
    if (this.step2Timer !== null) {
      clearInterval(this.step2Timer);
      this.step2Timer = null;
    }
  }
}
