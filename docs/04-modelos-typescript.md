# 04 — Modelos TypeScript

Todas as interfaces estão mapeadas 1:1 com os DTOs do backend Java.
A referência primária é o código em `../security-spring/src/main/java/.../dtos/`.

---

## Princípios de modelagem

1. **Espelhar o backend exatamente** — sem renomear campos, sem camelCase inventado.
   O Jackson serializa Java `camelCase` → JSON `camelCase`, então `accessToken` vira
   exatamente `accessToken` no JSON.

2. **Type guards para unions** — quando o backend retorna dois formatos distintos para
   o mesmo endpoint, usar type guards em vez de `any` ou casting.

3. **Sem `interface` para requests simples** — um objeto literal TypeScript serve;
   a interface só vale quando o tipo é reutilizado em múltiplos lugares.

4. **`null` explícito** — campos opcionais vindos do backend que podem ser `null`
   devem ser tipados como `string | null`, não `string | undefined`. O JSON serializa
   `null`, não omite o campo.

---

## Respostas do backend

### TokenPairResponse

Retornado por: `POST /auth/login` (sucesso completo), `POST /auth/2fa/verify`,
`POST /auth/refresh`.

```typescript
// Espelha TokenPairResponseDTO.java
export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';   // sempre "Bearer", constante no backend
  expiresIn: number;     // segundos até expirar o access token (padrão: 900 = 15min)
}
```

### TwoFactorChallengeResponse

Retornado por: `POST /auth/login` quando o usuário tem 2FA habilitado.

```typescript
// Espelha TwoFactorChallengeResponseDTO.java
export interface TwoFactorChallengeResponse {
  status: 'PENDING_2FA';
  challengeToken: string;    // JWT temporário, TTL de 5 minutos
  expiresInSeconds: number;  // 300
}
```

### LoginResponse (union type)

O mesmo endpoint `POST /auth/login` retorna um dos dois formatos acima.

```typescript
export type LoginResponse = TokenPairResponse | TwoFactorChallengeResponse;

// Type guard — verificar a presença do campo exclusivo de cada tipo
export function isTwoFactorChallenge(r: LoginResponse): r is TwoFactorChallengeResponse {
  return 'challengeToken' in r;
}

// Uso correto:
const response = await authService.login(req);
if (isTwoFactorChallenge(response)) {
  // TypeScript sabe que response é TwoFactorChallengeResponse aqui
  router.navigate(['/auth/2fa'], { state: { challengeToken: response.challengeToken } });
} else {
  // TypeScript sabe que response é TokenPairResponse aqui
  await authService.handleTokenPair(response);
}
```

> **Por que não usar `response.type === 'PENDING_2FA'`?**
> O backend não tem um campo `type` comum — ele retorna dois DTOs diferentes.
> Checar `'challengeToken' in r` é a forma correta de discriminar sem assumir um campo
> que não existe.

### CurrentUser

Retornado por: `GET /users/me`, `PATCH /users/me`, `POST /users`, `GET /users/{id}`,
`PATCH /users/{id}`.

```typescript
// Espelha UserResponseDTO.java
export interface CurrentUser {
  id: number;
  username: string;
  enabled: boolean;        // false = conta desabilitada pelo admin
  email: string;
  emailVerified: boolean;  // false = aguardando verificação de email de registro
  pendingEmail: string | null;  // preenchido quando email foi alterado mas não confirmado
  roles: string[];         // ex: ["ADMIN", "VIEWER"]
  permissions: string[];   // ex: ["USER_READ", "USER_CREATE", "ROLE_READ"]
}
```

> **Campos críticos para o frontend:**
> - `enabled: false` → conta bloqueada, não consegue logar (backend rejeita)
> - `emailVerified: false` → mostrar banner de aviso no dashboard
> - `pendingEmail !== null` → mostrar banner de confirmação de email no perfil/dashboard

### SessionInfo

Retornado por: `GET /auth/sessions`.

```typescript
// Espelha SessionInfoDTO.java (Java record)
export interface SessionInfo {
  id: number;
  createdAt: string;   // ISO-8601, ex: "2026-05-28T10:00:00Z"
  expiresAt: string;   // ISO-8601
  ipAddress: string;
  userAgent: string;   // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ..."
}
```

### TotpSetupResponse

Retornado por: `POST /auth/2fa/setup`.

```typescript
// Espelha TotpSetupResponseDTO.java
export interface TotpSetupResponse {
  secret: string;      // ex: "JBSWY3DPEHPK3PXP" — base32 para configuração manual
  otpauthUri: string;  // ex: "otpauth://totp/SecuritySpring:admin?secret=...&issuer=SecuritySpring"
}
```

> O `otpauthUri` é o que vai para o QR code. Nunca enviar o `secret` para um serviço
> externo de geração de QR — gerar localmente com `qrcode`.

### TotpConfirmResponse

Retornado por: `POST /auth/2fa/confirm`.

```typescript
// Espelha TotpConfirmResponseDTO.java
export interface TotpConfirmResponse {
  backupCodes: string[];  // ex: ["ABCD-1234", "EFGH-5678", ...]
}
```

> Exibir uma única vez. Não há endpoint para recuperar os backup codes depois.

### PageResult<T>

Retornado por todos os endpoints paginados: `GET /users`, `GET /roles`, `GET /permissions`.

```typescript
// Espelha PageResult<T>.java (generic record)
export interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

### RoleResponse

Retornado por: `GET /roles`, `POST /roles`.

```typescript
// Espelha RoleResponseDTO.java
export interface RoleResponse {
  id: number;
  name: string;
  permissions: string[];  // nomes das permissions
}
```

### PermissionResponse

Retornado por: `GET /permissions`, `POST /permissions`.

```typescript
// Espelha PermissionResponseDTO.java
export interface PermissionResponse {
  id: number;
  name: string;
}
```

---

## Requests ao backend

### Login, Register, etc.

```typescript
export interface LoginRequest {
  username: string;
  password: string;
}

export interface TotpVerifyRequest {
  challengeToken: string;
  code: string;
}

// POST /auth/logout — refreshToken é obrigatório no body
export interface LogoutRequest {
  refreshToken: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  email: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyEmailRequest {
  code: string;
}

export interface TotpConfirmRequest {
  code: string;
}

// DELETE /auth/2fa
export interface TotpDisableRequest {
  currentPassword: string;
  code: string;
}
```

### User requests

```typescript
// POST /users (admin criando usuário)
export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;     // obrigatório pelo backend
  roles?: string[];  // opcional — usuário pode ser criado sem roles
}

// PATCH /users/me (usuário editando próprio perfil)
export interface UpdateOwnProfileRequest {
  username?: string;
  email?: string;
  currentPassword?: string; // obrigatório apenas quando alterando email
}

// PATCH /users/{id} (admin editando usuário)
export interface UpdateUserRequest {
  username?: string;
  email?: string;
}

// PUT /users/me/password
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
```

---

## Onde colocar os tipos

```
src/app/core/auth/models/
├── auth.models.ts     ← TokenPairResponse, CurrentUser, LoginResponse, TotpSetupResponse, etc.
├── session.models.ts  ← SessionInfo
└── page.models.ts     ← PageResult<T>

src/app/features/settings/models/
├── user.models.ts     ← CreateUserRequest, UpdateUserRequest, UpdateOwnProfileRequest
├── role.models.ts     ← RoleResponse, CreateRoleRequest
└── permission.models.ts ← PermissionResponse
```

> Modelos em `core/` são usados em múltiplos lugares.
> Modelos em `features/settings/models/` são específicos daquela feature.

---

## Conversões de data

O backend retorna datas como strings ISO-8601 (`"2026-05-28T10:00:00Z"`).
O frontend usa `Date` do JavaScript para exibição formatada:

```typescript
// Converter string para Date
const date = new Date(session.createdAt);

// Formatar para português
const formatted = date.toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric',
  hour: '2-digit', minute: '2-digit'
});
// Resultado: "28/05/2026, 10:00"
```

Não usar bibliotecas de data (date-fns, moment) para este projeto — o padrão da
plataforma é suficiente.
