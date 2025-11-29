/**
 * 🕷️ Scrape Universal v3.1 - Framework de Captação Inteligente
 * Autor: Deivison Santana (@deivisan)
 * 
 * Este script é um template robusto para extração de dados de SPAs (Single Page Applications).
 * Configurado por padrão para conversas do Grok, mas facilmente adaptável.
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// --- ⚙️ CONFIGURAÇÃO UNIVERSAL ---
const CONFIG = {
  targetUrl: process.argv[2], // URL passada via CLI
  outputDir: path.join(__dirname, 'captures'), // Pasta de saída padrão
  scroll: {
    enabled: true,
    delay: 2000,    // Tempo de espera entre scrolls (ms)
    maxScrolls: 50, // Limite de segurança para evitar loops infinitos
  },
  selectors: {
    // Lista de seletores para tentar encontrar mensagens (ordem de prioridade)
    messageContainers: [
      '[role="article"]',
      '[data-testid*="message"]',
      '.message',
      'div[class*="message"]'
    ],
    author: '[data-author], .author, strong',
    timestamp: 'time'
  },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// --- 🔧 FUNÇÕES UTILITÁRIAS ---

/** Gera metadados básicos a partir da URL */
function extractMetadata(url) {
  const timestamp = new Date().toISOString();
  // Tenta extrair um ID único da URL ou gera um aleatório
  const urlMatch = url ? url.match(/share\/([^_]+)_(.+)$/) : null;
  const uuid = urlMatch ? urlMatch[2] : `capture_${Date.now()}`;
  
  return {
    uuid,
    sourceUrl: url || 'unknown',
    capturedAt: timestamp
  };
}

/** Realiza scroll infinito suave para carregar conteúdo dinâmico */
async function autoScroll(page) {
  if (!CONFIG.scroll.enabled) return;

  let previousHeight = 0;
  let scrollCount = 0;
  
  console.log('📜 [Scroll] Iniciando varredura de conteúdo...');
  
  while (scrollCount < CONFIG.scroll.maxScrolls) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    
    if (currentHeight === previousHeight) {
      console.log('✅ [Scroll] Final da página alcançado.');
      break;
    }
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(CONFIG.scroll.delay);
    
    previousHeight = currentHeight;
    scrollCount++;
    
    if (scrollCount % 5 === 0) {
      console.log(`   ⏳ [Scroll] Passo ${scrollCount}/${CONFIG.scroll.maxScrolls} (${currentHeight}px)`);
    }
  }
  
  // Retorna ao topo para garantir que elementos visíveis sejam capturados corretamente se necessário
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
}

/** 
 * Núcleo da Extração: Roda dentro do navegador 
 * Adapte esta função para extrair dados diferentes (ex: produtos, artigos)
 */
async function extractContent(page) {
  console.log('🔍 [Extract] Analisando DOM...');
  
  // Aguarda o corpo da página estar presente
  try {
    await page.waitForSelector('body', { timeout: 15000 });
  } catch (e) {
    console.warn('⚠️ [Warn] Timeout aguardando body. Tentando extração mesmo assim...');
  }
  
  return await page.evaluate((selectors) => {
    const results = [];
    
    // 1. Tenta encontrar containers de conteúdo com a lista de seletores
    let elements = [];
    for (const sel of selectors.messageContainers) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) {
        elements = found;
        break;
      }
    }
    
    // 2. Fallback: Se não achar nada estruturado, pega o texto bruto
    if (elements.length === 0) {
      return [{
        type: 'raw',
        content: document.body.innerText,
        author: 'system',
        timestamp: new Date().toISOString()
      }];
    }
    
    // 3. Processa cada elemento encontrado
    elements.forEach((el, idx) => {
      const text = el.innerText?.trim();
      if (!text) return;
      
      // Tenta extrair autor e hora com seletores específicos
      const authorEl = el.querySelector(selectors.author);
      const timeEl = el.querySelector(selectors.timestamp);
      
      results.push({
        index: idx,
        type: 'structured',
        content: text,
        author: authorEl ? authorEl.innerText.trim() : 'unknown',
        timestamp: timeEl ? timeEl.getAttribute('datetime') : null
      });
    });
    
    return results;
  }, CONFIG.selectors);
}

/** Gera um arquivo Markdown limpo a partir dos dados */
function generateMarkdown(metadata, data) {
  const date = new Date(metadata.capturedAt).toLocaleString('pt-BR');
  
  let md = `# 📝 Relatório de Captura\n\n`;
  md += `> **ID:** 
${'`'}${metadata.uuid}${'`'}
`;
  md += `> **Data:** ${date}\n`;
  md += `> **Fonte:** [${metadata.sourceUrl}](${metadata.sourceUrl})\n`;
  md += `> **Itens:** ${data.length}\n\n`;
  md += `---\n\n`;
  
  data.forEach(item => {
    if (item.type === 'raw') {
      md += `### ⚠️ Conteúdo Bruto (Estrutura não detectada)\n\n`;
      md += `
${'`'}`text
${'`'}
${item.content}

`;
    } else {
      const icon = item.author.toLowerCase().includes('grok') ? '🤖' : '👤';
      md += `### ${icon} **${item.author}**\n`;
      md += `${item.content}\n\n`;
      md += `*${item.timestamp || ''}*\n`;
      md += `---\n`;
    }
  });
  
  return md;
}

// --- 🚀 MAIN ---
(async () => {
  // Validação de entrada
  if (!CONFIG.targetUrl) {
    console.error('❌ Erro: URL não fornecida.');
    console.log('👉 Uso: node scrape.js "https://exemplo.com"');
    process.exit(1);
  }

  console.log('🚀 Iniciando Scraper Universal v3.1');
  console.log(`🎯 Alvo: ${CONFIG.targetUrl}`);

  const metadata = extractMetadata(CONFIG.targetUrl);
  
  // Configuração do Browser
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu'] // Necessário para ambientes server/container
  });
  
  try {
    const context = await browser.newContext({ userAgent: CONFIG.userAgent });
    const page = await context.newPage();
    
    // Navegação
    console.log('🌐 Navegando...');
    await page.goto(CONFIG.targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Scroll Automático
    await autoScroll(page);
    
    // Extração
    const extractedData = await extractContent(page);
    console.log(`✅ Extração concluída: ${extractedData.length} itens encontrados.`);
    
    // Salvar Resultados
    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    
    // 1. JSON (Dados puros)
    const jsonPath = path.join(CONFIG.outputDir, `${metadata.uuid}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ metadata, data: extractedData }, null, 2));
    
    // 2. Markdown (Relatório legível)
    const mdPath = path.join(CONFIG.outputDir, `${metadata.uuid}.md`);
    fs.writeFileSync(mdPath, generateMarkdown(metadata, extractedData));
    
    console.log(`\n💾 Resultados salvos em: ${CONFIG.outputDir}`);
    console.log(`   📄 ${path.basename(mdPath)}`);
    console.log(`   { } ${path.basename(jsonPath)}`);

  } catch (error) {
    console.error('\n💥 Erro fatal durante a execução:', error.message);
  } finally {
    await browser.close();
    console.log('\n👋 Browser fechado.');
  }
})();
