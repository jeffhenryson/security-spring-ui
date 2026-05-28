# SecuritySpring UI v2 — Documentação de Estudo

Conjunto de documentos para aprofundar o entendimento do projeto antes de implementar.
Ler na ordem sugerida para construir o contexto progressivamente.

---

## Ordem de leitura sugerida

| # | Documento | O que você vai aprender |
|---|---|---|
| 01 | [Arquitetura Geral](01-arquitetura.md) | Estrutura de pastas, camadas, regras de dependência, fluxo de boot |
| 02 | [Contratos da API](02-contratos-api.md) | Todos os endpoints com request/response shapes reais do backend |
| 03 | [Fluxos de Autenticação](03-fluxos-auth.md) | Diagramas ASCII de cada fluxo: login, registro, 2FA, reset, etc. |
| 04 | [Modelos TypeScript](04-modelos-typescript.md) | Interfaces mapeadas do backend, type guards, discriminated unions |
| 05 | [Estado com Signals](05-estado-signals.md) | AuthStore, computed signals, quando usar Signals vs RxJS |
| 06 | [RBAC no Frontend](06-rbac-frontend.md) | Permissões por tela, diretivas, guards, sidebar filtering |
| 07 | [Mapa de Rotas](07-rotas.md) | Árvore completa de rotas, guards, lazy loading, navigation state |
| 08 | [Componentes UI](08-componentes.md) | Árvore de componentes, responsabilidades, padrões recorrentes |
| 09 | [Estratégia CSS](09-css-estrategia.md) | Por que Tailwind CLI separado, Material M3 dark, coexistência |
| 10 | [Decisões Técnicas](10-decisoes-tecnicas.md) | ADRs: por que cada tech choice, opções rejeitadas e consequências |

---

## Referências rápidas

**Backend rodando em:** `http://localhost:8080`  
**Frontend dev em:** `http://localhost:4200`  
**Plano de implementação:** [../PLANO.md](../PLANO.md)

**Permissões do sistema:**
```
USER_READ, USER_CREATE, USER_UPDATE, USER_DELETE, USER_STATUS, USER_ROLE_ASSIGN
ROLE_READ, ROLE_CREATE, ROLE_DELETE, ROLE_MANAGE_PERMISSIONS
PERMISSION_READ, PERMISSION_CREATE, PERMISSION_DELETE
```

**Token storage:**
- Access token → memória (AuthStore signal)
- Refresh token → `localStorage['ss_refresh_token']`

**Discriminar login response:**
```typescript
// Checar presença de 'challengeToken', não um campo 'type'
if ('challengeToken' in response) { /* 2FA */ } else { /* tokens completos */ }
```

**Endpoints que o plano original tinha errado:**
- `POST /auth/logout` exige `{ refreshToken }` no body (não `{}`)
- Ativar 2FA: `POST /auth/2fa/confirm` (não `/auth/2fa/enable`)
- Desativar 2FA: `DELETE /auth/2fa` com body `{ currentPassword, code }`
- Perfil: `PATCH /users/me` (não `PATCH /users/{id}`)
