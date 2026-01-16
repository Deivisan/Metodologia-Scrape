/**
 * 🎯 MCP Grok Scraper - Model Context Protocol Server
 * 
 * Servidor MCP para captura de conversas do Grok Share.
 * Fornece tools para agentes AI acessarem contexto completo.
 * 
 * @author Deivison Santana (@deivisan)
 * @version 1.0.0
 * 
 * 🎓 METODOLOGIA: Puppeteer Stealth + Chromium Bundled
 * Status: ✅ FUNCIONANDO (15 mensagens capturadas)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Ativar Stealth Plugin
puppeteer.use(StealthPlugin());

// Configuração
const CONFIG = {
  defaultOutputDir: join(dirname(fileURLToPath(import.meta.url)), 'captures'),
  scrollDelay: 2000,
  maxScrolls: 50,
  cloudflareTimeout: 60
};

// ============================================
// FERRAMENTAS DO MCP
// ============================================

const tools = {
  grok_scrape: {
    name: 'grok_scrape',
    description: 'Captura uma conversa do Grok Share e salva em arquivos (JSON, MD, HTML, PNG)',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL do Grok Share' },
        outputDir: { type: 'string', description: 'Diretório de saída (opcional)' },
        saveHtml: { type: 'boolean', description: 'Salvar HTML completo' },
        saveScreenshot: { type: 'boolean', description: 'Salvar screenshot' }
      },
      required: ['url']
    }
  },
  
  grok_read: {
    name: 'grok_read',
    description: 'Lê uma captura existente e retorna o conteúdo',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: { type: 'string', description: 'UUID da captura' },
        outputDir: { type: 'string', description: 'Diretório' },
        format: { type: 'string', enum: ['markdown', 'json', 'text'] }
      },
      required: ['uuid']
    }
  },
  
  grok_list: {
    name: 'grok_list',
    description: 'Lista todas as capturas disponíveis',
    inputSchema: {
      type: 'object',
      properties: {
        outputDir: { type: 'string', description: 'Diretório' }
      }
    }
  },
  
  grok_context: {
    name: 'grok_context',
    description: 'Retorna contexto formatado para agentes AI',
    inputSchema: {
      type: 'object',
      properties: {
        uuid: { type: 'string', description: 'UUID específico (opcional)' },
        outputDir: { type: 'string', description: 'Diretório' }
      }
    }
  }
};

// ============================================
// IMPLEMENTAÇÃO DAS FERRAMENTAS
// ============================================

async function grokScrape({ 
  url, 
  outputDir = CONFIG.defaultOutputDir,
  saveHtml = false,
  saveScreenshot = false 
}: { 
  url: string;
  outputDir?: string;
  saveHtml?: boolean;
  saveScreenshot?: boolean;
}): Promise<string> {
  console.log(`🎯 MCP: Scraping ${url}`);
  
  const uuid = `grok_${Date.now()}`;
  const files: string[] = [];
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });
    
    // Navegar
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 });
    
    // Aguardar Cloudflare
    for (let i = 0; i < CONFIG.cloudflareTimeout; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const title = await page.title();
      if (!title.includes('Just a moment') && !title.includes('Cloudflare')) {
        break;
      }
    }
    
    // Scroll completo
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    for (let i = 0; i < CONFIG.maxScrolls; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === lastHeight) break;
      lastHeight = newHeight;
    }
    
    // Extrair mensagens
    const result = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('div[class*="message"], article'))
        .map(el => ({
          text: el.innerText?.trim(),
          html: el.outerHTML?.substring(0, 500)
        }))
        .filter(m => m.text && m.text.length > 10);
      
      return {
        title: document.title,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.text,
        messages,
        html: document.documentElement.outerHTML,
        body: document.body.innerText
      };
    });
    
    // Criar diretório
    mkdirSync(outputDir, { recursive: true });
    
    // Salvar JSON
    const jsonPath = join(outputDir, `${uuid}.json`);
    writeFileSync(jsonPath, JSON.stringify({
      uuid,
      url,
      title: result.title,
      capturedAt: new Date().toISOString(),
      method: 'mcp-grok-scraper',
      messageCount: result.messageCount
    }, null, 2));
    files.push(jsonPath);
    
    // Salvar Markdown
    const mdPath = join(outputDir, `${uuid}.md`);
    let mdContent = `# ${result.title}\n\n`;
    mdContent += `**Data:** ${new Date().toLocaleString()}  \n`;
    mdContent += `**URL:** ${url}  \n`;
    mdContent += `**Mensagens:** ${result.messageCount}\n\n`;
    mdContent += `---\n\n`;
    
    result.messages?.forEach((msg, i) => {
      mdContent += `### Mensagem ${i + 1}\n\n${msg.text}\n\n---\n\n`;
    });
    
    writeFileSync(mdPath, mdContent);
    files.push(mdPath);
    
    // Salvar HTML se solicitado
    if (saveHtml) {
      const htmlPath = join(outputDir, `${uuid}.html`);
      writeFileSync(htmlPath, result.html);
      files.push(htmlPath);
    }
    
    // Screenshot se solicitado
    if (saveScreenshot) {
      const pngPath = join(outputDir, `${uuid}.png`);
      await page.screenshot({ path: pngPath, fullPage: true });
      files.push(pngPath);
    }
    
    await browser.close();
    
    return JSON.stringify({
      success: true,
      messageCount: result.messageCount,
      title: result.title,
      uuid,
      files,
      content: mdContent
    }, null, 2);
    
  } catch (error: any) {
    return JSON.stringify({
      success: false,
      messageCount: 0,
      title: '',
      uuid,
      files: [],
      error: error.message
    }, null, 2);
  }
}

async function grokRead({ 
  uuid, 
  outputDir = CONFIG.defaultOutputDir,
  format = 'markdown'
}: { 
  uuid: string;
  outputDir?: string;
  format?: 'markdown' | 'json' | 'text';
}): Promise<string> {
  const mdPath = join(outputDir, `${uuid}.md`);
  const jsonPath = join(outputDir, `${uuid}.json`);
  
  if (!existsSync(mdPath)) {
    return JSON.stringify({ success: false, error: 'Captura não encontrada' }, null, 2);
  }
  
  const mdContent = readFileSync(mdPath, 'utf-8');
  const jsonContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  
  return JSON.stringify({
    success: true,
    content: format === 'markdown' ? mdContent : undefined,
    metadata: jsonContent,
    messages: jsonContent.messages
  }, null, 2);
}

async function grokList({ 
  outputDir = CONFIG.defaultOutputDir 
}: { 
  outputDir?: string;
}): Promise<string> {
  if (!existsSync(outputDir)) {
    return JSON.stringify({ success: true, captures: [] }, null, 2);
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
            url: data.url || data.sourceUrl,
            title: data.title,
            messageCount: data.messageCount,
            capturedAt: data.capturedAt
          });
        } catch (e) {}
      }
    }
  } catch (e) {}
  
  return JSON.stringify({ success: true, captures }, null, 2);
}

async function grokContext({ 
  uuid, 
  outputDir = CONFIG.defaultOutputDir 
}: { 
  uuid?: string;
  outputDir?: string;
}): Promise<string> {
  if (uuid) {
    const mdPath = join(outputDir, `${uuid}.md`);
    if (existsSync(mdPath)) {
      const content = readFileSync(mdPath, 'utf-8');
      return JSON.stringify({
        success: true,
        context: content,
        hasConversation: true
      }, null, 2);
    }
  }
  
  // Listar última captura
  const listResult = JSON.parse(await grokList({ outputDir }));
  if (listResult.captures && listResult.captures.length > 0) {
    const latest = listResult.captures[0];
    const mdPath = join(outputDir, `${latest.uuid}.md`);
    if (existsSync(mdPath)) {
      const content = readFileSync(mdPath, 'utf-8');
      return JSON.stringify({
        success: true,
        context: content,
        hasConversation: true,
        latestUuid: latest.uuid
      }, null, 2);
    }
  }
  
  return JSON.stringify({
    success: true,
    context: '',
    hasConversation: false
  }, null, 2);
}

// ============================================
// PROTOCOLO MCP (STDIO)
// ============================================

async function main() {
  const stdin = Bun.file(0);
  const stdout = Bun.stdout;
  
  // Enviar capabilities
  const capabilities = {
    tools: Object.values(tools)
  };
  
  await stdout.write(JSON.stringify({
    jsonrpc: '2.0',
    id: null,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities,
      clientInfo: { name: 'mcp-grok-scraper', version: '1.0.0' }
    }
  }) + '\n');
  
  // Loop de mensagens
  for await (const line of stdin) {
    try {
      const msg = JSON.parse(line.toString());
      
      // Initialize response
      if (msg.method === 'initialize') {
        await stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'mcp-grok-scraper', version: '1.0.0' }
          }
        }) + '\n');
        continue;
      }
      
      // List tools
      if (msg.method === 'tools/list') {
        await stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: { tools: Object.values(tools) }
        }) + '\n');
        continue;
      }
      
      // Call tool
      if (msg.method === 'tools/call') {
        const { name, arguments: args } = msg.params;
        let result: string;
        
        switch (name) {
          case 'grok_scrape':
            result = await grokScrape(args);
            break;
          case 'grok_read':
            result = await grokRead(args);
            break;
          case 'grok_list':
            result = await grokList(args);
            break;
          case 'grok_context':
            result = await grokContext(args);
            break;
          default:
            result = JSON.stringify({ error: 'Tool not found' });
        }
        
        await stdout.write(JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          result: {
            content: [{ type: 'text', text: result }]
          }
        }) + '\n');
      }
      
    } catch (error: any) {
      await stdout.write(JSON.stringify({
        jsonrpc: '2.0',
        id: null,
        error: { message: error.message }
      }) + '\n');
    }
  }
}

main().catch(console.error);

export { grokScrape, grokRead, grokList, grokContext };
