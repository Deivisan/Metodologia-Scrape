#!/bin/bash
# Wrapper para grok-scraper MCP
# Garante que o processo não fecha prematuramente

cd "$(dirname "$0")"

# Executar e capturar output
exec bun run dist/index.js
