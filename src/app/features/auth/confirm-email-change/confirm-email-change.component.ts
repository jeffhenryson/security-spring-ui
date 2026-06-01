import { ChangeDetectionStrategy, Component, inject, signal, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-confirm-email-change',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
      <div
        class="w-full max-w-sm p-8 bg-[var(--surface-color)] rounded-2xl border border-[var(--border-color)] shadow-2xl text-center"
      >
        <h1 class="text-2xl font-bold text-[var(--active-color)] mb-6">Confirmar Troca de Email</h1>

        @if (loading()) {
          <mat-spinner diameter="40" class="mx-auto" />
        } @else if (success()) {
          <div class="text-emerald-400 mb-4">Email atualizado com sucesso!</div>
          <a routerLink="/app/settings/profile" mat-flat-button>Ir para o perfil</a>
        } @else {
          <div class="text-red-400 mb-4">{{ errorMsg() }}</div>
          <a routerLink="/app/settings/profile" mat-stroked-button>Ir para o perfil</a>
        }
      </div>
    </div>
  `,
})
export class ConfirmEmailChangeComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);

  readonly loading = signal(true);
  readonly success = signal(false);
  readonly errorMsg = signal('Código inválido ou expirado.');

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code') ?? '';
    if (!code) {
      this.errorMsg.set('Nenhum código de confirmação encontrado no link.');
      this.loading.set(false);
      return;
    }
    this.confirm(code);
  }

  private async confirm(code: string): Promise<void> {
    try {
      await this.authService.confirmEmailChange(code);
      this.success.set(true);
    } catch {
      this.success.set(false);
    } finally {
      this.loading.set(false);
    }
  }
}
