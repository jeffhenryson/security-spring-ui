import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordMatchValidator } from '../../../core/validators/password.validators';
import { PasswordStrengthComponent } from '../../../shared/password-strength/password-strength.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    PasswordStrengthComponent,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div class="w-full max-w-sm p-8 bg-[var(--surface-color)] rounded-2xl border border-[var(--border-color)] shadow-2xl">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-[var(--active-color)] mb-1">Criar conta</h1>
          <p class="text-[var(--text-secondary)] text-sm">Preencha os dados para se registrar</p>
        </div>

        @if (success()) {
          <div
            class="p-4 bg-[var(--surface-hover)] rounded-lg border border-emerald-400 text-emerald-400 text-sm text-center mb-4"
          >
            Conta criada! Verifique seu email para ativar a conta.
          </div>
          <div class="text-center">
            <a routerLink="/auth/login" class="text-[var(--active-color)] hover:underline text-sm"
              >Ir para o login</a
            >
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Usuário</mat-label>
              <input
                matInput
                formControlName="username"
                autocomplete="username"
                required
                aria-describedby="reg-username-error"
              />
              @if (form.get('username')?.invalid && form.get('username')?.touched) {
                <mat-error id="reg-username-error">Usuário é obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input
                matInput
                type="email"
                formControlName="email"
                autocomplete="email"
                required
                aria-describedby="reg-email-error"
              />
              @if (form.get('email')?.invalid && form.get('email')?.touched) {
                <mat-error id="reg-email-error">Email inválido</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Senha</mat-label>
              <input
                matInput
                type="password"
                formControlName="password"
                autocomplete="new-password"
                required
                aria-describedby="reg-password-error"
              />
              @if (form.get('password')?.hasError('minlength') && form.get('password')?.touched) {
                <mat-error id="reg-password-error">Mínimo 8 caracteres</mat-error>
              }
            </mat-form-field>
            <app-password-strength [password]="form.get('password')?.value ?? null" />

            <mat-form-field appearance="outline">
              <mat-label>Confirmar senha</mat-label>
              <input
                matInput
                type="password"
                formControlName="confirmPassword"
                autocomplete="new-password"
                required
              />
            </mat-form-field>

            <!-- Erro de grupo fica fora do mat-form-field para ser exibido corretamente -->
            @if (form.hasError('passwordMismatch') && form.get('confirmPassword')?.touched) {
              <p class="text-red-400 text-sm -mt-2">As senhas não coincidem</p>
            }

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
                Criar conta
              }
            </button>
          </form>

          <!-- Divider -->
          <div class="flex items-center gap-3 mt-6 mb-3">
            <div class="flex-1 h-px bg-[var(--border-color)]"></div>
            <span class="text-xs text-[var(--text-muted)]">ou</span>
            <div class="flex-1 h-px bg-[var(--border-color)]"></div>
          </div>

          <!-- Google OAuth -->
          <button
            type="button"
            (click)="registerWithGoogle()"
            class="w-full flex items-center justify-center gap-3 py-2.5 px-4
                   rounded-lg border border-[var(--border-color)] text-sm
                   text-[var(--text-primary)] bg-transparent
                   hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Registrar com Google
          </button>

          <div class="mt-5 text-center text-sm">
            <span class="text-[var(--text-secondary)]"
              >Já tem conta?
              <a routerLink="/auth/login" class="text-[var(--active-color)] hover:underline">Entrar</a>
            </span>
          </div>
        }
      </div>
    </div>
  `,
})
export class RegisterComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  async registerWithGoogle(): Promise<void> {
    const oauthUrl = `${environment.apiUrl}/oauth2/authorization/google`;
    try {
      const res = await fetch(oauthUrl, { redirect: 'manual', credentials: 'include' });
      if (res.type === 'opaqueredirect') {
        window.location.href = oauthUrl;
      } else {
        this.snackBar.open(
          'Registro com Google não está disponível. Verifique a configuração do servidor.',
          'Fechar',
          { duration: 6000 },
        );
      }
    } catch {
      window.location.href = oauthUrl;
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    const { username, email, password } = this.form.getRawValue();
    try {
      await this.authService.register(username, email, password);
      this.success.set(true);
      this.form.reset();
    } catch (err) {
      if (err instanceof HttpErrorResponse && err.status === 409) {
        this.errorMsg.set('Usuário ou email já cadastrado.');
      } else {
        this.errorMsg.set('Erro ao criar conta. Tente novamente.');
      }
    } finally {
      this.loading.set(false);
    }
  }
}
