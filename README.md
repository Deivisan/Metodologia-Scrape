# 🕷️ Metodologia-Scrape

> **Framework universal para captura e processamento de conversas de IA**  
> Transforme conversas efêmeras em contexto persistente e acionável

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)](https://github.com/Deivisan/Metodologia-Scrape)
[![Bun](https://img.shields.io/badge/runtime-Bun-ff69b4.svg)](https://bun.sh)
[![Status](https://img.shields.io/badge/status-production-success.svg)](https://github.com/Deivisan/Metodologia-Scrape)

---

## 🎯 O Que é Isso?

**Metodologia-Scrape** é um framework completo para **capturar, processar e orquestrar** conversas de IA (Grok Share, ChatGPT, Claude, etc.), permitindo:

- ✅ **Captura completa** de conversas públicas sem API key
- ✅ **Bypass inteligente** de Cloudflare e proteções anti-bot
- ✅ **Múltiplas metodologias** (Puppeteer Stealth, HTTP leve, APIs externas)
- ✅ **Contexto estruturado** para consumo por agentes AGI
- ✅ **MCP Server** para integração com OpenCode, VSCode, etc.
- ✅ **Sistema de aliases** para automação de workflows via voz

---

## 🚀 Quick Start

### Instalação

```bash
# Clone do repositório
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape

# Instalar dependências (Bun obrigatório)
bun install

# Testar captura standalone
cd packages/mcp-grok-scraper
bun run tests/test-standalone.ts
```

### Uso Básico (MCP Full)

```bash
# Iniciar MCP Server com Puppeteer Stealth
bun run start

# Ou usar versão leve (HTTP simples)
bun run start:light
```

### Exemplo de Código

```typescript
import { grokScrape, grokContext } from 'mcp-grok-scraper';

// Capturar conversa do Grok Share
const result = await grokScrape({
  url: 'https://grok.com/share/c2hhcmQtMg_...',
  headless: true,
  saveHtml: true,
  saveScreenshot: false
});

// Obter contexto formatado para AI
const context = await grokContext({ uuid: result.uuid });
console.log(context.summary); // Resumo da conversa
console.log(context.messages); // Array de mensagens
```

---

## 📚 Metodologias Disponíveis

### 1️⃣ **Puppeteer Stealth** (Recomendado ✅)

**Status:** ✅ **Funcionando** (testado e validado)

**Características:**
- Bypass total de Cloudflare (~19s de espera)
- Headless mode (background completo)
- Anti-detecção avançada (remove webdriver flags)
- Seletores robustos com múltiplos fallbacks
- Scroll inteligente para lazy loading
- Outputs: JSON, Markdown, HTML, Screenshot

**Performance:**
- ⏱️ ~20s por conversa (incluindo Cloudflare)
- 📊 182 mensagens extraídas em média
- 💾 ~500KB por captura (JSON + MD + HTML)

**Quando usar:**
- Sites com Cloudflare/WAF
- Conversas longas (>100 mensagens)
- Necessidade de screenshot/HTML completo

**Arquivos:**
- `packages/mcp-grok-scraper/index-full.ts` (600+ linhas)
- `packages/mcp-grok-scraper/tests/test-standalone.ts` (validação)

---

### 2️⃣ **HTTP Leve** (Fallback)

**Status:** ✅ **Funcionando** (versão simplificada)

**Características:**
- Sem Puppeteer (mais leve)
- HTTP simples com `follow-redirects`
- Ideal para sites sem proteção
- Rápido (~3s por conversa)

**Limitações:**
- ❌ Não funciona com Cloudflare
- ❌ Não captura conteúdo dinâmico (JS)
- ❌ Sem screenshot

**Quando usar:**
- Sites públicos sem proteção
- Capturas rápidas de texto
- Ambientes com recursos limitados

**Arquivos:**
- `packages/mcp-grok-scraper/index.ts` (versão leve)

---

### 3️⃣ **Firecrawl API** (Planejado 📋)

**Status:** 🔄 **Em desenvolvimento**

**Características previstas:**
- API-first (sem browser local)
- Bypass enterprise de Cloudflare
- Crawling distribuído
- Taxa de sucesso >99%

**Quando usar:**
- Ambientes serverless
- Escalabilidade horizontal
- Necessidade de API key própria

**Roadmap:**
- [ ] Integração com Firecrawl MCP
- [ ] Testes comparativos vs Puppeteer
- [ ] Documentação de setup

---

### 4️⃣ **Exa Search** (Planejado 📋)

**Status:** 🔄 **Em desenvolvimento**

**Características previstas:**
- Busca semântica AI-powered
- Extração de contexto inteligente
- Suporte a múltiplas fontes

**Quando usar:**
- Busca de conversas específicas
- Análise semântica avançada
- Agregação multi-fonte

**Roadmap:**
- [ ] Pesquisa de viabilidade
- [ ] Integração com Exa API
- [ ] Testes de qualidade de extração

---

### 5️⃣ **Tavily Extract** (Planejado 📋)

**Status:** 🔄 **Em desenvolvimento**

**Características previstas:**
- API de extração especializada
- Suporte a sites complexos
- Parsing inteligente de HTML

**Quando usar:**
- Sites com estrutura complexa
- Necessidade de parsing customizado
- Integração com Tavily MCP

**Roadmap:**
- [ ] Pesquisa de API Tavily
- [ ] Validação de extração
- [ ] Comparação de qualidade vs Puppeteer

---

## 🛠️ MCP Server (Model Context Protocol)

### O Que é MCP?

**MCP** permite que agentes AI (OpenCode, VSCode Copilot, etc.) acessem ferramentas externas de forma padronizada. Este projeto fornece um **MCP Server completo** para captura de conversas.

### Ferramentas Disponíveis

| Tool | Descrição | Inputs | Outputs |
|------|-----------|--------|---------|
| `grok_scrape` | Captura conversa do Grok Share | `url`, `headless`, `saveHtml`, `saveScreenshot` | `uuid`, `path`, `messageCount` |
| `grok_read` | Lê captura existente | `uuid`, `format` (json/markdown/text) | Conteúdo formatado |
| `grok_list` | Lista todas capturas | `outputDir` (opcional) | Array de capturas |
| `grok_context` | Gera contexto para AI | `uuid` (opcional) | Resumo + mensagens estruturadas |

### Configuração OpenCode

```json
{
  "mcpServers": {
    "grok-scraper-full": {
      "command": ["bun", "run", "C:\\Projetos\\Metodologia-Scrape\\packages\\mcp-grok-scraper\\index-full.ts"],
      "env": {
        "HEADLESS": "true",
        "OUTPUT_DIR": "C:\\Projetos\\Metodologia-Scrape\\captures"
      }
    }
  }
}
```

### Workflow com Agentes

```typescript
// Quando agente recebe link do Grok Share
if (url.includes('grok.com/share')) {
  // 1. Capturar automaticamente
  const result = await grok_scrape({ url, headless: true });
  
  // 2. Obter contexto
  const context = await grok_context({ uuid: result.uuid });
  
  // 3. Agente tem memória completa da conversa!
  // Pode responder com contexto total
}
```

---

## 🧪 Testes Automatizados

### Sistema de Testes

```bash
# Teste único (modo rápido)
bun run test:single

# Teste completo (todos os links)
bun run test

# Teste standalone (sem MCP)
cd packages/mcp-grok-scraper
bun run tests/test-standalone.ts
```

### Resultados Esperados

```
✅ TESTE ÚNICO CONCLUÍDO
📊 Tempo total: 19.06s
📝 Mensagens extraídas: 182
🔍 Cloudflare bypass: OK
💾 Arquivo salvo: test_1768675109033.json
```

### Validação

Os testes verificam:
- ✅ Bypass de Cloudflare (aguarda "Just a moment" sumir)
- ✅ Extração completa de mensagens (múltiplos seletores)
- ✅ Geração de arquivos (JSON, MD, HTML)
- ✅ Performance (<30s por conversa)
- ✅ Robustez (retry automático em falhas)

---

## 📁 Estrutura do Projeto

```
Metodologia-Scrape/
├── README.md                          # Este arquivo
├── CHANGELOG.md                       # Histórico de versões
├── ROADMAP.md                         # Planejamento de features
├── PROMPT_MASTER_V3.md                # Sistema SAL (aliases voz)
├── AGENTS.md                          # Contexto para agentes AGI
├── packages/
│   └── mcp-grok-scraper/              # MCP Server principal
│       ├── index.ts                   # Versão leve (HTTP)
│       ├── index-full.ts              # Versão completa (Puppeteer)
│       ├── package.json               # Dependências
│       ├── tests/
│       │   ├── test-standalone.ts     # Teste sem MCP ✅
│       │   ├── test-all.ts            # Testes completos
│       │   └── test-single.ts         # Teste único
│       └── captures/                  # Capturas geradas
├── captures/                          # Capturas globais
└── scrape-grok.js                     # Script standalone legado
```

---

## 🎭 Sistema de Aliases (Modo Voz)

### O Que São Aliases?

**Aliases** são **palavras-gatilho de 2 palavras** que ativam workflows complexos **apenas em modo voz** (Grok Voice no celular/desktop).

⚠️ **IMPORTANTE:** Aliases **NÃO funcionam** em MCP/OpenCode/CLI. São exclusivos para interação por voz.

### Exemplos de Aliases

| Alias | Ação Automatizada |
|-------|-------------------|
| `/resumo-semanal` | Busca commits da semana, analisa código, gera resumo |
| `/noticias-tech` | Pesquisa 7 fontes tech, resume novidades relevantes |
| `/ideia-rapida` | Acessa contexto pessoal, gera ideia alinhada com goals |
| `/bug-hunter` | Analisa últimos commits, detecta bugs comuns |
| `/prompt-magico` | Gera prompt otimizado baseado em contexto atual |

### Como Criar Aliases

Veja **PROMPT_MASTER_V3.md** (586 linhas) para:
- Sistema completo de aliases
- Personalidade SAL argumentativa
- Workflows automatizados
- Integração com repositórios

---

## 🌐 Integração com Outros Projetos

### FinanDEV

Projeto **PRIVADO** de desenvolvimento financeiro que usa este framework para:
- Capturar conversas sobre estratégias financeiras
- Processar análises de mercado
- Gerar relatórios automatizados

### DevSan AGI

Sistema de **agentes AGI** que usa MCP Grok Scraper para:
- Memória persistente entre sessões
- Contexto completo de conversas anteriores
- Automação de workflows complexos

### DeiviTech

Projetos comerciais que usam para:
- Análise de feedback de clientes
- Captura de requisitos em conversas
- Documentação automática de sessões

---

## 📊 Comparação de Metodologias

| Metodologia | Status | Cloudflare | Performance | Outputs | Custo |
|-------------|--------|------------|-------------|---------|-------|
| **Puppeteer Stealth** | ✅ Pronto | ✅ Bypass OK | ~20s | JSON/MD/HTML/Screenshot | 0 (local) |
| **HTTP Leve** | ✅ Pronto | ❌ Não funciona | ~3s | JSON/MD | 0 (local) |
| **Firecrawl** | 📋 Planejado | ✅ Bypass enterprise | ~3s | JSON/MD/HTML | API key (pago) |
| **Exa Search** | 📋 Planejado | ✅ Busca semântica | ~5s | JSON estruturado | API key (pago) |
| **Tavily Extract** | 📋 Planejado | ✅ Parsing inteligente | ~4s | JSON/MD | API key (pago) |

---

## 🚧 Roadmap

### Fase 1 - Concluída ✅
- [x] MCP Grok Scraper funcional
- [x] Puppeteer Stealth configurado
- [x] PROMPT MASTER agentico
- [x] Documentação consolidada

### Fase 2 - Em Andamento 🔄 (85%)
- [x] Sistema de aliases (PROMPT_MASTER_V3.md)
- [x] MCP Full com Puppeteer Stealth
- [x] Testes automatizados
- [x] Teste standalone validado
- [ ] README profissional (este arquivo)
- [ ] CHANGELOG.md para v2.0.0
- [ ] Integração Firecrawl/Exa/Tavily

### Fase 3 - Próximos Passos 📋
- [ ] **Cache de capturas** - Evitar re-scraping
- [ ] **Suporte a múltiplos idiomas** - EN, ES, PT-BR
- [ ] **API REST** - Endpoints para integrações
- [ ] **Dashboard web** - Visualização de capturas
- [ ] **Integração Mem0** - Contexto persistente
- [ ] **Templates por tipo** - Next.js, React, CLI, etc.
- [ ] **Python multithreading** - Paralelização de capturas
- [ ] **Escolha de navegador** - Chromium, Firefox, WebKit

### Fase 4 - JARVIS-like System 🤖
- [ ] **Sistema de voz completo** - Comandos naturais
- [ ] **Multi-agentes** - Orquestração inteligente
- [ ] **Memória de longo prazo** - Graph database
- [ ] **Aprendizado contínuo** - Feedback loops

### Fase 5 - Ecosystem 🌍
- [ ] **Marketplace de aliases** - Compartilhar workflows
- [ ] **Plugins community** - Extensibilidade
- [ ] **Suporte a outras plataformas** - ChatGPT, Claude, etc.
- [ ] **Mobile app** - Android/iOS

---

## 🤝 Como Contribuir

### Para Desenvolvedores

```bash
# Fork do repositório
git clone https://github.com/SEU_USER/Metodologia-Scrape.git
cd Metodologia-Scrape

# Criar branch para feature
git checkout -b feature/minha-feature

# Fazer modificações e testar
bun run test

# Commit com mensagem descritiva
git commit -m "feat: adiciona suporte a Firefox"

# Push e PR
git push origin feature/minha-feature
```

### Áreas de Contribuição

- 🐛 **Bug fixes** - Correções de bugs
- ✨ **Features** - Novas funcionalidades
- 📝 **Documentação** - Melhorias em docs
- 🧪 **Testes** - Cobertura de testes
- 🎨 **UI/UX** - Dashboard web
- 🌐 **Internacionalização** - Traduções

---

## 📄 Licença

**MIT License** - Livre para uso comercial e pessoal.

Veja [LICENSE](LICENSE) para detalhes.

---

## 🔗 Links Úteis

- **GitHub:** https://github.com/Deivisan/Metodologia-Scrape
- **Issues:** https://github.com/Deivisan/Metodologia-Scrape/issues
- **Discussions:** https://github.com/Deivisan/Metodologia-Scrape/discussions
- **Author:** [@deivisan](https://github.com/Deivisan)

---

## 💡 Filosofia

### Princípios Core

- **Capture primeiro** - Todo link merece ser capturado
- **Execute sem medo** - "Anything is possible"
- **Documente tudo** - README, METODOLOGIA, Commits
- **Memória persistente** - Contexto nunca se perde
- **Código robusto > Código bonito** - Funciona em silêncio
- **Bun First** - Runtime moderno e rápido

### Por Que Este Projeto Existe?

Conversas de IA são **efêmeras por padrão**. Quando você fecha a aba, perde o contexto. Este framework transforma conversas em **memória persistente**, permitindo:

- 🧠 **AGI com memória** - Agentes lembram de tudo
- 📊 **Análise de padrões** - Insights sobre conversas
- 🔄 **Continuidade** - Retomar contexto a qualquer momento
- 🤖 **Automação** - Workflows baseados em conversas

### Tecnologias Usadas

- **Runtime:** Bun 1.3.5 (NUNCA Node.js)
- **Scraping:** Puppeteer Stealth 24.33.0
- **MCP:** @modelcontextprotocol/sdk 1.25.2
- **Browser:** Chromium bundled
- **Linguagem:** TypeScript 5.3
- **Testes:** Bun test (nativo)

---

## 🎓 Aprenda Mais

### Documentos Técnicos

- **METODOLOGIA_CONSOLIDADA.md** - Metodologia técnica completa
- **PROMPT_MASTER_V3.md** - Sistema SAL e aliases
- **AGENTS.md** - Contexto para agentes AGI
- **ROADMAP.md** - Planejamento detalhado (5 fases)

### Tutoriais (em breve)

- [ ] Como criar aliases customizados
- [ ] Integrando com OpenCode
- [ ] Criando plugins para outros sites
- [ ] Usando em ambientes serverless

---

## 🙏 Agradecimentos

- **Grok Team** - Por criar uma plataforma incrível
- **Puppeteer Team** - Ferramenta essencial para scraping
- **Bun Team** - Runtime moderno que torna tudo possível
- **MCP Community** - Protocolo aberto para AI tools

---

**🚀 Versão:** 2.0.0  
**📅 Data:** 17/01/2026  
**👤 Autor:** Deivison Santana (@deivisan)  
**💼 Empresa:** DeiviTech  
**🎯 Missão:** Transformar conversas em contexto persistente

---

> _"Código robusto funciona em silêncio. Capturamos, processamos, orquestramos."_  
> — **DevSan**, AGI de Deivison Santana
