#!/bin/bash
#=============================================================================
# setup_dod.sh — DevOpsDays FSA Setup Automático
# Instala no HOST (não em container): nginx, aws cli, repo
# Containeriza apenas: localstack
#
# Uso: sudo ./setup_dod.sh
#      curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash
#=============================================================================
set -eo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

DEVOPS_USER="devopsdays"
DEVOPS_PASS="cetensufrb"
REPO_URL="https://github.com/Jonta-Sancar/dod-fsa.git"
REPO_DIR="dod-fsa"
MIN_DISK_MB=2048

info()  { echo -e "${CYAN}[setup]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }
header(){ echo -e "${BLUE}━━━ $* ━━━${NC}"; }

# ── 1. Verificações ─────────────────────────────────────────────────────────
header "Verificações do Sistema"

if [ "$EUID" -ne 0 ]; then
    fail "Execute como root (sudo)"
    exit 1
fi
ok "Executando como root"

FREE_SPACE=$(df -m / | awk 'NR==2 {print $4}')
if [ "$FREE_SPACE" -lt "$MIN_DISK_MB" ]; then
    warn "Espaço livre: ${FREE_SPACE}MB (mínimo: ${MIN_DISK_MB}MB)"
else
    ok "Espaço em disco: ${FREE_SPACE}MB"
fi

DISTRO=""
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO="${ID:-unknown}"
    DISTRO_VERSION="${VERSION_ID:-?}"
    info "Distro: $DISTRO $DISTRO_VERSION"
fi

# ── 2. Update + Prereqs ───────────────────────────────────────────────────
header "Atualizando Sistema"

apt-get update -qq
DEPS="curl wget unzip git ca-certificates"
for pkg in $DEPS; do
    if ! command -v "$pkg" &>/dev/null; then
        apt-get install -y -qq $pkg > /dev/null
    fi
done
ok "Sistema atualizado e dependências instaladas"

# ── 3. Usuário devopsdays ────────────────────────────────────────────────
header "Configurando Usuário"

if ! id "$DEVOPS_USER" &>/dev/null; then
    useradd -m -s /bin/bash "$DEVOPS_USER"
    echo "${DEVOPS_USER}:${DEVOPS_PASS}" | chpasswd
    ok "Usuário $DEVOPS_USER criado"
else
    ok "Usuário $DEVOPS_USER já existe"
fi

echo "$DEVOPS_USER ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$DEVOPS_USER
chmod 440 /etc/sudoers.d/$DEVOPS_USER
ok "Sudo sem senha configurado"

# ── 4. Docker ────────────────────────────────────────────────────────────
header "Instalando Docker"

if ! command -v docker &>/dev/null; then
    CODENAME="${VERSION_CODENAME:-jammy}"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${CODENAME} stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null
    ok "Docker instalado"
else
    ok "Docker já instalado: $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d ',')"
fi

if ! systemctl is-active --quiet docker; then
    systemctl start docker
fi

usermod -aG docker "$DEVOPS_USER"
chmod 666 /var/run/docker.sock 2>/dev/null || true
ok "Docker configurado"

# ── 5. Nginx (HOST) ───────────────────────────────────────────────────────
header "Instalando Nginx (host)"

apt-get install -y -qq nginx > /dev/null
systemctl enable nginx
systemctl start nginx
ok "Nginx rodando na porta 80"

# ── 6. LocalStack (CONTAINER) ───────────────────────────────────────────
header "Subindo LocalStack (container)"

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
ok "LocalStack container rodando"

# ── 7. AWS CLI v2 (HOST) ─────────────────────────────────────────────────
header "Instalando AWS CLI v2 (host)"

su - "$DEVOPS_USER" -c '
    AWS_BIN="$HOME/.local/bin/aws"
    if [ -x "$AWS_BIN" ]; then
        echo "AWS CLI já instalado"
        exit 0
    fi
    mkdir -p "$HOME/.local/bin"
    curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q "/tmp/awscliv2.zip" -d "/tmp/"
    /tmp/aws/install -i "$HOME/.local/aws-cli" -b "$HOME/.local/bin" > /dev/null
    rm -rf /tmp/awscliv2.zip /tmp/aws/
    grep -q "local/bin" "$HOME/.bashrc" 2>/dev/null || echo "export PATH=\$PATH:\$HOME/.local/bin" >> "$HOME/.bashrc"
    echo "AWS CLI instalado"
'
ok "AWS CLI v2 instalado em ~/.local/bin/aws"

# ── 8. Health Check LocalStack ────────────────────────────────────────────
info "Aguardando LocalStack (timeout: 120s)..."
TIMEOUT=120
ELAPSED=0
while [ "$ELAPSED" -lt "$TIMEOUT" ]; do
    HEALTH=$(curl -s --max-time 3 http://localhost:4566/_localstack/health 2>/dev/null || true)
    if echo "$HEALTH" | grep -q '"features"'; then
        echo ""
        ok "LocalStack saudável!"
        break
    fi
    printf "."
    sleep 3
    ELAPSED=$((ELAPSED + 3))
done
[ "$ELAPSED" -ge "$TIMEOUT" ] && warn "Timeout - LocalStack pode estar subindo"

# ── 9. Resumo ────────────────────────────────────────────────────────────
echo ""
header "Setup Concluído"
echo ""
echo -e "${GREEN}Credenciais:${NC}"
echo "  SSH root:     8u@3tArb!"
echo "  devopsdays:   $DEVOPS_PASS (sudo sem senha)"
echo ""
echo -e "${GREEN}Serviços no HOST:${NC}"
echo "  Nginx:        http://localhost:80"
echo "  AWS CLI:      ~/.local/bin/aws"
echo "  Repo:         /home/$DEVOPS_USER/$REPO_DIR"
echo ""
echo -e "${GREEN}Serviços em CONTAINER:${NC}"
echo "  LocalStack:   http://localhost:4566"
echo ""
info "Para verificar: ./verify_dod.sh"
echo ""
