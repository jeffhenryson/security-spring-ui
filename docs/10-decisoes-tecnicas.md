# 10 — Decisões Técnicas (ADRs)

Architectural Decision Records — cada decisão técnica relevante documentada com
o contexto, as opções consideradas e as consequências.

---

## ADR-001: Angular 21 Standalone como framework

**Status:** Decidido

**Contexto:**  
Precisamos de um framework frontend maduro, com boa integração com Material Design,
sistema de DI robusto e suporte a TypeScript de primeira classe.

**Opções consideradas:**

| Opção | Prós | Contras |
|---|---|---|
| Angular 21 Standalone | DI nativo, Material oficial, lazy loading, Guards, Interceptors | Bundle inicial maior que React/Vue |
| React + Vite | Ecossistema enorme, bundle menor | Sem DI nativo, Material não-oficial, mais decisões de libs |
| Vue 3 | Simples, Composition API similar a Signals | Menor suporte corporativo, menos opções para auth |

**Decisão:** Angular 21 com standalone components.

**Razão específica para Standalone (sem NgModules):**  
NgModules são o modelo antigo. Standalone reduz boilerplate, melhora tree-shaking e
facilita lazy loading por componente (`loadComponent`). O Angular team recomenda
Standalone para projetos novos desde Angular 17.

**Consequências:**
- Todo componente tem `standalone: true` e declara seus imports diretamente
- Sem `declarations: []` ou `exports: []` em módulos
- Lazy loading de componentes individuais sem precisar de módulo

---

## ADR-002: Tailwind CSS via CLI separada (não PostCSS integrado)

**Status:** Decidido (baseado em falha do projeto anterior)

**Contexto:**  
O projeto anterior (`security-spring-ui`) usou Tailwind v4 via plugin PostCSS
integrado ao Angular builder. O CSS ficou vazio porque o esbuild (usado pelo
`@angular/build`) resolve `@import` antes do PostCSS rodar.

**Opções consideradas:**

| Opção | Resultado |
|---|---|
| Tailwind via PostCSS integrado | Classes não geradas (FALHOU no projeto anterior) |
| Tailwind CLI standalone + concurrently | Dois processos independentes, funciona ✓ |
| Sass/SCSS puro sem Tailwind | Mais verboso, sem utilities |
| UnoCSS (alternativa ao Tailwind) | Tem plugin Angular funcionando, mas menor comunidade |

**Decisão:** Tailwind CLI standalone com `concurrently`.

**Como funciona:**
```
tw:watch → lê tailwind.css → gera tailwind-generated.css
ng serve → lê tailwind-generated.css (já processado)
```

**Consequências:**
- `npm start` roda dois processos (via concurrently)
- `src/tailwind-generated.css` não deve ser editado manualmente
- Build de produção: `npm run tw:build && ng build`
- Docker: o Dockerfile deve executar `npm run build` (que já inclui tw:build)

---

## ADR-003: Signals para estado (sem NgRx)

**Status:** Decidido

**Contexto:**  
Precisamos de estado reativo para auth (token, usuário atual, permissões).

**Opções consideradas:**

| Opção | Complexidade | Adequação | Boilerplate |
|---|---|---|---|
| NgRx (Redux) | Alta | Apps grandes/multi-time | Alto |
| NGXS | Média | Apps médios | Médio |
| BehaviorSubject manual | Baixa-média | Qualquer tamanho | Baixo-médio |
| Signals (Angular nativo) | Baixa | Apps pequenos/médios | Mínimo |

**Decisão:** Angular Signals com um único `AuthStore` global.

**Razão:**  
O estado de auth é pequeno (token, user, permissions) e bem delimitado.
Signals são nativos do Angular 21 — sem dependência extra, integração zero-config
com templates e DevTools, e sem o overhead de actions/reducers.

**Consequências:**
- `AuthStore` é `providedIn: 'root'` — singleton automático
- Componentes injetam o store via `inject(AuthStore)`
- Signals lidos no template criam dependências reativas automáticas
- Estado local de componente (listas, formulários) usa `signal()` local, não o store global

---

## ADR-004: Angular Material M3 Dark como sistema de design

**Status:** Decidido

**Contexto:**  
Precisamos de componentes UI prontos (tabelas, dialogs, formulários, menus).

**Opções consideradas:**

| Opção | Integração Angular | Maturidade | Customização |
|---|---|---|---|
| Angular Material (oficial) | Nativa | Alta | Via Sass/CSS vars |
| PrimeNG | Boa | Alta | Temas pré-definidos |
| Ng-Zorro (Ant Design) | Boa | Alta | Limitada |
| Tailwind puro (sem component lib) | — | — | Total, mas muito trabalho |

**Decisão:** Angular Material M3 dark.

**Razão:**
- Suporte oficial do Angular team — mesma versão do framework
- M3 (Material Design 3) tem tema dark nativo
- Componentes complexos prontos: `MatTable`, `MatPaginator`, `MatDialog`, `MatSnackBar`
- Customização via variáveis CSS sem fazer fork de estilos

**Consequências:**
- Configuração via `@include mat.theme()` no `styles.scss`
- Alguns overrides de variáveis CSS para ajustar ao design dark tech
- Tailwind cobre layout/espaçamento; Material cobre componentes interativos

---

## ADR-005: JWT com access token em memória e refresh token em localStorage

**Status:** Decidido

**Contexto:**  
Como armazenar os tokens JWT de forma segura no browser?

**Opções consideradas:**

| Estratégia | XSS | CSRF | Expiração | Logout |
|---|---|---|---|---|
| Ambos em localStorage | Vulnerável (XSS lê localStorage) | Seguro | Persiste | Fácil |
| Ambos em httpOnly cookie | Seguro vs XSS | Vulnerável (CSRF) | Persiste | Simples |
| Access em memória + Refresh em localStorage | Mitigado (acesso limitado) | Seguro | Limpo | Explícito |
| Ambos em memória | Seguro | Seguro | Não persiste (perde ao recarregar) | — |

**Decisão:** Access token em memória (AuthStore signal) + refresh token em localStorage.

**Razão:**
- Access token em memória → XSS não consegue lê-lo diretamente (não está em `window.localStorage`)
- Refresh token em localStorage → sessão sobrevive ao F5/reload (UX aceitável)
- O backend implementa rotação de refresh token → mesmo que o refresh token seja
  interceptado, ele expira após o primeiro uso
- Refresh token tem TTL longo (ex: 30 dias) mas é revogado no logout

**Consequências:**
- `localStorage.getItem('ss_refresh_token')` é lido pelo `APP_INITIALIZER` no boot
- `AuthStore.clear()` remove o item do localStorage
- O interceptor só precisa do access token (memória) para cada requisição
- O logout deve enviar o refresh token ao backend (`POST /auth/logout { refreshToken }`)
  para revogá-lo no servidor — sem isso, o token continuaria válido até expirar

---

## ADR-006: `firstValueFrom` em vez de `.subscribe()` para chamadas HTTP

**Status:** Decidido

**Contexto:**  
O `HttpClient` retorna `Observable`. Como consumir no código do serviço?

**Opções:**

| Abordagem | Código | Gerenciamento de unsubscribe |
|---|---|---|
| `.subscribe()` | Familiar, mas verbose | Manual (takeUntil, destroy$) |
| `async/await` com `firstValueFrom` | Limpo, linear | Automático (Promise resolve uma vez) |
| `toPromise()` (deprecated) | — | — |

**Decisão:** `firstValueFrom(observable$)` nos serviços.

**Razão:**
- `HttpClient` completa o Observable após a primeira emissão (comportamento de Promise)
- `firstValueFrom` converte com segurança: cancela a subscription após receber o valor
- `async/await` + `try/catch` é mais legível que callbacks de `subscribe`
- Sem risco de memory leak (subscription não fica aberta)

**Consequências:**
- Serviços usam `async` methods com `await`
- Componentes chamam `await this.service.doSomething()`
- `try/catch` trata erros naturalmente
- Streams contínuos (ex: polling) ainda usam RxJS com `subscribe` + unsubscribe

---

## ADR-007: Lazy loading em todos os componentes/features

**Status:** Decidido

**Contexto:**  
Como organizar o carregamento do código JavaScript?

**Opções:**

| Estratégia | Bundle inicial | Carregamento por rota |
|---|---|---|
| Tudo no bundle principal | Grande (demora na primeira visita) | Rápido (já no browser) |
| Lazy por feature (loadChildren) | Pequeno | Médio (download sob demanda) |
| Lazy por componente (loadComponent) | Mínimo | Máximo (granularidade máxima) |

**Decisão:** Lazy loading por componente em todas as features.

**Razão:**
- Bundle inicial pequeno → First Contentful Paint mais rápido
- Usuário baixa apenas o código que usa (ex: admin sem USER_READ nunca baixa o chunk de Users)
- Angular 21 tem suporte nativo excelente via `loadComponent`

**Consequências:**
- Cada feature tem um chunk JavaScript separado
- Primeiro acesso a cada rota tem um pequeno delay de download (~100ms em rede local)
- O `ShellComponent` (layout) está no chunk `/app` — todo usuário logado o baixa

---

## ADR-008: Diretivas estruturais para RBAC em vez de `@if`

**Status:** Decidido

**Contexto:**  
Como esconder elementos do DOM baseado em permissões?

**Opções:**

| Abordagem | Exemplo | Reatividade |
|---|---|---|
| `@if (store.hasPermission('X'))` | Direto | Reativo (signal) |
| `*hasPermission="'X'"` (diretiva) | Semântico | Reativo (effect + signal) |

**Decisão:** Diretivas estruturais `*hasPermission` e `*hasRole`.

**Razão:**
- Templates mais semânticos — a intenção é clara
- A diretiva pode ser reutilizada em qualquer componente sem importar o store
- Centraliza a lógica de verificação em um lugar
- A reatividade via `effect()` garante que o DOM é atualizado quando permissões mudam
  (ex: após recarregar o usuário)

**Desvantagem:** Adiciona um nível de indireção. Para quem não conhece a diretiva,
pode ser confuso. Mitigação: documentar no CLAUDE.md.

**Consequências:**
- `HasPermissionDirective` e `HasRoleDirective` devem estar em `core/rbac/`
- Componentes que usam as diretivas as importam no array `imports: []`
- Para lógica condicional em TypeScript (fora de template), usar `store.hasPermission()`

---

## Resumo das decisões

| Decisão | Escolha | Principal alternativa rejeitada |
|---|---|---|
| Framework | Angular 21 Standalone | React + Vite |
| CSS utilities | Tailwind v4 CLI standalone | PostCSS integrado (FALHOU) |
| Estado global | Angular Signals + AuthStore | NgRx |
| Component library | Angular Material M3 Dark | PrimeNG |
| Token storage | Access em memória + Refresh em localStorage | Ambos em httpOnly cookie |
| HTTP no serviço | `firstValueFrom` + async/await | `.subscribe()` |
| Carregamento | `loadComponent` (lazy por componente) | Bundle único |
| RBAC no template | Diretivas estruturais | `@if (store.hasPermission(...))` |
