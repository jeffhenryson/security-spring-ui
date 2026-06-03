import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div class="w-full max-w-sm p-8 bg-[var(--surface-color)] rounded-2xl border border-[var(--border-color)] shadow-2xl">
        @if (sessionExpired()) {
          <div class="text-center">
            <p class="text-yellow-400 text-sm mb-4">
              Sessão expirada. Por favor, faça login novamente.
            </p>
            <a routerLink="/auth/login" mat-flat-button>Ir para o login</a>
          </div>
        } @else {
          <div class="mb-8 text-center">
            <h1 class="text-2xl font-bold text-[var(--active-color)] mb-1">Verificação em 2 etapas</h1>
            <p class="text-[var(--text-secondary)] text-sm">
              @if (useBackupCode()) {
                Digite um dos seus códigos de backup
              } @else {
                Digite o código do seu aplicativo autenticador
              }
            </p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>{{ useBackupCode() ? 'Código de backup' : 'Código TOTP' }}</mat-label>
              <input
                matInput
                formControlName="code"
                [attr.maxlength]="useBackupCode() ? null : 6"
                autocomplete="one-time-code"
                required
                [attr.inputmode]="useBackupCode() ? 'text' : 'numeric'"
                [attr.pattern]="useBackupCode() ? null : '[0-9]*'"
                (input)="onCodeInput($event)"
              />
              @if (loading()) {
                <mat-spinner matSuffix diameter="18" class="mr-2" />
              }
            </mat-form-field>

            @if (errorMsg()) {
              <p class="text-red-400 text-sm text-center">{{ errorMsg() }}</p>
            }

            <button
              mat-flat-button
              type="submit"
              [disabled]="loading() || form.invalid"
              class="w-full mt-2"
            >
              @if (loading()) {
                <mat-spinner diameter="20" class="inline" />
              } @else {
                Verificar
              }
            </button>
          </form>

          <div class="mt-6 flex flex-col items-center gap-2 text-sm">
            <button
              type="button"
              class="text-[var(--text-secondary)] hover:text-[var(--active-color)] underline bg-transparent border-none cursor-pointer"
              (click)="toggleBackupCode()"
            >
              {{ useBackupCode() ? 'Usar código do autenticador' : 'Usar código de backup' }}
            </button>
            <a routerLink="/auth/login" class="text-[var(--active-color)] hover:underline">Voltar ao login</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class TwoFactorComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private challengeToken = '';
  private returnUrl = '/app/dashboard';
  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly sessionExpired = signal(false);
  readonly useBackupCode = signal(false);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6)]],
  });

  ngOnInit(): void {
    const token = this.authService.consumePendingChallengeToken() ?? '';
    this.challengeToken = token;
    if (!this.challengeToken) {
      this.sessionExpired.set(true);
    }
    const raw = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    this.returnUrl = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/dashboard';
  }

  toggleBackupCode(): void {
    this.useBackupCode.update((v) => !v);
    this.form.reset();
    this.errorMsg.set('');
  }

  onCodeInput(event: Event): void {
    if (this.useBackupCode()) return;
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 6);
    if (digits !== input.value) {
      this.form.get('code')?.setValue(digits, { emitEvent: false });
      input.value = digits;
    }
    if (digits.length === 6 && !this.loading()) {
      this.onSubmit();
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      await this.authService.verify2FA({
        challengeToken: this.challengeToken,
        code: this.form.getRawValue().code,
      });
      this.router.navigateByUrl(this.returnUrl);
    } catch {
      this.errorMsg.set('Código inválido ou expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
