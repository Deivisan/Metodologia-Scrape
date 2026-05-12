#!/bin/bash
#=============================================================================
# teardown_dod.sh — DevOpsDays FSA Limpeza Total
# Remove: containers, nginx, docker, aws cli, usuário devopsdays
#
# Uso: sudo ./teardown_dod.sh
#=============================================================================
set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEVOPS_USER="devopsdays"

info()  { echo -e "${BLUE}[teardown]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }

# root?
if [ "$EUID" -ne 0 ]; then
    fail "Este script deve ser executado como root (sudo)"
    exit 1
fi

info "Iniciando limpeza do ambiente..."

# ── 1. Containers ─────────────────────────────────────────────────────────
if id "$DEVOPS_USER" &>/dev/null; then
    if [ -d "/home/$DEVOPS_USER/dod-fsa" ]; then
        info "Parando containers..."
        su - "$DEVOPS_USER" -c 'cd ~/dod-fsa && docker compose down' 2>/dev/null || true
        ok "Containers parados"
    fi
else
    warn "Usuário $DEVOPS_USER não existe, pulando containers"
fi

# ── 2. Nginx ──────────────────────────────────────────────────────────────
info "Removendo Nginx..."
systemctl stop nginx 2>/dev/null || true
apt-get purge -y nginx nginx-common nginx-core 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true
ok "Nginx removido"

# ── 3. Docker ─────────────────────────────────────────────────────────────
info "Removendo Docker..."
apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true
ok "Docker removido"

# ── 4. Configs ────────────────────────────────────────────────────────────
info "Removendo configurações..."
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.asc
rm -f /etc/sudoers.d/$DEVOPS_USER
apt-get clean -qq
apt-get autoclean -qq
ok "Configurações removidas"

# ── 5. Usuário ────────────────────────────────────────────────────────────
info "Removendo usuário $DEVOPS_USER..."
if id "$DEVOPS_USER" &>/dev/null; then
    # tenta deluser (ubuntu/debian) senão userdel
    deluser --remove-home "$DEVOPS_USER" 2>/dev/null || userdel -r "$DEVOPS_USER" 2>/dev/null || true
    ok "Usuário $DEVOPS_USER removido"
else
    warn "Usuário $DEVOPS_USER não existe"
fi

# ── Resumo ────────────────────────────────────────────────────────────────
echo ""
header() { echo -e "${BLUE}━━━ $* ━━━${NC}"; }
header "Limpeza Concluída"
echo ""
echo -e "${GREEN}O sistema voltou ao estado original.${NC}"
echo -e "${YELLOW}Recomenda-se reiniciar o sistema para completar a remoção.${NC}"
echo ""
