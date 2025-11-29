/**
 * 🕷️ Scrape Universal v5.1 (Speaker Heuristic) - Framework de Captação Inteligente
 * Autor: Deivison Santana (@deivisan)
 * 
 * Atualização: Melhoria na detecção de falantes usando heurística de conteúdo e estrutura do Grok.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

const CONFIG = {
  targetUrl: process.argv[2],
  outputDir: path.join(__dirname, 'captures'),
  scroll: { enabled: true, delay: 2000, maxScrolls: 50 },
  selectors: {
    messageContainers: ['[role="article"]', '[data-testid*="message"]', '.message', 'div[class*="message"]'],
    author: '[data-author], .author, strong',
    timestamp: 'time'
  },
  executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

function extractMetadata(url) {
  const timestamp = new Date().toISOString();
  const urlMatch = url ? url.match(/share\/([^_]+)_(\d+)$/) : null;
  const uuid = urlMatch ? urlMatch[2] : `capture_${Date.now()}`;
  return { uuid, sourceUrl: url || 'unknown', capturedAt: timestamp };
}

async function autoScroll(page) {
  if (!CONFIG.scroll.enabled) return;
  let previousHeight = 0, scrollCount = 0;
  console.log('📜 [Scroll] Iniciando...');
  
  while (scrollCount < CONFIG.scroll.maxScrolls) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    if (currentHeight === previousHeight) { console.log('✅ [Scroll] Fim.'); break; }
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(resolve => setTimeout(resolve, CONFIG.scroll.delay));
    
    previousHeight = currentHeight;
    scrollCount++;
    if (scrollCount % 5 === 0) console.log(`   ⏳ Passo ${scrollCount}`);
  }
  
  await page.evaluate(() => window.scrollTo(0, 0));
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function extractContent(page) {
  console.log('🔍 [Extract] Analisando DOM...');
  
  try {
    await page.waitForSelector('body', { timeout: 30000 });
    const content = await page.content();
    if (content.includes('Cloudflare')) {
      console.log('🛡️ Detectado Cloudflare. Aguardando resolução...');
      await new Promise(r => setTimeout(r, 10000));
    }
  } catch (e) {}
  
  return await page.evaluate((selectors) => {
    const results = [];
    let elements = [];
    
    for (const sel of selectors.messageContainers) {
      const found = document.querySelectorAll(sel);
      if (found.length > 0) { elements = found; break; }
    }
    
    if (elements.length === 0) {
      // Tentativa de extração por blocos de texto visíveis se seletores falharem
      const textBlocks = Array.from(document.querySelectorAll('p, h1, h2, h3, pre')).map(el => el.innerText);
      if (textBlocks.length > 0) {
         return textBlocks.map((text, idx) => ({
            index: idx,
            type: 'raw_block',
            content: text,
            author: 'unknown',
            timestamp: null
         }));
      }

      return [{
        type: 'raw',
        content: document.body.innerText,
        author: 'system',
        timestamp: new Date().toISOString()
      }];
    }
    
    elements.forEach((el, idx) => {
      const text = el.innerText?.trim();
      if (!text) return;
      
      // Detecção Heurística de Falante Melhorada
      let author = 'unknown';
      
      // 1. Tenta seletor direto
      const authorEl = el.querySelector(selectors.author);
      if (authorEl) {
        author = authorEl.innerText.trim();
      } else {
        // 2. Tenta inferir pelo conteúdo/ícone/classe
        const html = el.innerHTML;
        const classList = el.classList.toString();
        
        if (html.includes('Grok') || classList.includes('ai') || classList.includes('bot')) {
            author = 'Grok';
        } else if (classList.includes('user') || classList.includes('human')) {
            author = 'User';
        } else {
            // 3. Heurística de alternância (Grok geralmente responde, User pergunta)
            // Se o anterior foi User, este provavelmente é Grok (assumindo fluxo linear)
            // Nota: Isso é falho em chats longos, então usamos 'unknown' ou tentamos padrão de texto
            if (text.startsWith('Grok') || text.includes('I can help')) author = 'Grok';
        }
      }

      // Correção específica para o Grok Share Interface (onde User geralmente é 'User' e AI é 'Grok')
      if (author === 'unknown') {
          // Tenta pegar do container pai se houver label
          const parentText = el.parentElement?.innerText || '';
          if (parentText.includes('Grok')) author = 'Grok';
          else if (parentText.includes('User') || parentText.includes('You')) author = 'User';
      }

      const timeEl = el.querySelector(selectors.timestamp);
      
      results.push({
        index: idx,
        type: 'structured',
        content: text,
        author: author,
        timestamp: timeEl ? timeEl.getAttribute('datetime') : null
      });
    });
    
    return results;
  }, CONFIG.selectors);
}

function generateMarkdown(metadata, data) {
  const date = new Date(metadata.capturedAt).toLocaleString('pt-BR');
  let md = `# 📝 Relatório de Captura\n\n> **ID:** 
${'`'}${metadata.uuid}${'`'} 
> **Data:** ${date}
> **Fonte:** [Link](${metadata.sourceUrl})

---

`;
  
  data.forEach(item => {
    let icon = '❓';
    let authorName = item.author;

    if (item.author.toLowerCase().includes('grok')) {
        icon = '🤖';
        authorName = 'Grok';
    } else if (item.author.toLowerCase().includes('user') || item.author.toLowerCase().includes('you')) {
        icon = '👤';
        authorName = 'User';
    } else if (item.type === 'raw_block') {
        icon = '📄';
    }

    if (item.type === 'raw') {
      md += `### ⚠️ Conteúdo Bruto (Falha de Estrutura)\n\n\
\
text
${item.content}
\
\
\
`;
    } else {
      md += `### ${icon} **${authorName}**\n${item.content}\n\n---\n`;
    }
  });
  
  return md;
}

(async () => {
  if (!CONFIG.targetUrl) {
    console.error('❌ Erro: URL não fornecida.');
    process.exit(1);
  }
  
  console.log(`🚀 Iniciando Scraper v5.1 (Speaker Heuristic)`);
  console.log(`🎯 Alvo: ${CONFIG.targetUrl}`);
  
  const metadata = extractMetadata(CONFIG.targetUrl);
  let browser;

  try {
    if (!fs.existsSync(CONFIG.executablePath)) {
      throw new Error(`Chromium não encontrado em: ${CONFIG.executablePath}. Instale com: pkg install chromium`);
    }

    browser = await puppeteer.launch({
      executablePath: CONFIG.executablePath,
      headless: true,
      args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--single-process', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7'
    });

    await page.goto(CONFIG.targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    await autoScroll(page);
    const extractedData = await extractContent(page);
    
    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    
    const jsonPath = path.join(CONFIG.outputDir, `${metadata.uuid}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ metadata, data: extractedData }, null, 2));
    
    const mdPath = path.join(CONFIG.outputDir, `${metadata.uuid}.md`);
    fs.writeFileSync(mdPath, generateMarkdown(metadata, extractedData));
    
    console.log(`✅ Salvo em: ${CONFIG.outputDir}`);
    console.log(`   📄 ${path.basename(mdPath)}`);

  } catch (error) {
    console.error('💥 Erro:', error.message);
  } finally {
    if (browser) await browser.close();
  }
})();