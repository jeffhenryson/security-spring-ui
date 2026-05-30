#!/usr/bin/env bash
# Autentica no backend e salva o spec OpenAPI em openapi.json na raiz do projeto.
# Uso: ./scripts/fetch-openapi-spec.sh [usuario] [senha]
# Sem argumentos: usa ADMIN_USER e ADMIN_PASS do ambiente, ou pede no prompt.

set -euo pipefail

API="${BACKEND_URL:-http://localhost:8080}"
USERNAME="${1:-${ADMIN_USER:-}}"
PASSWORD="${2:-${ADMIN_PASS:-}}"

if [[ -z "$USERNAME" ]]; then
  read -rp "Usuário admin: " USERNAME
fi
if [[ -z "$PASSWORD" ]]; then
  read -rsp "Senha: " PASSWORD
  echo
fi

echo "Autenticando em $API..."
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USERNAME\",\"password\":\"$PASSWORD\"}" \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['accessToken'])")

if [[ -z "$TOKEN" ]]; then
  echo "Falha: access token não encontrado. Verifique as credenciais." >&2
  exit 1
fi

echo "Token obtido. Baixando OpenAPI spec..."
curl -s "$API/v3/api-docs" \
  -H "Authorization: Bearer $TOKEN" \
  -o openapi.json

echo "Spec salvo em openapi.json ($(wc -c < openapi.json) bytes)."
echo "Execute agora: npm run generate:api"
