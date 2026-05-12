#!/bin/bash
#=============================================================================
# setup_dod.sh — DevOpsDays FSA Setup Automático
# Instala: nginx, docker, docker compose, aws cli v2, clona repo, sobe stack
#
# Uso: sudo ./setup_dod.sh
#      curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash
#=============================================================================
set -euo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# ── Configurações ──────────────────────────────────────────────────────────
DEVOPS_USER="devopsdays"
DEVOPS_PASS="cetensufrb"
REPO_URL="https://github.com/Jonta-Sancar/dod-fsa.git"
REPO_DIR="dod-fsa"
AWS_CLI_URL="https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip"
MIN_DISK_MB=2048
LOCALSTACK_VERSION="3.5.0"

# ── Helpers ────────────────────────────────────────────────────────────────
info()  { echo -e "${CYAN}[setup]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }
header(){ echo -e "${BLUE}━━━ $* ━━━${NC}"; }

cleanup() {
    local ec=$?
    [ $ec -ne 0 ] && warn "Script interrompido com erro (código $ec)"
    exit $ec
}
trap cleanup EXIT

# ── 1. Verificações Iniciais ──────────────────────────────────────────────
header "Verificações do Sistema"

# root?
if [ "$EUID" -ne 0 ]; then
    fail "Este script deve ser executado como root (sudo)"
    exit 1
fi
ok "Executando como root"

# espaço em disco
FREE_SPACE=$(df -m / | awk 'NR==2 {print $4}')
if [ "$FREE_SPACE" -lt "$MIN_DISK_MB" ]; then
    warn "Pouco espaço livre: ${FREE_SPACE}MB (recomendado: ${MIN_DISK_MB}MB)"
else
    ok "Espaço em disco: ${FREE_SPACE}MB"
fi

# distro detection
DISTRO=""
if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO="$ID"
    info "Distro detectada: $DISTRO $VERSION_ID"
else
    warn "Não foi possível detectar a distribuição"
fi

# ── 2. Update + Limpeza ───────────────────────────────────────────────────
header "Atualizando Sistema e Limpando Cache"

apt-get update -qq
apt-get upgrade -y -qq
apt-get autoremove -y -qq
apt-get clean -qq
apt-get autoclean -qq
ok "Sistema atualizado e caches limpos"

# ── 3. Usuário devopsdays ─────────────────────────────────────────────────
header "Criando Usuário Isolado"

if id "$DEVOPS_USER" &>/dev/null; then
    ok "Usuário $DEVOPS_USER já existe"
else
    useradd -m -s /bin/bash "$DEVOPS_USER"
    echo "${DEVOPS_USER}:${DEVOPS_PASS}" | chpasswd
    echo "$DEVOPS_USER ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/$DEVOPS_USER
    chmod 440 /etc/sudoers.d/$DEVOPS_USER
    ok "Usuário $DEVOPS_USER criado"
fi

usermod -aG docker "$DEVOPS_USER" 2>/dev/null || true
ok "Usuário adicionado ao grupo docker"

# ── 4. Nginx + Dependências ────────────────────────────────────────────────
header "Instalando Nginx e Dependências"

apt-get install -y -qq nginx curl unzip git ca-certificates > /dev/null

if systemctl is-active --quiet nginx; then
    ok "Nginx instalado e rodando"
else
    systemctl start nginx
    ok "Nginx instalado e iniciado"
fi

# ── 5. Docker ─────────────────────────────────────────────────────────────
header "Instalando Docker e Docker Compose"

# Só adiciona repo se docker não estiver instalado
if ! command -v docker &>/dev/null; then
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
    chmod a+r /etc/apt/keyrings/docker.asc
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null
    ok "Docker instalado via repositório oficial"
else
    ok "Docker já instalado: $(docker --version 2>/dev/null || true)"
fi

if ! systemctl is-active --quiet docker; then
    systemctl start docker
fi

# ── 6. AWS CLI v2 ─────────────────────────────────────────────────────────
header "Instalando AWS CLI v2"

su - "$DEVOPS_USER" -c '
    AWS_BIN="$HOME/.local/bin/aws"
    if [ -x "$AWS_BIN" ]; then
        echo "AWS CLI já instalado: $($AWS_BIN --version 2>&1 | head -1)"
        exit 0
    fi
    mkdir -p "$HOME/.local/bin"
    curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q "/tmp/awscliv2.zip" -d "/tmp/"
    /tmp/aws/install -i "$HOME/.local/aws-cli" -b "$HOME/.local/bin" > /dev/null
    rm -rf /tmp/awscliv2.zip /tmp/aws/
    # add to PATH se não existir
    grep -q "local/bin" "$HOME/.bashrc" 2>/dev/null || echo "export PATH=\$PATH:\$HOME/.local/bin" >> "$HOME/.bashrc"
    echo "AWS CLI instalado"
'

ok "AWS CLI v2 configurado"

# ── 7. Repositório dod-fsa ────────────────────────────────────────────────
header "Clonando Repositório"

su - "$DEVOPS_USER" -c '
    set -e
    if [ -d "'"$REPO_DIR"'" ]; then
        echo "Repositório já existe, fazendo pull..."
        cd "'"$REPO_DIR"'" && git pull -q
    else
        git clone -q "'"$REPO_URL"'" "'"$REPO_DIR"'" 2>/dev/null || {
            echo "Falha ao clonar. Verifique se o repo existe e sua internet."
            exit 1
        }
    fi
    cd "'"$REPO_DIR"'"
    # fix localstack version (gratuita)
    sed -i "s|image: localstack/localstack$|image: localstack/localstack:'"$LOCALSTACK_VERSION"'|" docker-compose.yml 2>/dev/null || true
    sed -i "s|image: localstack/localstack:latest$|image: localstack/localstack:'"$LOCALSTACK_VERSION"'|" docker-compose.yml 2>/dev/null || true
    # fix nginx volume path
    sed -i "s|./html:/usr/share/nginx/html:ro|./resources/html:/usr/share/nginx/html:ro|" docker-compose.yml 2>/dev/null || true
    echo "Repositório configurado"
'

ok "Repositório clonado e configurado"

# ── 8. Subir Containers ────────────────────────────────────────────────────
header "Iniciando Containers Docker"

su - "$DEVOPS_USER" -c "cd ~/$REPO_DIR && docker compose up -d"

# ── Health Check (em vez de sleep fixo) ─────────────────────────────────────
info "Aguardando LocalStack ficar saudável (timeout: 120s)..."
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

if [ "$ELAPSED" -ge "$TIMEOUT" ]; then
    echo ""
    warn "Timeout aguardando LocalStack. Containers podem ainda estar subindo."
fi

# ── Verificação Final ─────────────────────────────────────────────────────
header "Verificação Final"

CONTAINER_COUNT=$(su - "$DEVOPS_USER" -c 'docker ps -q' 2>/dev/null | wc -l)
if [ "$CONTAINER_COUNT" -ge 1 ]; then
    ok "$CONTAINER_COUNT container(s) rodando"
    su - "$DEVOPS_USER" -c 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"' 2>/dev/null
else
    warn "Nenhum container rodando — execute 'docker compose up -d' manualmente"
fi

# ── Resumo ────────────────────────────────────────────────────────────────
echo ""
header "Setup Concluído"
echo ""
echo -e "${GREEN}Credenciais:${NC}"
echo "  Usuário:  $DEVOPS_USER"
echo "  Senha:    $DEVOPS_PASS"
echo "  sudo:     sem senha"
echo ""
echo -e "${GREEN}Serviços:${NC}"
echo "  LocalStack:       http://localhost:4566"
echo "  Nginx (container): http://localhost:8080"
echo "  Nginx (sistema):   http://localhost"
echo ""
echo -e "${GREEN}Acessar:${NC}"
echo "  su - $DEVOPS_USER"
echo "  docker ps"
echo "  ~/.local/bin/aws --version"
echo ""
info "Para verificar tudo: curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash -s -- --verify"
echo ""
