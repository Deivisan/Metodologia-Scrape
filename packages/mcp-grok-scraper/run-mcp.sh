#!/bin/bash
cd "$(dirname "$0")"
exec bun run dist/index.js
