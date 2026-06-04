import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthStore } from '../../../core/auth/auth.store';
import { ProfileService } from '../../../core/profile/profile.service';
import { passwordMatchValidator, passwordPolicyValidator } from '../../../core/validators/password.validators';
import { PasswordStrengthComponent } from '../../../shared/password-strength/password-strength.component';
import { ChangePasswordModalComponent, PasswordConfirmData } from './change-password-modal.component';

@Component({
  selector: 'app-profile-password-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    PasswordStrengthComponent,
    ChangePasswordModalComponent,
  ],
  template: `
    <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
      <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-5">Trocar senha</h3>

      <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="flex flex-col gap-4">
        <mat-form-field appearance="outline">
          <mat-label>Senha atual</mat-label>
          <input matInput [type]="showCurrentPwd() ? 'text' : 'password'"
                 formControlName="currentPassword" autocomplete="current-password" required />
          <button mat-icon-button matSuffix type="button"
                  (mousedown)="showCurrentPwd.set(true)" (mouseup)="showCurrentPwd.set(false)"
                  (mouseleave)="showCurrentPwd.set(false)" aria-label="Mostrar senha atual">
            <mat-icon class="!text-[18px]">{{ showCurrentPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if (passwordForm.get('currentPassword')?.hasError('required') && passwordForm.get('currentPassword')?.touched) {
            <mat-error>Campo obrigatório</mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Nova senha</mat-label>
          <input matInput [type]="showNewPwd() ? 'text' : 'password'"
                 formControlName="newPassword" autocomplete="new-password" required />
          <button mat-icon-button matSuffix type="button"
                  (mousedown)="showNewPwd.set(true)" (mouseup)="showNewPwd.set(false)"
                  (mouseleave)="showNewPwd.set(false)" aria-label="Mostrar nova senha">
            <mat-icon class="!text-[18px]">{{ showNewPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
          @if ((passwordForm.get('newPassword')?.hasError('minlength') || passwordForm.get('newPassword')?.hasError('passwordPolicy')) && passwordForm.get('newPassword')?.touched) {
            <mat-error>Mínimo 8 caracteres com maiúscula, dígito e caractere especial</mat-error>
          }
        </mat-form-field>
        <app-password-strength [password]="passwordForm.get('newPassword')?.value ?? null" />

        <mat-form-field appearance="outline">
          <mat-label>Confirmar nova senha</mat-label>
          <input matInput [type]="showConfirmPwd() ? 'text' : 'password'"
                 formControlName="confirmPassword" autocomplete="new-password" required />
          <button mat-icon-button matSuffix type="button"
                  (mousedown)="showConfirmPwd.set(true)" (mouseup)="showConfirmPwd.set(false)"
                  (mouseleave)="showConfirmPwd.set(false)" aria-label="Mostrar confirmação">
            <mat-icon class="!text-[18px]">{{ showConfirmPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </mat-form-field>

        @if (passwordForm.hasError('passwordMismatch') && passwordForm.get('confirmPassword')?.touched) {
          <p class="text-red-400 text-sm -mt-2 m-0">As senhas não coincidem</p>
        }
        @if (passwordError()) {
          <p class="text-red-400 text-sm m-0">{{ passwordError() }}</p>
        }

        <div class="flex justify-end">
          <button mat-flat-button type="submit" [disabled]="saving() || passwordForm.invalid">
            @if (saving()) { <mat-spinner diameter="18" class="mr-2" /> }
            Alterar senha
          </button>
        </div>
      </form>
    </section>

    @if (showModal()) {
      <app-change-password-modal
        [totpEnabled]="totpEnabled()"
        [loading]="modalLoading()"
        [error]="modalError()"
        (confirmed)="onModalConfirmed($event)"
        (cancelled)="showModal.set(false)"
      />
    }
  `,
})
export class ProfilePasswordSectionComponent {
  private readonly store = inject(AuthStore);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly totpEnabled = computed(() => !!this.store.currentUser()?.totpEnabled);
  readonly saving = signal(false);
  readonly passwordError = signal('');
  readonly showCurrentPwd = signal(false);
  readonly showNewPwd = signal(false);
  readonly showConfirmPwd = signal(false);
  readonly showModal = signal(false);
  readonly modalLoading = signal(false);
  readonly modalError = signal('');

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordPolicyValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    if (this.totpEnabled()) {
      this.modalError.set('');
      this.showModal.set(true);
    } else {
      void this.execute();
    }
  }

  async onModalConfirmed(data: PasswordConfirmData): Promise<void> {
    this.modalLoading.set(true);
    this.modalError.set('');
    await this.execute(data.totpCode, data.revokeOtherSessions);
    if (!this.modalError()) this.showModal.set(false);
    this.modalLoading.set(false);
  }

  private async execute(totpCode?: string, revokeOtherSessions = false): Promise<void> {
    this.saving.set(true);
    this.passwordError.set('');
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    try {
      await this.profileService.changePassword({ currentPassword, newPassword, totpCode, revokeOtherSessions });
      this.passwordForm.reset();
      this.snackBar.open('Senha alterada com sucesso!', 'OK', { duration: 3000 });
    } catch (err) {
      const msg =
        err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)
          ? 'Senha atual incorreta.'
          : err instanceof HttpErrorResponse && err.status === 400
            ? 'Código 2FA inválido ou expirado.'
            : 'Erro ao alterar senha. Tente novamente.';
      this.passwordError.set(msg);
      this.modalError.set(msg);
    } finally {
      this.saving.set(false);
    }
  }
}
