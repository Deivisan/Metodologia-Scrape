#!/bin/bash
#=============================================================================
# verify_dod.sh — DevOpsDays FSA Verificação
# Verifica: nginx (host), localstack (container), aws cli (host), repo (host)
#
# Uso: sudo ./verify_dod.sh
#=============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DEVOPS_USER="devopsdays"
ERRORS=0
SUCCESS=0

info()  { echo -e "${CYAN}[verify]${NC} $*"; ((SUCCESS++)); }
ok()    { echo -e "${GREEN}✓${NC} $*"; ((SUCCESS++)); }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; ((ERRORS++)); }

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  DevOpsDays FSA — Verificação${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 1. Usuário ────────────────────────────────────────────────────────────
info "Usuário devopsdays..."
id "$DEVOPS_USER" &>/dev/null && ok "Usuário existe" || fail "Usuário não existe"

# ── 2. Docker ─────────────────────────────────────────────────────────────
info "Docker..."
command -v docker &>/dev/null && ok "Docker instalado" || fail "Docker não instalado"
systemctl is-active --quiet docker && ok "Docker daemon ativo" || warn "Docker daemon inativo"

# ── 3. LocalStack (container) ─────────────────────────────────────────────
info "LocalStack (container)..."
docker ps --format "{{.Names}}" 2>/dev/null | grep -q dod-localstack && ok "Container dod-localstack rodando" || warn "Container não encontrado"

if curl -s --max-time 5 http://localhost:4566/_localstack/health 2>/dev/null | grep -q '"features"'; then
    ok "LocalStack respondendo"
else
    warn "LocalStack ainda subindo ou indisponível"
fi

# ── 4. Nginx (host) ──────────────────────────────────────────────────────
info "Nginx (host)..."
systemctl is-active --quiet nginx && ok "Nginx ativo" || fail "Nginx inativo"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
[ "$HTTP_CODE" != "000" ] && ok "Nginx respondendo HTTP $HTTP_CODE" || fail "Porta 80 não responde"

# ── 5. AWS CLI (host) ─────────────────────────────────────────────────────
info "AWS CLI (host)..."
AWS_BIN="/home/$DEVOPS_USER/.local/bin/aws"
[ -x "$AWS_BIN" ] && ok "AWS CLI em $AWS_BIN" || fail "AWS CLI não encontrado"

if [ -x "$AWS_BIN" ]; then
    RESULT=$(AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 \
        "$AWS_BIN" --endpoint-url=http://localhost:4566 sts get-caller-identity 2>/dev/null || true)
    echo "$RESULT" | grep -q "UserId" && ok "AWS CLI conecta no LocalStack" || warn "AWS CLI sem acesso ao LocalStack"
fi

# ── 6. Repositório (host) ─────────────────────────────────────────────────
info "Repositório (host)..."
REPO_DIR="/home/$DEVOPS_USER/dod-fsa"
[ -d "$REPO_DIR" ] && ok "Repo existe em $REPO_DIR" || fail "Repo não encontrado"

# ── Resumo ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  RESUMO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓ Sucessos: $SUCCESS${NC}"
[ "$ERRORS" -gt 0 ] && echo -e "${RED}✗ Erros:    $ERRORS${NC}"
echo ""

[ "$ERRORS" -eq 0 ] && echo -e "${GREEN}🎉 Tudo OK!${NC}" || echo -e "${YELLOW}⚠️  Verifique os erros acima${NC}"

exit "$ERRORS"
