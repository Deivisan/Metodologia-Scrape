# 🎯 MCP Grok Scraper v2.1 - Google Chrome Edition

**Model Context Protocol Server para captura de conversas do Grok Share - Versão COMPLETA**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Descrição

Servidor MCP que fornece tools para agentes AI capturarem e acessarem conversas do Grok Share.

**✅ V2.1 CORRIGIDO:**
- **Google Chrome Stable** (não Chromium!) em `/usr/bin/google-chrome-stable`
- Puppeteer Stealth com anti-detecção avançada
- Captura **TUDO** - 925+ trechos de texto
- Scroll automático com retry
- Salva JSON completo + Markdown formatado

---

## 🚀 Instalação

```bash
cd packages/mcp-grok-scraper

# Instalar dependências
bun install

# Rodar servidor MCP
bun run start
```

---

## 🔧 Configuração

### OpenCode/Claude Code

```json
{
  "mcpServers": {
    "grok-scraper": {
      "command": ["bun", "run", "/home/deivi/Projetos/Metodologia-Scrape/packages/mcp-grok-scraper/index-full.ts"],
      "env": {
        "CHROME_PATH": "/usr/bin/google-chrome-stable"
      }
    }
  }
}
```

### Variáveis de Ambiente

| Variável | Valor Padrão | Descrição |
|----------|-------------|-----------|
| `CHROME_PATH` | `/usr/bin/google-chrome-stable` | Path do Chrome |
| `HEADLESS` | `true` | Rodar sem interface |
| `BROWSER` | `chrome-stable` | Browser a usar |

---

## 🎯 Ferramentas MCP

| Tool | Descrição |
|------|-----------|
| `grok_scrape` | Captura conversa do Grok Share com Chrome + Puppeteer |
| `grok_read` | Lê uma captura existente por UUID |
| `grok_list` | Lista todas as capturas |
| `grok_context` | Retorna contexto formatado para agentes AI |

---

## 📖 Uso

### Capturar conversa

```typescript
// Via MCP tool
await grok_scrape({
  url: 'https://grok.com/share/...',
  saveHtml: true,
  saveScreenshot: true
});
```

### Listar capturas

```typescript
await grok_list();
// Retorna: { captures: [{ uuid, url, title, messageCount, capturedAt }] }
```

### Obter contexto

```typescript
await grok_context();
// Retorna toda a conversa formatada em Markdown
```

---

## 📊 Resultado da Captura (Teste PsyConnect)

```
✅ Captura completa com SUCESSO!

📁 Arquivos gerados:
├── psyconnect_1770429456346.json       # Light (276K)
├── psyconnect_1770429456346_full.json  # Completo (1.1M)
└── psyconnect_1770429456346.md         # Markdown (299K)

📊 Estatísticas:
   - Textos únicos extraídos: 925
   - Scrolls realizados: 50
   - Mensagens estruturadas: ~182
   - Tempo de captura: ~90s
```

---

## 🧪 Teste Rápido

```bash
# Verificar Chrome
google-chrome --version

# Capturar teste
bun run capture-psyconnect.ts

# Ou rodar servidor MCP
bun run start
```

---

## 📁 Estrutura de Arquivos

```
mcp-grok-scraper/
├── index-full.ts         # 🎯 PRINCIPAL - Versão completa (Chrome + Puppeteer)
├── index.ts              # Versão leve (HTTP, sem Puppeteer)
├── capture-psyconnect.ts  # Script de teste
├── package.json
├── README.md
└── captures/             # Capturas geradas
    ├── *.json            # Dados estruturados
    ├── *_full.json       # Dados completos + allTexts
    └── *.md              # Markdown formatado
```

---

## 🔧 Comparação de Versões

| Feature | index.ts (Light) | index-full.ts (Full) |
|---------|-----------------|---------------------|
| **Browser** | HTTP Only | Google Chrome Stable |
| **Cloudflare** | ❌ Não bypassa | ✅ Bypass automático |
| **Captura** | Título + HTML | TUDO + textos |
| **Screenshot** | ❌ | ✅ Opcional |
| **Seletores** | 8 básicos | 25+ avançados |
| **Scroll** | 50x | 100x + retry |
| **Texto extraído** | ~50 trechos | ~925 trechos |

---

## 🛠️ Desenvolvimento

```bash
# Desenvolvimento com watch
bun run dev

# Build para produção
bun run build

# Teste standalone
bun run test-standalone.ts
```

---

## 📄 Licença

MIT License

---

**🎓 Parte da Metodologia-Scrape v7.6**
**🛠️ Corrigido em 2026-02-06**: Google Chrome Stable + anti-detecção + captura total
