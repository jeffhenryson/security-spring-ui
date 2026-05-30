import { Component, ElementRef, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { AvatarService } from '../../../core/auth/avatar.service';
import { ProfileService } from '../../../core/profile/profile.service';
import { passwordMatchValidator, passwordPolicyValidator } from '../../../core/validators/password.validators';
import { PasswordStrengthComponent } from '../../../shared/password-strength/password-strength.component';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    PasswordStrengthComponent,
  ],
  template: `
    <div class="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <!-- Foto de perfil -->
      <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
        <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-4">Foto de perfil</h3>
        <div class="flex items-center gap-5 flex-wrap">
          <div class="relative cursor-pointer group" (click)="triggerFileInput()">
            <div
              class="w-20 h-20 rounded-full bg-cyan-700 flex items-center justify-center
                        text-xl font-bold text-white overflow-hidden
                        ring-2 ring-[var(--border-color)]"
            >
              @if (avatar()) {
                <img [src]="avatar()" alt="Foto de perfil" class="w-full h-full object-cover" />
              } @else {
                {{ userInitials() }}
              }
            </div>
            <div
              class="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center
                        opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <mat-icon class="text-white">photo_camera</mat-icon>
            </div>
          </div>
          <div class="flex flex-col gap-2">
            <button mat-stroked-button type="button" (click)="triggerFileInput()">
              <mat-icon>upload</mat-icon>
              {{ avatar() ? 'Alterar foto' : 'Carregar foto' }}
            </button>
            @if (avatar()) {
              <button
                mat-stroked-button
                type="button"
                class="!text-red-400 !border-red-900"
                (click)="removeAvatar()"
              >
                Remover foto
              </button>
            }
          </div>
        </div>
        <input
          #fileInput
          type="file"
          accept="image/*"
          class="hidden"
          (change)="onFileSelected($event)"
        />
      </section>

      @if (pendingEmail()) {
        <div class="flex items-start gap-3 p-4 bg-blue-950/60 border border-blue-600/50 rounded-xl">
          <mat-icon class="text-blue-400 shrink-0 mt-0.5">mail</mat-icon>
          <div>
            <p class="text-blue-300 text-sm font-medium m-0">Confirmação de email pendente</p>
            <p class="text-blue-400/70 text-xs mt-1 m-0">
              Confirme a troca para
              <span class="font-medium text-blue-300">{{ pendingEmail() }}</span
              >. Verifique sua caixa de entrada.
            </p>
          </div>
        </div>
      }

      <!-- Seção 1: Dados do perfil -->
      <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
        <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-5">
          Dados do perfil
        </h3>

        <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="flex flex-col gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Usuário</mat-label>
            <input matInput formControlName="username" autocomplete="username" required />
            @if (
              profileForm.get('username')?.hasError('required') &&
              profileForm.get('username')?.touched
            ) {
              <mat-error>Campo obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" formControlName="email" autocomplete="email" required />
            @if (profileForm.get('email')?.hasError('email') && profileForm.get('email')?.touched) {
              <mat-error>Email inválido</mat-error>
            }
            <mat-hint
              >Ao alterar o email, uma confirmação será enviada para o novo endereço.</mat-hint
            >
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Senha atual</mat-label>
            <input
              matInput
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
            />
            <mat-hint>Necessário apenas ao alterar o email.</mat-hint>
          </mat-form-field>

          @if (profileError()) {
            <p class="text-red-400 text-sm m-0">{{ profileError() }}</p>
          }

          <div class="flex justify-end">
            <button mat-flat-button type="submit" [disabled]="saving() || profileForm.invalid">
              @if (saving()) {
                <mat-spinner diameter="18" class="mr-2" />
              }
              Salvar perfil
            </button>
          </div>
        </form>
      </section>

      <!-- Seção 2: Trocar senha -->
      <section class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-6">
        <h3 class="text-base font-semibold text-[var(--text-primary)] mt-0 mb-5">Trocar senha</h3>

        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="flex flex-col gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Senha atual</mat-label>
            <input
              matInput
              type="password"
              formControlName="currentPassword"
              autocomplete="current-password"
              required
            />
            @if (
              passwordForm.get('currentPassword')?.hasError('required') &&
              passwordForm.get('currentPassword')?.touched
            ) {
              <mat-error>Campo obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nova senha</mat-label>
            <input
              matInput
              type="password"
              formControlName="newPassword"
              autocomplete="new-password"
              required
            />
            @if (
              (passwordForm.get('newPassword')?.hasError('minlength') || passwordForm.get('newPassword')?.hasError('passwordPolicy')) &&
              passwordForm.get('newPassword')?.touched
            ) {
              <mat-error>Mínimo 8 caracteres com maiúscula, dígito e caractere especial</mat-error>
            }
          </mat-form-field>
          <app-password-strength [password]="passwordForm.get('newPassword')?.value ?? null" />

          <mat-form-field appearance="outline">
            <mat-label>Confirmar nova senha</mat-label>
            <input
              matInput
              type="password"
              formControlName="confirmPassword"
              autocomplete="new-password"
              required
            />
          </mat-form-field>

          @if (
            passwordForm.hasError('passwordMismatch') &&
            passwordForm.get('confirmPassword')?.touched
          ) {
            <p class="text-red-400 text-sm -mt-2 m-0">As senhas não coincidem</p>
          }

          @if (passwordError()) {
            <p class="text-red-400 text-sm m-0">{{ passwordError() }}</p>
          }

          <div class="flex justify-end">
            <button mat-flat-button type="submit" [disabled]="savingPwd() || passwordForm.invalid">
              @if (savingPwd()) {
                <mat-spinner diameter="18" class="mr-2" />
              }
              Alterar senha
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class ProfileComponent {
  @ViewChild('fileInput') private readonly fileInput!: ElementRef<HTMLInputElement>;

  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly avatarService = inject(AvatarService);
  private readonly profileService = inject(ProfileService);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);

  readonly avatar = this.avatarService.currentAvatar;
  readonly userInitials = this.store.userInitials;
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');

  readonly saving = signal(false);
  readonly profileError = signal('');
  readonly savingPwd = signal(false);
  readonly passwordError = signal('');

  readonly profileForm = this.fb.nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
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
      if (u && this.profileForm.pristine) {
        this.profileForm.patchValue({ username: u.username, email: u.email ?? '' });
      }
    });
  }

  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(size / img.width, size / img.height);
        const sw = size / scale;
        const sh = size / scale;
        ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, size, size);
        this.avatarService.setAvatar(canvas.toDataURL('image/jpeg', 0.85));
        this.snackBar.open('Foto atualizada!', 'OK', { duration: 2500 });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    // Reset so same file can be re-selected
    (event.target as HTMLInputElement).value = '';
  }

  removeAvatar(): void {
    this.avatarService.removeAvatar();
    this.snackBar.open('Foto removida.', 'OK', { duration: 2500 });
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

  async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) return;
    this.savingPwd.set(true);
    this.passwordError.set('');
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    try {
      await this.profileService.changePassword({ currentPassword, newPassword });
      this.passwordForm.reset();
      this.snackBar.open('Senha alterada com sucesso!', 'OK', { duration: 3000 });
    } catch (err) {
      if (err instanceof HttpErrorResponse && (err.status === 401 || err.status === 403)) {
        this.passwordError.set('Senha atual incorreta.');
      } else {
        this.passwordError.set('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      this.savingPwd.set(false);
    }
  }
}
