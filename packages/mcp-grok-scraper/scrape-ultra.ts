/**
 * 🚀 MCP Grok Scraper - VERSÃO ULTRA (Conversas Longas)
 * Captura conversas completas do Grok Share com scroll infinito
 * 
 * @author Deivison Santana (@deivisan)
 * @version 3.0.0 - Ultra Mode
 * @date 2026-02-13
 * 
 * 🎓 METODOLOGIA: Firecrawl + Actions (scroll) para conversas longas
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { https } from 'follow-redirects';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  defaultOutputDir: join(__dirname, 'captures'),
  firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
  requestTimeout: 120000, // 2 minutos para conversas longas
  maxScrollAttempts: 20,   // Máximo de scrolls para carregar tudo
};

// ============================================
// FIRECRAWL ULTRA - Com scroll para conversas longas
// ============================================

async function firecrawlScrapeUltra({
  url,
  outputDir = CONFIG.defaultOutputDir,
  scrollToBottom = true
}: {
  url: string;
  outputDir?: string;
  scrollToBottom?: boolean;
}) {
  if (!CONFIG.firecrawlApiKey) {
    throw new Error('FIRECRAWL_API_KEY não definida. Configure a variável de ambiente.');
  }

  console.log(`🔥 Firecrawl ULTRA: ${url}`);
  console.log(`📜 Scroll ativado: ${scrollToBottom ? 'SIM' : 'NÃO'}`);

  const uuid = `grok_ultra_${Date.now()}`;
  const files: string[] = [];

  try {
    // Preparar actions para scroll infinito
    const actions: any[] = [];
    
    if (scrollToBottom) {
      // Adicionar múltiplos scrolls para carregar conversas longas
      for (let i = 0; i < CONFIG.maxScrollAttempts; i++) {
        actions.push({
          type: 'scroll',
          direction: 'down'
        });
        // Pequena pausa entre scrolls para carregamento
        actions.push({
          type: 'wait',
          milliseconds: 500
        });
      }
    }

    const response = await new Promise<any>((resolve, reject) => {
      const data = JSON.stringify({
        url,
        formats: ['markdown', 'html'],
        onlyMainContent: true,
        timeout: CONFIG.requestTimeout,
        actions: scrollToBottom ? actions : undefined,
        waitFor: 3000 // Esperar 3s inicial para carregar
      });

      console.log(`📤 Enviando request para Firecrawl...`);
      console.log(`📝 Actions: ${actions.length} scrolls configurados`);

      const req = https.request({
        hostname: 'api.firecrawl.dev',
        path: '/v1/scrape',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CONFIG.firecrawlApiKey}`
        },
        timeout: CONFIG.requestTimeout + 10000 // +10s de margem
      }, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ statusCode: res.statusCode, body: { error: 'Invalid JSON', raw: body } });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Firecrawl timeout')));
      req.write(data);
      req.end();
    });

    if (response.statusCode !== 200) {
      throw new Error(`Firecrawl HTTP ${response.statusCode}: ${JSON.stringify(response.body)}`);
    }

    if (!response.body.success) {
      throw new Error(`Firecrawl failed: ${response.body.error || 'Unknown error'}`);
    }

    const { markdown, html, metadata, actions: executedActions } = response.body.data;

    console.log(`✅ Firecrawl completado!`);
    console.log(`📊 Metadata:`, metadata);
    if (executedActions) {
      console.log(`🎬 Actions executadas: ${executedActions.length}`);
    }

    // Criar diretório
    mkdirSync(outputDir, { recursive: true });

    // Salvar JSON com metadados
    const jsonPath = join(outputDir, `${uuid}.json`);
    const jsonData = {
      uuid,
      url,
      title: metadata?.title || 'Grok Conversation',
      capturedAt: new Date().toISOString(),
      method: 'firecrawl-ultra-v3.0',
      scrollEnabled: scrollToBottom,
      scrollAttempts: CONFIG.maxScrollAttempts,
      metadata: {
        ...metadata,
        markdownLength: markdown?.length || 0,
        htmlLength: html?.length || 0
      }
    };
    writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
    files.push(jsonPath);
    console.log(`💾 JSON salvo: ${jsonPath}`);

    // Salvar Markdown completo
    const mdPath = join(outputDir, `${uuid}.md`);
    let mdContent = `# ${metadata?.title || 'Grok Conversation'}\n\n`;
    mdContent += `**Data de Captura:** ${new Date().toLocaleString('pt-BR')}\n`;
    mdContent += `**URL Original:** ${url}\n`;
    mdContent += `**Método:** Firecrawl Ultra v3.0 (Scroll Infinito)\n`;
    mdContent += `**Scrolls:** ${CONFIG.maxScrollAttempts} tentativas\n`;
    mdContent += `**Tamanho:** ${markdown?.length || 0} caracteres\n\n`;
    mdContent += `---\n\n`;
    mdContent += markdown || '*Nenhum conteúdo markdown disponível*';
    
    writeFileSync(mdPath, mdContent);
    files.push(mdPath);
    console.log(`💾 Markdown salvo: ${mdPath}`);

    // Salvar HTML bruto também (para debug)
    if (html) {
      const htmlPath = join(outputDir, `${uuid}.html`);
      writeFileSync(htmlPath, html);
      files.push(htmlPath);
      console.log(`💾 HTML salvo: ${htmlPath}`);
    }

    // Análise do conteúdo
    const lines = (markdown || '').split('\n').filter(line => line.trim());
    const paragraphs = (markdown || '').split('\n\n').filter(p => p.trim());
    
    console.log(`\n📊 ESTATÍSTICAS:`);
    console.log(`   • Linhas: ${lines.length}`);
    console.log(`   • Parágrafos: ${paragraphs.length}`);
    console.log(`   • Caracteres: ${markdown?.length || 0}`);
    console.log(`   • Arquivos salvos: ${files.length}`);

    return {
      success: true,
      uuid,
      files,
      content: markdown,
      metadata: jsonData.metadata,
      stats: {
        lines: lines.length,
        paragraphs: paragraphs.length,
        chars: markdown?.length || 0
      }
    };

  } catch (error: any) {
    console.error(`❌ Erro Firecrawl Ultra:`, error.message);
    throw error;
  }
}

// ============================================
// FUNÇÃO PRINCIPAL - CLI
// ============================================

async function main() {
  const url = process.argv[2];
  
  if (!url) {
    console.error(`
🚀 MCP Grok Scraper ULTRA v3.0

Uso: bun run scrape-ultra.ts <URL_GROK_SHARE>

Exemplo:
  bun run scrape-ultra.ts https://grok.com/share/c2hhcmQtMg_...

Variáveis de ambiente:
  FIRECRAWL_API_KEY  - Chave da API Firecrawl (obrigatória)
    `);
    process.exit(1);
  }

  console.log(`\n🎯 ============================================`);
  console.log(`🚀 GROK SCRAPER ULTRA v3.0`);
  console.log(`🎯 ============================================\n`);

  try {
    const result = await firecrawlScrapeUltra({
      url,
      scrollToBottom: true
    });

    console.log(`\n✅ ============================================`);
    console.log(`🎉 CAPTURA COMPLETADA COM SUCESSO!`);
    console.log(`✅ ============================================\n`);
    console.log(`📁 UUID: ${result.uuid}`);
    console.log(`📄 Arquivos: ${result.files.join('\n            ')}`);
    console.log(`\n📊 Conteúdo capturado:`);
    console.log(`   • ${result.stats.lines} linhas`);
    console.log(`   • ${result.stats.paragraphs} parágrafos`);
    console.log(`   • ${result.stats.chars} caracteres`);
    console.log(`\n📝 Preview (primeiros 500 chars):`);
    console.log(result.content?.substring(0, 500) + '...' || 'N/A');

  } catch (error: any) {
    console.error(`\n❌ ============================================`);
    console.error(`💥 FALHA NA CAPTURA`);
    console.error(`❌ ============================================\n`);
    console.error(`Erro: ${error.message}`);
    process.exit(1);
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { firecrawlScrapeUltra };
