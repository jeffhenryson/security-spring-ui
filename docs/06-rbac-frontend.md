# 06 — RBAC no Frontend

RBAC (Role-Based Access Control) é implementado em três camadas no frontend:
guards de rota, diretivas de template e verificação programática.

---

## Mapa de permissões → telas

| Permissão (string) | O que desbloqueia no frontend |
|---|---|
| `USER_READ` | Rota `/app/settings/users` + item no sidebar |
| `USER_CREATE` | Botão "Novo usuário" em Users |
| `USER_UPDATE` | Botão "Editar" em cada linha de Users |
| `USER_DELETE` | Botão "Excluir" em cada linha de Users |
| `USER_STATUS` | Botões "Ativar/Desativar" em cada linha de Users |
| `USER_ROLE_ASSIGN` | Botão "Atribuir role" em cada linha de Users |
| `ROLE_READ` | Rota `/app/settings/roles` + item no sidebar |
| `ROLE_CREATE` | Botão "Nova role" em Roles |
| `ROLE_DELETE` | Botão "Excluir" em cada linha de Roles |
| `ROLE_MANAGE_PERMISSIONS` | Painel de permissions dentro de cada role |
| `PERMISSION_READ` | Rota `/app/settings/permissions` + item no sidebar |
| `PERMISSION_CREATE` | Botão "Nova permissão" em Permissions |
| `PERMISSION_DELETE` | Botão "Excluir" em cada linha de Permissions |

> O backend também protege os endpoints — o frontend apenas **esconde** elementos.
> Se o usuário tentar acessar um endpoint sem permissão, receberá 403 de qualquer forma.

---

## Guard de autenticação: `authGuard`

```typescript
// src/app/core/rbac/permission.guard.ts
export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (store.isAuthenticated()) return true;
  return router.createUrlTree(['/auth/login']);
};
```

**Aplica em:** todas as rotas sob `/app/*`

**Comportamento:**
- `isAuthenticated()` retorna `computed(() => !!accessToken())`
- Se o token expirou e o interceptor ainda não fez refresh, o APP_INITIALIZER
  já terá tentado renovar antes de qualquer guard rodar
- Se não houver token: redirect para `/auth/login` preservando a rota de destino
  (implementação futura: `redirectUrl` no query param)

---

## Guard de permissão: `permissionGuard`

```typescript
export const permissionGuard = (permission: string): CanActivateFn => () => {
  const store = inject(AuthStore);
  const router = inject(Router);
  if (store.hasPermission(permission)) return true;
  return router.createUrlTree(['/app/dashboard']);
};
```

**Aplica em:** rotas que exigem permissão específica

**Comportamento:**
- Usuário autenticado mas sem a permissão → redirect para dashboard (não para 403)
- Não exibir mensagem de "acesso negado" — apenas redirecionar silenciosamente
- O item do sidebar para essa rota também estará invisível, então o usuário nunca
  verá o link para tentar acessar

**Uso nas rotas:**
```typescript
{
  path: 'users',
  canActivate: [authGuard, permissionGuard('USER_READ')],
  loadComponent: () => import('./users/users.component').then(m => m.UsersComponent),
}
```

> Ambos os guards são aplicados em sequência. Se `authGuard` falhar, `permissionGuard`
> não roda (Angular para na primeira falha).

---

## Diretiva `*hasPermission`

```typescript
// src/app/core/rbac/has-permission.directive.ts
@Directive({ selector: '[hasPermission]', standalone: true })
export class HasPermissionDirective {
  private readonly store = inject(AuthStore);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private permission = '';

  @Input() set hasPermission(p: string) {
    this.permission = p;
  }

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.store.hasPermission(this.permission)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
```

**Uso em template:**
```html
<!-- O botão só existe no DOM se o usuário tiver USER_CREATE -->
<button *hasPermission="'USER_CREATE'" mat-flat-button (click)="openCreateDialog()">
  Novo usuário
</button>

<!-- Funciona com qualquer elemento -->
<div *hasPermission="'ROLE_MANAGE_PERMISSIONS'">
  <mat-expansion-panel>...</mat-expansion-panel>
</div>
```

**Como funciona:**
- `effect()` roda sempre que `store.permissions()` mudar (signal reativo)
- `vcr.clear()` remove o elemento do DOM
- `vcr.createEmbeddedView(tpl)` injeta o elemento no DOM
- Ao fazer logout, `store.clear()` esvazia as permissions → todos os elementos
  protegidos são removidos automaticamente

---

## Diretiva `*hasRole`

```typescript
// src/app/core/rbac/has-role.directive.ts
@Directive({ selector: '[hasRole]', standalone: true })
export class HasRoleDirective {
  private readonly store = inject(AuthStore);
  private readonly tpl = inject(TemplateRef);
  private readonly vcr = inject(ViewContainerRef);
  private role = '';

  @Input() set hasRole(r: string) {
    this.role = r;
  }

  constructor() {
    effect(() => {
      this.vcr.clear();
      if (this.store.hasRole(this.role)) {
        this.vcr.createEmbeddedView(this.tpl);
      }
    });
  }
}
```

**Uso em template:**
```html
<!-- Visível apenas para ADMIN -->
<div *hasRole="'ADMIN'">
  <p>Área administrativa</p>
</div>
```

> **Preferir `*hasPermission` sobre `*hasRole`** quando possível.
> Permissões são mais granulares e mais fáceis de auditar — saber que o botão precisa
> de `USER_DELETE` é mais claro do que saber que "ADMIN tem permissão de deletar".

---

## Verificação programática (TypeScript)

Quando a lógica condicional está no componente, não no template:

```typescript
export class UsersComponent {
  private readonly store = inject(AuthStore);

  deleteUser(id: number): void {
    // Guard extra no TypeScript — nunca confiar só no template
    if (!this.store.hasPermission('USER_DELETE')) return;
    // ...
  }

  // Para exibição condicional de colunas na tabela
  protected readonly displayedColumns = computed(() => {
    const cols = ['username', 'email', 'status', 'roles'];
    if (this.store.hasPermission('USER_UPDATE') ||
        this.store.hasPermission('USER_DELETE') ||
        this.store.hasPermission('USER_STATUS')) {
      cols.push('actions');
    }
    return cols;
  });
}
```

---

## Sidebar com filtragem RBAC

O sidebar define um array de items de navegação com o campo `permission` opcional:

```typescript
interface NavItem {
  label: string;
  icon: string;
  route: string;
  permission?: string;  // se ausente, item sempre visível
}

const navItems: NavItem[] = [
  { label: 'Dashboard',    icon: 'dashboard',           route: '/app/dashboard' },
  { label: 'Perfil',       icon: 'person',              route: '/app/settings/profile' },
  { label: 'Segurança',    icon: 'security',            route: '/app/settings/security' },
  { label: 'Usuários',     icon: 'group',               route: '/app/settings/users',       permission: 'USER_READ' },
  { label: 'Roles',        icon: 'admin_panel_settings',route: '/app/settings/roles',        permission: 'ROLE_READ' },
  { label: 'Permissões',   icon: 'key',                 route: '/app/settings/permissions', permission: 'PERMISSION_READ' },
];
```

No template do sidebar:

```typescript
// computed que filtra os items visíveis (reativo a mudanças de permissões)
protected readonly visibleItems = computed(() =>
  navItems.filter(item =>
    !item.permission || this.store.hasPermission(item.permission)
  )
);
```

```html
@for (item of visibleItems(); track item.route) {
  <a mat-list-item [routerLink]="item.route" routerLinkActive="active">
    <mat-icon matListItemIcon>{{ item.icon }}</mat-icon>
    @if (!collapsed()) {
      <span matListItemTitle>{{ item.label }}</span>
    }
  </a>
}
```

---

## Camadas de defesa

O RBAC no frontend é uma UX concern, não uma camada de segurança.
O backend é sempre a última linha de defesa:

```
Usuário tenta ação
       │
       ▼
 1. Sidebar: item invisível  ← primeira barreira (UX)
       │
       ▼
 2. Guard de rota: redirect  ← segunda barreira (navegação)
       │
       ▼
 3. Diretiva: botão oculto   ← terceira barreira (UX)
       │
       ▼
 4. Verificação no TS        ← quarta barreira (defesa profunda no frontend)
       │
       ▼
 5. Backend: 403 Forbidden   ← barreira definitiva (nunca bypassável)
```

Alguém com acesso ao DevTools do browser pode manipular tokens e forçar requisições,
mas o backend rejeita qualquer requisição sem a permissão correta no JWT.

---

## Hierarquia típica de roles no sistema

```
ADMIN
  ├── USER_READ, USER_CREATE, USER_UPDATE, USER_DELETE, USER_STATUS, USER_ROLE_ASSIGN
  ├── ROLE_READ, ROLE_CREATE, ROLE_DELETE, ROLE_MANAGE_PERMISSIONS
  └── PERMISSION_READ, PERMISSION_CREATE, PERMISSION_DELETE

MANAGER (exemplo)
  ├── USER_READ, USER_UPDATE, USER_STATUS, USER_ROLE_ASSIGN
  └── ROLE_READ

VIEWER (exemplo)
  └── USER_READ
```

> As roles e permissions são criadas no banco de dados. O frontend não hardcoda a
> hierarquia — apenas verifica se o usuário atual tem a permissão específica.
