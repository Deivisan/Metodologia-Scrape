# 🚀 FASE 3 - PLANEJAMENTO DETALHADO
## Integração Firecrawl API + Benchmarks Comparativos

**Status:** 📋 Planejamento iniciado  
**Versão Base:** v2.0.1  
**Versão Alvo:** v2.1.0  
**Duração Estimada:** 2 semanas  
**Prioridade:** Alta (metodologia validada pendente de implementação)

---

## 🎯 OBJETIVOS DA FASE 3

### Primário
✅ **Implementar wrapper Firecrawl API** - Cliente TypeScript nativo  
✅ **Comparar performance** - Firecrawl vs Puppeteer Stealth vs HTTP Leve  
✅ **Documentar benchmarks** - Tabela comparativa de sucesso/velocidade/custo  

### Secundário
✅ **Explorar APIs alternativas** - Exa Search, Tavily Extract  
✅ **Multi-browser support** - Firefox, WebKit (Playwright)  
✅ **Testes automatizados** - Validar todas as metodologias  

---

## 📋 TAREFAS DETALHADAS

### 1️⃣ Firecrawl API Wrapper (Prioridade Máxima)

#### 1.1 Setup Inicial
**Arquivo:** `packages/mcp-grok-scraper/integrations/firecrawl.ts`

**Dependências:**
```bash
bun add @firecrawl/sdk
# OU (se SDK não disponível)
# HTTP client nativo do Bun (fetch)
```

**Configuração:**
```typescript
// .env
FIRECRAWL_API_KEY=fc-xxx
FIRECRAWL_BASE_URL=https://api.firecrawl.dev/v1  # ou endpoint custom
```

#### 1.2 Implementação
**Features obrigatórias:**
- ✅ Cliente TypeScript com retry automático
- ✅ Suporte a múltiplos formatos (markdown, html, text)
- ✅ Tratamento de rate limiting (30-60s wait)
- ✅ Validação de resultado (>10KB, sem Cloudflare challenge)
- ✅ Timeout configurável (padrão 30s)
- ✅ Logs detalhados (debug mode)

**Assinatura esperada:**
```typescript
interface FirecrawlOptions {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  formats?: ('markdown' | 'html' | 'text')[];
  maxAge?: number; // cache control
}

interface FirecrawlResult {
  success: boolean;
  markdown?: string;
  html?: string;
  text?: string;
  metadata?: {
    title: string;
    duration: number;
    statusCode: number;
  };
  error?: string;
}

async function scrapeWithFirecrawl(
  url: string,
  options: FirecrawlOptions
): Promise<FirecrawlResult>
```

#### 1.3 Integração com MCP
**Arquivo:** `packages/mcp-grok-scraper/index-firecrawl.ts`

Criar variante do MCP que usa Firecrawl ao invés de Puppeteer:
```typescript
server.tool(
  "grok_scrape_firecrawl",
  "Scrape Grok Share via Firecrawl API (bypass Cloudflare)",
  {
    url: z.string(),
    saveHtml: z.boolean().default(false),
    saveScreenshot: z.boolean().default(false),
    outputDir: z.string().optional()
  },
  async ({ url, saveHtml, outputDir }) => {
    const result = await scrapeWithFirecrawl(url, {
      apiKey: process.env.FIRECRAWL_API_KEY!,
      formats: ["markdown", "html"]
    });
    
    // Salvar outputs...
    return { content: [{ type: "text", text: result.markdown }] };
  }
);
```

#### 1.4 Testes
**Arquivo:** `packages/mcp-grok-scraper/tests/test-firecrawl.ts`

Validar:
- ✅ Conexão com API (auth válido)
- ✅ Scraping de link Grok Share conhecido
- ✅ Tratamento de rate limiting
- ✅ Comparação de resultado com Puppeteer (mesmo conteúdo?)
- ✅ Performance (tempo médio <10s)

---

### 2️⃣ Benchmark Comparativo

#### 2.1 Metodologias a Testar
1. **Puppeteer Stealth** (atual, v2.0.1)
2. **Firecrawl API** (nova)
3. **HTTP Leve** (baseline)
4. **Playwright + Chromium** (comparação)
5. **Exa Search** (exploratório)
6. **Tavily Extract** (exploratório)

#### 2.2 Métricas
**Por cada metodologia:**
- ✅ Taxa de sucesso (% de links funcionando)
- ✅ Tempo médio (s)
- ✅ Tempo mínimo/máximo (s)
- ✅ Tamanho médio do output (KB)
- ✅ Custo estimado ($ por 1000 capturas, se aplicável)
- ✅ Detecção Cloudflare (sim/não)
- ✅ Requisitos (Docker, API key, etc)

#### 2.3 Arquivo de Output
**Localização:** `benchmarks/BENCHMARK_RESULTS.md`

**Formato:**
```markdown
# 📊 BENCHMARK - Metodologias de Scraping
**Data:** 2026-01-17  
**Links testados:** 10 URLs Grok Share reais  
**Ambiente:** Windows 11, Bun 1.3.5, CPU Ryzen 7 5700G

## Resultados

| Metodologia | Taxa Sucesso | Tempo Médio | Min/Max | Tamanho Médio | Custo/1K | Cloudflare | Requisitos |
|------------|-------------|------------|---------|---------------|----------|-----------|-----------|
| Puppeteer Stealth | 100% | 19s | 15s/25s | 45KB | $0 | ❌ Bypass | Bun, Chromium |
| Firecrawl API | ? | ? | ? | ? | ~$5 | ❌ Bypass | API key |
| HTTP Leve | 0% | N/A | N/A | N/A | $0 | ✅ Bloqueado | Nenhum |
| Playwright | ? | ? | ? | ? | $0 | ? | Bun, browsers |
| Exa Search | ? | ? | ? | ? | ? | ? | API key |
| Tavily Extract | ? | ? | ? | ? | ? | API key |

## Recomendações
1. **Para uso pessoal:** Puppeteer Stealth (grátis, confiável)
2. **Para produção:** Firecrawl API (rápido, escalável)
3. **Para desenvolvimento:** Playwright (multi-browser)
```

#### 2.4 Script de Benchmark
**Arquivo:** `packages/mcp-grok-scraper/tests/benchmark-all.ts`

```typescript
// Pseudo-código
const testUrls = [
  "https://grok.com/share/xxx1",
  "https://grok.com/share/xxx2",
  // ... 10 links reais
];

const methodologies = [
  { name: "Puppeteer Stealth", fn: scrapePuppeteer },
  { name: "Firecrawl API", fn: scrapeFirecrawl },
  { name: "HTTP Leve", fn: scrapeHttp },
  { name: "Playwright", fn: scrapePlaywright },
  // { name: "Exa Search", fn: scrapeExa },  // se implementado
  // { name: "Tavily Extract", fn: scrapeTavily },  // se implementado
];

for (const method of methodologies) {
  const results = await benchmarkMethodology(method, testUrls);
  console.table(results);
}
```

**Outputs:**
- Console com tabelas (console.table)
- Arquivo Markdown detalhado
- JSON para análise posterior

---

### 3️⃣ APIs Alternativas (Exploratório)

#### 3.1 Exa Search API
**Documentação:** https://exa.ai/docs

**Hipótese:** Busca semântica pode encontrar conteúdo do Grok Share indiretamente?

**Teste:**
```typescript
// Usar MCP existente: exa_web_search_exa
const result = await exa_get_code_context_exa({
  query: "site:grok.com/share/xxx content"
});
```

**Expectativa:** Baixa (Grok Share não indexado em buscadores)

#### 3.2 Tavily Extract API
**Documentação:** https://tavily.com/docs/extract

**Hipótese:** Extract pode processar Grok Share se passar pela autenticação?

**Teste:**
```typescript
// Usar MCP existente: tavily_tavily-extract
const result = await tavily_extract({
  urls: ["https://grok.com/share/xxx"],
  extract_depth: "advanced"
});
```

**Expectativa:** Média (Tavily tem infraestrutura anti-Cloudflare)

---

### 4️⃣ Multi-Browser Support (Playwright)

#### 4.1 Configuração
**Variável de ambiente:** `BROWSER=chromium|firefox|webkit`

**Implementação:**
```typescript
// packages/mcp-grok-scraper/index-playwright.ts
import { chromium, firefox, webkit } from 'playwright';

const browserType = process.env.BROWSER || 'chromium';
const browsers = { chromium, firefox, webkit };

const browser = await browsers[browserType].launch({
  headless: true
});
```

#### 4.2 Teste
Comparar taxa de sucesso de cada browser com Cloudflare:
- Chromium (baseline)
- Firefox (user-agent diferente)
- WebKit (Safari engine, pode ter menos detecção?)

**Expectativa:** Chromium provavelmente terá melhor resultado (mais stealth plugins)

---

## 📅 CRONOGRAMA

### Semana 1 (17-23 Jan 2026)
- ✅ **Dia 1-2:** Implementar Firecrawl wrapper + testes básicos
- ✅ **Dia 3-4:** Integração com MCP + validação
- ✅ **Dia 5-7:** Benchmark comparativo (Puppeteer vs Firecrawl vs HTTP)

### Semana 2 (24-30 Jan 2026)
- ✅ **Dia 1-2:** Explorar Exa Search + Tavily Extract
- ✅ **Dia 3-4:** Implementar multi-browser (Playwright)
- ✅ **Dia 5:** Documentar benchmarks finais
- ✅ **Dia 6-7:** Release v2.1.0 + atualizar README/ROADMAP

---

## 🎯 CRITÉRIOS DE SUCESSO

### Mínimo Viável (v2.1.0)
- ✅ Firecrawl API wrapper funcional
- ✅ MCP tool `grok_scrape_firecrawl` funcionando
- ✅ Benchmark com pelo menos 3 metodologias
- ✅ Documentação atualizada

### Desejável
- ✅ Benchmark com todas as 6 metodologias
- ✅ Tabela comparativa no README principal
- ✅ Multi-browser support completo
- ✅ Testes automatizados para todas as metodologias

### Excepcional
- ✅ Script de seleção automática (escolher melhor metodologia baseado em taxa de sucesso)
- ✅ Dashboard web com resultados de benchmark
- ✅ Cache inteligente (evitar re-scraping)

---

## 🚧 BLOCKERS CONHECIDOS

### Potenciais Problemas
1. **Firecrawl API Key:** Precisa de key válida (verificar com Deivi)
2. **Custo Firecrawl:** API paga pode ter limite de requests
3. **Exa/Tavily Limitations:** Podem não suportar Grok Share
4. **Playwright + Cloudflare:** Já documentado como ~80% falha

### Mitigações
- ✅ Testar Firecrawl em free tier primeiro
- ✅ Manter Puppeteer Stealth como fallback sempre
- ✅ Documentar claramente quando cada metodologia falha
- ✅ Criar modo "auto-retry" (tentar múltiplas metodologias até sucesso)

---

## 📝 PRÓXIMOS PASSOS IMEDIATOS

### AGORA (próxima sessão)
1. ✅ Verificar se Firecrawl API key está disponível
2. ✅ Instalar SDK Firecrawl (`bun add @firecrawl/sdk`)
3. ✅ Criar `packages/mcp-grok-scraper/integrations/firecrawl.ts`
4. ✅ Implementar função básica de scraping
5. ✅ Testar com 1 link Grok Share conhecido

### DEPOIS
6. ✅ Criar MCP tool wrapper
7. ✅ Implementar testes automatizados
8. ✅ Executar benchmark completo
9. ✅ Atualizar documentação
10. ✅ Release v2.1.0

---

## 🔗 LINKS ÚTEIS

- **Firecrawl Docs:** https://docs.firecrawl.dev/
- **Firecrawl SDK:** https://github.com/mendableai/firecrawl-js
- **Playwright Docs:** https://playwright.dev/
- **Exa AI Docs:** https://docs.exa.ai/
- **Tavily Docs:** https://docs.tavily.com/

---

**📅 Criado em:** 2026-01-17  
**👤 Autor:** DevSan (AGI)  
**🎯 Projeto:** Metodologia-Scrape  
**📌 Versão Base:** v2.0.1  
**🚀 Versão Alvo:** v2.1.0
