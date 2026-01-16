# 🎯 MCP Grok Scraper v1.1

**Model Context Protocol Server para captura de conversas do Grok Share - Versão Leve**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 📋 Descrição

Servidor MCP que fornece tools para agentes AI capturarem e acessarem conversas do Grok Share.

**⚠️ Nota importante (v1.1):** Esta versão usa HTTP simples em vez de Puppeteer para evitar erros de bundling. Para páginas com Cloudflare, use Playwright MCP como alternativa.

## 🚀 Instalação

```bash
# Clone do repositório Metodologia-Scrape
cd packages/mcp-grok-scraper

# Instalar dependências
bun install

# Rodar diretamente (sem build!)
bun run start
```

## 🎯 Uso

### Como servidor MCP (OpenCode)

```json
{
  "mcpServers": {
    "grok-scraper": {
      "command": ["bun", "run", "C:\\Users\\Deivi\\Metodologia-Scrape\\packages\\mcp-grok-scraper\\index.ts"],
      "env": {}
    }
  }
}
```

### Como módulo Bun

```typescript
import { grokScrape, grokRead, grokContext, grokList } from 'mcp-grok-scraper';

// Capturar conversa
const result = await grokScrape({
  url: 'https://grok.com/share/...',
  outputDir: './captures',
  saveHtml: true
});

// Listar capturas
const list = await grokList();

// Ler contexto
const context = await grokContext({
  uuid: result.uuid
});
```

## 🔧 Ferramentas disponíveis

| Tool | Descrição |
|------|-----------|
| `grok_scrape` | Captura uma conversa do Grok Share |
| `grok_read` | Lê uma captura existente |
| `grok_list` | Lista todas as capturas |
| `grok_context` | Retorna contexto para agentes |

## 📝 Exemplo de uso com Agente DevSan

```typescript
// Quando receber link do Grok Share
if (url.includes('grok.com/share')) {
  // 1. Capturar
  await grok_scrape({ url, saveHtml: true });
  
  // 2. Obter contexto
  const { context } = await grok_context();
  
  // 3. Usar na conversa
}
```

## 📁 Estrutura de arquivos

```
mcp-grok-scraper/
├── index.ts          # Servidor MCP principal (v1.1 - leve, sem Puppeteer)
├── package.json      # Configuração npm
├── README.md         # Documentação
└── captures/         # Capturas geradas
```

## 🧪 Testes

```bash
bun run start
# O servidor deve exibir:
# 🚀 MCP Grok Scraper v1.1 rodando...
# 📋 Available tools: grok_scrape, grok_read, grok_list, grok_context
```

## 📄 Licença

MIT License

---

**🎓 Parte da Metodologia-Scrape v7.6**
**🛠️ Corrigido em 2026-01-16**: Removido Puppeteer, adicionado @modelcontextprotocol/sdk e follow-redirects
