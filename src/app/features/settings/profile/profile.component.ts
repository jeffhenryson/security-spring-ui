import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { ProfileService } from '../../../core/profile/profile.service';
import { passwordMatchValidator, passwordPolicyValidator } from '../../../core/validators/password.validators';
import { PasswordStrengthComponent } from '../../../shared/password-strength/password-strength.component';
import { ChangePasswordModalComponent, PasswordConfirmData } from './change-password-modal.component';
import { ProfileAvatarSectionComponent } from './profile-avatar-section.component';
import { PendingEmailBannerComponent } from './pending-email-banner.component';

@Component({
  selector: 'app-profile',
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
    ProfileAvatarSectionComponent,
    PendingEmailBannerComponent,
  ],
  template: `
    <div class="p-6 max-w-2xl mx-auto flex flex-col gap-6">

      @if (loading()) {
        <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
          <div class="skeleton h-4 w-28 rounded mb-4"></div>
          <div class="flex items-center gap-5">
            <div class="skeleton w-20 h-20 rounded-full shrink-0"></div>
            <div class="flex flex-col gap-2">
              <div class="skeleton h-8 w-28 rounded"></div>
            </div>
          </div>
        </section>

        <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
          <div class="skeleton h-4 w-32 rounded mb-5"></div>
          <div class="flex flex-col gap-4">
            <div class="skeleton h-14 w-full rounded"></div>
            <div class="skeleton h-14 w-full rounded"></div>
            <div class="skeleton h-14 w-full rounded"></div>
          </div>
        </section>
      } @else {

        <app-profile-avatar-section [userInitials]="userInitials()" />

        @if (pendingEmail()) {
          <app-pending-email-banner [pendingEmail]="pendingEmail()" />
        }

        <!-- Dados do perfil -->
        <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
          <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-5">Dados do perfil</h3>

          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Usuário</mat-label>
              <input matInput formControlName="username" autocomplete="username" required />
              @if (profileForm.get('username')?.hasError('required') && profileForm.get('username')?.touched) {
                <mat-error>Campo obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" required />
              @if (profileForm.get('email')?.hasError('email') && profileForm.get('email')?.touched) {
                <mat-error>Email inválido</mat-error>
              }
              <mat-hint>Ao alterar o email, uma confirmação será enviada para o novo endereço.</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Senha atual</mat-label>
              <input
                matInput
                [type]="showEmailPwd() ? 'text' : 'password'"
                formControlName="currentPassword"
                autocomplete="current-password"
              />
              <button mat-icon-button matSuffix type="button"
                      (mousedown)="showEmailPwd.set(true)"
                      (mouseup)="showEmailPwd.set(false)"
                      (mouseleave)="showEmailPwd.set(false)"
                      aria-label="Mostrar senha">
                <mat-icon class="!text-[18px]">{{ showEmailPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>Necessário apenas ao alterar o email.</mat-hint>
            </mat-form-field>

            @if (profileError()) {
              <p class="text-red-400 text-sm m-0">{{ profileError() }}</p>
            }

            <div class="flex justify-end">
              <button mat-flat-button type="submit" [disabled]="saving() || profileForm.invalid">
                @if (saving()) { <mat-spinner diameter="18" class="mr-2" /> }
                Salvar perfil
              </button>
            </div>
          </form>
        </section>

        <!-- Trocar senha -->
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
              <button mat-flat-button type="submit" [disabled]="savingPwd() || passwordForm.invalid">
                @if (savingPwd()) { <mat-spinner diameter="18" class="mr-2" /> }
                Alterar senha
              </button>
            </div>
          </form>
        </section>

        @if (showPwdModal()) {
          <app-change-password-modal
            [totpEnabled]="totpEnabled()"
            [loading]="pwdModalLoading()"
            [error]="pwdModalError()"
            (confirmed)="onPasswordModalConfirmed($event)"
            (cancelled)="showPwdModal.set(false)"
          />
        }
      }
    </div>
  `,
})
export class ProfileComponent {
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = computed(() => this.store.currentUser() === null);
  readonly userInitials = this.store.userInitials;
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');
  readonly totpEnabled = computed(() => !!this.store.currentUser()?.totpEnabled);

  readonly saving = signal(false);
  readonly profileError = signal('');
  readonly savingPwd = signal(false);
  readonly showEmailPwd = signal(false);
  readonly showCurrentPwd = signal(false);
  readonly showNewPwd = signal(false);
  readonly showConfirmPwd = signal(false);
  readonly showPwdModal = signal(false);
  readonly pwdModalLoading = signal(false);
  readonly pwdModalError = signal('');
  readonly passwordError = signal('');

  readonly profileForm = this.fb.nonNullable.group({
    username: [this.store.currentUser()?.username ?? '', Validators.required],
    email: [this.store.currentUser()?.email ?? '', [Validators.required, Validators.email]],
    currentPassword: [''],
  });

  readonly passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, passwordPolicyValidator]],
      confirmPassword: ['', Validators.required],
    },
    { validators: passwordMatchValidator },
  );

  constructor() {
    effect(() => {
      const u = this.store.currentUser();
      if (!u) return;
      // Sempre sincroniza com o store para evitar race condition após login.
      // emitEvent:false não dispara valueChanges, evitando marcar o form como dirty.
      this.profileForm.patchValue({ username: u.username, email: u.email ?? '' }, { emitEvent: false });
    });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.saving.set(true);
    this.profileError.set('');
    try {
      await this.profileService.updateProfile(this.profileForm.getRawValue());
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.profileError.set('Senha atual incorreta.');
      } else if (err instanceof HttpErrorResponse && err.status === 409) {
        this.profileError.set('Usuário ou email já está em uso.');
      } else {
        this.profileError.set('Erro ao atualizar. Tente novamente.');
      }
      this.saving.set(false);
      return;
    }
    this.profileForm.patchValue({ currentPassword: '' });
    this.profileForm.get('currentPassword')?.markAsUntouched();
    this.snackBar.open('Perfil atualizado!', 'OK', { duration: 3000 });
    try {
      await this.authService.loadCurrentUser();
    } catch {
      this.snackBar.open(
        'Perfil salvo, mas os dados exibidos podem estar desatualizados. Recarregue a página.',
        'OK',
        { duration: 5000 },
      );
    } finally {
      this.saving.set(false);
    }
  }

  changePassword(): void {
    if (this.passwordForm.invalid) return;
    if (this.totpEnabled()) {
      this.pwdModalError.set('');
      this.showPwdModal.set(true);
    } else {
      void this.executePasswordChange();
    }
  }

  async onPasswordModalConfirmed(data: PasswordConfirmData): Promise<void> {
    this.pwdModalLoading.set(true);
    this.pwdModalError.set('');
    await this.executePasswordChange(data.totpCode, data.revokeOtherSessions);
    if (!this.pwdModalError()) {
      this.showPwdModal.set(false);
    }
    this.pwdModalLoading.set(false);
  }

  private async executePasswordChange(totpCode?: string, revokeOtherSessions = false): Promise<void> {
    this.savingPwd.set(true);
    this.passwordError.set('');
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    try {
      await this.profileService.changePassword({ currentPassword, newPassword, totpCode, revokeOtherSessions });
      this.passwordForm.reset();
      this.snackBar.open('Senha alterada com sucesso!', 'OK', { duration: 3000 });
    } catch (err) {
      const msg = err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)
        ? 'Senha atual incorreta.'
        : err instanceof HttpErrorResponse && err.status === 400
          ? 'Código 2FA inválido ou expirado.'
          : 'Erro ao alterar senha. Tente novamente.';
      this.passwordError.set(msg);
      this.pwdModalError.set(msg);
    } finally {
      this.savingPwd.set(false);
    }
  }
}
