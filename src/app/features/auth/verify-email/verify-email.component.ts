import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

type ViewState = 'loading' | 'success' | 'manual-form';

@Component({
  selector: 'app-verify-email',
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
      <div
        class="w-full max-w-sm p-8 bg-[var(--surface-color)] rounded-2xl border border-[var(--border-color)] shadow-2xl text-center"
      >
        <h1 class="text-2xl font-bold text-[var(--active-color)] mb-6">Verificação de Email</h1>

        @switch (viewState()) {
          @case ('loading') {
            <mat-spinner diameter="40" class="mx-auto" />
            <p class="text-[var(--text-secondary)] text-sm mt-4">Verificando seu email...</p>
          }

          @case ('success') {
            <div
              class="p-4 bg-[var(--surface-hover)] rounded-lg border border-emerald-400 text-emerald-400 text-sm mb-4"
            >
              Email verificado! Você já pode fazer login.
            </div>
            <a routerLink="/auth/login" mat-flat-button class="w-full">Ir para o login</a>
          }

          @case ('manual-form') {
            @if (verifyError()) {
              <div
                class="p-3 bg-[var(--surface-hover)] rounded-lg border border-yellow-500 text-yellow-400 text-sm mb-4"
              >
                Código inválido ou expirado.
              </div>
            }

            <p class="text-[var(--text-secondary)] text-sm mb-6">
              {{
                verifyError()
                  ? 'Insira o código manualmente ou reenvie um novo.'
                  : 'Insira o código enviado para seu email.'
              }}
            </p>

            <form
              [formGroup]="form"
              (ngSubmit)="onManualSubmit()"
              class="flex flex-col gap-4 text-left"
            >
              <mat-form-field appearance="outline">
                <mat-label>Código de verificação</mat-label>
                <input matInput formControlName="code" />
              </mat-form-field>

              @if (formErrorMsg()) {
                <p class="text-red-400 text-sm text-center">{{ formErrorMsg() }}</p>
              }

              <button
                mat-flat-button
                type="submit"
                [disabled]="loadingManual() || form.invalid"
                class="w-full"
              >
                @if (loadingManual()) {
                  <mat-spinner diameter="20" class="inline" />
                } @else {
                  Verificar
                }
              </button>
            </form>

            <div class="mt-4 border-t border-[var(--border-color)] pt-4">
              <p class="text-[var(--text-secondary)] text-sm mb-2">Não recebeu o código?</p>
              <button
                mat-stroked-button
                (click)="resendCode()"
                [disabled]="loadingResend() || resendSent()"
              >
                @if (loadingResend()) {
                  <mat-spinner diameter="16" class="inline" />
                } @else if (resendSent()) {
                  Código reenviado!
                } @else {
                  Reenviar código
                }
              </button>
              @if (resendError()) {
                <p class="text-red-400 text-sm mt-2">{{ resendError() }}</p>
              }
            </div>
          }
        }
      </div>
    </div>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly viewState = signal<ViewState>('loading');
  readonly verifyError = signal(false);
  readonly loadingManual = signal(false);
  readonly loadingResend = signal(false);
  readonly resendSent = signal(false);
  readonly formErrorMsg = signal('');
  readonly resendError = signal('');

  readonly form = this.fb.nonNullable.group({
    code: ['', Validators.required],
  });

  private email = '';
  private resendTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.resendTimer !== null) clearTimeout(this.resendTimer);
    });
  }

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') ?? '';
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.autoVerify(code);
    } else {
      this.viewState.set('manual-form');
    }
  }

  private async autoVerify(code: string): Promise<void> {
    this.viewState.set('loading');
    try {
      await this.authService.verifyEmail(code);
      this.viewState.set('success');
    } catch {
      // Auto-verificação falhou: mostrar form manual com aviso de erro
      this.verifyError.set(true);
      this.viewState.set('manual-form');
    }
  }

  async onManualSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loadingManual.set(true);
    this.formErrorMsg.set('');
    try {
      await this.authService.verifyEmail(this.form.getRawValue().code);
      this.viewState.set('success');
    } catch {
      this.formErrorMsg.set('Código inválido ou expirado.');
    } finally {
      this.loadingManual.set(false);
    }
  }

  async resendCode(): Promise<void> {
    this.loadingResend.set(true);
    this.resendError.set('');
    try {
      await this.authService.resendVerification(this.email);
      this.resendSent.set(true);
      this.resendTimer = setTimeout(() => this.resendSent.set(false), 15_000);
    } catch {
      this.resendError.set('Não foi possível reenviar. Tente novamente.');
    } finally {
      this.loadingResend.set(false);
    }
  }
}
