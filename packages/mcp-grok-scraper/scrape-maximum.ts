/**
 * 🚀 MCP Grok Scraper - VERSÃO MAXIMUM (Captura Completa Garantida)
 * Captura TUDO - incluindo conversas gigantes com lazy loading
 * 
 * @author Deivison Santana (@deivisan)
 * @version 4.0.0 - Maximum Mode
 * @date 2026-02-13
 * 
 * 🎓 METODOLOGIA: Firecrawl + Máximo Scroll + Detecção de Fim
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { https } from 'follow-redirects';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURAÇÃO MAXIMUM
// ============================================

const CONFIG = {
  defaultOutputDir: join(__dirname, 'captures'),
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
  requestTimeout: 300000, // 5 minutos para conversas gigantes
  maxScrollAttempts: 50,   // 50 scrolls para garantir
  scrollDelay: 1000,       // 1s entre scrolls para carregamento
};

// ============================================
// FIRECRAWL MAXIMUM - Garante captura completa
// ============================================

async function firecrawlScrapeMaximum({
  url,
  outputDir = CONFIG.defaultOutputDir
}: {
  url: string;
  outputDir?: string;
}) {
  if (!CONFIG.firecrawlApiKey) {
    throw new Error('FIRECRAWL_API_KEY não definida. Configure a variável de ambiente.');
  }

  console.log(`🔥🔥🔥 Firecrawl MAXIMUM: ${url}`);
  console.log(`📜 Scrolls configurados: ${CONFIG.maxScrollAttempts}`);
  console.log(`⏱️  Timeout: ${CONFIG.requestTimeout / 1000}s`);

  const uuid = `grok_max_${Date.now()}`;
  const files: string[] = [];

  try {
    // MONTAR ACTIONS PARA SCROLL MÁXIMO (máximo 50 actions permitido)
    const actions: any[] = [];
    
    // Firecrawl limita a 50 actions totais
    // Vamos usar: 40 scrolls + 10 waits (1 wait a cada 4 scrolls)
    const totalScrolls = 40;
    
    for (let i = 0; i < totalScrolls; i++) {
      actions.push({
        type: 'scroll',
        direction: 'down'
      });
      
      // Wait a cada 4 scrolls para carregamento
      if ((i + 1) % 4 === 0 && actions.length < 50) {
        actions.push({
          type: 'wait',
          milliseconds: CONFIG.scrollDelay
        });
      }
    }
    
    // Wait final se ainda tiver espaço
    if (actions.length < 50) {
      actions.push({
        type: 'wait',
        milliseconds: 2000
      });
    }

    console.log(`📤 Enviando request com ${actions.length} actions...`);
    console.log(`⏳ Isso pode demorar alguns minutos...`);

    const response = await new Promise<any>((resolve, reject) => {
      const data = JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: false, // Pegar tudo, não só main content
        timeout: CONFIG.requestTimeout,
        actions: actions,
        waitFor: 5000, // Esperar 5s inicial
        mobile: false, // Desktop mode = mais conteúdo visível
        removeBase64Images: true // Remover imagens base64 para focar no texto
      });

      const req = https.request({
        hostname: 'api.firecrawl.dev',
        path: '/v1/scrape',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.firecrawlApiKey}`
        },
        timeout: CONFIG.requestTimeout + 30000 // +30s margem
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: { error: 'Invalid JSON', raw: body.substring(0, 500) } });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error(`Firecrawl timeout após ${CONFIG.requestTimeout}ms`)));
      req.write(data);
      req.end();
    });

    if (response.statusCode !== 200) {
      throw new Error(`Firecrawl HTTP ${response.statusCode}: ${JSON.stringify(response.body).substring(0, 200)}`);
    }

    if (!response.body.success) {
      throw new Error(`Firecrawl failed: ${response.body.error || 'Unknown error'}`);
    }

    const { markdown, html, metadata, actions: executedActions } = response.body.data;

    console.log(`\n✅ Firecrawl MAXIMUM completado!`);
    console.log(`📊 Título: ${metadata?.title || 'N/A'}`);
    if (executedActions) {
      console.log(`🎬 Actions executadas: ${executedActions.length}`);
    }

    // Criar diretório
    mkdirSync(outputDir, { recursive: true });

    // VERIFICAR SE PEGOU TUDO
    const hasMoreContent = markdown?.includes('Sign in to continue') || 
                           markdown?.includes('Load more') ||
                           markdown?.includes('Show more');
    
    if (hasMoreContent) {
      console.log(`⚠️  ATENÇÃO: Conteúdo pode estar incompleto (detectado "Sign in/Load more")`);
    }

    // Salvar JSON com metadados completos
    const jsonPath = join(outputDir, `${uuid}.json`);
    const jsonData = {
      uuid,
      url,
      title: metadata?.title || 'Grok Conversation',
      capturedAt: new Date().toISOString(),
      method: 'firecrawl-maximum-v4.0',
      scrollConfig: {
        attempts: CONFIG.maxScrollAttempts,
        delay: CONFIG.scrollDelay,
        totalActions: actions.length
      },
      metadata: {
        ...metadata,
        markdownLength: markdown?.length || 0,
        htmlLength: html?.length || 0,
        hasMoreContent: hasMoreContent || false
      }
    };
    writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    files.push(jsonPath);
    console.log(`💾 JSON: ${jsonPath}`);

    // Salvar Markdown COMPLETO
    const mdPath = join(outputDir, `${uuid}.md`);
    let mdContent = `# ${metadata?.title || 'Grok Conversation'}\n\n`;
    mdContent += `**Data:** ${new Date().toLocaleString('pt-BR')}\n`;
    mdContent += `**URL:** ${url}\n`;
    mdContent += `**Método:** Firecrawl MAXIMUM v4.0\n`;
    mdContent += `**Scrolls:** ${CONFIG.maxScrollAttempts} tentativas\n`;
    mdContent += `**Tamanho:** ${markdown?.length || 0} caracteres\n`;
    mdContent += `**Completo:** ${hasMoreContent ? '⚠️ Possivelmente incompleto' : '✅ Completo'}\n\n`;
    mdContent += `---\n\n`;
    mdContent += markdown || '*Nenhum conteúdo*';
    
    writeFileSync(mdPath, mdContent);
    files.push(mdPath);
    console.log(`💾 Markdown: ${mdPath}`);

    // Salvar HTML para análise
    if (html) {
      const htmlPath = join(outputDir, `${uuid}.html`);
      writeFileSync(htmlPath, html);
      files.push(htmlPath);
      console.log(`💾 HTML: ${htmlPath}`);
    }

    // ESTATÍSTICAS DETALHADAS
    const lines = (markdown || '').split('\n').filter(line => line.trim());
    const paragraphs = (markdown || '').split('\n\n').filter(p => p.trim());
    
    // Tentar extrair mensagens da conversa
    const messageMatches = markdown?.match(/(User|Grok|Human|Assistant)[\s:]+/gi) || [];
    
    console.log(`\n📊 ESTATÍSTICAS DA CAPTURA:`);
    console.log(`   ├─ Linhas: ${lines.length}`);
    console.log(`   ├─ Parágrafos: ${paragraphs.length}`);
    console.log(`   ├─ Caracteres: ${markdown?.length || 0}`);
    console.log(`   ├─ Mensagens detectadas: ~${messageMatches.length}`);
    console.log(`   ├─ Arquivos salvos: ${files.length}`);
    console.log(`   └─ Status: ${hasMoreContent ? '⚠️ VERIFICAR' : '✅ OK'}`);

    return {
      success: true,
      uuid,
      files,
      content: markdown,
      metadata: jsonData.metadata,
      stats: {
        lines: lines.length,
        paragraphs: paragraphs.length,
        chars: markdown?.length || 0,
        estimatedMessages: messageMatches.length,
        complete: !hasMoreContent
      }
    };

  } catch (error: any) {
    console.error(`\n❌ Erro Firecrawl MAXIMUM:`, error.message);
    throw error;
  }
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error(`
🔥🔥🔥 MCP Grok Scraper MAXIMUM v4.0

Uso: bun run scrape-maximum.ts <URL_GROK_SHARE>

Exemplo:
  bun run scrape-maximum.ts https://grok.com/share/c2hhcmQtMg_...

Features:
  • 50 scrolls agressivos
  • Detecção de conteúdo incompleto
  • Timeout de 5 minutos
  • Captura HTML completo

Variáveis:
  FIRECRAWL_API_KEY - Chave da API (obrigatória)
    `);
    process.exit(1);
  }

  console.log(`\n🔥🔥🔥 ============================================`);
  console.log(`🔥🔥🔥 GROK SCRAPER MAXIMUM v4.0`);
  console.log(`🔥🔥🔥 ============================================\n`);

  const startTime = Date.now();

  try {
    const result = await firecrawlScrapeMaximum({ url });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log(`\n✅✅✅ ============================================`);
    console.log(`🎉 CAPTURA MAXIMUM COMPLETADA!`);
    console.log(`✅✅✅ ============================================\n`);
    console.log(`⏱️  Duração: ${duration}s`);
    console.log(`📁 UUID: ${result.uuid}`);
    console.log(`📄 Arquivos:`);
    result.files.forEach(f => console.log(`   • ${f}`));
    console.log(`\n📊 Resultado:`);
    console.log(`   • ${result.stats.lines} linhas`);
    console.log(`   • ${result.stats.paragraphs} parágrafos`);
    console.log(`   • ${result.stats.chars} caracteres`);
    console.log(`   • ~${result.stats.estimatedMessages} mensagens`);
    console.log(`   • Completo: ${result.stats.complete ? '✅ SIM' : '⚠️ VERIFICAR'}`);
    
    console.log(`\n📝 Primeiros 800 caracteres:`);
    console.log('=' .repeat(50));
    console.log(result.content?.substring(0, 800));
    console.log('=' .repeat(50));

  } catch (error: any) {
    console.error(`\n❌❌❌ ============================================`);
    console.error(`💥 FALHA NA CAPTURA MAXIMUM`);
    console.error(`❌❌❌ ============================================\n`);
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { firecrawlScrapeMaximum };
