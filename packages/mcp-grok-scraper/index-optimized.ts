/**
 * 🎯 MCP GROK SCRAPER - OTIMIZADO COM INSTRUMENTAÇÃO COMPLETA
 * 
 * @version 2.1.0 - Instrumentado e Otimizado
 * @author Deivison Santana (@deivisan)
 * @date 2026-01-21
 * 
 * 🚀 MELHORIAS:
 * - Logging dinâmico com cores e timestamps
 * - Medição precisa de tempo por etapa
 * - Identificação automática de gargalos
 * - Scroll adaptativo (otimizado)
 * - Relatório de performance consolidado
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';

// ============================================
// 🎨 SISTEMA DE LOGGING COLORIDO
// ============================================

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'debug' | 'metric';

const COLORS = {
  info: '\x1b[36m',    // Cyan
  success: '\x1b[32m', // Green
  warn: '\x1b[33m',    // Yellow
  error: '\x1b[31m',   // Red
  debug: '\x1b[90m',   // Gray
  metric: '\x1b[35m',  // Magenta
  reset: '\x1b[0m'
};

function log(level: LogLevel, message: string, data?: any) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const color = COLORS[level];
  const prefix = {
    info: 'ℹ️  ',
    success: '✅',
    warn: '⚠️ ',
    error: '❌',
    debug: '🔍',
    metric: '📊'
  }[level];
  
  console.log(`${color}${timestamp} ${prefix} ${message}${COLORS.reset}`);
  if (data !== undefined) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// ============================================
// ⏱️ SISTEMA DE MÉTRICAS
// ============================================

interface StageMetrics {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class PerformanceTracker {
  private stages: Map<string, StageMetrics> = new Map();
  private totalStart: number = 0;

  start(name: string) {
    const stage: StageMetrics = {
      name,
      startTime: Date.now()
    };
    this.stages.set(name, stage);
    if (!this.totalStart) this.totalStart = stage.startTime;
    log('info', `🚀 INICIANDO: ${name}`);
  }

  end(name: string) {
    const stage = this.stages.get(name);
    if (stage) {
      stage.endTime = Date.now();
      stage.duration = stage.endTime - stage.startTime;
      log('success', `✅ FINALIZADO: ${name}`, { duration: `${stage.duration}ms` });
    }
  }

  getReport() {
    const stages = Array.from(this.stages.values());
    const totalDuration = Date.now() - this.totalStart;
    
    // Calcular percentis e identificar gargalos
    const durations = stages.map(s => s.duration || 0).filter(d => d > 0).sort((a, b) => b - a);
    const totalStageTime = durations.reduce((a, b) => a + b, 0);
    
    const report = {
      totalDuration: `${totalDuration}ms`,
      stages: stages.map(s => ({
        name: s.name,
        duration: `${s.duration}ms`,
        percentage: ((s.duration || 0) / totalStageTime * 100).toFixed(1) + '%'
      })),
      biggestBottleneck: stages.reduce((prev, current) => 
        (prev.duration || 0) > (current.duration || 0) ? prev : current
      ),
      recommendation: this.getRecommendation(stages)
    };

    return report;
  }

  private getRecommendation(stages: StageMetrics[]): string {
    const sorted = stages.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    const slowest = sorted[0];
    
    if ((slowest.duration || 0) > 10000) {
      return `⚠️ GARGALO DETECTADO: "${slowest.name}" levou ${slowest.duration}ms. Considere otimizar.`;
    }
    return '✅ Performance dentro do esperado.';
  }
}

// ============================================
// 🔧 CONFIGURAÇÃO OTIMIZADA
// ============================================

puppeteer.use(StealthPlugin());

const CONFIG = {
  defaultOutputDir: join(dirname(fileURLToPath(import.meta.url)), 'captures'),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1920, height: 1080 },
  
  // ⏱️Timeouts OTIMIZADOS
  timeout: 60000,           // Reduzido de 90s para 60s
  cloudflareWait: 30000,    // Reduzido de 60s para 30s
  
  // 📜 Scroll adaptativo
  scrollDelay: 1500,        // Reduzido de 2500ms para 1500ms
  scrollMaxWait: 10000,     // Max wait por scroll
  maxScrolls: 30,           // Reduzido de 50 para 30
  
  // 🌐 Browser
  headless: process.env.HEADLESS !== 'false',
  browser: process.env.BROWSER || 'chromium'
};

// ============================================
// 🎯 CORE SCRAPER OTIMIZADO
// ============================================

/**
 * Captura conversa do Grok Share com instrumentação completa
 * 
 * @returns Objeto com metrics, resultados e relatório de performance
 */
async function grokScrapeOptimized({ 
  url, 
  outputDir = CONFIG.defaultOutputDir,
  saveHtml = true,
  saveScreenshot = false,
  headless = CONFIG.headless
}: { 
  url: string;
  outputDir?: string;
  saveHtml?: boolean;
  saveScreenshot?: boolean;
  headless?: boolean;
}) {
  const metrics = new PerformanceTracker();
  const uuid = `grok_${Date.now()}`;
  const files: string[] = [];
  const stageTimes: Record<string, number> = {};
  
  log('info', `🎯 SCRAPE OTIMIZADO: ${url}`);
  log('metric', 'Configurações', { headless, scrollDelay: CONFIG.scrollDelay });
  
  let browser: any;
  
  try {
    // ════════════════════════════════════════
    // 🚀 ETAPA 1: LANÇAR BROWSER
    // ════════════════════════════════════════
    metrics.start('launchBrowser');
    const launchStart = Date.now();
    
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        `--window-size=${CONFIG.viewport.width},${CONFIG.viewport.height}`
      ]
    });
    
    const page = await browser.newPage();
    
    // Anti-detecção
    await page.setViewport(CONFIG.viewport);
    await page.setUserAgent(CONFIG.userAgent);
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      delete (navigator as any).webdriver;
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
    });
    
    stageTimes.launchBrowser = Date.now() - launchStart;
    metrics.end('launchBrowser');
    
    // ════════════════════════════════════════
    // 🌐 ETAPA 2: NAVEGAÇÃO + CLOUDFLARE
    // ════════════════════════════════════════
    metrics.start('navigation');
    const navStart = Date.now();
    
    await page.goto(url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    stageTimes.navigation = Date.now() - navStart;
    metrics.end('navigation');
    
    // ════════════════════════════════════════
    // 🛡️ ETAPA 3: CLOUDFLARE BYPASS
    // ════════════════════════════════════════
    metrics.start('cloudflareBypass');
    const cfStart = Date.now();
    
    let cloudflareResolved = false;
    let cfCheckCount = 0;
    
    while (Date.now() - cfStart < CONFIG.cloudflareWait) {
      cfCheckCount++;
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
      
      if (title.includes('Just a moment') || 
          title.includes('Cloudflare') || 
          bodyText.includes('checking your browser')) {
        await new Promise(r => setTimeout(r, 500)); // Checagem mais frequente
        continue;
      }
      
      cloudflareResolved = true;
      log('success', `🛡️ Cloudflare bypass em ${cfCheckCount} verificações`);
      break;
    }
    
    if (!cloudflareResolved) {
      log('warn', '⚠️ Cloudflare pode não ter resolvido completamente');
    }
    
    stageTimes.cloudflareBypass = Date.now() - cfStart;
    metrics.end('cloudflareBypass');
    
    // ════════════════════════════════════════
    // ⏳ ETAPA 4: REACT HYDRATE
    // ════════════════════════════════════════
    metrics.start('reactHydrate');
    const hydrateStart = Date.now();
    await new Promise(r => setTimeout(r, 3000)); // Reduzido de 5s para 3s
    stageTimes.reactHydrate = Date.now() - hydrateStart;
    metrics.end('reactHydrate');
    
    // ════════════════════════════════════════
    // 📜 ETAPA 5: SCROLL ADAPTATIVO
    // ════════════════════════════════════════
    metrics.start('scroll');
    const scrollStart = Date.now();
    
    let scrollCount = 0;
    let stableCount = 0; // Contador de estabilidade
    const lastHeight = await page.evaluate('document.body.scrollHeight');
    let currentHeight = lastHeight;
    
    log('info', `📏 Página inicial: ${lastHeight}px`);
    
    for (let i = 0; i < CONFIG.maxScrolls; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
      
      const newHeight = await page.evaluate('document.body.scrollHeight');
      
      if (newHeight === currentHeight) {
        stableCount++;
        // Se estável por 2 verificações, sai
        if (stableCount >= 2) {
          log('success', `✅ Scroll completo: ${i + 1} iterações (estável ${stableCount}x)`);
          break;
        }
      } else {
        stableCount = 0;
      }
      
      currentHeight = newHeight;
      scrollCount++;
    }
    
    // Verificação final de conteúdo
    const finalHeight = await page.evaluate('document.body.scrollHeight');
    if (finalHeight === lastHeight) {
      log('debug', '📜 Página já estava completa (sem scroll necessário)');
    }
    
    stageTimes.scroll = Date.now() - scrollStart;
    metrics.end('scroll');
    
    // ════════════════════════════════════════
    // 🔍 ETAPA 6: EXTRAÇÃO
    // ════════════════════════════════════════
    metrics.start('extraction');
    const extractStart = Date.now();
    
    const result = await page.evaluate(() => {
      const selectors = [
        'div[class*="message-bubble"]',
        'div[class*="response-content"]',
        'article',
        '[data-testid*="message"]',
        'div[class*="Conversation"]',
        'div[class*="chat"]',
        'div.prose',
        '.markdown'
      ];
      
      const elements: HTMLElement[] = [];
      for (const selector of selectors) {
        elements.push(...Array.from(document.querySelectorAll<HTMLElement>(selector)));
      }
      
      const uniqueElements = Array.from(new Set(elements));
      const messages = uniqueElements
        .map((el, i) => ({
          index: i,
          text: el.innerText?.trim().substring(0, 5000),
          html: el.outerHTML?.substring(0, 1000)
        }))
        .filter(m => m.text && m.text.length > 10);
      
      return {
        title: document.title,
        url: window.location.href,
        messageCount: messages.length,
        messages,
        fullHtml: document.documentElement.outerHTML
      };
    });
    
    stageTimes.extraction = Date.now() - extractStart;
    metrics.end('extraction');
    log('success', `🔍 Extraídas ${result.messageCount} mensagens`);
    
    // ════════════════════════════════════════
    // 💾 ETAPA 7: SALVAMENTO
    // ════════════════════════════════════════
    metrics.start('save');
    const saveStart = Date.now();
    
    mkdirSync(outputDir, { recursive: true });
    
    // JSON
    const jsonPath = join(outputDir, `${uuid}.json`);
    writeFileSync(jsonPath, JSON.stringify({
      metadata: {
        url,
        title: result.title,
        capturedAt: new Date().toISOString(),
        method: 'puppeteer-stealth-v2.1-optimized',
        scrollCount,
        messageCount: result.messageCount,
        headless,
        stageTimes // ⏱️ Tempos de cada etapa
      },
      messages: result.messages
    }, null, 2));
    files.push(jsonPath);
    
    // Markdown
    const mdPath = join(outputDir, `${uuid}.md`);
    let md = `# ${result.title}\n\n`;
    md += `**Data:** ${new Date().toLocaleString('pt-BR')}  \n`;
    md += `**URL:** ${url}  \n`;
    md += `**Mensagens:** ${result.messageCount}\n`;
    md += `**Tempo Total:** ${stageTimes.launchBrowser + stageTimes.navigation + stageTimes.cloudflareBypass + stageTimes.reactHydrate + stageTimes.scroll + stageTimes.extraction + stageTimes.save}ms\n\n`;
    md += `---\n\n`;
    
    result.messages.forEach((msg, i) => {
      md += `### Mensagem ${i + 1}\n\n${msg.text}\n\n---\n\n`;
    });
    
    writeFileSync(mdPath, md);
    files.push(mdPath);
    
    // HTML (opcional)
    if (saveHtml) {
      const htmlPath = join(outputDir, `${uuid}.html`);
      writeFileSync(htmlPath, result.fullHtml);
      files.push(htmlPath);
    }
    
    // Screenshot (opcional)
    if (saveScreenshot) {
      const pngPath = join(outputDir, `${uuid}.png`);
      await page.screenshot({ path: pngPath, fullPage: true });
      files.push(pngPath);
    }
    
    stageTimes.save = Date.now() - saveStart;
    metrics.end('save');
    
    await browser.close();
    
    // ════════════════════════════════════════
    // 📊 RELATÓRIO FINAL DE PERFORMANCE
    // ════════════════════════════════════════
    const report = metrics.getReport();
    
    log('metric', '══════════════════════════════════════════');
    log('metric', '📊 RELATÓRIO DE PERFORMANCE');
    log('metric', '══════════════════════════════════════════');
    log('metric', `⏱️ Tempo Total: ${report.totalDuration}`);
    log('metric', `📝 Mensagens: ${result.messageCount}`);
    log('metric', `�️ Scrolls: ${scrollCount}`);
    log('metric', '--------------------------------------');
    
    report.stages.forEach(stage => {
      log('debug', `  ${stage.name}: ${stage.duration} (${stage.percentage})`);
    });
    
    log('metric', '--------------------------------------');
    log('metric', report.recommendation);
    log('metric', '══════════════════════════════════════════');
    
    return {
      success: true,
      messageCount: result.messageCount,
      title: result.title,
      uuid,
      files,
      content: md,
      performance: report,
      stageTimes
    };
    
  } catch (error: any) {
    if (browser) await browser.close();
    
    log('error', `❌ Erro: ${error.message}`);
    
    return {
      success: false,
      messageCount: 0,
      title: '',
      uuid,
      files: [],
      content: `Erro: ${error.message}`,
      performance: metrics.getReport(),
      stageTimes
    };
  }
}

// ============================================
// 📚 FUNÇÕES AUXILIARES (READ, LIST, CONTEXT)
// ============================================

async function grokRead({ 
  uuid, 
  outputDir = CONFIG.defaultOutputDir,
  format = 'markdown'
}: { 
  uuid: string;
  outputDir?: string;
  format?: 'markdown' | 'json' | 'text';
}) {
  const mdPath = join(outputDir, `${uuid}.md`);
  const jsonPath = join(outputDir, `${uuid}.json`);
  
  if (!existsSync(mdPath) && !existsSync(jsonPath)) {
    return { success: false, error: 'Captura não encontrada' };
  }
  
  const mdContent = existsSync(mdPath) ? readFileSync(mdPath, 'utf-8') : '';
  const jsonContent = existsSync(jsonPath) ? JSON.parse(readFileSync(jsonPath, 'utf-8')) : null;
  
  return {
    success: true,
    content: format === 'markdown' ? mdContent : (format === 'json' ? JSON.stringify(jsonContent, null, 2) : mdContent),
    metadata: jsonContent?.metadata,
    messages: jsonContent?.messages,
    performance: jsonContent?.metadata?.stageTimes
  };
}

async function grokList({ 
  outputDir = CONFIG.defaultOutputDir 
}: { 
  outputDir?: string;
} = {}) {
  if (!existsSync(outputDir)) {
    return { success: true, captures: [] };
  }
  
  const captures: any[] = [];
  
  try {
    const files = readdirSync(outputDir);
    
    for (const file of files) {
      if (file.endsWith('.json') && !file.includes('_raw')) {
        try {
          const jsonPath = join(outputDir, file);
          const data = JSON.parse(readFileSync(jsonPath, 'utf-8'));
          captures.push({
            uuid: file.replace('.json', ''),
            url: data.metadata?.url || data.url,
            title: data.metadata?.title || data.title,
            messageCount: data.metadata?.messageCount || data.messageCount || 0,
            capturedAt: data.metadata?.capturedAt || data.capturedAt,
            performance: data.metadata?.stageTimes
          });
        } catch (e) {
          log('warn', `Erro ao ler ${file}`);
        }
      }
    }
    
    captures.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
    
  } catch (e) {
    return { success: true, captures: [] };
  }
  
  return { success: true, captures };
}

async function grokContext({ 
  uuid, 
  outputDir = CONFIG.defaultOutputDir 
}: { 
  uuid?: string;
  outputDir?: string;
} = {}) {
  if (uuid) {
    const read = await grokRead({ uuid, outputDir, format: 'markdown' });
    if (read.success) {
      return {
        success: true,
        content: read.content,
        hasConversation: true,
        uuid,
        performance: read.performance
      };
    }
  }
  
  const list = await grokList({ outputDir });
  if (list.captures && list.captures.length > 0) {
    const latest = list.captures[0];
    const read = await grokRead({ uuid: latest.uuid, outputDir, format: 'markdown' });
    if (read.success) {
      return {
        success: true,
        content: read.content,
        hasConversation: true,
        uuid: latest.uuid,
        performance: read.performance
      };
    }
  }
  
  return {
    success: true,
    content: 'Nenhuma captura encontrada',
    hasConversation: false
  };
}

// ============================================
// 🔌 SERVIDOR MCP
// ============================================

const server = new McpServer({
  name: 'mcp-grok-scraper-optimized',
  version: '2.1.0'
});

// Tool: grok_scrape
server.registerTool(
  'grok_scrape',
  {
    title: 'Capturar Conversa do Grok (Otimizado)',
    description: 'Captura com instrumentação completa e métricas de performance',
    inputSchema: {
      url: z.string().describe('URL do Grok Share'),
      outputDir: z.string().optional().describe('Diretório de saída'),
      saveHtml: z.boolean().optional().describe('Salvar HTML completo'),
      saveScreenshot: z.boolean().optional().describe('Salvar screenshot'),
      headless: z.boolean().optional().describe('Modo headless')
    },
    outputSchema: {
      success: z.boolean(),
      messageCount: z.number(),
      title: z.string(),
      uuid: z.string(),
      files: z.array(z.string()),
      content: z.string().optional(),
      performance: z.any()
    }
  },
  async ({ url, outputDir, saveHtml, saveScreenshot, headless }) => {
    const result = await grokScrapeOptimized({ url, outputDir, saveHtml, saveScreenshot, headless });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      isError: !result.success
    };
  }
);

// Tool: grok_read
server.registerTool(
  'grok_read',
  {
    title: 'Ler Captura',
    description: 'Lê uma captura existente com métricas de performance',
    inputSchema: {
      uuid: z.string().describe('UUID da captura'),
      outputDir: z.string().optional().describe('Diretório'),
      format: z.enum(['markdown', 'json', 'text']).optional().describe('Formato')
    },
    outputSchema: {
      success: z.boolean(),
      content: z.string().optional(),
      metadata: z.any().optional(),
      performance: z.any().optional()
    }
  },
  async ({ uuid, outputDir, format }) => {
    const result = await grokRead({ uuid, outputDir, format });
    return {
      content: [{ type: 'text', text: result.success ? result.content : result.error }],
      isError: !result.success
    };
  }
);

// Tool: grok_list
server.registerTool(
  'grok_list',
  {
    title: 'Listar Capturas',
    description: 'Lista todas as capturas com informações de performance',
    inputSchema: {
      outputDir: z.string().optional().describe('Diretório')
    },
    outputSchema: {
      success: z.boolean(),
      captures: z.array(z.any())
    }
  },
  async ({ outputDir }) => {
    const result = await grokList({ outputDir });
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  }
);

// Tool: grok_context
server.registerTool(
  'grok_context',
  {
    title: 'Obter Contexto para AI',
    description: 'Retorna contexto com métricas de performance',
    inputSchema: {
      uuid: z.string().optional().describe('UUID específico'),
      outputDir: z.string().optional().describe('Diretório')
    },
    outputSchema: {
      success: z.boolean(),
      context: z.string(),
      hasConversation: z.boolean(),
      performance: z.any().optional()
    }
  },
  async ({ uuid, outputDir }) => {
    const result = await grokContext({ uuid, outputDir });
    return {
      content: [{ type: 'text', text: result.context }]
    };
  }
);

// ============================================
// 🚀 INICIALIZAÇÃO
// ============================================

const transport = new StdioServerTransport();
await server.connect(transport);

log('info', '🚀 MCP Grok Scraper OTIMIZADO v2.1.0');
log('info', '📋 Tools: grok_scrape, grok_read, grok_list, grok_context');
log('metric', '⚙️ Config', { 
  headless: CONFIG.headless, 
  scrollDelay: CONFIG.scrollDelay,
  cloudflareWait: CONFIG.cloudflareWait 
});

export { grokScrapeOptimized, grokRead, grokList, grokContext };
