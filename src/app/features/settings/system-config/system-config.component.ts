import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AppConfigService } from '../../../core/config/app-config.service';
import { AppConfigStore } from '../../../core/config/app-config.store';

interface ConfigItem {
  key: string;
  label: string;
  description: string;
  group: string;
}

const CONFIG_ITEMS: ConfigItem[] = [
  // Autenticação
  { key: 'auth.google.enabled',          label: 'Login com Google',            description: 'Exibe o botão "Entrar com Google" na tela de login', group: 'Autenticação' },
  { key: 'auth.google.register.enabled', label: 'Criar conta via Google',      description: 'Permite criar conta nova pelo Google', group: 'Autenticação' },
  { key: 'auth.registration.enabled',    label: 'Registro público',            description: 'Exibe o link "Criar conta" na tela de login', group: 'Autenticação' },
  { key: 'auth.forgot-password.enabled', label: 'Esqueci minha senha',         description: 'Exibe o link de recuperação de senha', group: 'Autenticação' },
  // Segurança
  { key: 'security.maintenance.enabled', label: 'Modo manutenção',             description: 'Bloqueia todos os logins com mensagem de indisponibilidade', group: 'Segurança' },
  { key: 'security.2fa.required',        label: '2FA obrigatório',             description: 'Exige 2FA para todos os usuários ao logar', group: 'Segurança' },
  // Módulos
  { key: 'module.audit-logs.enabled',    label: 'Módulo: Logs de auditoria',   description: 'Habilita a seção de Logs de Auditoria no painel', group: 'Módulos' },
  { key: 'module.roles.enabled',         label: 'Módulo: Roles e permissões',  description: 'Habilita o gerenciamento de roles e permissões', group: 'Módulos' },
];

@Component({
  selector: 'app-system-config',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatSlideToggleModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="p-6 max-w-2xl mx-auto flex flex-col gap-6">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-base font-semibold text-[var(--text-primary)] m-0">Configuração do Sistema</h3>
          <p class="text-sm text-[var(--text-secondary)] mt-1 mb-0">
            Alterações ficam pendentes até você aplicar.
          </p>
        </div>
        @if (hasPending()) {
          <button mat-flat-button (click)="applyAll()" [disabled]="saving()">
            @if (saving()) { <mat-spinner diameter="16" class="mr-2" /> }
            Aplicar {{ pendingCount() }} {{ pendingCount() === 1 ? 'alteração' : 'alterações' }}
          </button>
        }
      </div>

      @if (loadError()) {
        <div class="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5 text-red-400 text-sm">
          <mat-icon class="!text-[18px] shrink-0">error_outline</mat-icon>
          <span>Erro ao carregar configurações. Verifique se o token DEV está ativo e tente novamente.</span>
          <button mat-icon-button class="ml-auto !text-red-400" (click)="reload()">
            <mat-icon class="!text-[18px]">refresh</mat-icon>
          </button>
        </div>
      }

      @if (loading()) {
        <div class="flex flex-col gap-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="skeleton h-16 rounded-xl"></div>
          }
        </div>
      } @else {
        @for (g of groupedItems(); track g.group) {
          <section class="flex flex-col gap-2">
            <h4 class="text-xs font-semibold uppercase tracking-widest text-[var(--text-secondary)] m-0 px-1">
              {{ g.group }}
            </h4>
            @for (item of g.items; track item.key) {
              <div
                class="flex items-center justify-between p-4 rounded-xl border bg-[var(--surface-color)] transition-colors"
                [class]="item.isPending ? 'border-amber-500/40' : 'border-[var(--border-color)]'"
              >
                <div class="flex flex-col gap-0.5 pr-4">
                  <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-[var(--text-primary)]">{{ item.label }}</span>
                    @if (item.isPending) {
                      <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        pendente
                      </span>
                    }
                  </div>
                  <span class="text-xs text-[var(--text-secondary)]">{{ item.description }}</span>
                </div>
                <mat-slide-toggle
                  [checked]="item.value"
                  [disabled]="saving()"
                  (change)="markPending(item.key, $event.checked)"
                />
              </div>
            }
          </section>
        }
      }
    </div>
  `,
})
export class SystemConfigComponent implements OnInit {
  private readonly configService = inject(AppConfigService);
  private readonly store = inject(AppConfigStore);
  private readonly snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal(false);

  // Pending changes: key → new boolean value
  private readonly _pending = signal<Record<string, boolean>>({});

  readonly hasPending = computed(() => Object.keys(this._pending()).length > 0);
  readonly pendingCount = computed(() => Object.keys(this._pending()).length);

  /** Estrutura por grupo com estado de pending e valor actual pré-calculados. */
  readonly groupedItems = computed(() => {
    const pending = this._pending();
    const config = this.store.config();
    const groups = [...new Set(CONFIG_ITEMS.map((i) => i.group))];
    return groups.map((group) => ({
      group,
      items: CONFIG_ITEMS.filter((i) => i.group === group).map((item) => ({
        ...item,
        isPending: item.key in pending,
        value: item.key in pending ? pending[item.key] : (config[item.key] ?? 'true') === 'true',
      })),
    }));
  });

  markPending(key: string, value: boolean): void {
    const current = (this.store.config()[key] ?? 'true') === 'true';
    if (value === current) {
      // Reverted to original — remove from pending
      this._pending.update((p) => {
        const next = { ...p };
        delete next[key];
        return next;
      });
    } else {
      this._pending.update((p) => ({ ...p, [key]: value }));
    }
  }

  async ngOnInit(): Promise<void> {
    await this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(false);
    try {
      await this.configService.loadAll();
    } catch {
      this.loadError.set(true);
    } finally {
      this.loading.set(false);
    }
  }

  async applyAll(): Promise<void> {
    const pending = this._pending();
    if (!Object.keys(pending).length) return;
    this.saving.set(true);
    try {
      await Promise.all(
        Object.entries(pending).map(([key, val]) => this.configService.set(key, String(val))),
      );
      this._pending.set({});
      this.snackBar.open(`${Object.keys(pending).length} configuração(ões) aplicada(s).`, 'OK', { duration: 3000 });
    } catch {
      this.snackBar.open('Erro ao aplicar configurações.', 'Fechar', { duration: 4000 });
    } finally {
      this.saving.set(false);
    }
  }
}
