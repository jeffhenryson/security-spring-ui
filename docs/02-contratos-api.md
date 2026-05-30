# 02 — Contratos da API

Sincronizado com `openapi.json` em 2026-05-30.  
**Fonte de verdade:** `openapi.json` na raiz do projeto (gerado do backend).

**Base URL:** `http://localhost:8080`  
**Auth:** `Authorization: Bearer <accessToken>` — exceto rotas marcadas como Public  
**Seed dev:** `admin / Jeff@180203` (ROLE_ADMIN) · `user / User@dev1` (ROLE_USER)

---

## Auth — `/auth`

### POST `/auth/login` — Public
```json
// Request
{ "username": "string", "password": "string" }

// Response 200 — login direto
{ "accessToken": "...", "refreshToken": "...", "tokenType": "Bearer", "expiresIn": 900 }

// Response 200 — 2FA pendente
{ "status": "PENDING_2FA", "challengeToken": "...", "expiresInSeconds": 300 }

// Response 401 — credenciais inválidas
```
Cookie HttpOnly `refreshToken` setado automaticamente. Campo no body é fallback.

### POST `/auth/2fa/verify` — Public
```json
{ "challengeToken": "string", "code": "string (6 dígitos)" }
// Response 200 → TokenPairResponse
```

### POST `/auth/refresh` — Public
```json
{ "refreshToken": "string" }  // opcional se cookie HttpOnly presente
// Response 200 → TokenPairResponse
// Response 401 → token inválido/expirado/já usado (theft detection)
```
Sempre enviar `withCredentials: true`.

### POST `/auth/logout` — Public
```json
{ "refreshToken": "string" }  // opcional
// Response 204
```

### GET `/auth/sessions` — Autenticado
```json
// Response 200
[{ "id": 1, "createdAt": "ISO", "expiresAt": "ISO", "ipAddress": "string|null", "userAgent": "string|null" }]
```

### DELETE `/auth/sessions` — Autenticado
Revoga TODAS as sessões. Response 204.

### DELETE `/auth/sessions/{id}` — Autenticado
Revoga sessão por ID (Long). Response 204 / 404.

### POST `/auth/forgot-password` — Public
```json
{ "email": "string (email)" }
// Response 204 (sempre — sem email disclosure)
```

### POST `/auth/reset-password` — Public
```json
{ "token": "string", "newPassword": "string (PasswordPolicy)" }
// Response 204 / 400 (token inválido ou senha fraca)
```

### POST `/auth/confirm-email-change` — Public
```json
{ "code": "string ([A-Z0-9]{12})" }
// Response 204 / 400
```

---

## Registro — `/auth`

### POST `/auth/register` — Public
```json
{ "username": "string (3-80)", "password": "string (PasswordPolicy)", "email": "string (email, max 254)" }
// Response 201 / 409 (username ou email já existe)
```
Conta criada com `enabled=false`. Email de verificação enviado automaticamente.

### POST `/auth/verify-email` — Public
```json
{ "code": "string ([A-Z0-9]{12})" }
// Response 204 (ativa conta) / 400
```

### POST `/auth/resend-verification` — Public
```json
{ "email": "string (email)" }
// Response 204 (sempre). Cooldown 60s por email.
```

---

## 2FA TOTP — `/auth/2fa`

### GET `/auth/2fa/status` — Autenticado
```json
{ "enabled": true }
```

### POST `/auth/2fa/setup` — Autenticado
```json
// Response 200
{ "secret": "string", "otpauthUri": "otpauth://totp/..." }
// 409 se já ativo
```

### POST `/auth/2fa/confirm` — Autenticado
```json
{ "code": "string (exatamente 6 dígitos)" }
// Response 200: { "backupCodes": ["string", ...] }
// 400 código inválido
```

### DELETE `/auth/2fa` — Autenticado
```json
{ "currentPassword": "string", "code": "string" }
// Response 204 / 400
```

### POST `/auth/2fa/backup-codes/regenerate` — Autenticado
```json
{ "currentPassword": "string" }
// Response 200: { "backupCodes": ["string", ...] }
// 400 senha errada ou 2FA não ativo
```

---

## Usuários — `/users`

### GET `/users/me` — Autenticado → UserResponse

### PATCH `/users/me` — Autenticado
```json
{ "username": "string (3-80)", "email": "string (email, max 254)", "currentPassword": "string (obrigatório ao trocar email)" }
// Response 200 → UserResponse
// Se email mudou: pendingEmail setado, código enviado → /auth/confirm-email-change
// 409 username/email em uso
```

### PUT `/users/me/password` — Autenticado
```json
{ "currentPassword": "string", "newPassword": "string (PasswordPolicy)" }
// Response 204 / 400
```

### GET `/users` — Permissão: USER_READ
```
Query: search, enabled (boolean), page, size (máx 100, default 20)
Response 200 → PagedUserResponse
```

### POST `/users` — Permissão: USER_CREATE
```json
{ "username": "string (3-80)", "password": "string (PasswordPolicy)", "email": "string (email, opcional)", "roles": ["ROLE_USER"] }
// Response 201 + Location / 409
```

### GET `/users/{id}` — Permissão: USER_READ → UserResponse / 404

### PATCH `/users/{id}` — Permissão: USER_UPDATE
```json
{ "username": "string (3-80)", "email": "string" }
// Response 200 → UserResponse / 404 / 409
```

### PUT `/users/{id}/enable` — Permissão: USER_STATUS → 204 / 404
### PUT `/users/{id}/disable` — Permissão: USER_STATUS → 204 / 404
### DELETE `/users/{id}` — Permissão: USER_DELETE → 204 / 404
### POST `/users/{username}/roles/{roleName}` — Permissão: USER_ROLE_ASSIGN → 204 / 404
### DELETE `/users/{username}/roles/{roleName}` — Permissão: USER_ROLE_ASSIGN → 204 / 404

---

## Roles — `/roles`

### GET `/roles` — Permissão: ROLE_READ
```
Query: search (opcional), page, size
Response 200 → PagedRoleResponse
```

### POST `/roles` — Permissão: ROLE_CREATE
```json
{ "name": "string (3-80)" }
// Response 201 + Location / 409
```

### DELETE `/roles/{name}` — Permissão: ROLE_DELETE → 204 / 404
### POST `/roles/{roleName}/permissions/{permissionName}` — Permissão: ROLE_MANAGE_PERMISSIONS → 204 / 404
### DELETE `/roles/{roleName}/permissions/{permissionName}` — Permissão: ROLE_MANAGE_PERMISSIONS → 204 / 404

---

## Permissões — `/permissions`

### GET `/permissions` — Permissão: PERMISSION_READ
```
Query: page, size
Response 200 → PagedPermissionResponse
```
> Sem parâmetro `search` — backend não filtra por nome neste endpoint.

### POST `/permissions` — Permissão: PERMISSION_CREATE
```json
{ "name": "string (3-80)" }
// Response 201 + Location / 409
```

### DELETE `/permissions/{name}` — Permissão: PERMISSION_DELETE → 204 / 404

---

## Audit Logs — `/audit-logs`

### GET `/audit-logs` — Permissão: AUDIT_READ
```
Query: userId (string, opcional), action (string, opcional), page, size
Response 200 → PagedAuditLogResponse
```
> Parâmetro `userId` (não `username`). Sem `from`/`to` de data.  
> Sem endpoint `/audit-logs/actions` — lista de ações é estática no frontend (`KNOWN_ACTIONS`).

---

## Stats — `/stats`

### GET `/stats` — Permissões: USER_READ AND ROLE_READ
```json
{ "totalUsers": 100, "activeUsers": 95, "totalRoles": 3, "totalPermissions": 25 }
```
> `disabledUsers` removido. Frontend calcula `totalUsers - activeUsers`.

---

## Tipos TypeScript

```typescript
interface TokenPairResponse {
  accessToken: string;
  refreshToken?: string;
  tokenType: 'Bearer';
  expiresIn: number;
}

interface TwoFactorChallengeResponse {
  status: 'PENDING_2FA';
  challengeToken: string;
  expiresInSeconds: number;
}

interface UserResponse {
  id: number;
  username: string;
  enabled: boolean;
  email: string | null;
  emailVerified: boolean;
  pendingEmail?: string | null;
  roles: string[];
  permissions: string[];
}

interface RoleResponse {
  id: number;
  name: string;
  permissions: string[];
}

interface PermissionResponse {
  id: number;
  name: string;
}

interface SessionInfo {
  id: number;
  createdAt: string;
  expiresAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

interface StatsResponse {
  totalUsers: number;
  activeUsers: number;
  totalRoles: number;
  totalPermissions: number;
}

interface AuditLogEntry {
  id: number;
  who: string;
  action: string;
  target: string | null;
  ipAddress: string | null;
  timestamp: string;
}

interface PageResult<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
```

---

## PasswordPolicy

```
MIN_LENGTH: 8 | MAX_LENGTH: 120
Regexp: ^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).+$
Exige: 1 maiúscula + 1 minúscula + 1 dígito + 1 especial
```

---

## Permissões disponíveis

| Permissão | Descrição |
|-----------|-----------|
| USER_CREATE | Criar conta de usuário |
| USER_READ | Listar e ver usuários |
| USER_UPDATE | Atualizar dados básicos |
| USER_DELETE | Deletar conta |
| USER_ROLE_ASSIGN | Atribuir/remover roles |
| USER_STATUS | Ativar/desativar conta |
| ROLE_CREATE | Criar role |
| ROLE_READ | Listar roles |
| ROLE_DELETE | Deletar role |
| ROLE_MANAGE_PERMISSIONS | Atribuir/remover permissões de roles |
| PERMISSION_CREATE | Criar permissão |
| PERMISSION_READ | Listar permissões |
| PERMISSION_DELETE | Deletar permissão |
| AUDIT_READ | Ver audit logs |

---

## Convenções

- Roles sempre com prefixo `ROLE_` (ex: `ROLE_ADMIN`, nunca `ADMIN`)
- Códigos de verificação: `[A-Z0-9]{12}` — exatamente 12 chars
- Código TOTP: exatamente 6 dígitos numéricos
- Timestamps: ISO-8601 UTC
- Paginação começa em `page=0`
- 400 validação · 401 não autenticado · 403 sem permissão · 404 não encontrado · 409 conflito
