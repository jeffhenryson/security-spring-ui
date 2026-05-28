import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-two-factor',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-950">
      <div class="w-full max-w-sm p-8 bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl">
        @if (sessionExpired()) {
          <div class="text-center">
            <p class="text-yellow-400 text-sm mb-4">Sessão expirada. Por favor, faça login novamente.</p>
            <a routerLink="/auth/login" mat-flat-button>Ir para o login</a>
          </div>
        } @else {
          <div class="mb-8 text-center">
            <h1 class="text-2xl font-bold text-cyan-400 mb-1">Verificação em 2 etapas</h1>
            <p class="text-slate-400 text-sm">Digite o código do seu aplicativo autenticador</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Código TOTP</mat-label>
              <input matInput formControlName="code" maxlength="6" autocomplete="one-time-code" required />
            </mat-form-field>

            @if (errorMsg()) {
              <p class="text-red-400 text-sm text-center">{{ errorMsg() }}</p>
            }

            <button mat-flat-button type="submit" [disabled]="loading() || form.invalid" class="w-full mt-2">
              @if (loading()) {
                <mat-spinner diameter="20" class="inline" />
              } @else {
                Verificar
              }
            </button>
          </form>

          <div class="mt-6 text-center text-sm">
            <a routerLink="/auth/login" class="text-cyan-400 hover:underline">Voltar ao login</a>
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

  private challengeToken = '';
  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly sessionExpired = signal(false);

  readonly form = this.fb.nonNullable.group({
    code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
  });

  ngOnInit(): void {
    // history.state é a forma correta de acessar o estado de navegação após a
    // navegação ter completado. getCurrentNavigation() retorna null em ngOnInit.
    const token: string = history.state?.challengeToken ?? '';
    const isValidJwt = typeof token === 'string' && token.startsWith('eyJ');
    this.challengeToken = isValidJwt ? token : '';
    if (!this.challengeToken) {
      this.sessionExpired.set(true);
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
      this.router.navigate(['/app/dashboard']);
    } catch {
      this.errorMsg.set('Código inválido ou expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
