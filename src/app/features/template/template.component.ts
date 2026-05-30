import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-template',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <section
        class="bg-[var(--surface-color)] border border-[var(--border-color)] rounded-xl p-8
                      flex flex-col items-center gap-5 text-center"
      >
        <div class="w-16 h-16 rounded-full bg-cyan-900/50 flex items-center justify-center">
          <mat-icon class="!text-4xl !w-10 !h-10 text-cyan-400">dashboard_customize</mat-icon>
        </div>

        <div>
          <h2 class="text-xl font-semibold text-[var(--text-primary)] m-0 mb-2">Módulo Template</h2>
          <p class="text-[var(--text-secondary)] text-sm leading-relaxed m-0">
            Você pode usar este projeto como base para seus próprios sistemas. Adicione módulos
            baseados nas regras de negócio da sua aplicação utilizando o sistema
            <strong class="text-[var(--text-primary)]">RBAC</strong> já implementado.
          </p>
        </div>

        <div class="w-full max-w-md bg-[var(--surface-hover)] rounded-xl p-4 text-left">
          <p
            class="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3 m-0"
          >
            Infraestrutura disponível
          </p>
          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-3">
              <mat-icon class="text-cyan-400 !text-[18px] shrink-0">admin_panel_settings</mat-icon>
              <div>
                <p class="text-sm font-medium text-[var(--text-primary)] m-0">Roles</p>
                <p class="text-xs text-[var(--text-muted)] m-0">
                  Agrupe permissões em perfis de acesso
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <mat-icon class="text-cyan-400 !text-[18px] shrink-0">key</mat-icon>
              <div>
                <p class="text-sm font-medium text-[var(--text-primary)] m-0">Permissões</p>
                <p class="text-xs text-[var(--text-muted)] m-0">
                  Controle granular de acesso por funcionalidade
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <mat-icon class="text-cyan-400 !text-[18px] shrink-0">group</mat-icon>
              <div>
                <p class="text-sm font-medium text-[var(--text-primary)] m-0">Usuários</p>
                <p class="text-xs text-[var(--text-muted)] m-0">Gerencie contas e atribua roles</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <mat-icon class="text-cyan-400 !text-[18px] shrink-0">lock</mat-icon>
              <div>
                <p class="text-sm font-medium text-[var(--text-primary)] m-0">Guards de rota</p>
                <p class="text-xs text-[var(--text-muted)] m-0">
                  Proteja rotas com permissionGuard e hasRole
                </p>
              </div>
            </div>
          </div>
        </div>

        <p class="text-xs text-[var(--text-muted)] m-0">
          Substitua este módulo pelo conteúdo da sua aplicação.
        </p>
      </section>
    </div>
  `,
})
export class TemplateComponent {}
