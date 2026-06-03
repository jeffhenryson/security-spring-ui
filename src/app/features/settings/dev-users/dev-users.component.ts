import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { interval } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpErrorResponse } from '@angular/common/http';
import { UsersAdminService } from '../../../core/admin/users-admin.service';
import { DevService } from '../../../core/dev/dev.service';
import { AuthStore } from '../../../core/auth/auth.store';
import { passwordPolicyValidator } from '../../../core/validators/password.validators';
import { PasswordStrengthComponent } from '../../../shared/password-strength/password-strength.component';
import { ROLES } from '../../../core/rbac/permissions.constants';

type Step = 'form' | 'totp1' | 'totp2' | 'done';

@Component({
  selector: 'app-dev-users',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    PasswordStrengthComponent,
  ],
  template: `
    <div class="p-6 max-w-lg mx-auto flex flex-col gap-6">
      <div>
        <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Criar usuário DEV</h3>
        <p class="text-sm text-[var(--text-secondary)] mt-1">
          Requer dupla confirmação TOTP. O usuário receberá
          <code class="text-amber-400">ROLE_DEV</code> automaticamente.
        </p>
      </div>

      <!-- Step indicator -->
      <div class="flex items-center gap-2 text-xs">
        @for (s of steps; track s.key) {
          <div class="flex items-center gap-1.5">
            <div
              class="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
              [class]="step() === s.key ? 'bg-cyan-500 text-white' : (stepDone(s.key) ? 'bg-green-500 text-white' : 'bg-[var(--surface-hover)] text-[var(--text-muted)]')"
            >
              {{ stepDone(s.key) ? '✓' : s.num }}
            </div>
            <span [class]="step() === s.key ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'">
              {{ s.label }}
            </span>
          </div>
          @if (!$last) {
            <div class="flex-1 h-px bg-[var(--border-color)] mx-1"></div>
          }
        }
      </div>

      @switch (step()) {

        @case ('form') {
          <form [formGroup]="form" (ngSubmit)="goToTotp1()" class="flex flex-col gap-4">
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
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Senha</mat-label>
              <input matInput [type]="showPwd() ? 'text' : 'password'"
                     formControlName="password" autocomplete="new-password" />
              <button mat-icon-button matSuffix type="button"
                      (mousedown)="showPwd.set(true)" (mouseup)="showPwd.set(false)"
                      (mouseleave)="showPwd.set(false)" aria-label="Mostrar senha">
                <mat-icon class="!text-[18px]">{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('password')?.hasError('passwordPolicy') && form.get('password')?.touched) {
                <mat-error>Mín. 8 chars com maiúscula, dígito e especial</mat-error>
              }
            </mat-form-field>

            <app-password-strength [password]="form.get('password')?.value ?? null" />

            <mat-checkbox formControlName="confirmed" color="warn">
              Confirmo que estou criando um usuário DEV com acesso privilegiado
            </mat-checkbox>

            <button mat-flat-button type="submit" [disabled]="form.invalid">
              Continuar para confirmação 2FA
            </button>
          </form>
        }

        @case ('totp1') {
          <div class="flex flex-col gap-4">
            <p class="text-sm text-[var(--text-secondary)] m-0">
              Insira o código <strong>atual</strong> do seu app autenticador para confirmar a criação.
            </p>
            <mat-form-field appearance="outline">
              <mat-label>Código TOTP (6 dígitos)</mat-label>
              <input matInput maxlength="6" inputmode="numeric" autocomplete="one-time-code"
                     [value]="code1()" (input)="code1.set($any($event.target).value)"
                     (keyup.enter)="submitTotp1()" />
            </mat-form-field>
            @if (error()) {
              <p class="text-red-400 text-sm m-0">{{ error() }}</p>
            }
            <div class="flex gap-3">
              <button mat-stroked-button type="button" (click)="reset()">Voltar</button>
              <button mat-flat-button type="button"
                      [disabled]="loading() || code1().length !== 6" (click)="submitTotp1()">
                @if (loading()) { <mat-spinner diameter="18" /> } @else { Próximo }
              </button>
            </div>
          </div>
        }

        @case ('totp2') {
          <div class="flex flex-col gap-4">
            <p class="text-sm text-[var(--text-secondary)] m-0">
              Aguarde o código <strong>girar</strong> no app autenticador e insira o
              <strong>próximo código</strong>.
            </p>
            <div class="flex items-center gap-2">
              <div class="text-xs px-2 py-1 rounded-full border border-cyan-500/40 text-cyan-400 bg-cyan-500/10">
                🔄 Próximo código em: {{ totpSecondsUntilChange() }}s
              </div>
              <div class="text-xs px-2 py-1 rounded-full border"
                   [class]="step2SecondsLeft() > 20 ? 'border-amber-500/40 text-amber-400 bg-amber-500/10' : 'border-red-500/40 text-red-400 bg-red-500/10'">
                ⏱ Expira em: {{ step2SecondsLeft() }}s
              </div>
            </div>
            @if (step2Expired()) {
              <p class="text-red-400 text-sm m-0">Tempo expirado. Comece novamente.</p>
              <button mat-stroked-button (click)="reset()">Recomeçar</button>
            } @else {
              <mat-form-field appearance="outline">
                <mat-label>Próximo código TOTP (6 dígitos)</mat-label>
                <input matInput maxlength="6" inputmode="numeric" autocomplete="one-time-code"
                       [value]="code2()" (input)="code2.set($any($event.target).value)"
                       (keyup.enter)="submitTotp2()" />
              </mat-form-field>
              @if (error()) {
                <p class="text-red-400 text-sm m-0">{{ error() }}</p>
              }
              <div class="flex gap-3">
                <button mat-stroked-button type="button" (click)="reset()">Cancelar</button>
                <button mat-flat-button type="button"
                        [disabled]="loading() || code2().length !== 6" (click)="submitTotp2()">
                  @if (loading()) { <mat-spinner diameter="18" /> } @else { Criar usuário DEV }
                </button>
              </div>
            }
          </div>
        }

        @case ('done') {
          <div class="p-4 rounded-xl border border-green-500/40 bg-green-500/10 text-green-400 flex items-center gap-3">
            <mat-icon>check_circle</mat-icon>
            <span>Usuário <strong>{{ createdUsername() }}</strong> criado com ROLE_DEV.</span>
          </div>
          <button mat-stroked-button (click)="reset()">Criar outro</button>
        }
      }
    </div>
  `,
})
export class DevUsersComponent {
  private readonly usersService = inject(UsersAdminService);
  private readonly devService = inject(DevService);
  private readonly store = inject(AuthStore);
  private readonly snackBar = inject(MatSnackBar);
  private readonly fb = inject(FormBuilder);

  readonly steps = [
    { key: 'form', num: '1', label: 'Dados' },
    { key: 'totp1', num: '2', label: 'Código 1' },
    { key: 'totp2', num: '3', label: 'Código 2' },
    { key: 'done', num: '✓', label: 'Criado' },
  ] as const;

  readonly step = signal<Step>('form');
  readonly loading = signal(false);
  readonly error = signal('');
  readonly showPwd = signal(false);
  readonly code1 = signal('');
  readonly code2 = signal('');
  readonly devToken = signal('');
  readonly step2SecondsLeft = signal(90);
  readonly createdUsername = signal('');

  readonly step2Expired = computed(() => this.step2SecondsLeft() <= 0);

  private readonly _tick = toSignal(interval(1000), { initialValue: 0 });
  readonly totpSecondsUntilChange = computed(() => {
    this._tick();
    return 30 - (Math.floor(Date.now() / 1000) % 30);
  });

  private step2Timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopTimer());
  }

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', Validators.email],
    password: ['', [Validators.required, passwordPolicyValidator]],
    confirmed: [false, Validators.requiredTrue],
  });

  stepDone(key: string): boolean {
    const order: Step[] = ['form', 'totp1', 'totp2', 'done'];
    return order.indexOf(this.step()) > order.indexOf(key as Step);
  }

  goToTotp1(): void {
    if (this.form.invalid) return;
    this.error.set('');
    this.step.set('totp1');
  }

  async submitTotp1(): Promise<void> {
    if (this.code1().length !== 6 || this.loading()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.devService.firstCode(this.code1());
      this.devToken.set(res.devToken);
      this.step2SecondsLeft.set(Number.isFinite(res.expiresIn) ? res.expiresIn : 90);
      this.step.set('totp2');
      this.startTimer();
    } catch {
      this.error.set('Código inválido ou expirado. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }

  async submitTotp2(): Promise<void> {
    if (this.code2().length !== 6 || this.loading() || this.step2Expired()) return;
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.devService.complete(this.devToken(), this.code2());
      // Refresh the dev token in store (renews session)
      this.store.setDevToken(res.accessToken, Number.isFinite(res.expiresIn) ? res.expiresIn : 3600);
      this.stopTimer();
      await this.createDevUser();
    } catch {
      this.error.set('Código inválido ou não consecutivo. Aguarde o próximo ciclo.');
      this.code2.set('');
    } finally {
      this.loading.set(false);
    }
  }

  private async createDevUser(): Promise<void> {
    const { username, email, password } = this.form.getRawValue();
    try {
      const created = await this.usersService.create({
        username,
        password,
        email: email || '',
        roles: [],
      });
      await this.usersService.assignRole(created.username, ROLES.ROLE_DEV);
      this.createdUsername.set(created.username);
      this.step.set('done');
      this.snackBar.open(`Usuário "${created.username}" criado com ROLE_DEV.`, 'OK', { duration: 3000 });
    } catch (err: unknown) {
      let msg = 'Erro ao criar usuário DEV.';
      if (err instanceof HttpErrorResponse) {
        if (err.status === 409) msg = 'Usuário ou email já existe.';
        else if (err.status === 403) msg = 'Sem permissão para criar usuário DEV.';
      }
      this.snackBar.open(msg, 'Fechar', { duration: 4000 });
      this.step.set('form');
    }
  }

  reset(): void {
    this.stopTimer();
    this.step.set('form');
    this.code1.set('');
    this.code2.set('');
    this.error.set('');
    this.devToken.set('');
    this.step2SecondsLeft.set(90);
    this.form.reset();
  }

  private startTimer(): void {
    this.stopTimer();
    this.step2Timer = setInterval(() => {
      const left = this.step2SecondsLeft() - 1;
      this.step2SecondsLeft.set(left);
      if (left <= 0) this.stopTimer();
    }, 1000);
  }

  private stopTimer(): void {
    if (this.step2Timer !== null) {
      clearInterval(this.step2Timer);
      this.step2Timer = null;
    }
  }
}
