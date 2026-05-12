#!/bin/bash
#=============================================================================
# discover.sh — Descobre IPs pelos MACs na rede local
#
# Uso:
#   ./dod/discover.sh                          # modo automático
#   ./dod/discover.sh --scan                   # força escaneamento da rede
#   ./dod/discover.sh --status                 # mostra IPs descobertos
#   ./dod/discover.sh --save                   # salva como hosts.txt
#
# Fluxo:
#   1. Lê macs.txt
#   2. Escaneia a rede local (arp-scan, nmap ou ip neigh)
#   3. Casa cada MAC com seu IP atual
#   4. Gera hosts.txt automaticamente
#
# Requer: arp-scan OU nmap (recomendado) ou usa fallback com ip/arp
# Instalação: apt install arp-scan
#=============================================================================
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MACS_JSON="${SCRIPT_DIR}/macs.json"
MACS_FILE="${SCRIPT_DIR}/macs.txt"
HOSTS_FILE="${SCRIPT_DIR}/hosts.txt"
RESULTS_FILE="/tmp/dod-macs-$$.tsv"

# ── Cores ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

info()   { echo -e "${CYAN}[discover]${NC} $*"; }
ok()     { echo -e "${GREEN}✓${NC} $*"; }
warn()   { echo -e "${YELLOW}⚠${NC} $*"; }
fail()   { echo -e "${RED}✗${NC} $*"; }
header() { echo -e "${BLUE}━━━ $* ━━━${NC}"; }

# ── Parse args ─────────────────────────────────────────────────────────────
MODE="auto"
for arg in "$@"; do
    case "$arg" in
        --scan)   MODE="scan" ;;
        --status) MODE="status" ;;
        --save)   MODE="save" ;;
        --help)
            echo "Uso: $0 [--scan|--status|--save]"
            echo "  (sem flag)  Auto: escaneia + mostra + salva"
            echo "  --scan      Força escaneamento completo"
            echo "  --status    Mostra IPs já descobertos"
            echo "  --save      Salva hosts.txt com IPs atuais"
            exit 0
            ;;
    esac
done

# ── Carregar MACs ──────────────────────────────────────────────────────────
declare -A MAC_NAMES
MAC_LIST=()

if [ -f "$MACS_JSON" ]; then
    info "Carregando de $MACS_JSON..."
    TOTAL=$(python3 -c "import json,sys; d=json.load(open('$MACS_JSON')); print(len(d['machines']))" 2>/dev/null || echo 0)
    if [ "$TOTAL" -gt 0 ]; then
        python3 -c "
import json,sys
d=json.load(open('$MACS_JSON'))
for m in d['machines']:
    mac = m['mac'].lower().replace('-',':')
    name = m['host']
    print(f'{mac} {name}')
" | while read -r mac nome; do
            MAC_LIST+=("$mac")
            MAC_NAMES["$mac"]="$nome"
        done
        info "Carregados $TOTAL MACs de macs.json"
    fi
fi

if [ ${#MAC_LIST[@]} -eq 0 ] && [ -f "$MACS_FILE" ]; then
    info "Fallback para $MACS_FILE..."
    while read -r mac nome _; do
        mac=$(echo "$mac" | tr '[:upper:]' '[:lower:]' | tr '-' ':')
        [[ -z "$mac" || "$mac" == \#* ]] && continue
        if ! echo "$mac" | grep -qiE '^([0-9a-f]{2}:){5}[0-9a-f]{2}$'; then
            warn "MAC inválido ignorado: $mac"
            continue
        fi
        MAC_LIST+=("$mac")
        MAC_NAMES["$mac"]="${nome:-$mac}"
    done < "$MACS_FILE"
fi

TOTAL=${#MAC_LIST[@]}
if [ "$TOTAL" -eq 0 ]; then
    fail "Nenhum MAC encontrado (verifique macs.json ou macs.txt)"
    exit 1
fi
info "Total: $TOTAL MACs"

# ── Escanear rede ──────────────────────────────────────────────────────────
scan_network() {
    local tmpfile="$1"
    info "Escaneando rede local..."

    # Estratégia 1: arp-scan (melhor)
    if command -v arp-scan &>/dev/null; then
        info "Usando arp-scan..."
        # Descobre rede automaticamente
        local iface
        iface=$(ip route | grep default | awk '{print $5}' | head -1)
        local network
        network=$(ip -4 addr show "$iface" | grep inet | awk '{print $2}' | head -1)
        
        if [ -n "$network" ]; then
            sudo arp-scan --localnet --interface "$iface" 2>/dev/null | \
                grep -E '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+' | \
                awk '{print $1"\t"$2}' > "$tmpfile"
            ok "arp-scan concluído: $(wc -l < "$tmpfile") hosts encontrados"
            return 0
        fi
    fi

    # Estratégia 2: nmap (fallback)
    if command -v nmap &>/dev/null; then
        info "Usando nmap..."
        local network
        network=$(ip -4 addr show | grep inet | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
        if [ -n "$network" ]; then
            sudo nmap -sn -n "$network" 2>/dev/null | \
                grep -E 'Nmap scan|MAC Address' | \
                paste - - | \
                sed 's/.*Nmap scan report for //;s/.*MAC Address: //;s/  (.*//' | \
                awk '{print $1"\t"$2}' > "$tmpfile"
            ok "nmap concluído: $(wc -l < "$tmpfile") hosts encontrados"
            return 0
        fi
    fi

    # Estratégia 3: ping broadcast + ip neigh (fallback universal)
    info "Usando ping broadcast + ip neigh..."
    local network
    network=$(ip -4 addr show | grep inet | grep -v 127.0.0.1 | awk '{print $2}' | head -1)
    if [ -n "$network" ]; then
        local base
        base=$(echo "$network" | cut -d. -f1-3)
        # ping em toda a faixa (rápido, 1 pacote cada)
        for i in $(seq 1 254); do
            ping -c1 -W1 "${base}.${i}" &>/dev/null &
        done
        wait
        # ler ARP cache
        ip neigh show | grep -E 'REACHABLE|STALE|DELAY' | \
            awk '{print $1"\t"$5}' > "$tmpfile"
        ok "ARP cache: $(wc -l < "$tmpfile") entradas encontradas"
        return 0
    fi

    fail "Nenhum método de escaneamento disponível"
    warn "Instale: apt-get install arp-scan"
    return 1
}

# ── Casar MACs com IPs ─────────────────────────────────────────────────────
match_macs() {
    local scan_file="$1"
    local found=0
    local not_found=0

    echo ""
    header "CORRESPONDÊNCIA MAC → IP"
    printf "${BOLD}%-20s %-20s %-20s %s${NC}\n" "MAC" "IP" "NOME" "STATUS"
    echo "────────────────────────────────────────────────────────────────────"

    > "$HOSTS_FILE"

    for mac in "${MAC_LIST[@]}"; do
        local nome="${MAC_NAMES[$mac]}"
        local ip=""
        ip=$(grep -i "$mac" "$scan_file" | awk '{print $1}' | head -1)

        if [ -n "$ip" ]; then
            echo "$ip  $nome  $mac" >> "$HOSTS_FILE"
            printf "%-20s %-20s %-20s ${GREEN}✅${NC}\n" "$mac" "$ip" "$nome"
            ((found++))
        else
            echo "# NAO_ENCONTRADO  $nome  $mac" >> "$HOSTS_FILE"
            printf "%-20s %-20s %-20s ${RED}❌${NC}\n" "$mac" "?" "$nome"
            ((not_found++))
        fi
    done

    echo ""
    echo -e "${GREEN}✅ Encontrados: $found${NC}  ${RED}❌ Não encontrados: $not_found${NC}  |  Total: $TOTAL"
    echo ""

    if [ "$found" -gt 0 ]; then
        ok "hosts.txt gerado em $HOSTS_FILE"
    fi

    return "$not_found"
}

# ── Modo status ────────────────────────────────────────────────────────────
if [ "$MODE" = "status" ] && [ -f "$HOSTS_FILE" ]; then
    header "HOSTS DESCOBERTOS"
    echo ""
    awk '{printf "%-16s %-20s %s\n", $1, $2, $3}' "$HOSTS_FILE" 2>/dev/null || echo "(vazio)"
    echo ""
    info "Para rescannear: $0 --scan"
    exit 0
fi

# ── Execução principal ────────────────────────────────────────────────────
# Sempre escaneia se pediu --scan ou se hosts.txt não existe
if [ "$MODE" = "scan" ] || [ ! -f "$HOSTS_FILE" ] || [ "$MODE" = "auto" ]; then
    scan_network "$RESULTS_FILE"
    match_macs "$RESULTS_FILE"
    rm -f "$RESULTS_FILE"
else
    info "Usando hosts.txt existente. Use --scan para rescannear."
    cat "$HOSTS_FILE"
fi

# ── Modo save ──────────────────────────────────────────────────────────────
if [ "$MODE" = "save" ]; then
    info "hosts.txt salvo com $(wc -l < "$HOSTS_FILE") entradas"
fi

echo ""
info "Pronto! Agora execute:"
echo "  python3 dod/dashboard.py        # interface web"
echo "  ./dod/tracker.sh                # terminal"
echo ""
