#!/bin/bash
#=============================================================================
# teardown_dod.sh — Wrapper que executa dod/teardown_dod.sh
#
# Uso: sudo ./teardown_dod.sh
#=============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOD_SCRIPT="$SCRIPT_DIR/dod/teardown_dod.sh"

if [ -f "$DOD_SCRIPT" ]; then
    exec bash "$DOD_SCRIPT" "$@"
else
    echo "✗ Script não encontrado: $DOD_SCRIPT"
    exit 1
fi
