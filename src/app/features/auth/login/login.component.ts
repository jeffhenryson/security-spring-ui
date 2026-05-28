import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { isTwoFactorChallenge } from '../../../core/auth/models/auth.models';

@Component({
  selector: 'app-login',
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
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-cyan-400 mb-1">SecuritySpring</h1>
          <p class="text-slate-400 text-sm">Entre na sua conta</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Usuário</mat-label>
            <input matInput formControlName="username" autocomplete="username" required
                   aria-describedby="login-username-error" />
            @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
              <mat-error id="login-username-error">Campo obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Senha</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="current-password" required
                   aria-describedby="login-password-error" />
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <mat-error id="login-password-error">Campo obrigatório</mat-error>
            }
          </mat-form-field>

          @if (errorMsg()) {
            <p class="text-red-400 text-sm text-center">{{ errorMsg() }}</p>
          }

          <button mat-flat-button type="submit" [disabled]="loading() || form.invalid" class="w-full mt-2">
            @if (loading()) {
              <mat-spinner diameter="20" class="inline" />
            } @else {
              Entrar
            }
          </button>
        </form>

        <div class="mt-6 flex flex-col gap-2 text-center text-sm">
          <a routerLink="/auth/forgot-password" class="text-cyan-400 hover:underline">Esqueceu a senha?</a>
          <span class="text-slate-400">Não tem conta?
            <a routerLink="/auth/register" class="text-cyan-400 hover:underline">Criar conta</a>
          </span>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const res = await this.authService.login(this.form.getRawValue());
      if (isTwoFactorChallenge(res)) {
        this.router.navigate(['/auth/2fa'], { state: { challengeToken: res.challengeToken } });
      } else {
        this.router.navigate(['/app/dashboard']);
      }
    } catch {
      this.errorMsg.set('Usuário ou senha inválidos.');
    } finally {
      this.loading.set(false);
    }
  }
}
