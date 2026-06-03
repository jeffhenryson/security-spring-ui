import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-dashboard-user-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
             [class]="totpEnabled() ? 'bg-emerald-950' : 'bg-orange-950'">
          <mat-icon [class]="totpEnabled() ? 'text-emerald-400' : 'text-orange-400'">
            {{ totpEnabled() ? 'verified_user' : 'security' }}
          </mat-icon>
        </div>
        <div>
          <p class="text-xs text-[var(--text-secondary)] m-0">Autenticação 2FA</p>
          <p class="text-sm font-semibold m-0" [class]="totpEnabled() ? 'text-emerald-400' : 'text-orange-400'">
            {{ totpEnabled() ? 'Ativo' : 'Não configurado' }}
          </p>
        </div>
      </div>

      <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center"
             [class]="emailVerified() ? 'bg-blue-950' : 'bg-yellow-950'">
          <mat-icon [class]="emailVerified() ? 'text-blue-400' : 'text-yellow-400'">
            {{ emailVerified() ? 'mark_email_read' : 'mark_email_unread' }}
          </mat-icon>
        </div>
        <div>
          <p class="text-xs text-[var(--text-secondary)] m-0">Email</p>
          <p class="text-sm font-semibold m-0" [class]="emailVerified() ? 'text-blue-400' : 'text-yellow-400'">
            {{ emailVerified() ? 'Verificado' : (hasEmail() ? 'Pendente' : 'Não cadastrado') }}
          </p>
        </div>
      </div>

      <div class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
        <div class="w-9 h-9 rounded-lg shrink-0 bg-cyan-950 flex items-center justify-center">
          <mat-icon class="text-cyan-400">key</mat-icon>
        </div>
        <div>
          <p class="text-xs text-[var(--text-secondary)] m-0">Permissões</p>
          <p class="text-sm font-semibold text-[var(--text-primary)] m-0">{{ totalPermissions() }} ativas</p>
        </div>
      </div>
    </div>

    <div class="mb-6">
      <h3 class="text-sm font-semibold text-[var(--text-primary)] mb-3">Configurações da conta</h3>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <a routerLink="/app/settings/profile"
           class="flex flex-col items-start gap-2 p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors no-underline">
          <mat-icon class="text-[var(--active-color)]">person</mat-icon>
          <span class="text-sm font-medium text-[var(--text-primary)]">Perfil</span>
          <span class="text-xs text-[var(--text-secondary)]">Nome, foto e email</span>
        </a>
        <a routerLink="/app/settings/security"
           class="flex flex-col items-start gap-2 p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors no-underline">
          <mat-icon class="text-violet-400">security</mat-icon>
          <span class="text-sm font-medium text-[var(--text-primary)]">Segurança</span>
          <span class="text-xs text-[var(--text-secondary)]">Senha e 2FA</span>
        </a>
        <a routerLink="/app/settings/theme"
           class="flex flex-col items-start gap-2 p-4 bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--surface-hover)] transition-colors no-underline">
          <mat-icon class="text-amber-400">palette</mat-icon>
          <span class="text-sm font-medium text-[var(--text-primary)]">Tema</span>
          <span class="text-xs text-[var(--text-secondary)]">Aparência do sistema</span>
        </a>
      </div>
    </div>
  `,
})
export class DashboardUserSectionComponent {
  readonly totpEnabled = input.required<boolean>();
  readonly emailVerified = input.required<boolean>();
  readonly hasEmail = input.required<boolean>();
  readonly totalPermissions = input.required<number>();
}
