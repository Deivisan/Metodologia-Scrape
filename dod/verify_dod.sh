#!/bin/bash
#=============================================================================
# verify_dod.sh — DevOpsDays FSA Verificação
# Checa: usuário, docker, containers, localstack, aws cli, nginx, repo
#
# Uso: sudo ./verify_dod.sh
#=============================================================================
set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DEVOPS_USER="devopsdays"
ERRORS=0
SUCCESS=0

info()  { echo -e "${CYAN}[verify]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; ((SUCCESS++)); }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; ((ERRORS++)); }

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  DevOpsDays FSA — Verificação Completa${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── 1. Usuário ────────────────────────────────────────────────────────────
info "Verificando usuário..."
if id "$DEVOPS_USER" &>/dev/null; then
    ok "Usuário $DEVOPS_USER existe"
else
    fail "Usuário $DEVOPS_USER não existe"
fi

if groups "$DEVOPS_USER" 2>/dev/null | grep -q docker; then
    ok "Usuário no grupo docker"
else
    fail "Usuário não está no grupo docker"
fi

# ── 2. Docker ─────────────────────────────────────────────────────────────
info "Verificando Docker..."
if command -v docker &>/dev/null; then
    ok "Docker: $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')"
else
    fail "Docker não instalado"
fi

if systemctl is-active --quiet docker; then
    ok "Docker daemon ativo"
else
    fail "Docker daemon inativo"
fi

# ── 3. Containers ─────────────────────────────────────────────────────────
info "Verificando containers..."
if id "$DEVOPS_USER" &>/dev/null; then
    CONTAINER_COUNT=$(su - "$DEVOPS_USER" -c 'docker ps 2>/dev/null' | tail -n +2 | wc -l)
    if [ "$CONTAINER_COUNT" -ge 1 ]; then
        ok "$CONTAINER_COUNT container(s) rodando"
    else
        warn "Nenhum container rodando"
    fi
    echo ""
    su - "$DEVOPS_USER" -c 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"' 2>/dev/null || true
    echo ""
fi

# ── 4. LocalStack ─────────────────────────────────────────────────────────
info "Verificando LocalStack..."
if ss -tlnp 2>/dev/null | grep -q ':4566'; then
    ok "Porta 4566 ouvindo"
else
    fail "LocalStack não está na porta 4566"
fi

HEALTH=$(curl -s --max-time 5 http://localhost:4566/_localstack/health 2>/dev/null || true)
if [ -n "$HEALTH" ]; then
    ok "LocalStack respondendo na API"
    # extrai número de serviços (sem python3)
    SERVICE_COUNT=$(echo "$HEALTH" | grep -o '"available"[[:space:]]*:[[:space:]]*"[^"]*"' | wc -l || echo "?")
    echo "    Serviços disponíveis: $SERVICE_COUNT"
else
    fail "LocalStack não responde"
fi

# ── 5. AWS CLI ────────────────────────────────────────────────────────────
info "Verificando AWS CLI..."
AWS_BIN="/home/$DEVOPS_USER/.local/bin/aws"
if [ -x "$AWS_BIN" ]; then
    AWS_VER=$(su - "$DEVOPS_USER" -c '~/.local/bin/aws --version' 2>/dev/null | head -1)
    ok "AWS CLI: $AWS_VER"
else
    fail "AWS CLI não encontrado em $AWS_BIN"
fi

if [ -x "$AWS_BIN" ]; then
    RESULT=$(su - "$DEVOPS_USER" -c 'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 ~/.local/bin/aws --endpoint-url=http://localhost:4566 sts get-caller-identity' 2>/dev/null || true)
    if echo "$RESULT" | grep -q "UserId"; then
        ok "AWS CLI conectando no LocalStack"
    else
        warn "AWS CLI não conecta no LocalStack (pode ser ok se LocalStack ainda estiver subindo)"
    fi
fi

# ── 6. Nginx (sistema) ────────────────────────────────────────────────────
info "Verificando Nginx (sistema)..."
if systemctl is-active --quiet nginx 2>/dev/null; then
    ok "Nginx ativo"
else
    warn "Nginx inativo"
fi

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE" != "000" ]; then
    ok "Nginx (sistema) respondendo HTTP $HTTP_CODE"
else
    fail "Porta 80 não respondendo"
fi

# ── 7. Nginx (container) ──────────────────────────────────────────────────
info "Verificando Nginx (container)..."
HTTP_CODE_8080=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ 2>/dev/null || echo "000")
if [ "$HTTP_CODE_8080" != "000" ]; then
    ok "Nginx (container) respondendo HTTP $HTTP_CODE_8080"
else
    warn "Porta 8080 não respondendo (pode ser normal se container não expor)"
fi

# ── 8. Repositório ────────────────────────────────────────────────────────
info "Verificando repositório..."
REPO_DIR="/home/$DEVOPS_USER/dod-fsa"
if [ -d "$REPO_DIR" ]; then
    ok "Repositório dod-fsa existe"
    if [ -f "$REPO_DIR/docker-compose.yml" ]; then
        ok "Arquivo docker-compose.yml existe"
    fi
else
    fail "Repositório dod-fsa não encontrado"
fi

# ── Resumo ────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  RESUMO DA VERIFICAÇÃO${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}✓ Sucessos: $SUCCESS${NC}"
echo -e "${RED}✗ Erros:    $ERRORS${NC}"
echo ""

if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}🎉 Ambiente 100% funcional!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Ambiente com problemas ($ERRORS erro(s))${NC}"
    exit 1
fi
