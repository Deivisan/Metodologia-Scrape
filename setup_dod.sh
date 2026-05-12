#!/bin/bash
#=============================================================================
# setup_dod.sh — Wrapper que executa dod/setup_dod.sh
# Útil para execução local. Prefira o bootstrap para instalação remota.
#
# Uso: sudo ./setup_dod.sh
#=============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOD_SCRIPT="$SCRIPT_DIR/dod/setup_dod.sh"

if [ -f "$DOD_SCRIPT" ]; then
    exec bash "$DOD_SCRIPT" "$@"
else
    echo "✗ Script não encontrado: $DOD_SCRIPT"
    echo "Execute a partir da raiz do repositório Metodologia-Scrape."
    echo ""
    echo "Alternativa via curl:"
    echo "  curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash"
    exit 1
fi
