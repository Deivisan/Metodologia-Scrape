# 🕷️ Metodologia Scrape

> **Versão:** 8.0 (MCP Grok Scraper + Puppeteer Stealth)  
> **Status:** ✅ PRODUÇÃO - Captura funcionando 100%  
> **Foco:** Extração de conversas Grok Share para AGI pessoal

---

## 🏆 O QUE FUNCIONA (RANKED)

### 1️⃣ MCP Grok Scraper ⭐ RECOMENDADO
**Status:** ✅ Funcionando 100% | **Tempo:** ~5s | **API Key:** Não necessária

```typescript
// Ferramentas disponíveis:
grok_scrape({ url })      // Captura conversa
grok_context(captureId)   // Gera contexto para AGI
grok_list()               // Lista capturas
grok_read(uuid)           // Lê captura existente
```

**Instalação:** `packages/mcp-grok-scraper/`

**Por que funciona:**
- Puppeteer Stealth: bypass de detecção automática
- Links Grok Share são PÚBLICOS (370k+ indexados)
- Sem login necessário
- Link permanente para toda conversa

---

### 2️⃣ PROMPT MASTER AGENTICO ⭐ NOVO
**Status:** ✅ Pronto para uso

Copie e cole no Grok ao iniciar projetos:
```bash
PROMPT_MASTER.md  # Prompt agentico completo
```

**Contém:**
- Identidade DevSan AGI
- Regras de ouro (capture primeiro, execute sem perguntas)
- Artefatos de memória (Bun, Next.js, Tailwind, Framer Motion)
- Fluxo de trabalho padronizado

---

### 3️⃣ Capturas Manuais (Script)
**Status:** ✅ Funcionando

```bash
bun run scrape-grok.js "https://grok.com/share/..."
```

Gera: JSON + Markdown + HTML + Screenshot

---

## ❌ O QUE NÃO FUNCIONA

| Método | Motivo |
|--------|--------|
| ~~Firecrawl MCP~~ | Requer API key (não temos) |
| ~~Playwright simples~~ | Bloqueado por Cloudflare |
| ~~Puppeteer básico~~ | Detecta webdriver |

**Solução:** MCP Grok Scraper com Puppeteer Stealth ✅

---

## 🚀 Quick Start

### Para AGENTS/Agentes:

1. **Leia o contexto:**
   ```bash
   cat METODOLOGIA_CONSOLIDADA.md
   cat PROMPT_MASTER.md
   ```

2. **Quando receber link Grok:**
   ```typescript
   // Capturar automaticamente
   grok_scrape({ url: "link_grok" })
   
   // Gerar contexto
   grok_context()
   
   // Executar tarefas
   // Documentar
   // Commitar
   ```

### Para Uso Manual:

```bash
# Clone e use
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape
```

---

## 📁 Estrutura do Workspace

```
Metodologia-Scrape/
├── 📄 README.md                    ← Você está aqui
├── 📄 METODOLOGIA_CONSOLIDADA.md   ← Documentação completa
├── 📄 PROMPT_MASTER.md             ← Prompt para colar no GroK
├── 📁 packages/
│   └── 📁 mcp-grok-scraper/        ← MCP oficial (funciona!)
│       ├── index.ts
│       ├── package.json
│       └── README.md
├── 📁 captures/                    ← Capturas de conversas
└── 📁 logs/                        ← Logs de execução
```

---

## 🔗 Links Úteis

- **Conversa atual:** https://grok.com/share/c2hhcmQtMg_eb155646-3e5a-4f5c-834a-3df418e49201
- **Gerenciar links:** https://grok.com/share-links
- **GitHub:** https://github.com/Deivisan/Metodologia-Scrape

---

## 💡 Princípios

- **Capture primeiro** - Todo link merece ser capturado
- **Execute sem medo** - "Anything is possible"
- **Documente tudo** - README, METODOLOGIA, Commits
- **Memória persistente** - Mem0 MCP para contexto

---

**Status:** 🏆 PRONTO PARA PRODUÇÃO  
**Criado por:** Deivison Santana (@deivisan)  
**Versão:** 8.0 | **Data:** 15/01/2026
