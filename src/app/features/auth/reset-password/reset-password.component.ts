import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordMatchValidator, passwordPolicyValidator } from '../../../core/validators/password.validators';
import { PasswordStrengthComponent } from '../../../shared/password-strength/password-strength.component';

@Component({
  selector: 'app-reset-password',
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
    PasswordStrengthComponent,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div class="w-full max-w-sm p-8 bg-[var(--surface-color)] rounded-2xl border border-[var(--border-color)] shadow-2xl">
        <div class="mb-8 text-center">
          <h1 class="text-2xl font-bold text-[var(--active-color)] mb-1">Nova senha</h1>
          <p class="text-[var(--text-secondary)] text-sm">Defina sua nova senha</p>
        </div>

        @if (success()) {
          <div
            class="p-4 bg-[var(--surface-hover)] rounded-lg border border-emerald-400 text-emerald-400 text-sm text-center mb-4"
          >
            Senha redefinida com sucesso!
          </div>
          <div class="text-center">
            <a routerLink="/auth/login" mat-flat-button>Ir para o login</a>
          </div>
        } @else if (tokenMissing()) {
          <div
            class="p-4 bg-[var(--surface-hover)] rounded-lg border border-red-500 text-red-400 text-sm text-center mb-4"
          >
            Link inválido ou expirado. Solicite uma nova recuperação de senha.
          </div>
          <div class="text-center">
            <a routerLink="/auth/forgot-password" mat-stroked-button>Solicitar novamente</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Nova senha</mat-label>
              <input
                matInput
                [type]="showNew() ? 'text' : 'password'"
                formControlName="newPassword"
                autocomplete="new-password"
              />
              <button mat-icon-button matSuffix type="button"
                      (mousedown)="showNew.set(true)"
                      (mouseup)="showNew.set(false)"
                      (mouseleave)="showNew.set(false)"
                      [attr.aria-label]="showNew() ? 'Ocultar senha' : 'Mostrar senha'">
                <mat-icon class="!text-[18px]">{{ showNew() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('newPassword')?.hasError('passwordPolicy') && form.get('newPassword')?.touched) {
                <mat-error>Mín. 8 chars com maiúscula, número e caractere especial</mat-error>
              }
            </mat-form-field>
            <app-password-strength [password]="form.get('newPassword')?.value ?? null" />

            <mat-form-field appearance="outline">
              <mat-label>Confirmar senha</mat-label>
              <input
                matInput
                [type]="showConfirm() ? 'text' : 'password'"
                formControlName="confirmPassword"
                autocomplete="new-password"
              />
              <button mat-icon-button matSuffix type="button"
                      (mousedown)="showConfirm.set(true)"
                      (mouseup)="showConfirm.set(false)"
                      (mouseleave)="showConfirm.set(false)"
                      aria-label="Mostrar confirmação">
                <mat-icon class="!text-[18px]">{{ showConfirm() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
            </mat-form-field>

            <!-- Erro de grupo fica fora do mat-form-field — passwordMismatch é erro do FormGroup, não do control -->
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
                Redefinir senha
              }
            </button>
          </form>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  private token = '';
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly showNew = signal(false);
  readonly showConfirm = signal(false);
  readonly tokenMissing = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.nonNullable.group(
    {
      newPassword: ['', [Validators.required, passwordPolicyValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.tokenMissing.set(true);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      await this.authService.resetPassword(this.token, this.form.getRawValue().newPassword);
      this.success.set(true);
    } catch {
      this.errorMsg.set('Token inválido ou expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
