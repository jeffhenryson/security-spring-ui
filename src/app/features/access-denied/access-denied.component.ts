import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-access-denied',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div
      class="min-h-screen flex flex-col items-center justify-center gap-6
             bg-[var(--bg-primary)] text-[var(--text-primary)]"
    >
      <div class="text-center">
        <p class="text-8xl font-black text-red-500 leading-none">403</p>
        <h1 class="text-2xl font-semibold mt-3 mb-2">Acesso negado</h1>
        <p class="text-[var(--text-secondary)] text-sm max-w-xs mx-auto">
          Você não tem permissão para acessar esta página. Caso acredite que isso é um erro,
          entre em contato com o administrador.
        </p>
      </div>
      <a routerLink="/app/dashboard" mat-flat-button>
        <mat-icon>home</mat-icon>
        Ir para o dashboard
      </a>
    </div>
  `,
})
export class AccessDeniedComponent {}
