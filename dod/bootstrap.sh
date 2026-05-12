#!/bin/bash
#=============================================================================
# bootstrap.sh — DevOpsDays FSA Bootstrap Loader
# 
# Uso: curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash
#       curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash -s -- --teardown
#       curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash -s -- --verify
#
# Flags:
#   --teardown   Executa teardown (limpeza total)
#   --verify     Executa verificação pós-setup
#   --help       Mostra ajuda
#=============================================================================
set -euo pipefail

REPO_OWNER="Deivisan"
REPO_NAME="Metodologia-Scrape"
BRANCH="master"
BASE_URL="https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/dod"

# cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

MODE="setup"

usage() {
    echo "Uso: curl -fsSL ${BASE_URL}/bootstrap.sh | sudo bash [-- <flags>]"
    echo ""
    echo "Flags:"
    echo "  --teardown   Remove tudo (limpeza total)"
    echo "  --verify     Verifica instalação"
    echo "  --help       Mostra esta ajuda"
    exit 0
}

# parse flags
for arg in "$@"; do
    case "$arg" in
        --teardown) MODE="teardown" ;;
        --verify)   MODE="verify" ;;
        --help)     usage ;;
    esac
done

# pré-requisitos mínimos
for cmd in curl sudo; do
    if ! command -v "$cmd" &>/dev/null; then
        echo -e "${RED}✗ $cmd é obrigatório mas não está instalado${NC}"
        exit 1
    fi
done

case "$MODE" in
    setup)
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  Baixando e executando setup_dod.sh...${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        bash <(curl -fsSL "${BASE_URL}/setup_dod.sh")
        ;;
    teardown)
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  Baixando e executando teardown...${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        bash <(curl -fsSL "${BASE_URL}/teardown_dod.sh")
        ;;
    verify)
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${BLUE}  Baixando e executando verificação...${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        bash <(curl -fsSL "${BASE_URL}/verify_dod.sh")
        ;;
esac
