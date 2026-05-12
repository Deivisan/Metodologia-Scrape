#!/bin/bash
#=============================================================================
# deploy.sh — Deploy Remoto em Massa via SSH
# Instala o DOD em N máquinas simultaneamente (paralelo)
#
# Uso:
#   ./deploy.sh                                            # lê de hosts.txt
#   ./deploy.sh 192.168.1.10 192.168.1.11 192.168.1.12    # IPs inline
#   ./deploy.sh --user admin --key ~/.ssh/id_ed25519       # creds custom
#
# Formato do hosts.txt (um IP ou hostname por linha):
#   192.168.1.10
#   192.168.1.11
#   ...
#
# Flags:
#   --user <user>     SSH user (default: root)
#   --key <path>      SSH key path (default: ~/.ssh/id_rsa)
#   --port <port>     SSH port (default: 22)
#   --teardown        Executa teardown em vez de setup
#   --verify          Executa verificação após setup
#   --dry-run         Mostra o que seria executado sem executar
#   --help            Mostra ajuda
#=============================================================================
set -euo pipefail

# ── Configurações ──────────────────────────────────────────────────────────
REPO_BASE="https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod"
SSH_USER="root"
SSH_KEY="$HOME/.ssh/id_rsa"
SSH_PORT=22
MODE="setup"
DRY_RUN=false

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

info()  { echo -e "${CYAN}[deploy]${NC} $*"; }
ok()    { echo -e "${GREEN}✓${NC} $*"; }
warn()  { echo -e "${YELLOW}⚠${NC} $*"; }
fail()  { echo -e "${RED}✗${NC} $*"; }

# ── Parse args ─────────────────────────────────────────────────────────────
HOSTS=()
while [ $# -gt 0 ]; do
    case "$1" in
        --user)      SSH_USER="$2"; shift 2 ;;
        --key)       SSH_KEY="$2"; shift 2 ;;
        --port)      SSH_PORT="$2"; shift 2 ;;
        --teardown)  MODE="teardown"; shift ;;
        --verify)    MODE="verify"; shift ;;
        --dry-run)   DRY_RUN=true; shift ;;
        --help)
            echo "Uso: $0 [flags] [host1 host2 ...]"
            echo ""
            echo "Flags:"
            echo "  --user <user>     SSH user (default: root)"
            echo "  --key <path>      SSH key path (default: ~/.ssh/id_rsa)"
            echo "  --port <port>     SSH port (default: 22)"
            echo "  --teardown        Remove em vez de instalar"
            echo "  --verify          Verifica após setup"
            echo "  --dry-run         Modo simulação"
            echo "  --help            Mostra esta ajuda"
            echo ""
            echo "Sem argumentos, lê de hosts.txt"
            exit 0
            ;;
        -*)
            fail "Flag desconhecida: $1"
            exit 1
            ;;
        *)
            HOSTS+=("$1")
            shift
            ;;
    esac
done

# ── Carregar hosts ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ ${#HOSTS[@]} -eq 0 ]; then
    HOSTS_FILE="${SCRIPT_DIR}/hosts.txt"
    if [ -f "$HOSTS_FILE" ]; then
        mapfile -t HOSTS < "$HOSTS_FILE"
        info "Carregados ${#HOSTS[@]} hosts de hosts.txt"
    else
        fail "Nenhum host informado e hosts.txt não encontrado em $HOSTS_FILE"
        echo "Crie hosts.txt (um IP por linha) ou passe os IPs como argumentos."
        exit 1
    fi
fi

# ── Sanity checks ──────────────────────────────────────────────────────────
if ! command -v ssh &>/dev/null; then
    fail "ssh não encontrado. Instale o OpenSSH client."
    exit 1
fi

if [ ! -f "$SSH_KEY" ]; then
    warn "Chave SSH não encontrada: $SSH_KEY"
    warn "Use --key para especificar outra chave"
fi

# ── Deploy em cada host ────────────────────────────────────────────────────
case "$MODE" in
    setup)    SCRIPT="setup_dod.sh";    MSG="Instalando" ;;
    teardown) SCRIPT="teardown_dod.sh"; MSG="Removendo" ;;
    verify)   SCRIPT="verify_dod.sh";   MSG="Verificando" ;;
esac

BOOTSTRAP="curl -fsSL ${REPO_BASE}/${SCRIPT} | sudo bash"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Deploy DOD — $MSG em ${#HOSTS[@]} máquinas${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "  SSH user: $SSH_USER"
echo "  SSH key:  $SSH_KEY"
echo "  SSH port: $SSH_PORT"
echo "  Modo:     $MODE"
echo "  Dry-run:  $DRY_RUN"
echo ""

if [ "$DRY_RUN" = true ]; then
    for HOST in "${HOSTS[@]}"; do
        echo "  [$HOST] ssh -i $SSH_KEY -p $SSH_PORT ${SSH_USER}@${HOST} '$BOOTSTRAP'"
    done
    echo ""
    info "Dry-run concluído. Nada foi executado."
    exit 0
fi

# ── Execução paralela ──────────────────────────────────────────────────────
MAX_PARALLEL=10
ACTIVE=0
PIDS=()
RESULTS=()

deploy_host() {
    local host="$1"
    local output
    output=$(ssh -i "$SSH_KEY" -p "$SSH_PORT" \
        -o StrictHostKeyChecking=accept-new \
        -o ConnectTimeout=10 \
        -o ServerAliveInterval=30 \
        "$SSH_USER@$host" \
        "$BOOTSTRAP" 2>&1) || true
    echo "$host|$output"
}

echo -e "${YELLOW}Iniciando deploy paralelo (max $MAX_PARALLEL simultâneos)...${NC}"
echo ""

for HOST in "${HOSTS[@]}"; do
    # espera se atingiu limite de paralelismo
    while [ "$(jobs -r | wc -l)" -ge "$MAX_PARALLEL" ]; do
        sleep 1
    done

    info "Enviando para $HOST..."
    deploy_host "$HOST" &
    PIDS+=("$!")
done

# ── Aguardar todos terminarem ─────────────────────────────────────────────
echo ""
info "Aguardando conclusão de todos os deploys..."
for pid in "${PIDS[@]}"; do
    wait "$pid" 2>/dev/null || true
done

# ── Resumo ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  RESUMO DO DEPLOY${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# verificar resultado de cada host via SSH rápido
for HOST in "${HOSTS[@]}"; do
    if ssh -i "$SSH_KEY" -p "$SSH_PORT" \
        -o StrictHostKeyChecking=accept-new \
        -o ConnectTimeout=5 \
        "$SSH_USER@$host" \
        "echo 'reachable'" 2>/dev/null | grep -q "reachable"; then
        ok "$HOST — conectado"
    else
        fail "$HOST — sem conexão"
    fi
done

echo ""
info "Deploy concluído. Use --verify para verificar cada máquina."
echo ""
