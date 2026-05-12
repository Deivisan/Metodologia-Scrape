#!/bin/bash
#=============================================================================
# tracker.sh — Dashboard Assíncrono para Deploy em Massa
# 
# Uso:
#   ./dod/tracker.sh                   # setup em todas (lê de hosts.txt)
#   ./dod/tracker.sh --verify          # verifica todas
#   ./dod/tracker.sh --status          # mostra status atual sem executar
#   ./dod/tracker.sh --teardown        # limpa todas
#   ./dod/tracker.sh --watch           # modo monitoramento contínuo
#
# hosts.txt (um IP por linha, opcional: nome)
#   192.168.1.10  maquina-01
#   192.168.1.11  maquina-02
#
# Configuração via environment:
#   SSH_PASS=8u@3tArb!   # senha root (default)
#   SSH_USER=root         # user SSH (default)
#   MAX_PARALLEL=10       # máximo simultâneo
#=============================================================================
set -eo pipefail

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m'

# ── Config ─────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOSTS_FILE="${SCRIPT_DIR}/hosts.txt"
SSH_USER="${SSH_USER:-root}"
SSH_PASS="${SSH_PASS:-8u@3tArb!}"
MAX_PARALLEL="${MAX_PARALLEL:-10}"
REPO_BASE="https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod"
RESULTS_DIR="/tmp/dod-tracker-$$"
MODE="setup"

mkdir -p "$RESULTS_DIR"

# ── Helpers ────────────────────────────────────────────────────────────────
info()    { echo -e "${CYAN}[tracker]${NC} $*"; }
ok()      { echo -e "${GREEN}✓${NC} $*"; }
warn()    { echo -e "${YELLOW}⚠${NC} $*"; }
fail()    { echo -e "${RED}✗${NC} $*"; }
header()  { echo -e "${BLUE}━━━ $* ━━━${NC}"; }

# ── Parse args ─────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
    case "$1" in
        --verify)   MODE="verify"; shift ;;
        --teardown) MODE="teardown"; shift ;;
        --status)   MODE="status"; shift ;;
        --watch)    MODE="watch"; shift ;;
        --help)
            echo "Uso: $0 [--verify|--teardown|--status|--watch]"
            echo ""
            echo "  (sem flag)   Executa setup em todas as máquinas"
            echo "  --verify     Verifica instalação em todas"
            echo "  --teardown   Remove tudo de todas"
            echo "  --status     Mostra status atual (sem executar)"
            echo "  --watch      Monitora status a cada 10s"
            exit 0
            ;;
        *)  echo "Flag desconhecida: $1"; exit 1 ;;
    esac
done

# ── Carregar hosts ─────────────────────────────────────────────────────────
if [ ! -f "$HOSTS_FILE" ]; then
    fail "Arquivo $HOSTS_FILE não encontrado."
    echo "Crie um arquivo hosts.txt no formato:"
    echo "  IP_HOST  [nome_opcional]"
    echo "  Ex: 192.168.1.10  maquina-01"
    exit 1
fi

HOSTS=()
HOSTNAMES=()
while read -r ip nome _; do
    [ -z "$ip" ] && continue
    [[ "$ip" == \#* ]] && continue
    HOSTS+=("$ip")
    HOSTNAMES+=("${nome:-$ip}")
done < "$HOSTS_FILE"

TOTAL=${#HOSTS[@]}
if [ "$TOTAL" -eq 0 ]; then
    fail "Nenhum host válido encontrado em $HOSTS_FILE"
    exit 1
fi

info "Carregados $TOTAL hosts de $HOSTS_FILE"

# ── Modo status (sem executar) ────────────────────────────────────────────
if [ "$MODE" = "status" ]; then
    header "STATUS ATUAL"
    echo ""
    printf "${BOLD}%-16s %-20s %s${NC}\n" "IP" "NOME" "STATUS"
    echo "──────────────────────────────────────────────────────"
    for i in "${!HOSTS[@]}"; do
        ip="${HOSTS[$i]}"
        nome="${HOSTNAMES[$i]}"
        if ping -c1 -W2 "$ip" &>/dev/null; then
            if ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=5 -o BatchMode=yes "$SSH_USER@$ip" "uptime -p" 2>/dev/null; then
                printf "%-16s %-20s ${GREEN}online${NC}\n" "$ip" "$nome"
            else
                printf "%-16s %-20s ${YELLOW}ssh fail${NC}\n" "$ip" "$nome"
            fi
        else
            printf "%-16s %-20s ${RED}offline${NC}\n" "$ip" "$nome"
        fi
    done
    exit 0
fi

# ── Nome da operação ──────────────────────────────────────────────────────
case "$MODE" in
    setup)    SCRIPT="setup_dod.sh";    MSG="SETUP" ;;
    teardown) SCRIPT="teardown_dod.sh"; MSG="TEARDOWN" ;;
    verify)   SCRIPT="verify_dod.sh";   MSG="VERIFY" ;;
esac

# ── Função de execução remota ─────────────────────────────────────────────
REMOTE_CMD="curl -fsSL ${REPO_BASE}/${SCRIPT} | sudo bash"

run_remote() {
    local ip="$1" nome="$2" idx="$3"
    local result_file="${RESULTS_DIR}/${idx}_${ip//./-}"
    local log_file="${result_file}.log"

    # SSH with password via sshpass (if available) or assume key-based
    if command -v sshpass &>/dev/null; then
        SSHPASS="$SSH_PASS" sshpass -e ssh -o StrictHostKeyChecking=accept-new \
            -o ConnectTimeout=15 -o ServerAliveInterval=30 \
            "$SSH_USER@$ip" "$REMOTE_CMD" > "$log_file" 2>&1
    else
        ssh -o StrictHostKeyChecking=accept-new \
            -o ConnectTimeout=15 -o ServerAliveInterval=30 \
            "$SSH_USER@$ip" "$REMOTE_CMD" > "$log_file" 2>&1
    fi

    local ec=$?
    echo "$ec" > "${result_file}.exit"
    echo "$ec"  # return exit code
}

# ── Tabela de resultados ──────────────────────────────────────────────────
print_table() {
    clear 2>/dev/null || true
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  DOD TRACKER — $MSG — ${TOTAL} máquinas${NC}"
    echo -e "${BLUE}  $(date '+%d/%m/%Y %H:%M:%S')${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    printf "${BOLD}%-4s %-16s %-20s %-10s %s${NC}\n" "#" "IP" "NOME" "STATUS" "DETALHES"
    echo "──────────────────────────────────────────────────────────────────────────"

    DONE=0
    FAIL=0
    PENDING=0

    for i in "${!HOSTS[@]}"; do
        ip="${HOSTS[$i]}"
        nome="${HOSTNAMES[$i]}"
        result_file="${RESULTS_DIR}/${i}_${ip//./-}"
        log_file="${result_file}.log"
        exit_file="${result_file}.exit"

        if [ -f "$exit_file" ]; then
            ec=$(cat "$exit_file")
            if [ "$ec" -eq 0 ]; then
                printf "%-4s %-16s %-20s ${GREEN}%-10s${NC} %s\n" "$((i+1))" "$ip" "$nome" "✅ OK" "exit $ec"
                ((DONE++))
            else
                # mostra última linha do log como detalhe
                detail=$(tail -1 "$log_file" 2>/dev/null | cut -c1-50 || echo "")
                printf "%-4s %-16s %-20s ${RED}%-10s${NC} %s\n" "$((i+1))" "$ip" "$nome" "❌ FAIL" "$detail"
                ((FAIL++))
            fi
        else
            # verifica se está em execução (tem processo ssh rodando)
            if pgrep -f "ssh.*$ip" &>/dev/null; then
                printf "%-4s %-16s %-20s ${YELLOW}%-10s${NC} %s\n" "$((i+1))" "$ip" "$nome" "⏳ RUN" "executando..."
                ((PENDING++))
            else
                printf "%-4s %-16s %-20s ${CYAN}%-10s${NC} %s\n" "$((i+1))" "$ip" "$nome" "⏸️  QUEUE" "aguardando"
                ((PENDING++))
            fi
        fi
    done

    echo ""
    echo "──────────────────────────────────────────────────────────────────────────"
    echo -e "  ${GREEN}✅ Concluídos: $DONE${NC}  ${RED}❌ Falhas: $FAIL${NC}  ${YELLOW}⏳ Pendentes: $PENDING${NC}  |  Total: $TOTAL"
    echo ""
}

# ── Modo watch ──────────────────────────────────────────────────────────────
if [ "$MODE" = "watch" ]; then
    info "Modo monitoramento contínuo (Ctrl+C para sair)"
    echo ""
    while true; do
        for i in "${!HOSTS[@]}"; do
            ip="${HOSTS[$i]}"
            nome="${HOSTNAMES[$i]}"
            result_file="${RESULTS_DIR}/${i}_${ip//./-}"
            exit_file="${result_file}.exit"
            log_file="${result_file}.log"

            if [ ! -f "$exit_file" ]; then
                bash -c '
                    ip="$1" nome="$2" idx="$3" result_file="$4" log_file="$5" exit_file="$6"
                    REMOTE_CMD="curl -fsSL '"$REPO_BASE"'/verify_dod.sh | sudo bash"
                    if command -v sshpass &>/dev/null; then
                        SSHPASS="'"$SSH_PASS"'" sshpass -e ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "'"$SSH_USER"'@$ip" "$REMOTE_CMD" > "$log_file" 2>&1
                    else
                        ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=10 "'"$SSH_USER"'@$ip" "$REMOTE_CMD" > "$log_file" 2>&1
                    fi
                    echo $? > "$exit_file"
                ' _ "$ip" "$nome" "$i" "$result_file" "$log_file" "$exit_file" &
            fi
        done

        print_table
        sleep 10
    done
    exit 0
fi

# ── Execução principal (setup/teardown/verify) ────────────────────────────
header "$MSG em ${TOTAL} máquinas (máx $MAX_PARALLEL simultâneas)"
echo ""

# Lança todos os jobs em background (com controle de paralelismo)
ACTIVE=0
for i in "${!HOSTS[@]}"; do
    ip="${HOSTS[$i]}"
    nome="${HOSTNAMES[$i]}"

    # Aguarda se atingiu limite de paralelismo
    while [ "$(jobs -r | wc -l)" -ge "$MAX_PARALLEL" ]; do
        print_table
        sleep 2
    done

    info "[$((i+1))/$TOTAL] $nome ($ip) — enviando..."
    run_remote "$ip" "$nome" "$i" &
done

# ── Aguarda todos finalizarem ─────────────────────────────────────────────
echo ""
info "Aguardando conclusão de todos os jobs..."

while [ "$(jobs -r | wc -l)" -gt 0 ]; do
    print_table
    sleep 3
done

# ── Tabela final ──────────────────────────────────────────────────────────
print_table

# ── Resumo final ──────────────────────────────────────────────────────────
DONE=$(find "$RESULTS_DIR" -name '*.exit' -exec grep -l '^0$' {} + 2>/dev/null | wc -l)
FAIL=$(find "$RESULTS_DIR" -name '*.exit' -exec grep -l '^[1-9]' {} + 2>/dev/null | wc -l)

echo ""
header "RESUMO FINAL"
echo ""

if [ "$FAIL" -eq 0 ] && [ "$DONE" -eq "$TOTAL" ]; then
    echo -e "${GREEN}🎉 Todas as $TOTAL máquinas concluíram com sucesso!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  $DONE sucesso, $FAIL falha(s) de $TOTAL total${NC}"
    echo ""
    if [ "$FAIL" -gt 0 ]; then
        echo -e "${RED}Máquinas com falha:${NC}"
        for i in "${!HOSTS[@]}"; do
            ip="${HOSTS[$i]}"
            nome="${HOSTNAMES[$i]}"
            exit_file="${RESULTS_DIR}/${i}_${ip//./-}.exit"
            if [ -f "$exit_file" ] && [ "$(cat "$exit_file")" -ne 0 ]; then
                echo "  ❌ $nome ($ip) — exit code $(cat "$exit_file")"
            fi
        done
    fi
    exit 1
fi

# ── Limpeza ──────────────────────────────────────────────────────────────
trap 'rm -rf "$RESULTS_DIR"' EXIT
