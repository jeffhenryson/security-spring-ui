import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthStore } from '../../../core/auth/auth.store';
import { AuthService } from '../../../core/auth/auth.service';
import { passwordMatchValidator } from '../../../core/validators/password.validators';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatProgressSpinnerModule, MatIconModule,
  ],
  template: `
    <div class="p-6 max-w-2xl mx-auto flex flex-col gap-6">

      @if (pendingEmail()) {
        <div class="flex items-start gap-3 p-4 bg-blue-950/60 border border-blue-600/50 rounded-xl">
          <mat-icon class="text-blue-400 shrink-0 mt-0.5">mail</mat-icon>
          <div>
            <p class="text-blue-300 text-sm font-medium m-0">Confirmação de email pendente</p>
            <p class="text-blue-400/70 text-xs mt-1 m-0">
              Confirme a troca para
              <span class="font-medium text-blue-300">{{ pendingEmail() }}</span>.
              Verifique sua caixa de entrada.
            </p>
          </div>
        </div>
      }

      <!-- Seção 1: Dados do perfil -->
      <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 class="text-base font-semibold text-slate-200 mt-0 mb-5">Dados do perfil</h3>

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
            <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" />
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

      <!-- Seção 2: Trocar senha -->
      <section class="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 class="text-base font-semibold text-slate-200 mt-0 mb-5">Trocar senha</h3>

        <form [formGroup]="passwordForm" (ngSubmit)="changePassword()" class="flex flex-col gap-4">
          <mat-form-field appearance="outline">
            <mat-label>Senha atual</mat-label>
            <input matInput type="password" formControlName="currentPassword" autocomplete="current-password" required />
            @if (passwordForm.get('currentPassword')?.hasError('required') && passwordForm.get('currentPassword')?.touched) {
              <mat-error>Campo obrigatório</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nova senha</mat-label>
            <input matInput type="password" formControlName="newPassword" autocomplete="new-password" required />
            @if (passwordForm.get('newPassword')?.hasError('minlength') && passwordForm.get('newPassword')?.touched) {
              <mat-error>Mínimo 6 caracteres</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Confirmar nova senha</mat-label>
            <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" required />
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

    </div>
  `,
})
export class ProfileComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly fb = inject(FormBuilder);
  private readonly snackBar = inject(MatSnackBar);
  private readonly api = environment.apiUrl;

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

  readonly passwordForm = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    const u = this.store.currentUser();
    if (u) this.profileForm.patchValue({ username: u.username, email: u.email });
  }

  async saveProfile(): Promise<void> {
    if (this.profileForm.invalid) return;
    this.saving.set(true);
    this.profileError.set('');
    try {
      await firstValueFrom(
        this.http.patch(`${this.api}/users/me`, this.profileForm.getRawValue())
      );
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        this.profileError.set('Senha atual incorreta.');
      } else if (err?.status === 409) {
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
      this.snackBar.open('Perfil salvo, mas os dados exibidos podem estar desatualizados. Recarregue a página.', 'OK', { duration: 5000 });
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
      await firstValueFrom(
        this.http.put(`${this.api}/users/me/password`, { currentPassword, newPassword })
      );
      this.passwordForm.reset();
      this.snackBar.open('Senha alterada com sucesso!', 'OK', { duration: 3000 });
    } catch (err: any) {
      if (err?.status === 401 || err?.status === 403) {
        this.passwordError.set('Senha atual incorreta.');
      } else {
        this.passwordError.set('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      this.savingPwd.set(false);
    }
  }
}
