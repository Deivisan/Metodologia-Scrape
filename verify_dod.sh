#!/bin/bash
#=============================================================================
# verify_dod.sh — Wrapper que executa dod/verify_dod.sh
#
# Uso: sudo ./verify_dod.sh
#=============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOD_SCRIPT="$SCRIPT_DIR/dod/verify_dod.sh"

if [ -f "$DOD_SCRIPT" ]; then
    exec bash "$DOD_SCRIPT" "$@"
else
    echo "✗ Script não encontrado: $DOD_SCRIPT"
    exit 1
fi
