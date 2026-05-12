#!/bin/bash
#=============================================================================
# setup_dod.sh — DevOpsDays FSA Setup Automático
# YOLO MODE: idempotente, sem update/upgrade, trata tudo
#=============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DEVOPS_USER="devopsdays"
DEVOPS_PASS="cetensufrb"
MIN_DISK_MB=1500

info()  { echo -e "${CYAN}[setup]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }
header(){ echo -e "${BLUE}━━━ $* ━━━${NC}"; }

if [ "$EUID" -ne 0 ]; then
    fail "Execute como root"
    exit 1
fi

FREE_SPACE=$(df -m / | awk 'NR==2 {print $4}')
[ "$FREE_SPACE" -lt "$MIN_DISK_MB" ] && warn "Espaço: ${FREE_SPACE}MB" || ok "Espaço: ${FREE_SPACE}MB"

# ── 1. Prereqs (sem update, idempotente) ───────────────────────────────────
header "Dependências"
for pkg in curl wget unzip git ca-certificates gnupg lsb-release; do
    command -v "$pkg" &>/dev/null || apt-get install -y -qq "$pkg" > /dev/null 2>&1
done
ok "Prereqs ok"

# ── 2. devopsdays user ────────────────────────────────────────────────────
header "Usuário devopsdays"
if ! id "$DEVOPS_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEVOPS_USER"
    echo "${DEVOPS_USER}:${DEVOPS_PASS}" | chpasswd
    ok "Criado"
else
    ok "Já existe"
fi
groupadd -f sudo
usermod -aG sudo "$DEVOPS_USER" 2>/dev/null || true
echo "$DEVOPS_USER ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$DEVOPS_USER
chmod 440 /etc/sudoers.d/$DEVOPS_USER

# ── 3. Docker (sem update) ─────────────────────────────────────────────────
header "Docker"
if ! command -v docker &>/dev/null; then
    CODENAME="${VERSION_CODENAME:-jammy}"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq 2>/dev/null
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null 2>&1
    ok "Instalado"
else
    ok "Já instalado: $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')"
fi

systemctl start docker 2>/dev/null || true
usermod -aG docker "$DEVOPS_USER" 2>/dev/null || true
usermod -aG sudo "$DEVOPS_USER" 2>/dev/null || true
chmod 666 /var/run/docker.sock 2>/dev/null || true

# ── 4. Nginx ────────────────────────────────────────────────────────────────
header "Nginx"
if ! command -v nginx &>/dev/null; then
    apt-get install -y -qq nginx > /dev/null 2>&1
    ok "Instalado"
else
    ok "Já instalado"
fi
systemctl enable nginx 2>/dev/null || true
systemctl start nginx 2>/dev/null || true
ok "Nginx ativo"

# ── 5. LocalStack (container) ───────────────────────────────────────────────
header "LocalStack"
su - "$DEVOPS_USER" -c '
    set -e
    REPO_HOME="/home/devopsdays"
    if [ ! -d "$REPO_HOME/dod-fsa" ]; then
        git clone -q "https://github.com/Jonta-Sancar/dod-fsa.git" "$REPO_HOME/dod-fsa"
    fi
    cd "$REPO_HOME/dod-fsa"
    sed -i "s|image: localstack/localstack$|image: localstack/localstack:3.5.0|" docker-compose.yml 2>/dev/null || true
    docker compose up -d localstack
'
ok "LocalStack container"

# ── 6. AWS CLI (host) ────────────────────────────────────────────────────
header "AWS CLI"
su - "$DEVOPS_USER" -c '
    AWS_BIN="$HOME/.local/bin/aws"
    [ -x "$AWS_BIN" ] && exit 0
    mkdir -p "$HOME/.local/bin"
    curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q "/tmp/awscliv2.zip" -d "/tmp/"
    /tmp/aws/install -i "$HOME/.local/aws-cli" -b "$HOME/.local/bin" > /dev/null
    rm -rf /tmp/awscliv2.zip /tmp/aws/
'
ok "AWS CLI ok"

# ── 7. Health check ───────────────────────────────────────────────────────
info "Aguardando LocalStack..."
for i in $(seq 1 40); do
    wget -q -O- http://localhost:4566/_localstack/health > /dev/null 2>&1 && { echo ""; ok "LocalStack saudável"; break; }
    printf "."
    sleep 3
done

echo ""
header "Setup Concluído"
echo "  Nginx:       http://localhost:80"
echo "  LocalStack:  http://localhost:4566"
echo "  AWS CLI:     /home/$DEVOPS_USER/.local/bin/aws"
echo "  devopsdays:  $DEVOPS_PASS"
echo ""
