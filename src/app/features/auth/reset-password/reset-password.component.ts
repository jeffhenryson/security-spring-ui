import { Component, inject, signal, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';

function passwordMatch(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password === confirm ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
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
          <h1 class="text-2xl font-bold text-cyan-400 mb-1">Nova senha</h1>
          <p class="text-slate-400 text-sm">Defina sua nova senha</p>
        </div>

        @if (success()) {
          <div class="p-4 bg-slate-800 rounded-lg border border-emerald-400 text-emerald-400 text-sm text-center mb-4">
            Senha redefinida com sucesso!
          </div>
          <div class="text-center">
            <a routerLink="/auth/login" mat-flat-button>Ir para o login</a>
          </div>
        } @else if (tokenMissing()) {
          <div class="p-4 bg-slate-800 rounded-lg border border-red-500 text-red-400 text-sm text-center mb-4">
            Link inválido ou expirado. Solicite uma nova recuperação de senha.
          </div>
          <div class="text-center">
            <a routerLink="/auth/forgot-password" mat-stroked-button>Solicitar novamente</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Nova senha</mat-label>
              <input matInput type="password" formControlName="newPassword" autocomplete="new-password" />
              @if (form.get('newPassword')?.hasError('minlength') && form.get('newPassword')?.touched) {
                <mat-error>Mínimo 6 caracteres</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Confirmar senha</mat-label>
              <input matInput type="password" formControlName="confirmPassword" autocomplete="new-password" />
            </mat-form-field>

            <!-- Erro de grupo fica fora do mat-form-field — passwordMismatch é erro do FormGroup, não do control -->
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
  private readonly http = inject(HttpClient);

  private token = '';
  readonly loading = signal(false);
  readonly success = signal(false);
  readonly tokenMissing = signal(false);
  readonly errorMsg = signal('');

  readonly form = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordMatch });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) this.tokenMissing.set(true);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/reset-password`, {
          token: this.token,
          newPassword: this.form.getRawValue().newPassword,
        })
      );
      this.success.set(true);
    } catch {
      this.errorMsg.set('Token inválido ou expirado.');
    } finally {
      this.loading.set(false);
    }
  }
}
