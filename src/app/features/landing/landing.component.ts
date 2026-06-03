import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppConfigStore } from '../../core/config/app-config.store';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface TechBadge {
  name: string;
  color: string;
}

const FEATURES: Feature[] = [
  {
    icon: 'lock',
    title: 'Autenticação JWT',
    description:
      'Access token em memória + refresh token persistido. Auto-renovação transparente via interceptor.',
  },
  {
    icon: 'admin_panel_settings',
    title: 'RBAC granular',
    description:
      'Controle de acesso baseado em roles e permissões. Guards e directives prontos para uso.',
  },
  {
    icon: 'verified_user',
    title: 'Autenticação em dois fatores',
    description:
      'Suporte a TOTP (Google Authenticator, Authy) com QR code, chave manual e backup codes.',
  },
  {
    icon: 'mark_email_read',
    title: 'Verificação de email',
    description:
      'Registro com confirmação por email. Troca de email também exige confirmação no novo endereço.',
  },
  {
    icon: 'devices',
    title: 'Gestão de sessões',
    description:
      'Visualize e encerre todas as sessões ativas. Cada refresh token é rastreado individualmente.',
  },
  {
    icon: 'manage_accounts',
    title: 'Administração de usuários',
    description:
      'CRUD completo de usuários, roles e permissões — com paginação e controle de acesso fino.',
  },
];

const TECH_BADGES: TechBadge[] = [
  { name: 'Angular 21', color: 'bg-red-950/60 text-red-300 border-red-800/50' },
  { name: 'Spring Boot 3', color: 'bg-green-950/60 text-green-300 border-green-800/50' },
  { name: 'Angular Material M3', color: 'bg-blue-950/60 text-blue-300 border-blue-800/50' },
  { name: 'Tailwind CSS v4', color: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50' },
  { name: 'JWT + Refresh', color: 'bg-violet-950/60 text-violet-300 border-violet-800/50' },
  { name: 'TOTP / 2FA', color: 'bg-amber-950/60 text-amber-300 border-amber-800/50' },
  { name: 'Angular Signals', color: 'bg-orange-950/60 text-orange-300 border-orange-800/50' },
  { name: 'PostgreSQL', color: 'bg-sky-950/60 text-sky-300 border-sky-800/50' },
];

@Component({
  selector: 'app-landing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="min-h-screen bg-[#030712] text-slate-100">
      <!-- Nav -->
      <header
        class="fixed top-0 left-0 right-0 z-10 border-b border-slate-800/60 bg-[#030712]/80 backdrop-blur-sm"
      >
        <div class="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <span class="text-cyan-400 font-semibold tracking-wider text-sm">SecuritySpring</span>
          <div class="flex items-center gap-2">
            <a routerLink="/auth/login" mat-stroked-button class="!text-slate-300 !border-slate-700 !text-sm">
              Entrar
            </a>
            @if (registrationEnabled()) {
              <a routerLink="/auth/register" mat-flat-button class="!text-sm">Criar conta</a>
            }
          </div>
        </div>
      </header>

      <!-- Hero -->
      <section class="pt-40 pb-24 px-6 text-center relative overflow-hidden">
        <!-- glow background -->
        <div
          class="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px]
                    bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"
        ></div>

        <div class="relative max-w-3xl mx-auto">
          <div
            class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full
                      bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 text-xs mb-8"
          >
            <mat-icon class="!text-[14px] !w-3.5 !h-3.5 !leading-none">security</mat-icon>
            Plataforma de autenticação e autorização
          </div>

          <h1
            class="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6
                     bg-gradient-to-br from-slate-100 via-slate-200 to-slate-400
                     bg-clip-text text-transparent"
          >
            Autenticação segura,<br />pronta para escalar
          </h1>

          <p class="text-slate-400 text-lg leading-relaxed max-w-xl mx-auto mb-10">
            Infraestrutura completa de auth, RBAC, 2FA e gestão de sessões. Backend Spring Boot +
            Frontend Angular — sem código boilerplate.
          </p>

          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            <a routerLink="/auth/login" mat-flat-button class="!px-8 !py-3 !text-base !h-auto">
              <mat-icon class="mr-2">login</mat-icon>
              Acessar plataforma
            </a>
            @if (registrationEnabled()) {
              <a routerLink="/auth/register" mat-stroked-button
                 class="!px-8 !py-3 !text-base !h-auto !text-slate-300 !border-slate-600">
                <mat-icon class="mr-2">person_add</mat-icon>
                Criar conta
              </a>
            }
          </div>
        </div>
      </section>

      <!-- Features -->
      <section class="py-20 px-6">
        <div class="max-w-6xl mx-auto">
          <div class="text-center mb-14">
            <h2 class="text-2xl sm:text-3xl font-bold text-slate-100 mb-3">
              Tudo que você precisa, pronto
            </h2>
            <p class="text-slate-400 max-w-lg mx-auto">
              Cada recurso foi projetado para ser seguro por padrão e fácil de estender.
            </p>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            @for (f of features; track f.title) {
              <div
                class="bg-slate-900/60 border border-slate-800 rounded-2xl p-6
                          hover:border-slate-700 transition-colors duration-200"
              >
                <div
                  class="w-10 h-10 rounded-xl bg-cyan-950 border border-cyan-900/50
                            flex items-center justify-center mb-4"
                >
                  <mat-icon class="text-cyan-400 !text-[20px]">{{ f.icon }}</mat-icon>
                </div>
                <h3 class="text-slate-100 font-semibold mb-2">{{ f.title }}</h3>
                <p class="text-slate-400 text-sm leading-relaxed">{{ f.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Tech Stack -->
      <section class="py-16 px-6 border-t border-slate-800/60">
        <div class="max-w-6xl mx-auto text-center">
          <p class="text-slate-500 text-sm uppercase tracking-widest mb-8">Stack tecnológica</p>
          <div class="flex flex-wrap justify-center gap-2">
            @for (badge of badges; track badge.name) {
              <span class="px-3 py-1.5 rounded-full text-xs font-medium border {{ badge.color }}">
                {{ badge.name }}
              </span>
            }
          </div>
        </div>
      </section>

      <!-- CTA final -->
      <section class="py-24 px-6">
        <div class="max-w-2xl mx-auto text-center">
          <h2 class="text-2xl sm:text-3xl font-bold text-slate-100 mb-4">Pronto para começar?</h2>
          <p class="text-slate-400 mb-8">
            Crie sua conta gratuitamente e explore todos os recursos da plataforma.
          </p>
          <div class="flex flex-col sm:flex-row items-center justify-center gap-3">
            @if (registrationEnabled()) {
              <a routerLink="/auth/register" mat-flat-button class="!px-8 !py-3 !text-base !h-auto">
                Criar conta gratuita
              </a>
            }
            <a routerLink="/auth/login" mat-stroked-button
               class="!px-8 !py-3 !text-base !h-auto !text-slate-300 !border-slate-600">
              {{ registrationEnabled() ? 'Já tenho uma conta' : 'Entrar' }}
            </a>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="border-t border-slate-800/60 py-8 px-6 text-center">
        <p class="text-slate-600 text-sm">
          SecuritySpring — plataforma de autenticação e autorização
        </p>
      </footer>
    </div>
  `,
})
export class LandingComponent {
  private readonly appConfig = inject(AppConfigStore);

  readonly features = FEATURES;
  readonly badges = TECH_BADGES;
  readonly registrationEnabled = this.appConfig.registrationEnabled;
}
