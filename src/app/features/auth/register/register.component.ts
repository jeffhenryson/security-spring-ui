import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { passwordMatchValidator } from '../../../core/validators/password.validators';

@Component({
  selector: 'app-register',
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
          <h1 class="text-2xl font-bold text-cyan-400 mb-1">Criar conta</h1>
          <p class="text-slate-400 text-sm">Preencha os dados para se registrar</p>
        </div>

        @if (success()) {
          <div class="p-4 bg-slate-800 rounded-lg border border-emerald-400 text-emerald-400 text-sm text-center mb-4">
            Conta criada! Verifique seu email para ativar a conta.
          </div>
          <div class="text-center">
            <a routerLink="/auth/login" class="text-cyan-400 hover:underline text-sm">Ir para o login</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Usuário</mat-label>
              <input matInput formControlName="username" autocomplete="username" required
                     aria-describedby="reg-username-error" />
              @if (form.get('username')?.invalid && form.get('username')?.touched) {
                <mat-error id="reg-username-error">Usuário é obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" required
                     aria-describedby="reg-email-error" />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <mat-error id="reg-email-error">Email inválido</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Senha</mat-label>
              <input matInput type="password" formControlName="password" autocomplete="new-password" required
                     aria-describedby="reg-password-error" />
              @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                <mat-error id="reg-password-error">Mínimo 6 caracteres</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Confirmar senha</mat-label>
              <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" required />
            </mat-form-field>

            <!-- Erro de grupo fica fora do mat-form-field para ser exibido corretamente -->
            @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
              <p class="text-red-400 text-sm -mt-2">As senhas não coincidem</p>
            }

            @if (errorMsg()) {
              <p class="text-red-400 text-sm text-center">{{ errorMsg() }}</p>
            }

            <button mat-flat-button type="submit" [disabled]="loading() || form.invalid" class="w-full mt-2">
              @if (loading()) {
                <mat-spinner diameter="20" class="inline" />
              } @else {
                Criar conta
              }
            </button>
          </form>

          <div class="mt-6 text-center text-sm">
            <span class="text-slate-400">Já tem conta?
              <a routerLink="/auth/login" class="text-cyan-400 hover:underline">Entrar</a>
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatchValidator });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { username, email, password } = this.form.getRawValue();
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/register`, { username, email, password })
      );
      this.success.set(true);
      this.form.reset();
    } catch (err: any) {
      if (err?.status === 409) {
        this.errorMsg.set('Usuário ou email já cadastrado.');
      } else {
        this.errorMsg.set('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
