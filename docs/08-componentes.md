# 08 — Componentes UI

Responsabilidades, dados consumidos e padrões de cada componente.

---

## Árvore de componentes

```
AppComponent  (root, só tem <router-outlet>)
│
├── LandingComponent          (/auth/login, /auth/register)
│
├── Auth screens:
│   ├── LoginComponent
│   ├── TwoFactorComponent
│   ├── RegisterComponent
│   ├── VerifyEmailComponent
│   ├── ForgotPasswordComponent
│   ├── ResetPasswordComponent
│   └── ConfirmEmailChangeComponent
│
└── ShellComponent  (wrapper pós-login)
    ├── SidebarComponent
    │   └── NavItemComponent  (cada item de menu)
    ├── TopbarComponent
    │   └── UserMenuComponent  (dropdown avatar)
    └── <router-outlet>  (conteúdo principal)
        ├── DashboardComponent
        │   └── StatCardComponent
        └── Settings:
            ├── ProfileComponent
            ├── SecurityComponent
            │   ├── TotpSetupCardComponent
            │   └── SessionsTableComponent
            ├── UsersComponent
            │   ├── UserTableComponent
            │   ├── CreateUserDialogComponent
            │   └── EditUserDialogComponent
            ├── RolesComponent
            │   ├── RoleTableComponent
            │   └── CreateRoleDialogComponent
            └── PermissionsComponent
                └── PermissionTableComponent
```

---

## AppComponent

**Arquivo:** `src/app/app.component.ts`

```typescript
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
```

Não tem lógica. É apenas o ponto de entrada do router.

---

## LandingComponent

**Arquivo:** `src/app/features/landing/landing.component.ts`  
**Rota:** `/`

**Responsabilidades:**
- Apresentar a plataforma SecuritySpring
- Links para `/auth/login` e `/auth/register`

**Dados:** nenhum (componente estático)

**Estrutura visual:**
```
┌─────────────────────────────────────────┐
│  LOGO  SecuritySpring                   │
│                                         │
│  Hero: "Plataforma de segurança nativa" │
│  Subtítulo + botões [Entrar] [Criar]    │
│                                         │
│  Grid de features:                      │
│  [🔑 Auth] [🛡️ RBAC] [📱 2FA] [✉️ Email] │
│                                         │
│  Stack: Angular + Spring + Material     │
└─────────────────────────────────────────┘
```

---

## LoginComponent

**Arquivo:** `src/app/features/auth/login/login.component.ts`  
**Rota:** `/auth/login`

**Responsabilidades:**
- Formulário de login (username + password)
- Detectar resposta 2FA e redirecionar para `/auth/2fa`
- Detectar login completo e redirecionar para `/app/dashboard`
- Exibir erro genérico em 401

**Dados consumidos:** `AuthService.login()`

**Padrão de formulário:**
```typescript
protected readonly form = new FormGroup({
  username: new FormControl('', [Validators.required]),
  password: new FormControl('', [Validators.required]),
});

protected readonly loading = signal(false);
protected readonly error = signal<string | null>(null);

async submit(): Promise<void> {
  if (this.form.invalid) return;
  this.loading.set(true);
  this.error.set(null);
  try {
    const res = await this.authService.login(this.form.getRawValue());
    if (isTwoFactorChallenge(res)) {
      this.router.navigate(['/auth/2fa'], { state: { challengeToken: res.challengeToken } });
    } else {
      this.router.navigate(['/app/dashboard']);
    }
  } catch {
    this.error.set('Usuário ou senha inválidos.');
  } finally {
    this.loading.set(false);
  }
}
```

**Estrutura visual:**
```
┌──────────────────────────┐
│    🔒 SecuritySpring     │
│                          │
│  [Usuário             ]  │
│  [Senha               ]  │
│                          │
│  [    Entrar    ]        │
│                          │
│  Esqueceu a senha?       │
│  Criar conta             │
└──────────────────────────┘
```

---

## ShellComponent

**Arquivo:** `src/app/layout/shell/shell.component.ts`  
**Rota:** `/app` (container das rotas filhas)

**Responsabilidades:**
- Layout geral pós-login: sidebar à esquerda, conteúdo à direita
- Não tem lógica de negócio — apenas compõe o layout

```html
<div class="flex h-screen bg-gray-950">
  <app-sidebar />
  <div class="flex flex-col flex-1 overflow-hidden">
    <app-topbar />
    <main class="flex-1 overflow-y-auto p-6">
      <router-outlet />
    </main>
  </div>
</div>
```

---

## SidebarComponent

**Arquivo:** `src/app/layout/sidebar/sidebar.component.ts`

**Responsabilidades:**
- Exibir itens de navegação filtrados por permissão
- Estado de collapsed (ícone apenas vs. ícone + texto)
- Mostrar nome/avatar do usuário no rodapé

**Dados consumidos:**
- `store.currentUser()` → nome do usuário
- `store.permissions()` → filtragem dos itens do menu

**Estado local:**
```typescript
protected readonly collapsed = signal(false);

protected readonly visibleItems = computed(() =>
  navItems.filter(item => !item.permission || this.store.hasPermission(item.permission))
);
```

**Estrutura visual:**
```
┌─────────────┐     ┌────┐
│ SecuritySpg │     │ 🔑 │  ← collapsed
│             │     │    │
│ 📊 Dashboard│     │ 📊 │
│ 👤 Perfil   │     │ 👤 │
│ 🔒 Segurança│     │ 🔒 │
│ 👥 Usuários │     │ 👥 │
│ 🎭 Roles    │     │ 🎭 │
│ 🔑 Perms    │     │ 🔑 │
│             │     │    │
│ ◀ Recolher  │     │ ▶  │
│             │     │    │
│ admin       │     │ 👤 │
└─────────────┘     └────┘
```

---

## TopbarComponent

**Arquivo:** `src/app/layout/topbar/topbar.component.ts`

**Responsabilidades:**
- Exibir título da seção atual
- Avatar do usuário + dropdown com "Perfil" e "Sair"

**Dados consumidos:**
- `store.currentUser()` → username para avatar inicial

**Estrutura visual:**
```
┌──────────────────────────────────────────────────┐
│  Usuários                              [AD] ▾   │
└──────────────────────────────────────────────────┘
```

---

## DashboardComponent

**Arquivo:** `src/app/features/dashboard/dashboard.component.ts`  
**Rota:** `/app/dashboard`

**Responsabilidades:**
- Saudação personalizada
- Cards de stats (chamadas ao backend)
- Banners de alerta contextuais

**Dados consumidos:**
- `store.currentUser()` → username, emailVerified, pendingEmail
- `GET /users?page=0&size=1` → totalElements para card de usuários
- `GET /roles?page=0&size=1` → totalElements para card de roles

**Estado local:**
```typescript
protected readonly userCount = signal<number | null>(null);
protected readonly roleCount = signal<number | null>(null);
protected readonly permCount = computed(() => this.store.permissions().length);
```

**Estrutura visual:**
```
┌──────────────────────────────────────────────────┐
│  Olá, admin                                      │
│                                                   │
│  ⚠ Email não verificado [Reenviar verificação]   │  ← condicional
│  ⚠ Confirmação pendente para novo@email.com      │  ← condicional
│                                                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │ 42      │  │ 5       │  │ 13      │           │
│  │ Usuários│  │ Roles   │  │ Minhas  │           │
│  │         │  │         │  │ permiss.│           │
│  └─────────┘  └─────────┘  └─────────┘           │
└──────────────────────────────────────────────────┘
```

---

## ProfileComponent

**Arquivo:** `src/app/features/settings/profile/profile.component.ts`  
**Rota:** `/app/settings/profile`

**Duas seções independentes:**

**Seção 1 — Dados do perfil:**
- `PATCH /users/me` (username, email, currentPassword)
- Banner se `pendingEmail !== null`

**Seção 2 — Trocar senha:**
- `PUT /users/me/password` (currentPassword, newPassword)

**Padrão:** dois `FormGroup` separados, cada um com seu próprio estado de loading/error/success.

---

## SecurityComponent

**Arquivo:** `src/app/features/settings/security/security.component.ts`  
**Rota:** `/app/settings/security`

**Duas seções:**

**Seção 1 — 2FA:**
```
Estado: [idle] → [setup-loading] → [showing-qr] → [confirming] → [showing-backup-codes] → [done]
```

**Seção 2 — Sessões:**
- Tabela com `GET /auth/sessions`
- Botão "Encerrar todas" → `DELETE /auth/sessions` → logout local

---

## UsersComponent

**Arquivo:** `src/app/features/settings/users/users.component.ts`  
**Rota:** `/app/settings/users`

**Estado:**
```typescript
protected readonly users = signal<PageResult<CurrentUser> | null>(null);
protected readonly loading = signal(false);
protected readonly currentPage = signal(0);
protected readonly pageSize = signal(20);
```

**Interações:**
- Paginação → `load(newPage)`
- Ativar/Desativar → `PUT /users/{id}/enable|disable` → reload
- Editar → abre `EditUserDialogComponent`
- Criar → abre `CreateUserDialogComponent`
- Excluir → abre `MatDialog` de confirmação → `DELETE /users/{id}` → reload

**Colunas da tabela:**
```
username | email | status (chip) | roles (chips) | ações
```

---

## CreateUserDialogComponent

**Arquivo:** `src/app/features/settings/users/create-user-dialog/create-user-dialog.component.ts`

**Dados de entrada** (injetados pelo MatDialog):
```typescript
// Nenhum — é um dialog de criação
```

**Dados de saída:**
```typescript
// MatDialogRef<CreateUserDialogComponent, 'created' | undefined>
// 'created' → usuário criado, recarregar lista
```

**Formulário:**
- username (required, min 3)
- email (email validator)
- password (required, validação de força)
- roles (MatSelect múltiplo, carrega `GET /roles`)

---

## RolesComponent

**Arquivo:** `src/app/features/settings/roles/roles.component.ts`  
**Rota:** `/app/settings/roles`

**Diferencial:** cada role tem um painel expansível que mostra suas permissões atuais e
permite gerenciar (se `ROLE_MANAGE_PERMISSIONS`).

**Interações:**
- Criar role → dialog → `POST /roles`
- Excluir role → confirmação → `DELETE /roles/{name}`
- Atribuir permission → `POST /roles/{name}/permissions/{perm}`
- Remover permission → `DELETE /roles/{name}/permissions/{perm}`
- Listar permissions disponíveis → `GET /permissions` (ao abrir o painel)

---

## PermissionsComponent

**Arquivo:** `src/app/features/settings/permissions/permissions.component.ts`  
**Rota:** `/app/settings/permissions`

**O mais simples dos três.** Tabela paginada com create e delete.

---

## Padrões recorrentes

### Loading state em componentes de lista

```typescript
protected readonly items = signal<PageResult<T> | null>(null);
protected readonly loading = signal(false);
protected readonly error = signal<string | null>(null);

async load(page = 0): Promise<void> {
  this.loading.set(true);
  this.error.set(null);
  try {
    const result = await firstValueFrom(this.http.get<PageResult<T>>(...));
    this.items.set(result);
  } catch {
    this.error.set('Erro ao carregar. Tente novamente.');
  } finally {
    this.loading.set(false);
  }
}
```

```html
@if (loading()) {
  <mat-spinner />
} @else if (error()) {
  <p>{{ error() }}</p>
  <button (click)="load()">Tentar novamente</button>
} @else if (items()?.content?.length === 0) {
  <p>Nenhum item encontrado.</p>
} @else {
  <!-- tabela -->
}
```

### Dialog de confirmação de exclusão

```typescript
deleteItem(id: number): void {
  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    data: { message: 'Tem certeza que deseja excluir?' }
  });
  dialogRef.afterClosed().subscribe(confirmed => {
    if (confirmed) this.doDelete(id);
  });
}
```

### Snackbar de feedback

```typescript
private readonly snackBar = inject(MatSnackBar);

showSuccess(msg: string): void {
  this.snackBar.open(msg, 'Fechar', { duration: 3000, panelClass: 'snack-success' });
}

showError(msg: string): void {
  this.snackBar.open(msg, 'Fechar', { duration: 5000, panelClass: 'snack-error' });
}
```
