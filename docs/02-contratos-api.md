# 02 — Contratos da API

Todos os contratos foram extraídos diretamente do código Java do backend (`../security-spring`).
Esta é a fonte de verdade — não documentação gerada, não suposição.

**Base URL:** `http://localhost:8080`  
**Auth:** Bearer JWT no header `Authorization: Bearer <accessToken>`

---

## Auth — `/auth`

### POST `/auth/login`

**Sem autenticação.** Retorna tokens completos OU challenge de 2FA.

**Request:**
```json
{ "username": "admin", "password": "Senha@123" }
```

**Response 200 — login completo:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

**Response 200 — 2FA necessário:**
```json
{
  "status": "PENDING_2FA",
  "challengeToken": "eyJ...",
  "expiresInSeconds": 300
}
```

> **Discriminação:** checar presença do campo `challengeToken`. Se existir → 2FA pending.
> Não confiar no campo `status` como discriminador — verificar o campo que identifica o tipo.

**Response 401:** credenciais inválidas (mensagem genérica — nunca revelar qual campo)

---

### POST `/auth/2fa/verify`

**Sem autenticação.** Completa o login após challenge 2FA.

**Request:**
```json
{ "challengeToken": "eyJ...", "code": "123456" }
```

**Response 200:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 900
}
```

**Response 400:** código inválido ou challenge expirado

---

### POST `/auth/refresh`

**Sem autenticação.** Rotaciona o refresh token.

**Request:**
```json
{ "refreshToken": "eyJ..." }
```

**Response 200:** mesmo shape de `TokenPairResponse`  
**Response 401:** refresh inválido ou expirado → usuário precisa logar novamente

> Após refresh bem-sucedido, o refresh token antigo é invalidado (rotação de token).
> Salvar o novo refreshToken no localStorage.

---

### POST `/auth/logout`

**Sem autenticação no header** (o refresh token está no body).

**Request:** ← obrigatório, sem ele o backend não sabe qual token revogar
```json
{ "refreshToken": "eyJ..." }
```

**Response 204:** revogado com sucesso

---

### GET `/auth/sessions`

**Requer JWT.** Lista sessões ativas do usuário logado.

**Response 200:**
```json
[
  {
    "id": 1,
    "createdAt": "2026-05-28T10:00:00Z",
    "expiresAt": "2026-06-28T10:00:00Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "Mozilla/5.0 ..."
  }
]
```

---

### DELETE `/auth/sessions`

**Requer JWT.** Revoga todos os refresh tokens do usuário (logout de todos os dispositivos).

**Response 204:** todas as sessões encerradas

---

### POST `/auth/forgot-password`

**Sem autenticação.** Inicia recuperação de senha.

**Request:**
```json
{ "email": "user@example.com" }
```

**Response 204:** sempre, independente de o email existir ou não (sem leak de usuários)

---

### POST `/auth/reset-password`

**Sem autenticação.** Define nova senha com token recebido por email.

**Request:**
```json
{ "token": "uuid-do-email", "newPassword": "NovaSenha@123" }
```

**Response 204:** senha redefinida  
**Response 400:** token inválido, expirado, ou senha fraca

---

### POST `/auth/confirm-email-change`

**Sem autenticação.** Confirma troca de email com código enviado ao novo endereço.

**Request:**
```json
{ "code": "A1B2C3D4E5F6" }
```

> O código tem **12 caracteres alfanuméricos**. A rota frontend
> `/auth/confirm-email-change?code=A1B2C3D4E5F6` recebe o código via query param e envia no body.

**Response 204:** email atualizado  
**Response 400:** código inválido ou expirado

---

## Registro — `/auth` (RegistrationController)

### POST `/auth/register`

**Sem autenticação.** Autoregistro — cria conta desabilitada e envia código de verificação.

**Request:**
```json
{ "username": "joao", "password": "Senha@123", "email": "joao@example.com" }
```

**Response 201:** conta criada — verificar email  
**Response 409:** username ou email já cadastrado

> Validações no backend: username 3-80 chars, email válido, password segura.
> Conta fica `enabled=false` até o email ser verificado.

---

### POST `/auth/verify-email`

**Sem autenticação.** Ativa a conta usando código enviado no email de registro.

**Request:**
```json
{ "code": "A1B2C3D4E5F6" }
```

> O código tem **12 caracteres alfanuméricos** (gerado pelo backend). A rota frontend
> `/auth/verify-email?code=A1B2C3D4E5F6` recebe o código via query param e envia no body.

**Response 204:** email verificado, conta ativada  
**Response 400:** código inválido ou expirado

---

### POST `/auth/resend-verification`

**Sem autenticação.** Reenvia código de verificação. Sempre retorna 204.

**Request:**
```json
{ "email": "joao@example.com" }
```

**Response 204:** sempre (sem leak de cadastros ou estado da conta)

---

## 2FA — `/auth/2fa` (TotpController)

### POST `/auth/2fa/setup`

**Requer JWT.** Inicia configuração do 2FA.

**Response 200:**
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "otpauthUri": "otpauth://totp/SecuritySpring:admin?secret=JBSWY3...&issuer=SecuritySpring"
}
```

> O `otpauthUri` é usado para gerar o QR code localmente via biblioteca `qrcode`.
> O `secret` é exibido em texto como alternativa ao QR.

**Response 409:** 2FA já está ativado

---

### POST `/auth/2fa/confirm`

**Requer JWT.** Confirma o primeiro código TOTP e ativa o 2FA. Retorna backup codes.

**Request:**
```json
{ "code": "123456" }
```

**Response 200:**
```json
{
  "backupCodes": ["ABCD-1234", "EFGH-5678", "IJKL-9012", "MNOP-3456", "QRST-7890"]
}
```

> Backup codes são exibidos uma única vez. O usuário deve salvá-los.

**Response 400:** código inválido

---

### DELETE `/auth/2fa`

**Requer JWT.** Desativa 2FA. Exige senha e código para evitar bypass.

**Request:**
```json
{ "currentPassword": "Senha@123", "code": "123456" }
```

**Response 204:** 2FA desativado  
**Response 400:** senha ou código inválido

---

## Usuários — `/users`

### GET `/users/me`

**Requer JWT.** Dados do usuário autenticado.

**Response 200:**
```json
{
  "id": 1,
  "username": "admin",
  "enabled": true,
  "email": "admin@example.com",
  "emailVerified": true,
  "pendingEmail": null,
  "roles": ["ADMIN"],
  "permissions": ["USER_READ", "USER_CREATE", "USER_DELETE", "ROLE_READ", "ROLE_CREATE"]
}
```

> `pendingEmail`: preenchido quando o usuário solicitou troca de email mas ainda não confirmou.
> Usar para exibir banner de alerta no perfil e dashboard.

---

### PATCH `/users/me`

**Requer JWT.** Atualiza dados do próprio perfil.

**Request:** (todos os campos opcionais; `currentPassword` é obrigatório apenas ao alterar o email)
```json
{ "username": "novo-username", "email": "novo@email.com", "currentPassword": "Senha@123" }
```

**Response 200:** `UserResponseDTO` atualizado  
**Response 409:** username ou email já existe

> Se o email for alterado, o backend envia código de confirmação ao novo endereço.
> O email atual permanece ativo até a confirmação. `pendingEmail` é preenchido.

---

### PUT `/users/me/password`

**Requer JWT.** Troca a senha do usuário autenticado.

**Request:**
```json
{ "currentPassword": "SenhaAtual@123", "newPassword": "NovaSenha@456" }
```

**Response 204:** senha alterada  
**Response 400:** senha atual incorreta

---

### GET `/users`

**Requer `USER_READ`.** Lista usuários paginado.

**Query params:** `page` (default: 0), `size` (default: 20, max: 100)

**Response 200:**
```json
{
  "content": [ /* array de UserResponseDTO */ ],
  "page": 0,
  "size": 20,
  "totalElements": 42,
  "totalPages": 3
}
```

---

### POST `/users`

**Requer `USER_CREATE`.** Cria novo usuário (admin criando, não autoregistro).

**Request:**
```json
{
  "username": "joao",
  "password": "Senha@123",
  "email": "joao@example.com",
  "roles": ["VIEWER"]
}
```

**Response 201:** `UserResponseDTO` criado  
**Response 409:** username já existe

---

### GET `/users/{id}`

**Requer `USER_READ`.** Busca usuário por id.

**Response 200:** `UserResponseDTO`  
**Response 404:** não encontrado

---

### PATCH `/users/{id}`

**Requer `USER_UPDATE`.** Edita dados básicos do usuário (pelo admin).

**Request:**
```json
{ "username": "novo-username", "email": "novo@email.com" }
```

**Response 200:** `UserResponseDTO` atualizado

---

### DELETE `/users/{id}`

**Requer `USER_DELETE`.** Remove o usuário permanentemente.

**Response 204:** removido

---

### PUT `/users/{id}/enable`

**Requer `USER_STATUS`.** Ativa uma conta desabilitada.

**Response 204:** conta ativada

---

### PUT `/users/{id}/disable`

**Requer `USER_STATUS`.** Desativa uma conta sem excluir.

**Response 204:** conta desativada

---

### POST `/users/{username}/roles/{roleName}`

**Requer `USER_ROLE_ASSIGN`.** Atribui uma role ao usuário.

**Response 204:** atribuída  
**Response 404:** usuário ou role não encontrado

> **⚠ PENDENTE NO BACKEND:** `DELETE /users/{username}/roles/{roleName}` ainda não implementado.
> A conexão frontend será feita após o backend disponibilizar o endpoint.

### DELETE `/users/{username}/roles/{roleName}` *(pendente — backend em desenvolvimento)*

**Requer `USER_ROLE_ASSIGN`.** Remove uma role do usuário.

**Response esperado:** `204` sem body  
**Response 404:** usuário ou role não encontrado

```typescript
// frontend — implementar quando backend estiver pronto
removeRoleFromUser(username: string, roleName: string): Promise<void> {
  return firstValueFrom(
    this.http.delete<void>(`/users/${username}/roles/${roleName}`)
  );
}
```

---

## Roles — `/roles`

### GET `/roles`

**Requer `ROLE_READ`.** Lista roles paginado.

**Query params:** `page`, `size`

**Response 200:**
```json
{
  "content": [
    { "id": 1, "name": "ADMIN", "permissions": ["USER_READ", "USER_CREATE", "ROLE_READ"] },
    { "id": 2, "name": "VIEWER", "permissions": ["USER_READ"] }
  ],
  "page": 0, "size": 20, "totalElements": 2, "totalPages": 1
}
```

---

### POST `/roles`

**Requer `ROLE_CREATE`.** Cria nova role.

**Request:**
```json
{ "name": "GERENTE" }
```

**Response 201:** `RoleResponseDTO`  
**Response 409:** role já existe

---

### DELETE `/roles/{name}`

**Requer `ROLE_DELETE`.** Remove role pelo nome.

**Response 204:** removida  
**Response 404:** não encontrada

---

### POST `/roles/{roleName}/permissions/{permissionName}`

**Requer `ROLE_MANAGE_PERMISSIONS`.** Atribui uma permission à role.

**Response 204:** atribuída

---

### DELETE `/roles/{roleName}/permissions/{permissionName}`

**Requer `ROLE_MANAGE_PERMISSIONS`.** Remove uma permission da role.

**Response 204:** removida

---

## Permissions — `/permissions`

### GET `/permissions`

**Requer `PERMISSION_READ`.** Lista permissions paginado.

**Response 200:**
```json
{
  "content": [
    { "id": 1, "name": "USER_READ" },
    { "id": 2, "name": "USER_CREATE" }
  ],
  "page": 0, "size": 20, "totalElements": 10, "totalPages": 1
}
```

---

### POST `/permissions`

**Requer `PERMISSION_CREATE`.** Cria nova permission.

**Request:**
```json
{ "name": "RELATORIO_READ" }
```

**Response 201:** `PermissionResponseDTO`  
**Response 409:** permission já existe

---

### DELETE `/permissions/{name}`

**Requer `PERMISSION_DELETE`.** Remove permission pelo nome.

**Response 204:** removida

---

## Tabela resumida de permissões necessárias

| Ação | Permissão |
|---|---|
| Ver lista de usuários | `USER_READ` |
| Criar usuário | `USER_CREATE` |
| Editar dados de usuário | `USER_UPDATE` |
| Excluir usuário | `USER_DELETE` |
| Ativar/desativar usuário | `USER_STATUS` |
| Atribuir role a usuário | `USER_ROLE_ASSIGN` |
| Ver roles | `ROLE_READ` |
| Criar role | `ROLE_CREATE` |
| Excluir role | `ROLE_DELETE` |
| Gerenciar permissions de uma role | `ROLE_MANAGE_PERMISSIONS` |
| Ver permissions | `PERMISSION_READ` |
| Criar permission | `PERMISSION_CREATE` |
| Excluir permission | `PERMISSION_DELETE` |

---

## Tratamento de erros HTTP

| Status | Situação | Tratamento no frontend |
|---|---|---|
| 400 | Validação falhou / token inválido | Exibir mensagem do campo `message` da resposta |
| 401 | Token expirado ou inválido | Interceptor tenta refresh; se falhar → redirect /auth/login |
| 403 | Sem permissão | Redirecionar para dashboard (não expor que a rota existe) |
| 404 | Recurso não encontrado | Exibir mensagem inline no componente |
| 409 | Conflito (username/email duplicado) | Exibir erro inline no formulário |
| 500 | Erro interno do servidor | Toast genérico "Erro interno, tente novamente" |
