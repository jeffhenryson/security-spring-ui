# 01 — Arquitetura Geral

## Visão macro

O frontend é uma **Single Page Application Angular 21** que consome o backend SecuritySpring
(Spring Boot, `localhost:8080`). Toda a navegação é client-side. O servidor serve apenas o
`index.html` e os assets estáticos.

```
Browser
  └── Angular SPA (localhost:4200)
        ├── Auth state: Signals em memória (AuthStore)
        ├── HTTP: interceptor JWT automático
        └── REST API → Spring Boot (localhost:8080)
```

---

## Fluxo de navegação do usuário

```
/ (landing page — pública)
│   Apresenta o SecuritySpring com hero, features e CTA
│   Header: logo + botão "Entrar"
│         └── → /auth/login
│
/auth/login
│   Formulário de login (username + password)
│   Com suporte a 2FA (desvia para /auth/2fa se necessário)
│         └── autenticado com sucesso → /app/dashboard
│
/app/dashboard  (protegido — requer autenticação)
│   Home pós-login: boas-vindas, stats, atalhos
│   Shell com sidebar e topbar
│   Sidebar exibe apenas módulos que o usuário tem permissão para ver
│         ├── Settings → Usuários, Roles, Permissões, Perfil, Segurança
│         └── [seus módulos de negócio aparecem aqui]
```

A landing page detecta se o usuário já está autenticado: se sim, o botão "Entrar"
redireciona direto para `/app/dashboard` sem passar pelo login.

---

## Estrutura de pastas

```
src/app/
│
├── core/                          # Singletons globais — nunca importados entre features
│   ├── auth/
│   │   ├── models/
│   │   │   └── auth.models.ts     # Interfaces e type guards
│   │   ├── auth.store.ts          # Estado global: accessToken, currentUser (Signals)
│   │   ├── auth.service.ts        # Login, logout, refresh, 2FA, initSession
│   │   └── auth.interceptor.ts    # Anexa JWT + auto-refresh em 401
│   └── rbac/
│       ├── has-permission.directive.ts  # *hasPermission="'USER_READ'"
│       ├── has-role.directive.ts        # *hasRole="'ADMIN'"
│       └── permission.guard.ts          # authGuard + permissionGuard('PERM')
│
├── layout/                        # Shell pós-login — monta a tela com sidebar + topbar
│   ├── shell/
│   │   └── shell.component.ts     # RouterOutlet + Sidebar + Topbar
│   ├── sidebar/
│   │   └── sidebar.component.ts   # Nav colapsável com filtragem RBAC
│   └── topbar/
│       └── topbar.component.ts    # Título da página + menu do usuário
│
├── features/                      # Uma pasta por domínio funcional
│   ├── landing/                   # Página pública (/) — hero + features + CTA "Entrar"
│   │   └── landing.component.ts   # Header detecta auth: "Entrar" → /auth/login ou /app/dashboard
│   ├── auth/                      # Login, 2FA, registro, forgot/reset password, verify email
│   ├── dashboard/                 # Home pós-login (dentro do Shell)
│   └── settings/                  # Profile, Security, Users, Roles, Permissions
│       ├── profile/
│       ├── security/
│       ├── users/
│       │   ├── create-user-dialog/
│       │   └── edit-user-dialog/
│       ├── roles/
│       └── permissions/
│
└── modules/                       # Seus módulos de negócio ficam aqui
    └── example-module/            # Template — copie e renomeie para criar novos módulos
        ├── example-module.component.ts
        ├── example-module.routes.ts   # (opcional, se houver sub-rotas)
        └── example-module.service.ts
```

---

## Camadas e regras de dependência

```
           ┌─────────────────────────┐
           │   features / modules    │  ← domínios de negócio
           └──────────┬──────────────┘
                      │ usa (via inject())
           ┌──────────▼──────────────┐
           │         core            │  ← auth + rbac (singletons providedIn: 'root')
           └──────────┬──────────────┘
                      │ usa
           ┌──────────▼──────────────┐
           │        layout           │  ← shell visual, não tem lógica de negócio
           └─────────────────────────┘
```

**Regras:**
- `core/` não importa nada de `features/` ou `layout/`
- `features/` não importam entre si — se precisam de algo compartilhado, vai para `core/`
- `layout/` pode usar `core/` (via inject), mas não conhece features específicas
- Todo componente usa `inject()` para obter serviços — sem constructor injection manual

---

## Princípios adotados

### Standalone components
Todos os componentes são `standalone: true`. Não existe nenhum NgModule neste projeto.
Imports são declarados diretamente no array `imports: []` de cada componente.

### Lazy loading obrigatório
Todas as features são carregadas sob demanda:
```typescript
// Features com múltiplas rotas
loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)

// Componente único
loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
```
O bundle inicial (`main.js`) contém apenas `AppComponent`, `AppConfig` e o `AuthStore`.

### Signals para estado reativo
O `AuthStore` é a única fonte de verdade para estado de autenticação. Componentes leem
signals diretamente — sem subscriptions, sem `async` pipe, sem `ngOnDestroy`.

### RxJS apenas em fronteiras de I/O
RxJS é usado apenas onde há fluxos de eventos (HTTP via `HttpClient`). Internamente,
`firstValueFrom()` converte observables em Promises para código mais legível.

---

## Como adicionar um módulo de negócio

O ponto de partida é o **módulo template** em `src/app/modules/example-module/`.
Copie a pasta, renomeie tudo e siga os comentários `TODO:` nos arquivos.

```
1. Copiar o template:
   cp -r src/app/modules/example-module src/app/modules/meu-modulo

2. Renomear arquivos e classes internamente (buscar/substituir "example-module" e "ExampleModule").

3. Registrar rota em app.routes.ts (filho do ShellComponent):
   {
     path: 'meu-modulo',
     canActivate: [permissionGuard('MEU_MODULO_READ')],
     loadComponent: () =>
       import('./modules/meu-modulo/meu-modulo.component')
         .then(m => m.MeuModuloComponent),
   }

4. Adicionar item no sidebar (sidebar.component.ts):
   { label: 'Meu Módulo', icon: 'folder', route: '/app/meu-modulo', permission: 'MEU_MODULO_READ' }
   → O item só aparece para usuários com a permissão correta.

5. Cadastrar a permissão MEU_MODULO_READ no backend SecuritySpring e atribuir às roles.
```

O core (auth, RBAC, layout) **não é tocado**. O módulo é completamente auto-contido.

### Estrutura do módulo template

```typescript
// example-module.component.ts
// TODO: renomear a classe e o selector
// Estrutura básica: título + área de conteúdo + imports Material/Tailwind

// example-module.service.ts
// TODO: injetar HttpClient e implementar chamadas à API do seu recurso

// example-module.routes.ts (opcional)
// TODO: adicionar sub-rotas se o módulo tiver páginas internas (lista / detalhe / form)
```

---

## Fluxo de boot

```
1. Browser carrega index.html + main.js
2. Angular inicia AppComponent
3. APP_INITIALIZER dispara → AuthService.initSession()
   a. Lê localStorage['ss_refresh_token']
   b. Se existe: POST /auth/refresh → atualiza AuthStore
   c. Se não existe ou falha: store permanece vazio (não autenticado)
4. Angular Router avalia a rota atual:
   - Rota protegida + não autenticado → redirect /auth/login
   - Rota protegida + autenticado → renderiza componente
   - Rota pública → renderiza sem guard
```
