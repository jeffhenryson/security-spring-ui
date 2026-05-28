# Melhorias — security-spring-ui

> Documento atualizado em 2026-05-28. Itens concluídos na sessão anterior foram removidos.
> Novas descobertas da análise do código real foram adicionadas.

---

## Prompt para o próximo modelo

Este é um projeto Angular 18 (standalone components, Signals, `inject()`) que serve como frontend para uma API Spring Boot (`security-spring`). O backend **já está implementado** — antes de codificar qualquer integração, consulte sempre o contrato em `docs/02-contratos-api.md`, que foi extraído diretamente do código Java e é fonte de verdade.

### O que já foi feito (não refazer)

**Sessão 1 — bugs críticos e médios:**
- `isEmailVerified ?? false` no `auth.store.ts`
- Validação de `code`/`token` ausentes em `confirm-email-change` e `reset-password`
- Mensagem de "sessão expirada" no `two-factor.component.ts` (sem redirect silencioso)
- `permissionGuard` verifica `isAuthenticated()` antes de checar permissão
- `loadCurrentUser()` em try/catch separado no `profile.component.ts`
- `alreadyAuthGuard` criado e aplicado em `/login` e `/register`
- Títulos individuais nas rotas de settings (Perfil, Segurança, Tema, Usuários, Roles, Permissões)
- `resendSent` resetado após 15s em `verify-email`
- `mat-error` de campos obrigatórios no login
- `mat-hint` explicativo sobre troca de email no perfil
- Widths de todos os dialogs trocados para `min(Xpx, 95vw)`
- `form.reset()` após registro bem-sucedido
- Diálogo de confirmação antes de "Encerrar todas as sessões"
- QR code 200×200, botão copiar chave TOTP, copiar/baixar backup codes
- U1/U2 — rotas `verify-email` e `forgot-password` já existiam e estavam funcionais
- U19 — todos os três componentes admin já tinham estado "sem resultados"

**Sessão 2 — bugs, segurança, UX, acessibilidade, responsividade, qualidade:**
- N1 — `hasRole('ADMIN')` corrigido na sidebar (era `'ROLE_ADMIN'`, nunca mostrava seção "Módulos")
- N2 — `currentPassword` removido de `Validators.required` no `profileForm`; hint atualizado
- S2 — `challengeToken` validado como JWT (`startsWith('eyJ')`) antes de exibir formulário 2FA
- S3 — CSRF configurado com `withXsrfConfiguration` no `provideHttpClient`
- U8 — Dashboard: signals `errorUsers`/`errorRoles` + ícone de aviso com tooltip nos cards
- U15 — Tabela de usuários: busca por nome/email + filtro por status (client-side via `toSignal`)
- U16 — Roles exibidas como `mat-chip-set` na tabela de usuários (importado `MatChipsModule`)
- U17 — Dialog "Atribuir role" recebe e exibe `currentRoles` do usuário no topo
- U18 — Chip `+N` na tabela de roles tem `[matTooltip]` com as permissões restantes
- A1 — Botão toggle da sidebar tem `[attr.aria-label]` dinâmico
- A2 — Atributo HTML `required` adicionado em todos os inputs obrigatórios (login, register, 2FA, perfil)
- A3 — `aria-describedby`/`id` vinculando inputs aos `mat-error` em login e register
- A5 — `[attr.aria-label]` nos botões de ação (editar, ativar, atribuir, excluir) da tabela de usuários
- R1 — Settings: sidebar vira hambúrguer em mobile (`< 640px`); `flex-direction: column` no `:host` garante que o conteúdo preencha a altura restante
- R3 — Tabela de roles envolta em `<div class="overflow-x-auto">`
- V1 — Badge de status do usuário: `text-emerald-300 bg-emerald-900/80` (melhor contraste)
- C1 — Criados `UsersAdminService`, `RolesAdminService`, `PermissionsAdminService` em `src/app/core/admin/`
- C2 — Helper `runWithFeedback` criado em `src/app/core/admin/admin-feedback.ts`
- C3 — `passwordMatchValidator` extraído para `src/app/core/validators/password.validators.ts`

### Estrutura de arquivos relevantes
```
src/app/
  core/auth/          auth.store.ts, auth.service.ts, auth.interceptor.ts, models/
  core/rbac/          permission.guard.ts (authGuard, alreadyAuthGuard, permissionGuard)
  core/admin/         users-admin.service.ts, roles-admin.service.ts,
                      permissions-admin.service.ts, admin-feedback.ts  ← novos
  core/validators/    password.validators.ts  ← novo
  features/auth/      login, register, verify-email, forgot-password, reset-password,
                      two-factor, confirm-email-change
  features/dashboard/ dashboard.component.ts
  features/settings/  profile, security, theme, users, roles, permissions, settings-shell
  layout/             shell, sidebar, topbar
  shared/             confirm-dialog
docs/02-contratos-api.md   ← fonte de verdade da API
```

### Como abordar as melhorias restantes
1. Leia o contrato da API antes de qualquer chamada HTTP
2. Verifique sempre se o componente já importa os módulos Material necessários antes de adicionar elementos de template
3. Os serviços admin (`UsersAdminService`, etc.) foram criados mas **ainda não foram usados pelos componentes** — os componentes ainda injetam `HttpClient` diretamente. A migração é a tarefa C1 pendente.
4. O helper `runWithFeedback` também ainda não foi aplicado aos componentes — essa é a tarefa C2 pendente.

---

## Sumário

- [Segurança](#segurança)
- [UX / Fluxos](#ux--fluxos)
- [Performance](#performance)
- [Acessibilidade](#acessibilidade)
- [Qualidade de código](#qualidade-de-código)
- [Visual / Layout](#visual--layout)
- [Responsividade](#responsividade)

---

## Segurança

| # | Prioridade | Arquivo | Problema | Solução |
|---|-----------|---------|----------|---------|
| S1 | 🔴 Alta | `auth.interceptor.ts` | Refresh token armazenado em `localStorage` — vulnerável a XSS. Access token está correto (memória via Signal). | Documentar como limitação conhecida. Avaliar migração para `HttpOnly cookie` no futuro. Adicionar CSP no backend. |
| S4 | 🟢 Baixa | `login.component.ts` | Redirect pós-login está hardcoded (`/app/dashboard`). Se um parâmetro `returnUrl` for adicionado, pode virar open redirect. | Adicionar comentário de alerta. Se implementar `returnUrl`, validar contra whitelist de rotas internas. |

---

## UX / Fluxos

| # | Prioridade | Área | Problema | Solução |
|---|-----------|------|----------|---------|
| U14 | 🟢 Baixa | App startup | Durante o `APP_INITIALIZER` (restauração de sessão), não há indicador de carregamento — tela em branco por alguns instantes. | Adicionar splash screen ou spinner global no `index.html` que é removido quando o app inicializa. |
| U20 | 🟢 Baixa | Permissões | Formulário inline de criação (`<form>` ao lado do `<h3>`) quebra visualmente em telas menores (header com `flex-wrap` já ameniza, mas o campo fica estranho). | Em mobile, empilhar verticalmente: adicionar classe `flex-col sm:flex-row` na div pai. |

---

## Performance

| # | Prioridade | Arquivo | Problema | Solução |
|---|-----------|---------|----------|---------|
| P1 | 🟡 Média | `dashboard.component.ts` | Dois requests separados (`page=0&size=1`) para obter totais. | Criar endpoint no backend `GET /stats` ou aceitar como limitação. |
| P2 | 🟡 Média | `users.component.ts` | Lista de roles recarregada via HTTP toda vez que `CreateUserDialogComponent` ou `AssignRoleDialogComponent` é aberto (`ngOnInit → loadRoles()`). | Carregar roles uma vez ao montar `UsersComponent` e passar como `data` para os dialogs: `{ roles: this.cachedRoles }`. |
| P3 | 🟡 Média | `roles.component.ts` | Lista de permissões recarregada toda vez que `ManageRolePermissionsDialogComponent` é aberto. | Mesma abordagem — carregar uma vez no `RolesComponent.ngOnInit` e injetar via `data`. |
| P4 | 🟢 Baixa | Geral | Sem skeleton loaders — CLS visível ao navegar entre páginas. | Implementar skeletons com larguras fixas em tabelas e cards. |
| P5 | 🟢 Baixa | Geral | Sem cache de dados admin — cada navegação recarrega tudo. | Cache simples com TTL de 30s: `{ data: T[], loadedAt: number }` em signals no componente. |

---

## Acessibilidade

| # | Prioridade | Arquivo | Problema | Solução |
|---|-----------|---------|----------|---------|
| A4 | 🟢 Baixa | `topbar.component.ts` L30 | Botão do avatar (`<button [matMenuTriggerFor]="userMenu">`) não tem `aria-label`. | Adicionar `[attr.aria-label]="'Menu do usuário ' + username()"`. |

---

## Qualidade de código

| # | Prioridade | Área | Problema | Solução |
|---|-----------|------|----------|---------|
| C1 | 🟡 Média | Admin (todos) | Os serviços `UsersAdminService`, `RolesAdminService`, `PermissionsAdminService` foram criados em `core/admin/` mas os componentes (`users.component.ts`, `roles.component.ts`, `permissions.component.ts`) **ainda injetam `HttpClient` diretamente**. | Migrar os componentes para usar os serviços admin. Remover `HttpClient` direto dos componentes. |
| C2 | 🟡 Média | Admin (todos) | O helper `runWithFeedback` foi criado em `core/admin/admin-feedback.ts` mas **ainda não foi aplicado** aos componentes. Padrão `loading = true → try/catch/finally → snackBar.open` ainda repetido ~15 vezes. | Substituir o padrão repetido por chamadas a `runWithFeedback`. Fazer junto com a migração C1. |
| C4 | 🟢 Baixa | Admin (todos) | Lógica de paginação (`page`, `pageSize`, `total`, `load()`) duplicada em Usuários, Roles e Permissões. | Extrair `PagedTableStore<T>` ou mixin reutilizável. |
| C5 | 🟢 Baixa | Geral | Sem handler global de erros HTTP. Erros 5xx caem silenciosamente em componentes. | Criar `GlobalErrorInterceptor` para snackbar genérico em 5xx. |
| C6 | 🟢 Baixa | Geral | Nomes de sinais inconsistentes: `loadingRoles` vs `loading` vs `submitting`. | Adotar: `loading` para leitura, `submitting` para submit/escrita. |
| C7 | 🟢 Baixa | Dialogs | Interfaces de dados de dialogs (`CreateUserData` etc.) definidas inline nos componentes. | Centralizar em `features/settings/users/models.ts` etc. |

---

## Visual / Layout

| # | Prioridade | Área | Problema | Solução |
|---|-----------|------|----------|---------|
| V2 | 🟡 Média | Settings | Topbar mostra subtítulo correto (ex: "Perfil") mas não há breadcrumb "Configurações > Perfil" na área de conteúdo. | Adicionar breadcrumb dinâmico no `SettingsShellComponent` lendo a rota ativa. |
| V3 | 🟢 Baixa | Dashboard | Cards de estatísticas não têm skeleton loader — CLS quando os números chegam. | Substituir "—" de loading por shimmer animado. |
| V4 | 🟢 Baixa | Settings forms | Seções "Dados do Perfil" e "Alterar Senha" já têm `<section>` com borda, mas sem separação de cor de fundo suficiente no tema claro. | Verificar contraste no tema claro; usar variável `--bg-secondary` como fundo das sections. |
| V5 | 🟢 Baixa | Geral | Algumas classes Tailwind de cor hardcoded (`text-slate-400`) em vez de variáveis CSS `--text-muted`. | Auditar e substituir onde aplicável para consistência entre temas. |

---

## Responsividade

| # | Prioridade | Área | Problema | Solução |
|---|-----------|------|----------|---------|
| R4 | 🟢 Baixa | Permissões | Formulário inline de criação (campos lado a lado no header) não funciona em telas menores que 640px. | Empilhar verticalmente abaixo de `sm:` — já tem `flex-wrap`, mas o campo de 220px ainda transborda. |

---

## Índice de prioridades

### 🔴 Crítico / Alta prioridade
- S1 — Refresh token em localStorage (limitação conhecida, documentar)

### 🟡 Médio prazo
- P1, P2, P3 — Performance: stats endpoint, cache de roles/permissions
- C1, C2 — Migrar componentes admin para usar os serviços criados + aplicar `runWithFeedback`
- V2 — Breadcrumb dinâmico no settings

### 🟢 Polimento / Baixa prioridade
- S4 — Alerta sobre open redirect futuro
- U14 — Startup loader no `index.html`
- U20, R4 — Form permissões mobile
- P4, P5 — Skeletons, cache TTL
- C4–C7 — Refatorações
- V3–V5 — Visual/contraste/breadcrumb
- A4 — aria-label avatar topbar
