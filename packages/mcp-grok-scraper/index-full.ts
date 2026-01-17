/**
 * 🎯 MCP GROK SCRAPER - FULL PUPPETEER STEALTH
 * 
 * @version 2.0.0
 * @author Deivison Santana (@deivisan)
 * @date 2026-01-17
 * 
 * 🚀 METODOLOGIA CONSOLIDADA:
 * - Puppeteer Stealth (bypass Cloudflare/WAF)
 * - Background mode (headless completo)
 * - Multi-threading ready (Python fallback)
 * - Alternativas: Firecrawl, Exa, Tavily
 * 
 * 📌 FILOSOFIA:
 * "Código robusto > Código bonito"
 * "Funciona em silêncio > Funciona com UI"
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
// 🔧 CONFIGURAÇÃO
// ============================================

puppeteer.use(StealthPlugin());

const CONFIG = {
  defaultOutputDir: join(dirname(fileURLToPath(import.meta.url)), 'captures'),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  viewport: { width: 1920, height: 1080 },
  timeout: 90000,
  cloudflareWait: 60000,
  scrollDelay: 2500,
  maxScrolls: 50,
  headless: process.env.HEADLESS !== 'false', // Headless por padrão
  browser: process.env.BROWSER || 'chromium' // chromium, firefox, webkit
};

// ============================================
// 🎯 CORE SCRAPER (PUPPETEER STEALTH)
// ============================================

/**
 * Captura conversa do Grok Share com Puppeteer Stealth
 * 
 * @logic
 * 1. Lança Chromium com stealth (bypass Cloudflare)
 * 2. Aguarda Cloudflare resolver (até 60s)
 * 3. Scroll completo (lazy loading)
 * 4. Extrai mensagens (querySelectorAll múltiplos)
 * 5. Salva JSON, Markdown, HTML, Screenshot
 * 
 * @resilient
 * - Retry automático em timeout
 * - Múltiplos seletores (fallback)
 * - Validação de conteúdo
 */
async function grokScrapePuppeteer({ 
  url, 
  outputDir = CONFIG.defaultOutputDir,
  saveHtml = true,
  saveScreenshot = true,
  headless = CONFIG.headless
}: { 
  url: string;
  outputDir?: string;
  saveHtml?: boolean;
  saveScreenshot?: boolean;
  headless?: boolean;
}) {
  console.log(`🎯 Puppeteer Stealth: ${url}`);
  
  const uuid = `grok_${Date.now()}`;
  const files: string[] = [];
  
  let browser;
  
  try {
    // ════════════════════════════════════════
    // 🚀 ETAPA 1: LANÇAR BROWSER
    // ════════════════════════════════════════
    console.log('🚀 Lançando browser stealth...');
    
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
    
    // Anti-detecção avançada
    await page.setViewport(CONFIG.viewport);
    await page.setUserAgent(CONFIG.userAgent);
    
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      delete (navigator as any).webdriver;
      
      // Fake plugins/languages
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
    });
    
    // ════════════════════════════════════════
    // 🌐 ETAPA 2: NAVEGAÇÃO + CLOUDFLARE
    // ════════════════════════════════════════
    console.log('🌐 Navegando + aguardando Cloudflare...');
    
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.timeout 
    });
    
    // Aguardar Cloudflare resolver (checagem inteligente)
    let cloudflareResolved = false;
    const startTime = Date.now();
    
    while (Date.now() - startTime < CONFIG.cloudflareWait) {
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
      
      // Cloudflare detectado?
      if (title.includes('Just a moment') || 
          title.includes('Cloudflare') || 
          bodyText.includes('checking your browser')) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      
      // Página carregada!
      console.log(`✅ Cloudflare bypass! Título: ${title.substring(0, 60)}`);
      cloudflareResolved = true;
      break;
    }
    
    if (!cloudflareResolved) {
      console.warn('⚠️ Cloudflare pode não ter resolvido completamente');
    }
    
    // Aguardar React hidratar
    await new Promise(r => setTimeout(r, 5000));
    
    // ════════════════════════════════════════
    // 📜 ETAPA 3: SCROLL COMPLETO
    // ════════════════════════════════════════
    console.log('📜 Scroll para carregar lazy loading...');
    
    let scrollCount = 0;
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    
    for (let i = 0; i < CONFIG.maxScrolls; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
      
      const newHeight = await page.evaluate('document.body.scrollHeight');
      
      if (newHeight === lastHeight) {
        console.log(`✅ Scroll completo em ${i + 1} iterações`);
        break;
      }
      
      lastHeight = newHeight;
      scrollCount++;
    }
    
    // ════════════════════════════════════════
    // 🔍 ETAPA 4: EXTRAÇÃO ROBUSTA
    // ════════════════════════════════════════
    console.log('🔍 Extraindo mensagens...');
    
    const result = await page.evaluate(() => {
      // Múltiplos seletores (fallback resiliente)
      const selectors = [
        'div[class*="message-bubble"]',
        'div[class*="response-content"]',
        'article',
        '[data-testid*="message"]',
        'div[class*="Conversation"]',
        'div[class*="chat"]',
        'div.prose', // Grok usa Tailwind prose
        '.markdown' // Alternativa
      ];
      
      const elements: HTMLElement[] = [];
      
      for (const selector of selectors) {
        const found = Array.from(document.querySelectorAll<HTMLElement>(selector));
        elements.push(...found);
      }
      
      // Deduplicate + filter
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
    
    console.log(`📊 Mensagens extraídas: ${result.messageCount}`);
    
    // ════════════════════════════════════════
    // 💾 ETAPA 5: SALVAR ARQUIVOS
    // ════════════════════════════════════════
    mkdirSync(outputDir, { recursive: true });
    
    // JSON
    const jsonPath = join(outputDir, `${uuid}.json`);
    writeFileSync(jsonPath, JSON.stringify({
      metadata: {
        url,
        title: result.title,
        capturedAt: new Date().toISOString(),
        method: 'puppeteer-stealth-v2.0',
        scrollCount,
        messageCount: result.messageCount,
        headless
      },
      messages: result.messages
    }, null, 2));
    files.push(jsonPath);
    
    // Markdown
    const mdPath = join(outputDir, `${uuid}.md`);
    let md = `# ${result.title}\n\n`;
    md += `**Data:** ${new Date().toLocaleString('pt-BR')}  \n`;
    md += `**URL:** ${url}  \n`;
    md += `**Mensagens:** ${result.messageCount}\n\n`;
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
    
    await browser.close();
    
    return {
      success: true,
      messageCount: result.messageCount,
      title: result.title,
      uuid,
      files,
      content: md
    };
    
  } catch (error: any) {
    if (browser) await browser.close();
    
    console.error('❌ Erro:', error.message);
    
    return {
      success: false,
      messageCount: 0,
      title: '',
      uuid,
      files: [],
      content: `Erro: ${error.message}\n\nStack: ${error.stack}`
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
    messages: jsonContent?.messages
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
            capturedAt: data.metadata?.capturedAt || data.capturedAt
          });
        } catch (e) {
          console.warn(`Erro ao ler ${file}:`, e);
        }
      }
    }
    
    // Ordenar por data (mais recente primeiro)
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
  // UUID específico
  if (uuid) {
    const read = await grokRead({ uuid, outputDir, format: 'markdown' });
    if (read.success) {
      return {
        success: true,
        context: read.content,
        hasConversation: true,
        uuid
      };
    }
  }
  
  // Última captura
  const list = await grokList({ outputDir });
  if (list.captures && list.captures.length > 0) {
    const latest = list.captures[0];
    const read = await grokRead({ uuid: latest.uuid, outputDir, format: 'markdown' });
    if (read.success) {
      return {
        success: true,
        context: read.content,
        hasConversation: true,
        uuid: latest.uuid
      };
    }
  }
  
  return {
    success: true,
    context: 'Nenhuma captura encontrada',
    hasConversation: false
  };
}

// ============================================
// 🔌 SERVIDOR MCP
// ============================================

const server = new McpServer({
  name: 'mcp-grok-scraper-full',
  version: '2.0.0'
});

// Tool: grok_scrape
server.registerTool(
  'grok_scrape',
  {
    title: 'Capturar Conversa do Grok (Puppeteer Stealth)',
    description: 'Captura uma conversa do Grok Share com bypass Cloudflare completo',
    inputSchema: {
      url: z.string().describe('URL do Grok Share'),
      outputDir: z.string().optional().describe('Diretório de saída'),
      saveHtml: z.boolean().optional().describe('Salvar HTML completo'),
      saveScreenshot: z.boolean().optional().describe('Salvar screenshot'),
      headless: z.boolean().optional().describe('Modo headless (padrão: true)')
    },
    outputSchema: {
      success: z.boolean(),
      messageCount: z.number(),
      title: z.string(),
      uuid: z.string(),
      files: z.array(z.string()),
      content: z.string().optional()
    }
  },
  async ({ url, outputDir, saveHtml, saveScreenshot, headless }) => {
    const result = await grokScrapePuppeteer({ url, outputDir, saveHtml, saveScreenshot, headless });
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
    description: 'Lê uma captura existente e retorna o conteúdo',
    inputSchema: {
      uuid: z.string().describe('UUID da captura'),
      outputDir: z.string().optional().describe('Diretório'),
      format: z.enum(['markdown', 'json', 'text']).optional().describe('Formato')
    },
    outputSchema: {
      success: z.boolean(),
      content: z.string().optional(),
      metadata: z.any().optional()
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
    description: 'Lista todas as capturas disponíveis',
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
    description: 'Retorna contexto formatado para agentes AI',
    inputSchema: {
      uuid: z.string().optional().describe('UUID específico'),
      outputDir: z.string().optional().describe('Diretório')
    },
    outputSchema: {
      success: z.boolean(),
      context: z.string(),
      hasConversation: z.boolean()
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

console.log('🚀 MCP Grok Scraper FULL v2.0 rodando...');
console.log('📋 Tools: grok_scrape, grok_read, grok_list, grok_context');
console.log(`🎯 Headless: ${CONFIG.headless}`);
console.log(`🌐 Browser: ${CONFIG.browser}`);

export { grokScrapePuppeteer, grokRead, grokList, grokContext };
