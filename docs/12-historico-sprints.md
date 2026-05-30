# Histórico de Sprints — security-spring-ui

> Registro cronológico de todas as sprints concluídas no projeto frontend `security-spring-ui-v2`.  
> Estado final registrado: **302 unit tests** (42 suites) + **58 E2E (Playwright)** · build limpo · 2026-05-30.

---

## Linha do tempo

| Sprint | Tema | Estado final de testes |
|--------|------|------------------------|
| Sprint 1 | Segurança e consistência arquitetural | — |
| Sprint 2 | Funcionalidades faltantes críticas | — |
| Sprint 3 | Qualidade e infraestrutura | — |
| Sprint 4 | Polimento e features adicionais | — |
| Sprint 5 | Base RBAC pronta para crescer | — |
| Sprint 6 | Cobertura de testes | 209 unit tests |
| Sprint 7 | UX, acessibilidade e integrações | 259 unit tests |
| Sprint 8 | Cobertura de testes + infraestrutura | 259 unit tests + 13 E2E |
| Sprint 9 | Infraestrutura e monitoramento | 261 unit tests |
| Sprint 10 | Refatoração auth, timers e cobertura | 279 unit tests |
| Sprint 11 | Arquitetura, shared e E2E | 282 unit tests + 22 E2E |
| Sprint 12 | Integração backend atualizado + features | 288 unit tests + 22 E2E |
| Sprint 13 | Sync backend v2026-05 (breaking changes) | 287 unit tests + 22 E2E |
| Sprint 14 | E2E register, reset-password, audit-logs | 287 unit tests + 42 E2E |
| Sprint 15 | Cobertura completa + acessibilidade | 302 unit tests + 58 E2E |
| Sprint 16 | OAuth Google UI + correções de rendering | **302 unit tests + 58 E2E** |

---

## Sprint 1 — Segurança e consistência arquitetural

**Foco:** Eliminar antipadrões de segurança e padronizar a camada de serviços.

| Item | Arquivo(s) |
|------|-----------|
| C10 — Criar `ProfileService` e `SecurityService` | `core/profile/profile.service.ts`, `core/security/security.service.ts` |
| S7 — `AvatarService.clear()` remove entrada do usuário correto | `core/auth/avatar.service.ts` |
| C11 — Unificar `Page<T>` → `PagedResponse<T>` | `core/admin/paged-state.ts`; todos os serviços admin |
| C12 — Padronizar `list()` de roles com params opcionais | `roles-admin.service.ts` |

---

## Sprint 2 — Funcionalidades faltantes críticas

**Foco:** Fechar lacunas funcionais visíveis ao usuário admin.

| Item | Arquivo(s) |
|------|-----------|
| F2 — Remover role de usuário (`DELETE /users/{username}/roles/{roleName}`) | `users-admin.service.ts`, `users.component.ts` (`ManageRolesDialogComponent`) |
| F1 — Pesquisa/filtro de Roles com debounce + param `search` | `roles-admin.service.ts`, `roles.component.ts` |
| F6 — Revogar sessão individual (`DELETE /auth/sessions/{id}`) | `security.service.ts`, `security.component.ts` |
| P6 — Skeleton nas sessões ativas (substituiu `mat-spinner`) | `security.component.ts` |

---

## Sprint 3 — Qualidade e infraestrutura

**Foco:** Adicionar ferramentas de CI, linting e formatação.

| Item | Arquivo(s) |
|------|-----------|
| AI1 — Pipeline CI `.github/workflows/ci.yml` (Prettier → ESLint → Jest → build) | `.github/workflows/ci.yml` |
| AI2 — `Dockerfile` multi-stage + `nginx.conf` | `Dockerfile`, `nginx.conf` |
| AI3 — `strict: true` no `tsconfig.json` | `tsconfig.json` |
| AI5 — `.prettierrc` + scripts `format` / `format:check` | `package.json`, `.prettierrc` |
| T5 — ESLint com `@angular-eslint` e `@typescript-eslint` | `eslint.config.js` |

---

## Sprint 4 — Polimento e features adicionais

**Foco:** UX visual, tema claro nas páginas de auth, acessibilidade.

| Item | Arquivo(s) |
|------|-----------|
| V16/V17 — Tema claro nos componentes de auth (`bg-[var(--bg-primary)]` etc.) | Todos os componentes `features/auth/` |
| U29 — Página 404 customizada | `features/not-found/not-found.component.ts`, `app.routes.ts` |
| A7 — `aria-current="page"` no breadcrumb | `settings-shell.component.ts` |
| A8 — `MAT_SNACK_BAR_DEFAULT_OPTIONS` com `politeness: 'assertive'` | `app.config.ts` |
| A10 — `aria-label` em todas as 5 tabelas | `users`, `roles`, `permissions`, `security`, `audit-logs` |
| F7 — Opção de tema "Sistema" com ícone `settings_brightness` | `theme.component.ts`, `theme.service.ts` |

---

## Sprint 5 — Base RBAC pronta para crescer *(parcial)*

**Foco:** Centralizar permissões, criar serviços de stats/audit, página 403.

| Item | Arquivo(s) |
|------|-----------|
| AI7 — `PERMISSIONS` / `ROLES` constants centralizados (14 entradas) | `permissions.constants.ts`; 7 arquivos atualizados |
| C13 — Criar `StatsService` e `AuditLogsService` | `core/admin/stats.service.ts`, `core/admin/audit-logs.service.ts` |
| T7 — Specs de `HasPermissionDirective` e `HasRoleDirective` (6 + 6 testes) | `has-permission.directive.spec.ts`, `has-role.directive.spec.ts` |
| AI9 — Página "Acesso negado" (403) + guard atualizado | `features/access-denied/`, `permission.guard.ts` |

---

## Sprint 6 — Cobertura de testes

**Estado inicial:** ~100 testes → **Estado final: 209 unit tests passando**

| Item | Arquivo(s) | Testes |
|------|-----------|--------|
| T2 — Specs de `ProfileComponent` e `SecurityComponent` | `profile.component.spec.ts`, `security.component.spec.ts` | 36 |
| T3 — Specs dos 7 componentes de auth | `login`, `register`, `forgot-password`, `reset-password`, `two-factor`, `verify-email`, `confirm-email-change` | 33 |
| T8 — Specs de serviços de infra | `global-error.interceptor.spec.ts`, `theme.service.spec.ts`, `avatar.service.spec.ts`, `profile.service.spec.ts`, `security.service.spec.ts` | 30 |
| C14 — `takeUntilDestroyed()` nas subscriptions de `valueChanges` | `users.component.ts`, `audit-logs.component.ts`, `roles.component.ts` | — |
| T6 — Specs de `UsersComponent` e `AuditLogsComponent` | `users.component.spec.ts`, `audit-logs.component.spec.ts` | 20 |

---

## Sprint 7 — UX, acessibilidade e integrações

**Estado inicial:** 209 unit tests → **Estado final: 259 unit tests passando**

| Item | Arquivo(s) |
|------|-----------|
| B1 — `ThemeService` reativo a mudanças do OS em tempo real | `theme.service.ts` |
| B2 — Topbar cicla 3 modos de tema (dark → light → system) | `topbar.component.ts` |
| S6 — `challengeToken` armazenado em memória, consumido uma vez | `auth.service.ts`, `login.component.ts`, `two-factor.component.ts` |
| S8 — Rate limit no login (5 tentativas → bloqueio 30s) | `login.component.ts` |
| U25 — Animação `row-flash` na linha de usuário modificada | `users.component.ts` |
| U26 — Aviso "Caps Lock ativado" no formulário de login | `login.component.ts` |
| U27 — Animação `max-height` no menu mobile de settings | `settings-shell.component.ts` |
| U30 — Aviso extra ao excluir/desativar o próprio usuário logado | `users.component.ts` |
| U31 — Estado de colapso da sidebar persistido em `localStorage` | `sidebar.component.ts` |
| A11 — `aria-label="Navegação principal"` no `<nav>` da sidebar | `sidebar.component.ts` |
| V15 — Favicon SVG customizado (cadeado + "SS") | `src/favicon.svg`, `index.html` |
| V18 — `@routeAnimations` fade + `translateY` 180ms | `shell.component.ts` |
| V19 — Cores hardcoded `text-slate-100` → `text-[var(--text-primary)]` | `dashboard.component.ts` |
| F8 — Exportar usuários CSV client-side | `users.component.ts` |
| P7 — `size-limit` + script `npm run size` + job CI | `package.json`, `.github/workflows/ci.yml` |
| P8 — Lazy loading confirmado ativo em `settings.routes.ts` | `settings.routes.ts` |
| AI8 — `permissionGuard` migrado de `CanActivateFn` → `CanMatchFn` | `permission.guard.ts`, `settings.routes.ts` |
| **Integrações backend** | |
| S1 — `withCredentials: true` em login/refresh/logout (cookie HttpOnly) | `auth.service.ts`, `auth.models.ts` |
| F4 — `GET /stats` unificado substitui duas chamadas separadas | `dashboard.component.ts` |
| F9 — Regenerar backup codes (`POST /auth/2fa/backup-codes/regenerate`) | `security.service.ts`, `security.component.ts` |
| F3 — Logs de auditoria (`GET /audit-logs`) + componente + rota | `audit-logs.component.ts`, `settings.routes.ts` |

---

## Sprint 8 — Cobertura de testes + infraestrutura

**Estado inicial:** 210 unit tests → **Estado final: 259 unit tests + 13 E2E passando**

| Item | Arquivo(s) | Testes |
|------|-----------|--------|
| T9 — Spec de `StatsService` | `stats.service.spec.ts` | 1 |
| T10 — Spec de `AuditLogsService` | `audit-logs.service.spec.ts` | 2 |
| T11 — Spec de `DashboardComponent` | `dashboard.component.spec.ts` | 9 |
| T12 — Spec de `RolesComponent` | `roles.component.spec.ts` | 7 |
| T13 — Spec de `PermissionsComponent` | `permissions.component.spec.ts` | 8 |
| T14 — Spec de `SidebarComponent` | `sidebar.component.spec.ts` | 8 |
| T15 — Spec de `TopbarComponent` | `topbar.component.spec.ts` | 12 |
| T4 — Playwright E2E: login, 2FA, admin-usuários | `e2e/` (13 testes), `playwright.config.ts`, `e2e/helpers.ts` | 13 E2E |

---

## Sprint 9 — Infraestrutura e monitoramento

**Estado final: 261 unit tests passando**

| Item | Arquivo(s) |
|------|-----------|
| AI6 — `@sentry/angular` v10: `Sentry.init()` condicional em `main.ts` | `main.ts`, `environments/` |
| AI6 — `captureException` no `GlobalErrorInterceptor` para 5xx | `global-error.interceptor.ts`, `global-error.interceptor.spec.ts` |
| AI6 — `ErrorHandler` do Angular sobrescrito por `createErrorHandler()` | `app.config.ts` |

> Para ativar em produção: definir `sentryDsn` em `environment.prod.ts` ou via variável de build CI/CD.

---

## Sprint 10 — Refatoração auth, timers e cobertura

**Estado final: 279 unit tests passando**

| Item | Arquivo(s) |
|------|-----------|
| C15 — `HttpClient` removido de 5 componentes de auth; 6 métodos adicionados ao `AuthService` | `auth.service.ts` (+register, forgotPassword, resetPassword, verifyEmail, resendVerification, confirmEmailChange) |
| B5 — `DestroyRef.onDestroy()` + cancelamento de timers | `login.component.ts` (lockout), `users.component.ts` (row flash), `security.component.ts` (clipboard) |
| U32 — Clipboard `.catch()` + snackbar de falha | `security.component.ts` |
| U32 — Botão "Tentar novamente" + `retryStats()` no dashboard | `dashboard.component.ts` |
| T16 — Specs de 5 componentes restantes | `settings-shell.component.spec.ts` (8), `theme.component.spec.ts` (5), `landing.component.spec.ts` (3), `not-found.component.spec.ts` (1), `access-denied.component.spec.ts` (1) |

---

## Sprint 11 — Arquitetura, shared e E2E

**Estado final: 282 unit tests (40 suites) + 22 E2E passando**

| Item | Arquivo(s) |
|------|-----------|
| `ListAllLoader<T>` extraído de `RolesAdminService` e `PermissionsAdminService` | `core/admin/list-all-loader.ts` (novo) |
| `EmptyStateComponent` em `shared/` — estado vazio unificado em 4 componentes admin | `shared/empty-state/empty-state.component.ts` + spec |
| Sidebar limpa — `MODULES` vazio oculto, estilos órfãos removidos | `sidebar.component.ts` |
| E2E — Admin roles (4 testes) | `e2e/admin-roles.spec.ts` |
| E2E — Admin permissions (3 testes) | `e2e/admin-permissions.spec.ts` |
| E2E — Settings profile (4 testes) | `e2e/settings-profile.spec.ts` |

---

---

## Sprint 12 — Integração backend atualizado + features

**Estado final: 288 unit tests (40 suites) + 22 E2E passando · 2026-05-30**

Novos endpoints confirmados no backend: `GET /audit-logs/actions` (funcional), `GET /stats` com `disabledUsers` (funcional). Endpoints `GET /users/me/avatar`, `GET /notifications`, `GET /audit-logs/export` existem mas retornam 500 (migrations pendentes).

| Item | Arquivo(s) |
|------|-----------|
| D1 — Card `disabledUsers` no Dashboard | `api/models/stats-response.ts` (+campo), `dashboard.component.ts` (novo card vermelho) |
| AL1 — Filtro por `username` em Audit Logs | `audit-logs.service.ts` (`AuditLogFilters` interface, `username` param) |
| AL2 — Dropdown de tipos de ação via `GET /audit-logs/actions` | `audit-logs.service.ts` (`getActions()`), `audit-logs.component.ts` (`mat-select` + `availableActions` signal) |
| AL5 — Badges coloridas por categoria de ação | `audit-logs.component.ts` (`ACTION_COLORS` map + `badgeClass()`) |
| F10 — Export CSV dos Audit Logs (client-side) | `audit-logs.component.ts` (botão + `exportCsv()`) |
| F11 — Busca por nome em Permissions | `permissions-admin.service.ts` (`search` param), `permissions.component.ts` (campo + debounce) |
| U33 — Confirmação inline ao remover role | `users.component.ts` (`pendingRemove` signal + banner de confirmação) |
| U34 — Indicador de força de senha | `shared/password-strength/password-strength.component.ts` (novo); integrado em `register`, `reset-password` e `profile` |
| D2 — Feed de atividade recente no Dashboard | `dashboard.component.ts` (`AuditLogsService` + `recentActivity` signal + `fmtRelative()`) |
| AI13 — `Content-Security-Policy` no `nginx.conf` | `nginx.conf` (CSP + X-Frame-Options + X-Content-Type-Options + Referrer-Policy) |
| Specs atualizados | `audit-logs.service.spec.ts`, `audit-logs.component.spec.ts`, `permissions.component.spec.ts` |

---

## Sprint 13 — Sync backend v2026-05

**Estado final: 287 unit tests (40 suites) + 22 E2E passando · 2026-05-30**

Breaking changes aplicados ao frontend após o backend ser atualizado para v2026-05.

| Item | Arquivo(s) |
|------|-----------|
| `StatsResponse.disabledUsers` removido | `api/models/stats-response.ts`; `dashboard.component.ts` (computed `disabledUsers = totalUsers - activeUsers`) |
| `AuditLogResponse.details` removido | `api/models/audit-log-response.ts` |
| `AuditLogsService`: `username`→`userId`, remove `from`/`to`, remove `getActions()` | `core/admin/audit-logs.service.ts` |
| `AuditLogsComponent`: filtros de data removidos, lista de ações vira constante estática `KNOWN_ACTIONS` | `features/settings/audit-logs/audit-logs.component.ts` |
| Specs atualizados | `audit-logs.service.spec.ts`, `audit-logs.component.spec.ts`, `settings-shell.component.spec.ts`, `sidebar.component.spec.ts` |

---

## Sprint 14 — E2E register, reset-password e audit-logs

**Estado final: 287 unit tests (40 suites) + 42 E2E passando · 2026-05-30**

| Item | Arquivo(s) |
|------|-----------|
| E2E register (5 testes) | `e2e/auth-register.spec.ts` |
| E2E forgot/reset-password (8 testes) | `e2e/auth-reset-password.spec.ts` |
| E2E audit-logs (5 testes) | `e2e/admin-audit-logs.spec.ts` |
| Fix build — imports errados em `auth.models.ts` | `src/app/core/auth/models/auth.models.ts` |
| Fix build — type null no `profile.component.ts` | `email: u.email ?? ''` |
| Fix build — conflito `@Input()` / `input()` signal | `shared/password-strength/password-strength.component.ts` (migrado para `input()` signal) |
| Fixes E2E pré-existentes | `settings-profile.spec.ts`, `admin-permissions.spec.ts`, `admin-users.spec.ts`; `aria-label` no delete de roles |

---

## Sprint 15 — Cobertura completa + acessibilidade

**Estado final: 302 unit tests (42 suites) + 58 E2E passando · 2026-05-30**

| Item | Arquivo(s) |
|------|-----------|
| Spec `PasswordStrengthComponent` (9 testes) | `shared/password-strength/password-strength.component.spec.ts` |
| Spec `ConfirmDialogComponent` (5 testes) | `shared/confirm-dialog/confirm-dialog.component.spec.ts` |
| E2E settings-security (10 testes: 2FA setup/disable/cancelar + sessions) | `e2e/settings-security.spec.ts` |
| E2E auth-verify-email (7 testes) | `e2e/auth-verify-email.spec.ts` |
| `docs/02-contratos-api.md` reescrito com estado atual do backend | `docs/02-contratos-api.md` |
| `aria-label` na sessão terminate | `security.component.ts` |
| `aria-label` no role delete | `roles.component.ts` |

---

## Sprint 16 — OAuth Google UI + correções de rendering

**Estado final: 302 unit tests (42 suites) + 58 E2E passando · 2026-05-30**

Melhorias de UX visíveis + correções de bugs de renderização com Angular Material 21 / zoneless.

| Item | Arquivo(s) | Detalhe |
|------|-----------|---------|
| Material Symbols Outlined adicionado | `src/index.html` | Angular Material 21 usa este font por padrão; index só carregava Material Icons |
| Botão "Entrar com Google" no login | `features/auth/login/login.component.ts` | Usa `fetch(redirect:'manual')` para verificar se OAuth2 está disponível antes de redirecionar; exibe `MatSnackBar` se não estiver |
| Botão "Registrar com Google" no registro | `features/auth/register/register.component.ts` | Mesmo padrão do login; redireciona para `GET /oauth2/authorization/google` |
| Fix `minLength(6)` → `minLength(8)` no register | `features/auth/register/register.component.ts` | Alinhado com a `PasswordPolicy` do backend (min 8 chars) |
| Fix ícones do topbar invisíveis | `layout/topbar/topbar.component.ts` | Tokens CSS MDC `--mdc-icon-button-icon-color` e `--mat-icon-button-icon-color` definidos no `<button>` — Angular Material 21 não usa herança de `color` para ícones em `mat-icon-button` |
| Fix settings nav vazia na primeira navegação | `features/settings/settings-shell/settings-shell.component.ts` | `ChangeDetectionStrategy.OnPush` + leitura direta de `permissions()` signal no computed (anteriormente chamava `hasPermission()` indiretamente, sem rastreamento correto no modo zoneless) |

---

## Padrões consolidados ao longo das sprints

| Padrão | Onde usar |
|--------|-----------|
| `runWithFeedback` + `httpErrMsg` | loading / error / snackbar em qualquer operação async |
| `PagedState<T>` | Estado de paginação em todas as listas admin |
| `ListAllLoader<T>` | Carregamento com cache de listas completas (roles, permissions) |
| `EmptyStateComponent` | Estado vazio em tabelas admin |
| `permissionGuard(PERMISSIONS.X)` como `canMatch` | Guards de rota — bundle só baixado se autorizado |
| `DestroyRef.onDestroy()` + cancelar `setTimeout` | Cleanup de timers em qualquer componente |
| `takeUntilDestroyed(this.destroyRef)` | Cleanup de Observables (valueChanges, etc.) |
| Skeleton rows (8×) em vez de spinner | Loading state em tabelas |

---

## Estrutura de diretórios resultante

```
src/app/
├── api/              # Gerado por ng-openapi-gen (modelos + funções)
├── core/
│   ├── admin/        # Serviços admin + PagedState + ListAllLoader + EmptyState
│   ├── auth/         # AuthService, AuthStore, AuthInterceptor, AvatarService
│   ├── http/         # GlobalErrorInterceptor
│   ├── profile/      # ProfileService
│   ├── rbac/         # permissionGuard, HasPermissionDirective, HasRoleDirective
│   ├── security/     # SecurityService
│   ├── theme/        # ThemeService
│   └── validators/   # passwordMatchValidator, passwordStrengthValidator
├── features/
│   ├── auth/         # login, register, forgot-password, reset-password, 2FA, verify-email, confirm-email-change
│   ├── dashboard/    # DashboardComponent
│   ├── landing/      # LandingComponent
│   ├── settings/     # profile, security, theme, users, roles, permissions, audit-logs, settings-shell
│   ├── access-denied/
│   └── not-found/
├── layout/
│   ├── shell/        # ShellComponent (@routeAnimations)
│   ├── sidebar/      # SidebarComponent (collapse + RBAC)
│   └── topbar/       # TopbarComponent (tema 3 modos + logout)
└── shared/
    ├── confirm-dialog/
    └── empty-state/  # EmptyStateComponent
```
