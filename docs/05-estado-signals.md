# 05 — Estratégia de Estado com Signals

## Por que Signals e não NgRx ou BehaviorSubject?

| Critério | NgRx | BehaviorSubject | Signals (escolhido) |
|---|---|---|---|
| Boilerplate | Alto (actions, reducers, effects, selectors) | Médio | Mínimo |
| Curva de aprendizado | Alta | Baixa-média | Baixa |
| Adequação | Apps grande/multi-time | Apps médios | Apps pequenos/médios ✓ |
| Integração com templates | Precisa async pipe | Precisa async pipe | Direta, sem pipe |
| DevTools | Excelentes | Limitadas | Integradas no Angular DevTools |
| Granularidade de re-render | Por selector | Por subscriber | Por signal read ✓ |

Para este projeto (um único time, estado de auth bem definido e pequeno), Signals
eliminam toda a cerimônia do NgRx sem perder reatividade.

---

## O AuthStore — estrutura completa

```typescript
@Injectable({ providedIn: 'root' })
export class AuthStore {
  // ── Signals privados (writable) ────────────────────────────────────────────
  private readonly _accessToken = signal<string | null>(null);
  private readonly _currentUser = signal<CurrentUser | null>(null);
  private readonly _loading = signal(false);

  // ── Signals públicos (readonly) ────────────────────────────────────────────
  // Expor como readonly impede que componentes alterem o estado diretamente.
  readonly accessToken = this._accessToken.asReadonly();
  readonly currentUser = this._currentUser.asReadonly();
  readonly loading = this._loading.asReadonly();

  // ── Computed signals ────────────────────────────────────────────────────────
  // São recalculados automaticamente quando os signals de que dependem mudam.
  // Angular não re-renderiza views que não leem esses computeds.
  readonly isAuthenticated = computed(() => !!this._accessToken());
  readonly permissions = computed(() => this._currentUser()?.permissions ?? []);
  readonly roles = computed(() => this._currentUser()?.roles ?? []);
  readonly hasPendingEmail = computed(() => !!this._currentUser()?.pendingEmail);
  readonly isEmailVerified = computed(() => this._currentUser()?.emailVerified ?? true);

  // ── Métodos de conveniência ─────────────────────────────────────────────────
  // Checar permissão programaticamente (fora de templates)
  hasPermission(permission: string): boolean {
    return this.permissions().includes(permission);
  }

  hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  // ── Mutações — só o AuthService as chama ───────────────────────────────────
  setAccessToken(token: string | null): void {
    this._accessToken.set(token);
  }

  setCurrentUser(user: CurrentUser | null): void {
    this._currentUser.set(user);
  }

  setLoading(loading: boolean): void {
    this._loading.set(loading);
  }

  clear(): void {
    this._accessToken.set(null);
    this._currentUser.set(null);
    localStorage.removeItem('ss_refresh_token');
  }
}
```

---

## Como componentes consomem o store

### Em templates (reatividade automática)

```html
<!-- Angular detecta que o template lê currentUser() e re-renderiza quando muda -->
<span>Olá, {{ store.currentUser()?.username }}</span>

<!-- computed usado no template — mesma reatividade -->
@if (store.isAuthenticated()) {
  <app-dashboard />
}

<!-- com operador de encadeamento opcional -->
@if (store.hasPendingEmail()) {
  <mat-card class="border border-yellow-500">
    Confirmação pendente para {{ store.currentUser()?.pendingEmail }}
  </mat-card>
}
```

### Em código TypeScript (leitura pontual)

```typescript
export class DashboardComponent {
  protected readonly store = inject(AuthStore);

  // Leitura pontual — valor atual do signal
  protected readonly user = this.store.currentUser;  // signal ref, não o valor
  protected readonly permissions = this.store.permissions;

  ngOnInit() {
    // Leitura do valor com ()
    const username = this.store.currentUser()?.username;
  }
}
```

### Em guards (código imperativo)

```typescript
export const authGuard: CanActivateFn = () => {
  const store = inject(AuthStore);
  // Leitura do valor com ()
  return store.isAuthenticated() || inject(Router).createUrlTree(['/auth/login']);
};
```

---

## Regra: quem pode escrever no store?

```
AuthStore._accessToken  ← só AuthService
AuthStore._currentUser  ← só AuthService
AuthStore._loading      ← só AuthService

Componentes             ← apenas leitura (signals readonly)
Guards                  ← apenas leitura
Directives              ← apenas leitura
```

Essa restrição garante que o estado de auth tem uma única fonte de mudanças.
Se um componente precisar atualizar o estado (ex: perfil editado), ele chama
`AuthService.loadCurrentUser()` e o serviço atualiza o store.

---

## Quando usar Signals vs RxJS neste projeto

| Situação | Usar |
|---|---|
| Estado global (auth, user) | Signal (AuthStore) |
| Reatividade em templates | Signal (leitura direta) |
| Chamadas HTTP | RxJS (HttpClient retorna Observable) |
| Converter uma chamada HTTP em Promise | `firstValueFrom(observable$)` |
| Eventos de formulário | ReactiveFormsModule (sem RxJS explícito) |
| Múltiplas chamadas em paralelo | `forkJoin` ou `Promise.all` |
| Polling / streams contínuos | RxJS (`interval`, `switchMap`) |

**Padrão para chamadas HTTP no serviço:**
```typescript
// Não expor Observable para fora do serviço — converter em Promise
async loadCurrentUser(): Promise<void> {
  const user = await firstValueFrom(
    this.http.get<CurrentUser>(`${this.api}/users/me`)
  );
  this.store.setCurrentUser(user);
}
```

**Por que `firstValueFrom` e não `.subscribe()`?**
- Sem gerenciamento de unsubscribe
- Integra naturalmente com `async/await` e `try/catch`
- O Observable do HttpClient completa após a primeira emissão — `firstValueFrom` é seguro

---

## Estado local vs estado global

Nem todo estado vai no AuthStore. O store só tem o que é compartilhado entre rotas.

```
AuthStore (global):
  ✓ accessToken        — interceptor precisa em toda requisição
  ✓ currentUser        — sidebar, topbar, dashboard, profile todos usam
  ✓ loading            — (opcional) para spinner global

Estado local (signal em componente):
  ✓ Lista de usuários paginada  — só UsersComponent usa
  ✓ Formulário em edição        — estado temporário, descartado ao fechar
  ✓ Dialog aberto/fechado       — só o componente pai gerencia
  ✓ Erro de validação HTTP       — só o componente que fez a chamada trata
```

**Signal local em componente:**
```typescript
export class UsersComponent {
  protected readonly users = signal<PageResult<CurrentUser> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  async load(page = 0): Promise<void> {
    this.loading.set(true);
    try {
      const result = await firstValueFrom(
        this.http.get<PageResult<CurrentUser>>(`${this.api}/users?page=${page}&size=20`)
      );
      this.users.set(result);
    } catch {
      this.error.set('Erro ao carregar usuários. Tente novamente.');
    } finally {
      this.loading.set(false);
    }
  }
}
```

---

## Reactivity model do Angular 21

Angular 21 usa o modelo de reatividade baseado em Signals, onde:

1. Signals são lidos durante a execução do template
2. Angular registra quais signals cada template leu
3. Quando um signal muda, apenas os componentes que o leram são re-renderizados
4. Não há `ChangeDetectorRef.markForCheck()` nem `detectChanges()` necessário

Isso significa que `store.currentUser()` no template cria automaticamente uma
dependência — sem `OnPush`, sem `async` pipe, sem nada extra.

```typescript
@Component({
  // Sem ChangeDetectionStrategy.OnPush necessário com Signals
  template: `
    <!-- Automaticamente reativo ao signal -->
    <span>{{ store.currentUser()?.username }}</span>
  `
})
export class TopbarComponent {
  protected readonly store = inject(AuthStore);
}
```
