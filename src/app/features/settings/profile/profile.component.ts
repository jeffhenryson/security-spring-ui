import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthStore } from '../../../core/auth/auth.store';
import { ProfileService } from '../../../core/profile/profile.service';
import { ProfileAvatarSectionComponent } from './profile-avatar-section.component';
import { PendingEmailBannerComponent } from './pending-email-banner.component';
import { ProfilePasswordSectionComponent } from './profile-password-section.component';
import { ButtonComponent } from '../../../shared/ui';

@Component({
  selector: 'app-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    ProfileAvatarSectionComponent,
    PendingEmailBannerComponent,
    ProfilePasswordSectionComponent,
    ButtonComponent,
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
            <mat-form-field appearance="outline" class="cs-input">
              <mat-label>Usuário</mat-label>
              <input matInput formControlName="username" autocomplete="username" required />
              @if (profileForm.get('username')?.hasError('required') && profileForm.get('username')?.touched) {
                <mat-error>Campo obrigatório</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="cs-input">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" required />
              @if (profileForm.get('email')?.hasError('email') && profileForm.get('email')?.touched) {
                <mat-error>Email inválido</mat-error>
              }
              <mat-hint>Ao alterar o email, uma confirmação será enviada para o novo endereço.</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline" class="cs-input">
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
              <app-button type="submit" [processing]="saving()" [disabled]="profileForm.invalid">Salvar perfil</app-button>
            </div>
          </form>
        </section>

        <app-profile-password-section />
      }
    </div>
  `,
})
export class ProfileComponent {
  private readonly store = inject(AuthStore);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = computed(() => this.store.currentUser() === null);
  readonly userInitials = this.store.userInitials;
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');

  readonly saving = signal(false);
  readonly profileError = signal('');
  readonly showEmailPwd = signal(false);

  readonly profileForm = this.fb.nonNullable.group({
    username: [this.store.currentUser()?.username ?? '', Validators.required],
    email: [this.store.currentUser()?.email ?? '', [Validators.required, Validators.email]],
    currentPassword: [''],
  });

  constructor() {
    effect(() => {
      const u = this.store.currentUser();
      if (!u) return;
      // Só sincroniza se o form não foi tocado pelo usuário, evitando sobrescrever edições em andamento.
      if (this.profileForm.pristine) {
        this.profileForm.patchValue({ username: u.username, email: u.email ?? '' }, { emitEvent: false });
      }
    });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.saving.set(true);
    this.profileError.set('');
    try {
      const updated = await this.profileService.updateProfile(this.profileForm.getRawValue());
      const current = this.store.currentUser();
      this.store.setCurrentUser({ ...current, ...updated });
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
    this.saving.set(false);
  }
}
