import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthStore } from '../../core/auth/auth.store';
import { environment } from '../../../environments/environment';

interface PageResponse {
  totalElements: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  template: `
    <div class="p-6 max-w-5xl mx-auto">

      <!-- Saudação -->
      <div class="mb-6">
        <h2 class="text-2xl font-bold text-slate-100">Olá, {{ username() }}!</h2>
        <p class="text-slate-400 text-sm mt-1">Bem-vindo ao painel de controle.</p>
      </div>

      <!-- Banner: email não verificado -->
      @if (emailUnverified()) {
        <div class="mb-4 flex items-start gap-3 p-4 bg-yellow-950/60 border border-yellow-600/50 rounded-xl">
          <mat-icon class="text-yellow-400 shrink-0 mt-0.5">warning</mat-icon>
          <div class="flex-1 min-w-0">
            <p class="text-yellow-300 text-sm font-medium">Email não verificado</p>
            <p class="text-yellow-400/70 text-xs mt-0.5">
              Verifique seu email para ativar todos os recursos da conta.
            </p>
          </div>
          <a routerLink="/auth/verify-email"
             class="text-yellow-400 text-xs font-medium hover:underline whitespace-nowrap mt-0.5">
            Verificar agora →
          </a>
        </div>
      }

      <!-- Banner: troca de email pendente -->
      @if (hasPendingEmail()) {
        <div class="mb-4 flex items-start gap-3 p-4 bg-blue-950/60 border border-blue-600/50 rounded-xl">
          <mat-icon class="text-blue-400 shrink-0 mt-0.5">mail</mat-icon>
          <div class="flex-1 min-w-0">
            <p class="text-blue-300 text-sm font-medium">Confirmação de email pendente</p>
            <p class="text-blue-400/70 text-xs mt-0.5">
              Confirme a troca para
              <span class="font-medium text-blue-300">{{ pendingEmail() }}</span>.
              Verifique sua caixa de entrada.
            </p>
          </div>
        </div>
      }

      <!-- Cards de stats -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

        <!-- Card: Total de usuários (só com USER_READ) -->
        @if (canReadUsers()) {
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-lg bg-cyan-950 flex items-center justify-center shrink-0">
                <mat-icon class="text-cyan-400">group</mat-icon>
              </div>
              <span class="text-slate-400 text-sm flex-1">Total de usuários</span>
              @if (errorUsers()) {
                <mat-icon class="text-yellow-400 !text-[18px]"
                          matTooltip="Falha ao carregar. Tente recarregar a página.">warning</mat-icon>
              }
            </div>
            @if (loadingUsers()) {
              <mat-spinner diameter="28" />
            } @else {
              <p class="text-3xl font-bold text-slate-100 leading-none">
                {{ totalUsers() !== null ? totalUsers() : '—' }}
              </p>
            }
          </div>
        }

        <!-- Card: Total de roles (só com ROLE_READ) -->
        @if (canReadRoles()) {
          <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-10 h-10 rounded-lg bg-violet-950 flex items-center justify-center shrink-0">
                <mat-icon class="text-violet-400">admin_panel_settings</mat-icon>
              </div>
              <span class="text-slate-400 text-sm flex-1">Total de roles</span>
              @if (errorRoles()) {
                <mat-icon class="text-yellow-400 !text-[18px]"
                          matTooltip="Falha ao carregar. Tente recarregar a página.">warning</mat-icon>
              }
            </div>
            @if (loadingRoles()) {
              <mat-spinner diameter="28" />
            } @else {
              <p class="text-3xl font-bold text-slate-100 leading-none">
                {{ totalRoles() !== null ? totalRoles() : '—' }}
              </p>
            }
          </div>
        }

        <!-- Card: Suas permissões (sempre visível) -->
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div class="flex items-center gap-3 mb-4">
            <div class="w-10 h-10 rounded-lg bg-emerald-950 flex items-center justify-center shrink-0">
              <mat-icon class="text-emerald-400">key</mat-icon>
            </div>
            <span class="text-slate-400 text-sm">Suas permissões</span>
          </div>
          <p class="text-3xl font-bold text-slate-100 leading-none">{{ totalPermissions() }}</p>
        </div>

      </div>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private readonly store = inject(AuthStore);
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  readonly username = computed(() => this.store.currentUser()?.username ?? '');
  readonly emailUnverified = computed(() => !this.store.isEmailVerified());
  readonly hasPendingEmail = computed(() => this.store.hasPendingEmail());
  readonly pendingEmail = computed(() => this.store.currentUser()?.pendingEmail ?? '');
  readonly totalPermissions = computed(() => this.store.permissions().length);

  readonly canReadUsers = computed(() => this.store.hasPermission('USER_READ'));
  readonly canReadRoles = computed(() => this.store.hasPermission('ROLE_READ'));

  readonly loadingUsers = signal(true);
  readonly loadingRoles = signal(true);
  readonly totalUsers = signal<number | null>(null);
  readonly totalRoles = signal<number | null>(null);
  readonly errorUsers = signal(false);
  readonly errorRoles = signal(false);

  ngOnInit(): void {
    if (this.canReadUsers()) this.fetchUsers();
    if (this.canReadRoles()) this.fetchRoles();
  }

  private async fetchUsers(): Promise<void> {
    this.loadingUsers.set(true);
    this.errorUsers.set(false);
    try {
      const res = await firstValueFrom(
        this.http.get<PageResponse>(`${this.api}/users?page=0&size=1`)
      );
      this.totalUsers.set(res.totalElements);
    } catch {
      this.totalUsers.set(null);
      this.errorUsers.set(true);
    } finally {
      this.loadingUsers.set(false);
    }
  }

  private async fetchRoles(): Promise<void> {
    this.loadingRoles.set(true);
    this.errorRoles.set(false);
    try {
      const res = await firstValueFrom(
        this.http.get<PageResponse>(`${this.api}/roles?page=0&size=1`)
      );
      this.totalRoles.set(res.totalElements);
    } catch {
      this.totalRoles.set(null);
      this.errorRoles.set(true);
    } finally {
      this.loadingRoles.set(false);
    }
  }
}
