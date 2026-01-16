# 🎯 MCP Grok Scraper

**Model Context Protocol Server para captura de conversas do Grok Share**

[![npm version](https://img.shields.io/npm/v/mcp-grok-scraper.svg)](https://npmjs.com/package/mcp-grok-scraper)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Descrição

Servidor MCP que fornece tools para agentes AI capturarem e acessarem conversas do Grok Share com memória persistente.

## 🚀 Instalação

```bash
# Instalar dependências
bun install

# Build
bun run build
```

## 🎯 Usage

### Como servidor MCP

```bash
# Rodar o servidor
bun run start
# ou
node dist/index.js
```

### Como módulo Bun

```typescript
import { grokScrape, grokRead, grokContext } from 'mcp-grok-scraper';

// Capturar conversa
const result = await grokScrape({
  url: 'https://grok.com/share/c2hhcmQtMg_...',
  outputDir: './captures',
  saveHtml: true,
  saveScreenshot: true
});

// Ler contexto
const context = await grokContext({
  uuid: 'grok_1736899200000'
});
```

## 🔧 Ferramentas disponíveis

| Tool | Descrição |
|------|-----------|
| `grok_scrape` | Captura uma conversa do Grok Share |
| `grok_read` | Lê uma captura existente |
| `grok_list` | Lista todas as capturas |
| `grok_context` | Retorna contexto para agentes |

## 📝 Exemplo de uso

```typescript
// Capturar conversa
await grokScrape({
  url: 'https://grok.com/share/c2hhcmQtMg_4afc2b31-2aca-48ff-b6fe-0c680b805199',
  saveHtml: true,
  saveScreenshot: true
});

// O agente pode agora ler o contexto
const { context } = await grokContext({
  uuid: 'grok_1736899200000'
});
```

## 🔗 Integração com Agentes

### OpenCode / Claude Desktop

```json
{
  "mcpServers": {
    "grok-scraper": {
      "command": "node",
      "args": ["/path/to/mcp-grok-scraper/dist/index.js"],
      "env": {}
    }
  }
}
```

### DevSan (OpenCode Agent)

Atualize o prompt do DevSan para usar automaticamente:

```typescript
// Quando receber link do Grok Share
if (url.includes('grok.com/share')) {
  const result = await mcp_grok_scrape({ url });
  const context = await mcp_grok_context({ uuid: result.uuid });
  // Usar contexto na conversa
}
```

## 📁 Estrutura de arquivos

```
mcp-grok-scraper/
├── index.ts          # Servidor MCP principal
├── package.json      # Configuração npm
├── bunfig.toml       # Build config
├── README.md         # Documentação
├── dist/             # Arquivos compilados
└── captures/         # Capturas geradas
```

## 🧪 Testes

```bash
bun test
```

## 📄 Licença

MIT License - see LICENSE file

---

**🎓 Parte da Metodologia-Scrape v7.5**
