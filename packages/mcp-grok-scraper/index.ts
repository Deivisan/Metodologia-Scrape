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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as z from 'zod';
import { https } from 'follow-redirects';

// Configuração
const CONFIG = {
  defaultOutputDir: join(dirname(fileURLToPath(import.meta.url)), 'captures'),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  requestTimeout: 30000
};

// ============================================
// FUNÇÕES DO SCRAPER (VERSÃO LEVE)
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
}) {
  console.log(`🎯 MCP: Scraping ${url}`);
  
  const uuid = `grok_${Date.now()}`;
  const files: string[] = [];
  
  try {
    // HTTP request simples
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
      req.on('timeout', () => reject(new Error('Timeout')));
    });

    if (response.statusCode !== 200) {
      throw new Error(`HTTP ${response.statusCode}`);
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
    mdContent += `**Data:** ${new Date().toLocaleString()}  \n`;
    mdContent += `**URL:** ${url}  \n`;
    mdContent += `**Método:** Light HTTP Scraper v1.1\n\n`;
    mdContent += `---\n\n`;
    mdContent += `**Nota:** Versão leve sem Puppeteer. Para conversas complexas com Cloudflare, use Playwright MCP.\n`;
    
    writeFileSync(mdPath, mdContent);
    files.push(mdPath);
    
    // Salvar HTML se solicitado
    if (saveHtml) {
      const htmlPath = join(outputDir, `${uuid}.html`);
      writeFileSync(htmlPath, response.body);
      files.push(htmlPath);
    }
    
    return {
      success: true,
      messageCount: 1,
      title,
      uuid,
      files,
      content: mdContent
    };
    
  } catch (error: any) {
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

const server = new McpServer({
  name: 'mcp-grok-scraper',
  version: '1.1.0'
});

// Tool: grok_scrape
server.registerTool(
  'grok_scrape',
  {
    title: 'Capturar Conversa do Grok',
    description: 'Captura uma conversa do Grok Share e salva em arquivos',
    inputSchema: {
      url: z.string().describe('URL do Grok Share'),
      outputDir: z.string().optional().describe('Diretório de saída'),
      saveHtml: z.boolean().optional().describe('Salvar HTML completo'),
      saveScreenshot: z.boolean().optional().describe('Salvar screenshot')
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
  async ({ url, outputDir, saveHtml, saveScreenshot }) => {
    const result = await grokScrape({ url, outputDir, saveHtml, saveScreenshot });
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
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
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
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
      captures: z.array(z.object({
        uuid: z.string(),
        url: z.string(),
        title: z.string(),
        messageCount: z.number(),
        capturedAt: z.string()
      }))
    }
  },
  async ({ outputDir }) => {
    const result = await grokList({ outputDir });
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
    };
  }
);

// Tool: grok_context
server.registerTool(
  'grok_context',
  {
    title: 'Obter Contexto',
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
      content: [{ type: 'text', text: JSON.stringify(result) }],
      structuredContent: result
    };
  }
);

// Iniciar servidor
const transport = new StdioServerTransport();
await server.connect(transport);

console.log('🚀 MCP Grok Scraper v1.1 rodando...');
console.log('📋 Available tools: grok_scrape, grok_read, grok_list, grok_context');

export { grokScrape, grokRead, grokList, grokContext };
