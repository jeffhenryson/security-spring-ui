# 07 — Mapa de Rotas

---

## Árvore completa de rotas

```
/                              → LandingComponent              [público]
│
├── /auth/                     → authRoutes (lazy loadChildren)  [público]
│   ├── /auth/login            → LoginComponent
│   ├── /auth/2fa              → TwoFactorComponent
│   ├── /auth/register         → RegisterComponent
│   ├── /auth/verify-email     → VerifyEmailComponent         (query: ?code=X)
│   ├── /auth/forgot-password  → ForgotPasswordComponent
│   ├── /auth/reset-password   → ResetPasswordComponent       (query: ?token=X)
│   ├── /auth/confirm-email-change → ConfirmEmailChangeComponent (query: ?code=X)
│   └── **                     → redirect /auth/login
│
├── /app/                      → ShellComponent  [authGuard]
│   ├── /app/                  → redirect /app/dashboard
│   ├── /app/dashboard         → DashboardComponent
│   └── /app/settings/         → settingsRoutes (lazy loadChildren)
│       ├── /app/settings/     → redirect /app/settings/profile
│       ├── /app/settings/profile     → ProfileComponent
│       ├── /app/settings/security    → SecurityComponent
│       ├── /app/settings/users       → UsersComponent       [+USER_READ]
│       ├── /app/settings/roles       → RolesComponent       [+ROLE_READ]
│       └── /app/settings/permissions → PermissionsComponent [+PERMISSION_READ]
│
└── **                         → redirect /auth/login
```

---

## Arquivo `app.routes.ts` completo

```typescript
import { Routes } from '@angular/router';
import { authGuard, permissionGuard } from './core/rbac/permission.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/landing/landing.component').then(m => m.LandingComponent),
  },
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/shell/shell.component').then(m => m.ShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(m => m.settingsRoutes),
      },
    ],
  },
  { path: '**', redirectTo: '/auth/login' },
];
```

---

## Arquivo `auth.routes.ts`

```typescript
import { Routes } from '@angular/router';

export const authRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./login/login.component').then(m => m.LoginComponent),
  },
  {
    path: '2fa',
    loadComponent: () =>
      import('./two-factor/two-factor.component').then(m => m.TwoFactorComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./register/register.component').then(m => m.RegisterComponent),
  },
  {
    path: 'verify-email',
    loadComponent: () =>
      import('./verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
  },
  {
    path: 'reset-password',
    loadComponent: () =>
      import('./reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'confirm-email-change',
    loadComponent: () =>
      import('./confirm-email-change/confirm-email-change.component')
        .then(m => m.ConfirmEmailChangeComponent),
  },
  { path: '**', redirectTo: 'login' },
];
```

---

## Arquivo `settings.routes.ts`

```typescript
import { Routes } from '@angular/router';
import { permissionGuard } from '../../core/rbac/permission.guard';

export const settingsRoutes: Routes = [
  { path: '', redirectTo: 'profile', pathMatch: 'full' },
  {
    path: 'profile',
    loadComponent: () =>
      import('./profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./security/security.component').then(m => m.SecurityComponent),
  },
  {
    path: 'users',
    canActivate: [permissionGuard('USER_READ')],
    loadComponent: () =>
      import('./users/users.component').then(m => m.UsersComponent),
  },
  {
    path: 'roles',
    canActivate: [permissionGuard('ROLE_READ')],
    loadComponent: () =>
      import('./roles/roles.component').then(m => m.RolesComponent),
  },
  {
    path: 'permissions',
    canActivate: [permissionGuard('PERMISSION_READ')],
    loadComponent: () =>
      import('./permissions/permissions.component').then(m => m.PermissionsComponent),
  },
];
```

---

## Passagem de estado entre rotas

O Angular Router permite passar objetos no `navigation state` sem expô-los na URL.
Usado para o challengeToken do 2FA:

**Enviando (LoginComponent):**
```typescript
this.router.navigate(['/auth/2fa'], {
  state: { challengeToken: response.challengeToken }
});
```

**Recebendo (TwoFactorComponent):**
```typescript
export class TwoFactorComponent implements OnInit {
  private readonly router = inject(Router);
  private challengeToken = '';

  ngOnInit(): void {
    // Usar history.state — o navigation state é copiado para o browser history pela
    // Angular Router e permanece acessível após a navegação completar.
    // getCurrentNavigation() retorna null em ngOnInit porque a navegação já completou.
    this.challengeToken = history.state?.challengeToken ?? '';
    if (!this.challengeToken) {
      this.router.navigate(['/auth/login']);
    }
  }
}
```

> **Importante:** Use `history.state` para ler navigation state em `ngOnInit()`.
> `getCurrentNavigation()` só funciona no **construtor** do componente (durante a navegação).
> Em `ngOnInit()` a navegação já completou e `getCurrentNavigation()` retorna `null`.

---

## Leitura de query params

Para rotas com parâmetros na URL (`?code=X`, `?token=X`):

```typescript
export class VerifyEmailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly http = inject(HttpClient);

  ngOnInit(): void {
    // Leitura síncrona do snapshot — ok para params que não mudam em runtime
    const code = this.route.snapshot.queryParamMap.get('code');
    if (code) {
      this.verifyCode(code);
    }
  }
}
```

---

## Lazy loading: o que é carregado quando

```
Bundle inicial (main.js):
  ├── AppComponent
  ├── AppConfig (interceptors, guards, APP_INITIALIZER)
  └── AuthStore, AuthService (providedIn: 'root')

Ao acessar /auth/* (primeiro lazy chunk):
  └── authRoutes + todos os componentes de auth

Ao acessar /app/* (segundo lazy chunk):
  └── ShellComponent + layout

Ao acessar /app/dashboard (terceiro lazy chunk):
  └── DashboardComponent

Ao acessar /app/settings/* (quarto lazy chunk):
  └── settingsRoutes

Ao acessar /app/settings/users (quinto lazy chunk):
  └── UsersComponent
```

Cada `loadComponent` e `loadChildren` gera um chunk JavaScript separado.
O browser só baixa o chunk quando o usuário navega para aquela rota.

---

## Proteção de rotas públicas para usuários logados

Situação: usuário logado acessa `/auth/login` manualmente.

```typescript
// authRoutes — adicionar redirect se já autenticado
{
  path: 'login',
  canActivate: [
    () => {
      const store = inject(AuthStore);
      const router = inject(Router);
      if (store.isAuthenticated()) {
        return router.createUrlTree(['/app/dashboard']);
      }
      return true;
    }
  ],
  loadComponent: () => import('./login/login.component').then(m => m.LoginComponent),
},
```

> Opcional para o MVP. Implementar se o UX exigir — usuário logado vendo tela de login
> pode gerar confusão.

---

## Tabela de guards por rota

| Rota | authGuard | permissionGuard |
|---|---|---|
| `/` | — | — |
| `/auth/*` | — | — |
| `/app/*` | ✓ | — |
| `/app/settings/users` | ✓ (via pai) | `USER_READ` |
| `/app/settings/roles` | ✓ (via pai) | `ROLE_READ` |
| `/app/settings/permissions` | ✓ (via pai) | `PERMISSION_READ` |

> Quando `authGuard` está no pai (`/app`), ele se aplica a **todas** as rotas filhas
> automaticamente — não precisa repetir em cada rota filho.
