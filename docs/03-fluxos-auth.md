# 03 — Fluxos de Autenticação

Todos os fluxos que o frontend precisa suportar, com os estados intermediários e
decisões de roteamento.

---

## Fluxo 1 — Boot da aplicação (APP_INITIALIZER)

Executado automaticamente antes de qualquer tela ser renderizada.

```
BROWSER ABRE A APP
        │
        ▼
AuthService.initSession()
        │
        ├─ localStorage['ss_refresh_token'] existe?
        │         │
        │       NÃO ──► store permanece vazio → Router avalia a rota
        │         │
        │        SIM
        │         │
        │         ▼
        │   POST /auth/refresh
        │         │
        │    ┌────┴────┐
        │  200 OK    401/500
        │    │          │
        │    ▼          ▼
        │  setAccessToken()   store.clear()
        │  setRefreshToken()  localStorage limpo
        │  GET /users/me      │
        │  setCurrentUser()   │
        │    │                │
        └────┴────────────────┘
                   │
                   ▼
          Angular Router avalia rota atual
          ┌────────────────────────────────┐
          │ Rota protegida + autenticado   │ → renderiza componente
          │ Rota protegida + não-autent.   │ → redirect /auth/login
          │ Rota pública                   │ → renderiza componente
          └────────────────────────────────┘
```

**Por que APP_INITIALIZER?** O Angular espera todos os initializers terminarem antes de
renderizar qualquer rota. Isso garante que `AuthStore` está populado antes dos guards
e componentes rodarem — sem flicker de tela de login antes do redirect.

---

## Fluxo 2 — Login (sem 2FA)

```
/auth/login
     │
     ▼
Usuário preenche username + password
     │
     ▼
AuthService.login(req)
     │
     ▼
POST /auth/login
     │
  ┌──┴───────┐
200 OK      401
  │           │
  ▼           ▼
resposta tem  exibir erro genérico
challengeToken? "Usuário ou senha inválidos"
  │
  ├── SIM ──────────────────────────────► Fluxo 3 (2FA)
  │
  └── NÃO
        │
        ▼
  handleTokenPair(response)
        │
        ├── store.setAccessToken(accessToken)
        ├── localStorage.setItem('ss_refresh_token', refreshToken)
        └── GET /users/me → store.setCurrentUser(user)
                │
                ▼
        router.navigate(['/app/dashboard'])
```

---

## Fluxo 3 — Login com 2FA

```
(continuando do Fluxo 2, quando challengeToken está presente)
        │
        ▼
router.navigate(['/auth/2fa'], { state: { challengeToken } })
        │
        ▼
TwoFactorComponent inicializa
        │
        ├── Lê challengeToken do router.getCurrentNavigation()?.extras?.state
        │         │
        │       ausente? ──► router.navigate(['/auth/login'])
        │
        ▼
Usuário digita código TOTP de 6 dígitos
        │
        ▼
AuthService.verify2FA({ challengeToken, code })
        │
        ▼
POST /auth/2fa/verify
        │
  ┌─────┴──────┐
200 OK        400
  │              │
  ▼              ▼
handleTokenPair() "Código inválido ou expirado"
  │
  ▼
router.navigate(['/app/dashboard'])
```

**Detalhe importante:** o `challengeToken` é um JWT temporário que expira em 5 minutos
(300 segundos). Se o usuário demorar, o backend retorna 400 e o frontend deve sugerir
fazer o login novamente.

---

## Fluxo 4 — Registro de nova conta

```
/auth/register
     │
     ▼
Usuário preenche username + email + password + confirmação
     │
     ▼
Validação client-side:
  - Senha e confirmação coincidem?
  - Formato de email?
     │
     ▼
POST /auth/register
     │
  ┌──┴──────────┐
201 Created    409
  │               │
  ▼               ▼
"Conta criada!   "Usuário ou email
 Verifique seu    já cadastrado"
 email para
 ativar a conta."
  │
  ▼
Link "Fazer login" → /auth/login

(Usuário recebe email com link: /auth/verify-email?code=XXXXX)
```

---

## Fluxo 5 — Verificação de email (ativação de conta)

```
Usuário clica no link do email:
  http://localhost:4200/auth/verify-email?code=XXXXX
        │
        ▼
VerifyEmailComponent inicializa
        │
        ├── Lê param 'code' da URL
        │
        ├── code presente?
        │     │
        │    SIM ──► POST /auth/verify-email { code }
        │                  │
        │             ┌────┴────┐
        │           204       400
        │             │         │
        │             ▼         ▼
        │   "Email verificado!"  "Código inválido"
        │   "Você já pode        "ou expirado."
        │    fazer login."       link para reenvio
        │     │
        │    NÃO ──► exibir formulário de código manual
        │
        ▼
Link para /auth/login
```

---

## Fluxo 6 — Reenvio de verificação

```
/auth/login (link "Reenviar verificação")
     │
     ▼
Formulário com campo de email
     │
     ▼
POST /auth/resend-verification { email }
     │
     ▼
Sempre exibe: "Se o email estiver cadastrado,
               um novo código foi enviado."
(Backend sempre retorna 204 — sem leak de cadastros)
```

---

## Fluxo 7 — Recuperação de senha

```
/auth/login
  └── link "Esqueceu a senha?"
              │
              ▼
/auth/forgot-password
              │
              ▼
Campo de email
              │
              ▼
POST /auth/forgot-password { email }
              │
              ▼
Sempre exibe: "Se o email estiver cadastrado,
               você receberá um link de redefinição."
(Backend sempre retorna 204 — segurança)

(Usuário recebe email com link: /auth/reset-password?token=XXXXX)
              │
              ▼
/auth/reset-password?token=XXXXX
              │
              ▼
Campos: nova senha + confirmação
              │
              ▼
POST /auth/reset-password { token, newPassword }
              │
        ┌─────┴──────┐
       204           400
        │              │
        ▼              ▼
"Senha redefinida!"  "Token inválido ou expirado."
link para login      "Solicite um novo link."
```

---

## Fluxo 8 — Auto-refresh pelo interceptor (transparente ao usuário)

```
Componente faz requisição HTTP qualquer
        │
        ▼
authInterceptor anexa: Authorization: Bearer <accessToken>
        │
        ▼
Requisição enviada ao backend
        │
   ┌────┴────┐
  200      401
   │          │
   ▼          └── é rota /auth/* ?
resposta            │
normal             SIM ──► throwError (não tenta refresh em rotas de auth)
                    │
                   NÃO
                    │
                    ▼
             AuthService.initSession()
             POST /auth/refresh { refreshToken }
                    │
               ┌────┴────┐
             200         401/500
               │              │
               ▼              ▼
         novo accessToken  store.clear()
         retry da req      router → /auth/login
         original
```

---

## Fluxo 9 — Logout

```
Topbar: usuário clica "Sair"
        │
        ▼
AuthService.logout()
        │
        ├── Lê refreshToken do localStorage
        │
        ├── POST /auth/logout { refreshToken }  ← revoga o token no backend
        │   (se falhar, segue em frente de qualquer forma — finally)
        │
        ├── store.clear()  ← limpa accessToken + currentUser
        │
        ├── localStorage.removeItem('ss_refresh_token')
        │
        └── router.navigate(['/auth/login'])
```

**Por que enviar o refreshToken no logout?** Para que o backend possa revogar o token
específico. Sem isso, o backend não sabe qual das sessões ativas encerrar.

---

## Fluxo 10 — Troca de email (usuário já logado)

```
Settings > Perfil
        │
        ▼
Usuário altera campo de email + informa senha atual
        │
        ▼
PATCH /users/me { email: "novo@email.com", currentPassword: "..." }
        │
        ▼
Backend: cria `pendingEmail`, envia código ao NOVO endereço
        │
        ▼
Response 200 com pendingEmail preenchido
        │
        ▼
Frontend: atualiza store (loadCurrentUser)
        │
        ▼
Banner: "Confirmação pendente para novo@email.com — verifique seu email."

(Usuário clica no link do email: /auth/confirm-email-change?code=XXXXX)
        │
        ▼
ConfirmEmailChangeComponent
        │
        ▼
POST /auth/confirm-email-change { code }
        │
   ┌────┴────┐
  204       400
   │           │
   ▼           ▼
"Email atualizado!"  "Código inválido."
loadCurrentUser()    (pendingEmail permanece)
pendingEmail = null
```

---

## Fluxo 11 — Configuração do 2FA (primeiro setup)

```
Settings > Segurança
        │
        ▼
Botão "Configurar 2FA"
        │
        ▼
POST /auth/2fa/setup
        │
   ┌────┴────┐
  200       409
   │           │
   ▼           ▼
{ secret,    "2FA já está ativado"
  otpauthUri }
   │
   ▼
Gerar QR code localmente:
  QRCode.toCanvas(canvas, otpauthUri)
   │
   ▼
Exibir QR + secret em texto
   │
   ▼
Campo para código TOTP (para confirmar que o app leu o QR)
   │
   ▼
POST /auth/2fa/confirm { code }
   │
┌──┴──────┐
200      400
│           │
▼           ▼
{ backupCodes }  "Código inválido"
│
▼
Exibir backup codes — lista única, nunca mais recuperável
Botão "Salvei meus códigos"
│
▼
2FA ativo ✓
```

---

## Resumo de rotas de auth e seus propósitos

| Rota | Propósito | Trigger |
|---|---|---|
| `/auth/login` | Login principal | Navegação manual / redirect de guard |
| `/auth/2fa` | Código TOTP no login | Redirect do login quando 2FA pending |
| `/auth/register` | Criar nova conta | Link no login |
| `/auth/verify-email?code=X` | Ativar conta por email | Link no email de registro |
| `/auth/forgot-password` | Solicitar reset de senha | Link no login |
| `/auth/reset-password?token=X` | Definir nova senha | Link no email de reset |
| `/auth/confirm-email-change?code=X` | Confirmar novo email | Link no email de confirmação |
