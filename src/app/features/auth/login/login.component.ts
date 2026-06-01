import { ChangeDetectionStrategy, Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { HttpErrorResponse } from '@angular/common/http';
import { isTwoFactorChallenge } from '../../../core/auth/models/auth.models';
import { environment } from '../../../../environments/environment';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;
const LOCKOUT_STORAGE_KEY = 'ss_login_lockout';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div class="w-full max-w-sm p-8 bg-[var(--surface-color)] rounded-2xl border border-[var(--border-color)] shadow-2xl">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-[var(--active-color)] mb-1">SecuritySpring</h1>
          <p class="text-[var(--text-secondary)] text-sm">Entre na sua conta</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Usuário</mat-label>
            <input
              matInput
              formControlName="username"
              autocomplete="username"
              required
              aria-describedby="login-username-error"
            />
            @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
              <mat-error id="login-username-error">Campo obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Senha</mat-label>
            <input
              matInput
              [type]="showPwd() ? 'text' : 'password'"
              formControlName="password"
              autocomplete="current-password"
              required
              aria-describedby="login-password-error"
              (keyup)="checkCapsLock($event)"
              (keydown)="checkCapsLock($event)"
            />
            <button mat-icon-button matSuffix type="button"
                    (mousedown)="showPwd.set(true)"
                    (mouseup)="showPwd.set(false)"
                    (mouseleave)="showPwd.set(false)"
                    [attr.aria-label]="showPwd() ? 'Ocultar senha' : 'Mostrar senha'">
              <mat-icon class="!text-[18px]">{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
              <mat-error id="login-password-error">Campo obrigatório</mat-error>
            }
            @if (capsLockOn()) {
              <mat-hint>Caps Lock ativado</mat-hint>
            }
          </mat-form-field>

          @if (errorMsg()) {
            <p class="text-red-400 text-sm text-center">{{ errorMsg() }}</p>
          }
          @if (lockedUntil() > 0) {
            <p class="text-yellow-400 text-sm text-center">
              Muitas tentativas. Tente novamente em {{ lockoutSecondsLeft() }}s.
            </p>
          }

          <button
            mat-flat-button
            type="submit"
            [disabled]="loading() || form.invalid || lockedUntil() > 0"
            class="w-full mt-2"
          >
            @if (loading()) {
              <mat-spinner diameter="20" class="inline" />
            } @else {
              Entrar
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
          (click)="loginWithGoogle()"
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
          Entrar com Google
        </button>

        <div class="mt-5 flex flex-col gap-2 text-center text-sm">
          <a routerLink="/auth/forgot-password" class="text-[var(--active-color)] hover:underline"
            >Esqueceu a senha?</a
          >
          <span class="text-[var(--text-secondary)]"
            >Não tem conta?
            <a routerLink="/auth/register" class="text-[var(--active-color)] hover:underline">Criar conta</a>
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
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);

  private lockoutTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.lockoutTimer !== null) clearTimeout(this.lockoutTimer);
    });
  }

  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly capsLockOn = signal(false);
  readonly showPwd = signal(false);
  readonly failedAttempts = signal(0);
  readonly lockedUntil = signal(
    Math.max(0, parseInt(localStorage.getItem(LOCKOUT_STORAGE_KEY) ?? '0', 10)),
  );
  readonly lockoutSecondsLeft = computed(() =>
    Math.max(0, Math.ceil((this.lockedUntil() - Date.now()) / 1000)),
  );

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  async loginWithGoogle(): Promise<void> {
    const oauthUrl = `${environment.apiUrl}/oauth2/authorization/google`;
    try {
      // redirect:'manual' devolve type='opaqueredirect' quando o backend redireciona p/ Google.
      // Se retornar 4xx/5xx (OAuth2 não configurado), type='basic' e mostramos uma mensagem.
      const res = await fetch(oauthUrl, { redirect: 'manual', credentials: 'include' });
      if (res.type === 'opaqueredirect') {
        window.location.href = oauthUrl;
      } else {
        this.snackBar.open(
          'Login com Google não está disponível. Verifique a configuração do servidor.',
          'Fechar',
          { duration: 6000 },
        );
      }
    } catch {
      // Erro de rede / CORS — tenta o redirect direto assim mesmo
      window.location.href = oauthUrl;
    }
  }

  checkCapsLock(event: KeyboardEvent): void {
    this.capsLockOn.set(event.getModifierState('CapsLock'));
  }

  private applyLockout(durationMs: number): void {
    const until = Date.now() + durationMs;
    this.lockedUntil.set(until);
    localStorage.setItem(LOCKOUT_STORAGE_KEY, String(until));
    if (this.lockoutTimer !== null) clearTimeout(this.lockoutTimer);
    this.lockoutTimer = setTimeout(() => {
      this.lockedUntil.set(0);
      localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    }, durationMs);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid || this.lockedUntil() > Date.now()) return;
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      const res = await this.authService.login(this.form.getRawValue());
      this.failedAttempts.set(0);
      if (isTwoFactorChallenge(res)) {
        this.authService.setPendingChallengeToken(res.challengeToken);
        this.router.navigate(['/auth/2fa']);
      } else {
        const raw = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
        // SECURITY: só aceita rotas internas — deve começar com '/' e não com '//'
        // para evitar open redirect (ex: //evil.com ou https://evil.com).
        const dest = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/app/dashboard';
        this.router.navigateByUrl(dest);
      }
    } catch (err) {
      // HTTP 429 do backend: usar Retry-After se disponível
      if (err instanceof HttpErrorResponse && err.status === 429) {
        const retryAfterSec = parseInt(err.headers.get('Retry-After') ?? '60', 10);
        this.applyLockout(retryAfterSec * 1000);
        this.errorMsg.set('');
      } else {
        const attempts = this.failedAttempts() + 1;
        this.failedAttempts.set(attempts);
        if (attempts >= MAX_ATTEMPTS) {
          this.applyLockout(LOCKOUT_MS);
          this.failedAttempts.set(0);
          this.errorMsg.set('');
        } else {
          this.errorMsg.set('Usuário ou senha inválidos.');
        }
      }
    } finally {
      this.loading.set(false);
    }
  }
}
