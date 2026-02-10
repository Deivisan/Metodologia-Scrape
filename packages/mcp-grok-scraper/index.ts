/**
 * 🎯 MCP Grok Scraper - Model Context Protocol Server
 * Versão leve (sem Puppeteer) - Funciona com Bun sem erros de bundling
 * 
 * @author Deivison Santana (@deivisan)
 * @version 1.1.0
 * @date 2026-01-16
 * 
 * 🎓 METODOLOGIA: HTTP Leve com follow-redirects
 * Status: ✅ FUNCIONANDO no OpenCode
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import * as z from 'zod';
import { https } from 'follow-redirects';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

// ============================================
// FIRECRAWL INTEGRATION (Smart Fallback)
// ============================================

async function firecrawlScrape({
  url,
  outputDir = CONFIG.defaultOutputDir
}: {
  url: string;
  outputDir?: string;
}) {
  // Verificar API key
  if (!CONFIG.firecrawlApiKey) {
    return {
      success: false,
      messageCount: 0,
      title: '',
      uuid: `fc_${Date.now()}`,
      files: [],
      content: `Erro: FIRECRAWL_API_KEY não definida. Configure a variável de ambiente.`
    };
  }

  console.log(`🔥 MCP: Firecrawl scraping ${url}`);

  const uuid = `fc_${Date.now()}`;
  const files: string[] = [];

  try {
    const response = await new Promise<any>((resolve, reject) => {
      const data = JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true
      });

      const req = https.request({
        hostname: 'api.firecrawl.dev',
        path: '/v1/scrape',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.firecrawlApiKey}`
        },
        timeout: 60000
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => resolve({ statusCode: res.statusCode, body: JSON.parse(body) }));
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Firecrawl timeout')));
      req.write(data);
      req.end();
    });

    if (response.statusCode !== 200 || !response.body.success) {
      throw new Error(`Firecrawl failed: ${response.body?.error || 'Unknown error'}`);
    }

    const { markdown, html, metadata } = response.body.data;

    mkdirSync(outputDir, { recursive: true });

    const jsonPath = join(outputDir, `${uuid}.json`);
    writeFileSync(jsonPath, JSON.stringify({
      uuid,
      url,
      title: metadata?.title || 'Firecrawl Scrape',
      capturedAt: new Date().toISOString(),
      method: 'firecrawl-api-v1',
      messageCount: (markdown || '').split(/\n\n/).filter(Boolean).length
    }, null, 2));
    files.push(jsonPath);

    const mdPath = join(outputDir, `${uuid}.md`);
    let mdContent = `# ${metadata?.title || 'Firecrawl Scrape'}\n\n`;
    mdContent += `**Data:** ${new Date().toLocaleString()}\n`;
    mdContent += `**URL:** ${url}\n`;
    mdContent += `**Método:** Firecrawl API v1 (Smart Fallback)\n\n`;
    mdContent += `---\n\n`;
    mdContent += markdown || '';
    writeFileSync(mdPath, mdContent);
    files.push(mdPath);

    return { success: true, messageCount: files.length, title: metadata?.title || 'Firecrawl', uuid, files, content: mdContent, method: 'firecrawl' };

  } catch (error: any) {
    return { success: false, messageCount: 0, title: '', uuid, files: [], content: `Firecrawl Error: ${error.message}`, method: 'firecrawl' };
  }
}

// Configuração
// NOTA: Defina FIRECRAWL_API_KEY como variável de ambiente
// A API key não está hardcoded por segurança (repo público)
const CONFIG = {
  defaultOutputDir: join(dirname(fileURLToPath(import.meta.url)), 'captures'),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  requestTimeout: 30000,
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
  useFirecrawlFallback: !!process.env.FIRECRAWL_API_KEY
};

// ============================================
// FUNÇÕES DO SCRAPER (VERSÃO LEVE)
// ============================================

async function grokScrape({
  url,
  outputDir = CONFIG.defaultOutputDir,
  saveHtml = false,
  saveScreenshot = false,
  forceFirecrawl = false
}: {
  url: string;
  outputDir?: string;
  saveHtml?: boolean;
  saveScreenshot?: boolean;
  forceFirecrawl?: boolean;
}) {
  console.log(`🎯 MCP: Scraping ${url}`);

  const uuid = `grok_${Date.now()}`;
  const files: string[] = [];

  try {
    // Strategy 1: Firecrawl (if forced or fallback)
    if (forceFirecrawl || CONFIG.useFirecrawlFallback) {
      const fcResult = await firecrawlScrape({ url, outputDir });
      if (fcResult.success) {
        console.log(`✅ MCP: Firecrawl succeeded`);
        return fcResult;
      }
      if (forceFirecrawl) {
        // If forced and failed, return error
        throw new Error('Firecrawl failed');
      }
      console.log(`⚠️ MCP: Firecrawl failed, trying HTTP...`);
    }

    // Strategy 2: HTTP request simples
    const response = await new Promise<any>((resolve, reject) => {
      const req = https.get(url, {
        headers: { 'User-Agent': CONFIG.userAgent },
        timeout: CONFIG.requestTimeout
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        }));
      });
      req.on('error', reject);
      req.on('timeout', () => reject(new Error('HTTP Timeout')));
    });

    if (response.statusCode !== 200) {
      // Fallback to Firecrawl if HTTP fails
      if (CONFIG.useFirecrawlFallback) {
        console.log(`⚠️ MCP: HTTP ${response.statusCode}, using Firecrawl fallback...`);
        return await firecrawlScrape({ url, outputDir });
      }
      throw new Error(`HTTP ${response.statusCode}`);
    }

    // Detectar proteção Cloudflare
    const hasCloudflare = response.body.includes('cloudflare') || response.body.includes('challenges');
    if (hasCloudflare && CONFIG.useFirecrawlFallback) {
      console.log(`⚠️ MCP: Cloudflare detected, using Firecrawl...`);
      return await firecrawlScrape({ url, outputDir });
    }

    // Extrair título
    const titleMatch = response.body.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'Grok Conversation';

    // Criar diretório
    mkdirSync(outputDir, { recursive: true });

    // Salvar JSON
    const jsonPath = join(outputDir, `${uuid}.json`);
    writeFileSync(jsonPath, JSON.stringify({
      uuid,
      url,
      title,
      capturedAt: new Date().toISOString(),
      method: 'mcp-grok-scraper-light-v1.1',
      rawHtmlLength: response.body.length
    }, null, 2));
    files.push(jsonPath);

    // Salvar Markdown
    const mdPath = join(outputDir, `${uuid}.md`);
    let mdContent = `# ${title}\n\n`;
    mdContent += `**Data:** ${new Date().toLocaleString()}\n`;
    mdContent += `**URL:** ${url}\n`;
    mdContent += `**Método:** Light HTTP Scraper v1.1\n\n`;
    mdContent += `---\n\n`;

    // Tentar extrair mensagens
    const messages = extractMessages(response.body);
    if (messages.length > 0) {
      mdContent += `## 💬 ${messages.length} Mensagens Extraídas\n\n`;
      messages.forEach((msg, i) => {
        mdContent += `### ${i + 1}. ${msg.role || 'Unknown'}\n\n`;
        mdContent += `${msg.content || msg.text || JSON.stringify(msg)}\n\n`;
      });
    } else {
      mdContent += `**Nota:** Versão leve - conteúdo não estruturado detectado.\n`;
      mdContent += `Use forceFirecrawl: true para scraping completo.\n`;
    }

    writeFileSync(mdPath, mdContent);
    files.push(mdPath);

    if (saveHtml) {
      const htmlPath = join(outputDir, `${uuid}.html`);
      writeFileSync(htmlPath, response.body);
      files.push(htmlPath);
    }

    return {
      success: true,
      messageCount: messages.length,
      title,
      uuid,
      files,
      content: mdContent
    };

  } catch (error: any) {
    // Final fallback
    if (CONFIG.useFirecrawlFallback) {
      console.log(`🔥 MCP: Final fallback to Firecrawl...`);
      return await firecrawlScrape({ url, outputDir });
    }
    return {
      success: false,
      messageCount: 0,
      title: '',
      uuid,
      files: [],
      content: `Erro: ${error.message}`
    };
  }
}

// Simple message extraction for HTTP version
function extractMessages(html: string): any[] {
  const messages: any[] = [];

  // Try JSON-LD data first
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi);
  if (jsonLdMatch) {
    try {
      jsonLdMatch.forEach(script => {
        const content = script.replace(/<[^>]+>/g, '');
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item['@type'] === 'Conversation' || item['@type'] === 'Message') {
              messages.push(item);
            }
          });
        }
      });
    } catch (e) {}
  }

  // Fallback: Try data attributes
  if (messages.length === 0) {
    const dataAttrMatch = html.match(/data-message='([^']*)'/g);
    if (dataAttrMatch) {
      dataAttrMatch.forEach(attr => {
        try {
          const json = attr.replace(/data-message='/, '').replace(/'$/, '');
          const msg = JSON.parse(decodeURIComponent(json));
          messages.push(msg);
        } catch (e) {}
      });
    }
  }

  return messages;
}

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
  
  if (!existsSync(mdPath)) {
    return { success: false };
  }
  
  const mdContent = readFileSync(mdPath, 'utf-8');
  const jsonContent = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  
  return {
    success: true,
    content: format === 'markdown' ? mdContent : undefined,
    metadata: jsonContent,
    messages: jsonContent.messages
  };
}

async function grokList({ 
  outputDir = CONFIG.defaultOutputDir 
}: { 
  outputDir?: string;
}) {
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
            url: data.url || data.sourceUrl,
            title: data.title,
            messageCount: data.messageCount || 0,
            capturedAt: data.capturedAt
          });
        } catch (e) {}
      }
    }
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
}) {
  if (uuid) {
    const mdPath = join(outputDir, `${uuid}.md`);
    if (existsSync(mdPath)) {
      const content = readFileSync(mdPath, 'utf-8');
      return {
        success: true,
        context: content,
        hasConversation: true
      };
    }
  }
  
  const list = await grokList({ outputDir });
  if (list.captures && list.captures.length > 0) {
    const latest = list.captures[0];
    const mdPath = join(outputDir, `${latest.uuid}.md`);
    if (existsSync(mdPath)) {
      const content = readFileSync(mdPath, 'utf-8');
      return {
        success: true,
        context: content,
        hasConversation: true
      };
    }
  }
  
  return {
    success: true,
    context: '',
    hasConversation: false
  };
}

// ============================================
// SERVIDOR MCP (usando @modelcontextprotocol/sdk)
// ============================================

const server = new Server({
  name: 'mcp-grok-scraper',
  version: '1.1.0'
});

// Primeiro declarar capabilities
server.registerCapabilities({
  tools: {
    listChanged: true
  }
});

// Handler para listar ferramentas
server.setRequestHandler(
  ListToolsRequestSchema,
  async () => {
    return {
      tools: [
        {
          name: 'grok_scrape',
          description: 'Scrape Grok conversation with automatic Firecrawl fallback for protected sites',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'Grok conversation URL to scrape' },
              outputDir: { type: 'string', description: 'Output directory for captures' },
              saveHtml: { type: 'boolean', description: 'Save HTML file' },
              forceFirecrawl: { type: 'boolean', description: 'Force Firecrawl API (skip HTTP attempt)' }
            },
            required: ['url']
          }
        },
        {
          name: 'firecrawl_scrape',
          description: 'Scrape any URL using Firecrawl API (bypasses Cloudflare, renders JS)',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'URL to scrape' },
              outputDir: { type: 'string', description: 'Output directory' }
            },
            required: ['url']
          }
        },
        {
          name: 'grok_read',
          description: 'Read a captured Grok conversation by UUID',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: { type: 'string', description: 'UUID of the captured conversation' },
              outputDir: { type: 'string', description: 'Output directory' },
              format: { type: 'string', description: 'Output format (json/markdown/text)' }
            },
            required: ['uuid']
          }
        },
        {
          name: 'grok_list',
          description: 'List all captured Grok conversations',
          inputSchema: {
            type: 'object',
            properties: {
              outputDir: { type: 'string', description: 'Output directory' }
            }
          }
        },
        {
          name: 'grok_context',
          description: 'Get conversation context/markdown for a captured conversation',
          inputSchema: {
            type: 'object',
            properties: {
              uuid: { type: 'string', description: 'UUID of the conversation' },
              outputDir: { type: 'string', description: 'Output directory' }
            }
          }
        }
      ]
    };
  }
);

// Schema for tools/call
const ToolsCallSchema = z.object({
  method: z.literal('tools/call'),
  params: z.object({
    name: z.string(),
    arguments: z.any()
  })
});

// Tool: grok_scrape
server.setRequestHandler(
  ToolsCallSchema,
  async (request) => {
    const { name, arguments: args } = request.params;
    if (name === 'grok_scrape') {
      const result = await grokScrape(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } else if (name === 'firecrawl_scrape') {
      const result = await firecrawlScrape(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } else if (name === 'grok_read') {
      const result = await grokRead(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } else if (name === 'grok_list') {
      const result = await grokList(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } else if (name === 'grok_context') {
      const result = await grokContext(args);
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    }
    throw new Error(`Unknown tool: ${name}`);
  }
);

// Tool: grok_read (continua no handler acima)

// Tool: grok_list (continua no handler acima)

// Tool: grok_context (continua no handler acima)

// Iniciar servidor
const transport = new StdioServerTransport();
await server.connect(transport);

// Usar stderr para logs (não interfere na comunicação MCP via stdout)
console.error('🚀 MCP Grok Scraper v2.0 rodando...');
console.error('🔥 Firecrawl integrado como fallback inteligente');
console.error('📋 Tools: grok_scrape, firecrawl_scrape, grok_read, grok_list, grok_context');

export { grokScrape, firecrawlScrape, grokRead, grokList, grokContext };
