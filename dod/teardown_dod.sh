#!/bin/bash
#=============================================================================
# teardown_dod.sh — DevOpsDays FSA Limpeza Total
# Remove: containers, nginx, docker, aws cli, usuário devopsdays
#
# Uso: sudo ./teardown_dod.sh
#=============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DEVOPS_USER="devopsdays"
REPO_DIR="/home/$DEVOPS_USER/dod-fsa"

info()  { echo -e "${BLUE}[teardown]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }
header(){ echo -e "${BLUE}━━━ $* ━━━${NC}"; }

if [ "$EUID" -ne 0 ]; then
    fail "Execute como root"
    exit 1
fi

header "Iniciando Limpeza"

# ── 1. LocalStack (container) ────────────────────────────────────────────
info "Parando LocalStack..."
if [ -d "$REPO_DIR" ]; then
    su - "$DEVOPS_USER" -c "cd /home/$DEVOPS_USER/dod-fsa 2>/dev/null && docker compose down" 2>/dev/null || true
fi
docker stop dod-localstack 2>/dev/null || true
docker rm dod-localstack 2>/dev/null || true
ok "Container removido"

# ── 2. Nginx (host) ──────────────────────────────────────────────────────
info "Removendo Nginx..."
systemctl stop nginx 2>/dev/null || true
systemctl disable nginx 2>/dev/null || true
apt-get purge -y nginx nginx-common nginx-core 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true
ok "Nginx removido"

# ── 3. Docker ─────────────────────────────────────────────────────────────
info "Removendo Docker..."
apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.asc
ok "Docker removido"

# ── 4. AWS CLI (host) ─────────────────────────────────────────────────────
info "Removendo AWS CLI..."
rm -rf /home/$DEVOPS_USER/.local/aws-cli 2>/dev/null || true
rm -f /home/$DEVOPS_USER/.local/bin/aws 2>/dev/null || true
ok "AWS CLI removido"

# ── 5. Repo (host) ────────────────────────────────────────────────────────
info "Removendo repositório..."
rm -rf "$REPO_DIR" 2>/dev/null || true
ok "Repo removido"

# ── 6. Usuário ────────────────────────────────────────────────────────────
info "Removendo usuário $DEVOPS_USER..."
deluser --remove-home "$DEVOPS_USER" 2>/dev/null || userdel -r "$DEVOPS_USER" 2>/dev/null || true
rm -f /etc/sudoers.d/$DEVOPS_USER
ok "Usuário removido"

# ── 7. Limpeza final ─────────────────────────────────────────────────────
apt-get clean -qq
apt-get autoclean -qq

echo ""
header "Limpeza Concluída"
echo ""
echo -e "${GREEN}Sistema limpo.${NC}"
echo -e "${YELLOW}Reinicie para completar.${NC}"
echo ""
