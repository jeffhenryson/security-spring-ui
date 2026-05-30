# Melhorias Futuras — security-spring-ui

> Atualizado em 2026-05-30 após Sprint 16.  
> Estado atual: **302 unit tests** (42 suites) + **58 E2E** · build limpo.  
> Histórico completo: [`docs/12-historico-sprints.md`](12-historico-sprints.md).

---

## Sumário

- [OAuth2 / Login Social](#oauth2--login-social)
- [Integração com o backend](#integração-com-o-backend)
- [Funcionalidades novas](#funcionalidades-novas)
- [UX e fluxos pendentes](#ux-e-fluxos-pendentes)
- [Qualidade e testes](#qualidade-e-testes)
- [Arquitetura e infraestrutura](#arquitetura-e-infraestrutura)
- [Roadmap sugerido](#roadmap-sugerido)

---

## OAuth2 / Login Social

| # | Prioridade | Dependência | Descrição |
|---|-----------|-------------|-----------|
| **OA1** | 🔴 Alta | **Backend** | **Configurar Spring Security OAuth2 Client com Google.** O botão "Entrar com Google" já está implementado no frontend (login e registro). Quando o backend adicionar `spring-security-oauth2-client` com o provider Google e a rota `GET /oauth2/authorization/google` pública, o botão funcionará sem alteração de frontend. O `fetch(redirect:'manual')` detecta automaticamente se o endpoint existe. |
| **OA2** | 🟡 Média | Backend | **Callback OAuth2 → emitir JWT.** O backend precisa de um handler `OAuth2AuthenticationSuccessHandler` que, após o Google autenticar o usuário, emite um `TokenPairResponse` (access + refresh token) e redireciona o browser de volta para o frontend em `/auth/oauth2/callback?token=...`. O frontend então precisa de um componente `OAuth2CallbackComponent` para capturar o token da URL e chamar `handleTokenPair()`. |
| **OA3** | 🟡 Média | OA1 + OA2 | **Suporte a outros providers** (GitHub, Microsoft). Após Google funcionar, adicionar mais providers é só adicionar mais botões e configurar o backend. |

---

## Integração com o backend

| # | Prioridade | Dependência | Área | Descrição |
|---|-----------|-------------|------|-----------|
| **INT1** | 🟡 Média | Backend | API Client | **Regenerar cliente Angular do OpenAPI.** `/v3/api-docs` retorna 500 com Spring Boot 4 + SpringDoc (problema conhecido). Quando resolvido: `npm run fetch:spec && npm run generate:api`. |
| **INT3** | 🟡 Média | Backend | Avatar | **Upload de avatar server-side.** `GET/POST /users/me/avatar` retorna 500 (migrations pendentes). Quando estabilizar, integrar upload na `ProfileComponent`. |
| **INT4** | 🟢 Baixa | Backend | Audit | **Filtros de data nos Audit Logs.** Se o backend adicionar `from`/`to` (ISO), adicionar dois `mat-datepicker` na `AuditLogsComponent`. |
| **INT5** | 🟢 Baixa | Backend | Audit | **Coluna `details` nos Audit Logs.** Se o backend retornar `details` no `AuditLogResponse`, exibir via `matTooltip` ou linha expansível. |

---

## Funcionalidades novas

| # | Prioridade | Dependência | Área | Descrição |
|---|-----------|-------------|------|-----------|
| **F1** | 🔴 Alta | Nenhuma | Auth | **Página de callback OAuth2 (`/auth/oauth2/callback`).** Componente que lê `?token=` da URL após o Google redirecionar de volta, chama `authService.handleTokenPair()` e navega para o dashboard. Obrigatório para completar o fluxo OA2. |
| **F2** | 🟡 Média | Nenhuma | Settings | **Notificações in-app.** Sininho no topbar com lista de eventos recentes (novo login, sessão revogada, etc.). Pode usar polling de `GET /audit-logs?userId=me&page=0&size=5` enquanto o backend não tiver WebSocket/SSE. |
| **F3** | 🟡 Média | Nenhuma | Dashboard | **Gráfico de atividade.** Usar os dados de `GET /audit-logs` para exibir um sparkline de logins/dia nos últimos 7 dias no dashboard. Biblioteca sugerida: `ngx-charts` ou SVG puro. |
| **F4** | 🟡 Média | Nenhuma | Usuários | **Busca por email** no filtro de usuários admin (além de username). O backend já aceita `search` que abrange ambos. |
| **F5** | 🟢 Baixa | Nenhuma | Settings | **Exportar perfil como JSON.** Botão em `ProfileComponent` que baixa `GET /users/me` como arquivo `.json`. Sem dependência de backend novo. |

---

## UX e fluxos pendentes

| # | Prioridade | Dependência | Área | Descrição |
|---|-----------|-------------|------|-----------|
| **U1** | 🔴 Alta | Nenhuma | Settings | **OnPush em todos os componentes.** Com `provideZonelessChangeDetection()`, todos os componentes devem usar `ChangeDetectionStrategy.OnPush`. Apenas `SettingsShellComponent` foi corrigido na Sprint 16. Aplicar nos demais: `ProfileComponent`, `SecurityComponent`, `UsersComponent`, `RolesComponent`, `PermissionsComponent`, `AuditLogsComponent`, `DashboardComponent`, `SidebarComponent`, `TopbarComponent`. |
| **U2** | 🟡 Média | Nenhuma | Auth | **"Lembrar de mim" no login.** Checkbox que, quando desmarcado, usa `sessionStorage` em vez de `localStorage` para o refresh token. |
| **U3** | 🟡 Média | Nenhuma | Auth | **Redirecionamento pós-login com `returnUrl`.** Guardar a rota original quando o guard rejeitar, e navegar para ela após login bem-sucedido. Precisa de whitelist de rotas internas para evitar open redirect. |
| **U4** | 🟡 Média | Backend | Auth | **Countdown na verificação de email.** Se o backend retornar `expiresAt` no token de verificação, exibir contador regressivo na `VerifyEmailComponent`. |
| **U5** | 🟡 Média | Nenhuma | Geral | **Skeleton loaders nas páginas de settings.** Apenas tabelas admin têm skeleton. Adicionar em `ProfileComponent` e `SecurityComponent` enquanto carregam dados. |
| **U6** | 🟢 Baixa | Nenhuma | Layout | **Tour de onboarding.** Na primeira visita ao dashboard, exibir um overlay guiado (tooltip de introdução) mostrando sidebar, topbar e cards. Biblioteca: `shepherd.js` ou `intro.js`. |
| **U7** | 🟢 Baixa | Nenhuma | Auth | **Animação de progresso no login com Google.** Enquanto o `fetch()` verifica o endpoint OAuth2, exibir um spinner no botão para indicar que algo está acontecendo. |

---

## Qualidade e testes

| # | Prioridade | Dependência | Área | Descrição |
|---|-----------|-------------|------|-----------|
| **Q1** | 🔴 Alta | Nenhuma | Testes | **E2E para o botão Google.** Testar que o clique no botão exibe o `MatSnackBar` de "não disponível" quando o backend não tem OAuth2 configurado. Testar que o redirect ocorre quando o endpoint retorna `opaqueredirect`. |
| **Q2** | 🟡 Média | Nenhuma | Testes | **Spec para `LoginComponent`.** Cobrir: submit com credenciais válidas, lockout após 5 tentativas, redirecionamento para 2FA, botão Google (snackbar). |
| **Q3** | 🟡 Média | Nenhuma | Testes | **Spec para `RegisterComponent`.** Cobrir: validação de senha (min 8 chars), mismatch de senha, erro 409, sucesso, botão Google. |
| **Q4** | 🟡 Média | Nenhuma | Testes | **Spec para `SettingsShellComponent`.** Cobrir `visibleSections()` com e sem permissões admin, e que OnPush re-renderiza quando `permissions()` muda. |
| **Q5** | 🟢 Baixa | Nenhuma | Build | **Regenerar cliente OpenAPI.** Rodar `npm run fetch:spec && npm run generate:api` quando `/v3/api-docs` estabilizar no backend. |

---

## Arquitetura e infraestrutura

| # | Prioridade | Dependência | Área | Descrição |
|---|-----------|-------------|------|-----------|
| **A1** | 🟡 Média | Nenhuma | Angular | **Migração completa para Material Symbols.** O `index.html` agora carrega ambos os fonts (Material Icons + Material Symbols Outlined). Remover o Material Icons legacy (`family=Material+Icons`) e garantir que todos os ícones usam nomes compatíveis com Material Symbols. |
| **A2** | 🟡 Média | Nenhuma | Build | **Ícones self-hosted.** Substituir os dois `<link>` do Google Fonts por pacotes npm (`material-symbols`, `@fontsource/roboto`) para funcionar offline e reduzir dependência de CDN externo. |
| **A3** | 🟢 Baixa | Nenhuma | Build | **PWA.** Adicionar `@angular/pwa` com service worker para cache offline do shell. A maioria dos dados é de API, mas o app shell (sidebar, topbar) ficaria disponível sem rede. |
| **A4** | 🟢 Baixa | Nenhuma | Segurança | **CSP nonce para scripts inline.** Atualmente `style-src` inclui `'unsafe-inline'` para o Angular Material injetar estilos. Migrar para nonce-based CSP é possível com SSR/SSG mas mais complexo com SPA puro. |

---

## Roadmap sugerido

### Sprint 17 — OnPush + specs de auth (sem dependência de backend)

> Prioridade: estabilidade e cobertura de testes.

1. **U1** — `ChangeDetectionStrategy.OnPush` em todos os componentes restantes
2. **Q2** — Spec completo de `LoginComponent` (incluindo botão Google)
3. **Q3** — Spec completo de `RegisterComponent` (incluindo botão Google)
4. **Q4** — Spec de `SettingsShellComponent` cobrindo OnPush + permissões

### Sprint 18 — OAuth2 callback + Google funcional (depende de backend OA1)

> Prioridade: completar o fluxo de login social.

1. **OA1** — Backend configura Spring OAuth2 com Google *(backend)*
2. **F1** — `OAuth2CallbackComponent` em `/auth/oauth2/callback`
3. **Q1** — E2E para o botão Google

### Sprint 19 — Funcionalidades novas (dashboard + notificações)

1. **F2** — Notificações in-app (sininho no topbar)
2. **F3** — Gráfico de atividade no dashboard
3. **INT3** — Avatar server-side (quando backend estabilizar)
4. **A1** — Migração completa para Material Symbols (remover Material Icons legacy)
5. **A2** — Ícones self-hosted (remover dependência de Google Fonts CDN)

---

> **Notas sobre dependências de backend:**
> - `OA1` (Google OAuth2) é o único bloqueador crítico de features novas.
> - `INT3` (avatar server-side) e `INT4/INT5` (audit logs avançados) aguardam migrations pendentes no backend.
> - Todos os itens sem dependência de backend podem ser desenvolvidos em paralelo.
