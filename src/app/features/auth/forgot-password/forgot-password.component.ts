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

@Component({
  selector: 'app-forgot-password',
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
          <h1 class="text-2xl font-bold text-cyan-400 mb-1">Recuperar senha</h1>
          <p class="text-slate-400 text-sm">Informe seu email para receber as instruções</p>
        </div>

        @if (sent()) {
          <div class="p-4 bg-slate-800 rounded-lg border border-emerald-400 text-emerald-400 text-sm text-center mb-4">
            Se o email estiver cadastrado, você receberá as instruções em breve.
          </div>
          <div class="text-center">
            <a routerLink="/auth/login" class="text-cyan-400 hover:underline text-sm">Voltar ao login</a>
          </div>
        } @else {
          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="flex flex-col gap-4">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="email" />
            </mat-form-field>

            <button mat-flat-button type="submit" [disabled]="loading() || form.invalid" class="w-full mt-2">
              @if (loading()) {
                <mat-spinner diameter="20" class="inline" />
              } @else {
                Enviar instruções
              }
            </button>
          </form>

          <div class="mt-6 text-center text-sm">
            <a routerLink="/auth/login" class="text-cyan-400 hover:underline">Voltar ao login</a>
          </div>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordComponent {
  private readonly fb = inject(FormBuilder);
  private readonly http = inject(HttpClient);

  readonly loading = signal(false);
  readonly sent = signal(false);

  readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    try {
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/auth/forgot-password`, this.form.getRawValue())
      );
    } catch {
      // Silencioso — nunca revelar se o email existe
    } finally {
      this.loading.set(false);
      this.sent.set(true);
    }
  }
}
