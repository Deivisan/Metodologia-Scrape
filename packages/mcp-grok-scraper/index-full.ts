/**
 * 🎯 MCP GROK SCRAPER - FULL PUPPETEER STEALTH
 * 
 * @version 2.1.0
 * @author Deivison Santana (@deivisan)
 * @date 2026-02-06
 * 
 * 🚀 METODOLOGIA CONSOLIDADA:
 * - Puppeteer Stealth + Google Chrome Stable (não Chromium!)
 * - Bypass Cloudflare/WAF
 * - Captura COMPLETA de conversas longas
 * - Alternativas: Tavily, WebFetch
 * 
 * 📌 PHILOSOPHY:
 * "Chrome real > Chromium headless"
 * "Captura tudo > Deixa algo pra trás"
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';

// ============================================
// 🔧 CONFIGURAÇÃO
// ============================================

// Usar Google Chrome Stable (NÃO Chromium!)
const CHROME_PATH = process.env.CHROME_PATH || '/usr/bin/google-chrome-stable';

puppeteer.use(StealthPlugin());

const CONFIG = {
  defaultOutputDir: join(dirname(fileURLToPath(import.meta.url)), 'captures'),
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
  viewport: { width: 1920, height: 1080 },
  timeout: 120000,          // 2 minutos
  cloudflareWait: 90000,    // 1.5 minutos para Cloudflare
  scrollDelay: 3000,        // 3 segundos entre scrolls
  maxScrolls: 100,          // Mais scrolls para conversas longas
  headless: process.env.HEADLESS !== 'false',
  browser: 'chrome-stable'  // Google Chrome Stable!
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
    // 🚀 ETAPA 1: LANÇAR GOOGLE CHROME STABLE
    // ════════════════════════════════════════
    console.log('🚀 Lançando Google Chrome Stable...');
    console.log(`📍 Chrome path: ${CHROME_PATH}`);
    
    browser = await puppeteer.launch({
      headless: headless ? 'new' : false,
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--disable-extensions',
        '--disable-background-networking',
        '--disable-sync',
        '--disable-translate',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--safebrowsing-disable-auto-update',
        `--window-size=${CONFIG.viewport.width},${CONFIG.viewport.height}`,
        '--profile-directory=Default'
      ]
    });
    
    const page = await browser.newPage();
    
    // Anti-detecção ULTRA-AVANÇADA
    await page.setViewport(CONFIG.viewport);
    await page.setUserAgent(CONFIG.userAgent);
    
    await page.evaluateOnNewDocument(() => {
      // Remove webdriver flag
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      delete (navigator as any).webdriver;
      
      // Fake plugins e languages
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
      Object.defineProperty(navigator, 'platform', { get: () => 'Linux x86_64' });
      Object.defineProperty(navigator, 'product', { get: () => 'Gecko' });
      
      // Remove chrome runtime
      window.chrome = { runtime: undefined, apps: {} };
      
      // Faked permissions
      const originalQuery = (navigator as any).permissions?.query;
      (navigator as any).permissions = {
        query: (params: any) => {
          if (params.name === 'notifications') return Promise.resolve({ state: 'granted' });
          return originalQuery ? originalQuery(params) : Promise.resolve({ state: 'denied' });
        }
      };
    });
    
    // ════════════════════════════════════════
    // 🌐 ETAPA 2: NAVEGAÇÃO + CLOUDFLARE
    // ════════════════════════════════════════
    console.log('🌐 Navegando para:', url);
    console.log('⏳ Aguardando Cloudflare...');
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded', 
      timeout: CONFIG.timeout 
    });
    
    // Aguardar Cloudflare resolver
    await new Promise(r => setTimeout(r, 5000));
    
    let cloudflareChecks = 0;
    const maxCloudflareChecks = 30;
    
    while (cloudflareChecks < maxCloudflareChecks) {
      const title = await page.title();
      const bodyText = await page.evaluate(() => document.body.innerText.toLowerCase());
      
      // Cloudflare detectado?
      if (title.includes('Just a moment') || 
          title.includes('Cloudflare') || 
          title.includes('Checking your browser') ||
          bodyText.includes('checking your browser') ||
          bodyText.includes('security check')) {
        await new Promise(r => setTimeout(r, 2000));
        cloudflareChecks++;
        console.log(`⏳ Cloudflare check ${cloudflareChecks}/${maxCloudflareChecks}`);
        continue;
      }
      
      // Página carregada!
      console.log(`✅ Página carregada! Título: ${title.substring(0, 60)}...`);
      break;
    }
    
    if (cloudflareChecks >= maxCloudflareChecks) {
      console.warn('⚠️ Cloudflare pode estar bloqueando. Continuando mesmo assim...');
    }
    
    // Aguardar React hidratar completamente
    console.log('⏳ Aguardando React hidratar...');
    await new Promise(r => setTimeout(r, 8000));
    
    // ════════════════════════════════════════
    // 📜 ETAPA 3: SCROLL COMPLETO (TODAS AS MENSAGENS)
    // ════════════════════════════════════════
    console.log('📜 Scrollando para carregar todas as mensagens...');
    
    let scrollCount = 0;
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    let noNewContentCount = 0;
    
    for (let i = 0; i < CONFIG.maxScrolls; i++) {
      // Scroll para o bottom
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
      
      const newHeight = await page.evaluate('document.body.scrollHeight');
      
      if (newHeight === lastHeight) {
        noNewContentCount++;
        console.log(`📜 Sem conteúdo novo (${noNewContentCount}/5)`);
        
        if (noNewContentCount >= 5) {
          console.log(`✅ Scroll completo! Total: ${i + 1} scrolls`);
          break;
        }
      } else {
        noNewContentCount = 0;
        lastHeight = newHeight;
        console.log(`📜 Scroll ${i + 1}: ${newHeight}px`);
      }
      
      scrollCount++;
    }
    
    // Scroll de volta ao topo
    await page.evaluate('window.scrollTo(0, 0)');
    await new Promise(r => setTimeout(r, 1000));
    
    // ════════════════════════════════════════
    // 🔍 ETAPA 4: EXTRAÇÃO COMPLETA (TUDO!)
    // ════════════════════════════════════════
    console.log('🔍 Extraindo TODAS as mensagens e conteúdo...');
    
    const result = await page.evaluate(() => {
      // Seletores COMPLETOS para Grok Share
      const selectors = [
        // Estrutura Grok Share
        '[data-testid*="conversation"]',
        '[class*="Conversation"]',
        '[class*="conversation"]',
        '[class*="ChatView"]',
        // Mensagens
        '[data-testid*="message"]',
        '[class*="message-bubble"]',
        '[class*="message-content"]',
        '[class*="Message"]',
        '[class*="chat-message"]',
        // Conteúdo (Grok e usuário)
        '[data-testid*="response"]',
        '[class*="response-content"]',
        '[class*="assistant-message"]',
        '[class*="user-message"]',
        '[class*="Markdown"]',
        '[class*="markdown"]',
        // Genérico
        'article',
        '.prose', // Grok usa Tailwind prose
        '.markdown',
        '[role="article"]',
        'div[class*="Item"]',
        '[data-message-author-role]',
        // Container de conversa
        '[class*="ConversationContainer"]',
        '[class*="chat-container"]',
        '[class*="ThreadView"]'
      ];
      
      // Coletar TODOS os elementos relevantes
      const elements: HTMLElement[] = [];
      
      for (const selector of selectors) {
        try {
          const found = Array.from(document.querySelectorAll<HTMLElement>(selector));
          elements.push(...found);
        } catch (e) {
          // Seletor inválido, ignorar
        }
      }
      
      // Deduplicate mantendo ordem
      const seen = new Set<string>();
      const uniqueElements = elements.filter(el => {
        const key = el.outerHTML.substring(0, 100);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      
      // Extrair mensagens com contexto
      const messages = uniqueElements
        .map((el, i) => {
          const text = el.innerText?.trim() || '';
          const outerHTML = el.outerHTML || '';
          
          // Detectar se é mensagem do usuário, Grok, ou outro
          let role = 'unknown';
          const htmlLower = outerHTML.toLowerCase();
          
          if (htmlLower.includes('user') || htmlLower.includes('human') || 
              htmlLower.includes('role="user"')) {
            role = 'user';
          } else if (htmlLower.includes('assistant') || htmlLower.includes('grok') ||
                     htmlLower.includes('role="assistant"') || htmlLower.includes('response')) {
            role = 'grok';
          } else if (htmlLower.includes('system') || htmlLower.includes('tool')) {
            role = 'system';
          }
          
          return {
            index: i,
            text: text.substring(0, 10000), // Limita mas captura muito
            html: outerHTML.substring(0, 5000),
            role,
            length: text.length
          };
        })
        .filter(m => m.text && m.text.length > 3);
      
    // Tentar extrair estrutura da conversa do DOM
      const conversationTitle = document.title;
      const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || conversationTitle;
      
      // Capturar TODAS as URLs de imagens/code blocks
      const images: string[] = [];
      const links: string[] = [];
      document.querySelectorAll('img[src], a[href], code, pre').forEach(el => {
        const src = (el as HTMLImageElement).src || (el as HTMLAnchorElement).href;
        if (src && src.startsWith('http')) {
          if ((el as HTMLImageElement).src) images.push(src);
          else links.push(src);
        }
      });
      
      // NOVO: Pegar TODOS os textos da página (funcional!)
      const allTexts: string[] = [];
      document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6, li, td, th, article').forEach(el => {
        const text = el.innerText?.trim();
        // Filtro inteligente: remove duplicatas e textos de UI
        if (text && text.length > 15 && 
            !text.includes('Sign in') && 
            !text.includes('Continue with') &&
            !text.includes('Creating account') &&
            !text.includes('Terms of Service')) {
          allTexts.push(text);
        }
      });
      
      // Deduplicar textos
      const uniqueTexts = [...new Set(allTexts)];
      
      return {
        title: metaTitle,
        url: window.location.href,
        messageCount: messages.length,
        messages,
        images,
        links,
        allTexts: uniqueTexts,  // <-- NOVO: Textos únicos
        fullHtml: document.documentElement.outerHTML,
        scrollHeight: document.body.scrollHeight,
        capturedAt: new Date().toISOString()
      };
    });
    
    console.log(`📊 Total de elementos extraídos: ${result.messageCount}`);
    
    // ════════════════════════════════════════
    // 💾 ETAPA 5: SALVAR ARQUIVOS
    // ════════════════════════════════════════
    mkdirSync(outputDir, { recursive: true });
    
    // JSON COMPLETO (com allTexts)
    const jsonPath = join(outputDir, `${uuid}_full.json`);
    writeFileSync(jsonPath, JSON.stringify({
      metadata: {
        url,
        title: result.title,
        capturedAt: new Date().toISOString(),
        method: 'puppeteer-stealth-v2.1-google-chrome',
        scrollCount,
        messageCount: result.messageCount,
        textsCount: result.allTexts?.length || 0,
        headless
      },
      messages: result.messages,
      allTexts: result.allTexts
    }, null, 2));
    files.push(jsonPath);
    
    // JSON Light (apenas mensagens estruturadas)
    const jsonLightPath = join(outputDir, `${uuid}.json`);
    writeFileSync(jsonLightPath, JSON.stringify({
      metadata: {
        url,
        title: result.title,
        capturedAt: new Date().toISOString(),
        method: 'puppeteer-stealth-v2.1',
        scrollCount,
        messageCount: result.messageCount,
        headless
      },
      messages: result.messages
    }, null, 2));
    files.push(jsonLightPath);
    
    // Markdown COMPLETO com todos os textos
    const mdPath = join(outputDir, `${uuid}.md`);
    let md = `# ${result.title}\n\n`;
    md += `**Data:** ${new Date().toLocaleString('pt-BR')}  \n`;
    md += `**URL:** ${url}  \n`;
    md += `**Mensagens estruturadas:** ${result.messageCount}  \n`;
    md += `**Textos únicos extraídos:** ${result.allTexts?.length || 0}\n\n`;
    md += `---\n\n`;
    
    md += `## 📝 MENSAGENS ESTRUTURADAS\n\n`;
    result.messages.forEach((msg: any, i: number) => {
      md += `### ${msg.role?.toUpperCase() || 'MSG'} ${i + 1}\n\n${msg.text}\n\n---\n\n`;
    });
    
    if (result.allTexts && result.allTexts.length > 0) {
      md += `\n## 📄 TODOS OS TEXTOS DA PÁGINA (${result.allTexts.length})\n\n`;
      result.allTexts.forEach((text: string, i: number) => {
        md += `### Trecho ${i + 1}\n\n${text}\n\n---\n\n`;
      });
    }
    
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

const server = new Server({
  name: 'mcp-grok-scraper-full',
  version: '2.1.0-google-chrome'
});

// Primeiro declarar capabilities
server.registerCapabilities({
  tools: {
    listChanged: true
  }
});

// Schema for tools/call
const ToolsCallSchema = z.object({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.any()
  })
});

// Tool: grok_scrape (MAIN HANDLER - único registro!)
server.setRequestHandler(
  CallToolRequestSchema,
  async (request) => {
    const { name, arguments: args } = request.params;
    
    if (name === 'grok_scrape') {
      const result = await grokScrapePuppeteer(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } else if (name === 'grok_read') {
      const result = await grokRead(args);
      return {
        content: [{ type: 'text', text: result.success ? result.content : result.error }]
      };
    } else if (name === 'grok_list') {
      const result = await grokList(args);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } else if (name === 'grok_context') {
      const result = await grokContext(args);
      return {
        content: [{ type: 'text', text: result.context }]
      };
    }
    throw new Error(`Unknown tool: ${name}`);
  }
);

// ============================================
// 🚀 INICIALIZAÇÃO
// ============================================

const transport = new StdioServerTransport();
await server.connect(transport);

console.log('🚀 MCP Grok Scraper FULL v2.1.0 (Google Chrome) rodando...');
console.log('📋 Tools: grok_scrape, grok_read, grok_list, grok_context');
console.log(`🎯 Headless: ${CONFIG.headless}`);
console.log(`🌐 Browser: ${CONFIG.browser} (Chrome: ${CHROME_PATH})`);
console.log(`📊 Max Scrolls: ${CONFIG.maxScrolls}, Timeout: ${CONFIG.timeout}ms`);

export { grokScrapePuppeteer, grokRead, grokList, grokContext };
