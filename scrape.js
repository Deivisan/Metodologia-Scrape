const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 🎯 Configuração
const GROK_LINK = process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_4fc386de-dd1b-47bd-a96c-3dded05d8582';
const OUTPUT_DIR = path.join(__dirname, '../Transcricoes');
const SCROLL_DELAY = 2000; // 2s entre scrolls
const MAX_SCROLLS = 50; // Limite segurança (conversas longas)

// 🔧 Funções auxiliares
function extractMetadata(url) {
  const match = url.match(/share\/([^_]+)_(.+)$/);
  return {
    uuid: match ? match[2] : 'unknown',
    base64: match ? match[1] : 'unknown',
    capturedAt: new Date().toISOString()
  };
}

function sanitizeFilename(text) {
  return text.replace(/[^a-z0-9]/gi, '-').toLowerCase().substring(0, 50);
}

async function autoScroll(page) {
  let previousHeight = 0;
  let scrollCount = 0;
  
  console.log('📜 Iniciando scroll automático para carregar mensagens antigas...');
  
  while (scrollCount < MAX_SCROLLS) {
    const currentHeight = await page.evaluate(() => document.body.scrollHeight);
    
    if (currentHeight === previousHeight) {
      console.log('✅ Scroll completo - sem mais conteúdo a carregar');
      break;
    }
    
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(SCROLL_DELAY);
    
    previousHeight = currentHeight;
    scrollCount++;
    
    if (scrollCount % 5 === 0) {
      console.log(`   📊 Scroll ${scrollCount}/${MAX_SCROLLS} - Altura: ${currentHeight}px`);
    }
  }
  
  // Volta ao topo
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1000);
}

async function extractConversation(page) {
  console.log('🔍 Extraindo mensagens estruturadas...');
  
  // Aguardar carregamento
  await page.waitForSelector('body', { timeout: 30000 });
  
  // Extrair mensagens com seletores específicos
  const messages = await page.evaluate(() => {
    const results = [];
    
    // Tenta vários seletores possíveis do Grok
    const selectors = [
      '[role="article"]',
      '[data-testid*="message"]',
      '.message',
      '[class*="message"]'
    ];
    
    let elements = [];
    for (const selector of selectors) {
      elements = document.querySelectorAll(selector);
      if (elements.length > 0) break;
    }
    
    // Fallback: divide por padrões textuais se não achar elementos
    if (elements.length === 0) {
      const bodyText = document.body.innerText;
      return [{
        type: 'raw',
        content: bodyText,
        timestamp: null,
        author: 'unknown'
      }];
    }
    
    // Processa elementos encontrados
    elements.forEach((el, idx) => {
      const text = el.innerText?.trim() || '';
      if (!text) return;
      
      // Tenta detectar autor
      const authorEl = el.querySelector('[data-author]') || 
                       el.querySelector('[class*="author"]') ||
                       el.querySelector('strong');
      const author = authorEl?.innerText?.trim() || 'unknown';
      
      // Tenta detectar timestamp
      const timeEl = el.querySelector('time');
      const timestamp = timeEl?.getAttribute('datetime') || null;
      
      results.push({
        index: idx,
        author: author,
        content: text,
        timestamp: timestamp,
        type: 'structured'
      });
    });
    
    return results;
  });
  
  console.log(`   ✅ ${messages.length} mensagens extraídas`);
  return messages;
}

async function analyzeContext(messages) {
  console.log('🧠 Analisando contexto conversacional...');
  
  const analysis = {
    totalMessages: messages.length,
    confirmations: [],
    corrections: [],
    sentiments: [],
    errors: [],
    topics: []
  };
  
  messages.forEach((msg, idx) => {
    const text = msg.content.toLowerCase();
    
    // Confirmações
    if (text.includes('entendeu') || text.includes('certo') || text.includes('perfeito')) {
      analysis.confirmations.push({ index: idx, text: msg.content.substring(0, 100) });
    }
    
    // Correções
    if (text.includes('não') && (text.includes('na verdade') || text.includes('correto'))) {
      analysis.corrections.push({ index: idx, text: msg.content.substring(0, 100) });
    }
    
    // Sentimentos
    if (text.includes('frustração') || text.includes('lixão') || text.includes('problema')) {
      analysis.sentiments.push({ type: 'frustração', index: idx });
    }
    if (text.includes('ótimo') || text.includes('excelente') || text.includes('boa')) {
      analysis.sentiments.push({ type: 'satisfação', index: idx });
    }
    
    // Erros potenciais (resposta curta demais)
    if (msg.author !== 'Deivison' && msg.content.length < 20) {
      analysis.errors.push({ index: idx, reason: 'Resposta muito curta' });
    }
  });
  
  console.log(`   📊 Análise: ${analysis.confirmations.length} confirmações, ${analysis.corrections.length} correções`);
  return analysis;
}

function generateMarkdown(metadata, messages, analysis) {
  const date = new Date(metadata.capturedAt);
  const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
  
  let md = `# 🗣️ Transcrição Grok - ${dateStr}\n\n`;
  md += `> **UUID:** ${metadata.uuid}  \n`;
  md += `> **Capturado em:** ${date.toLocaleString('pt-BR')}  \n`;
  md += `> **Total mensagens:** ${messages.length}  \n`;
  md += `> **Link original:** [Grok Share](${GROK_LINK})  \n\n`;
  
  md += `---\n\n`;
  md += `## 📊 Análise Contextual\n\n`;
  md += `- ✅ **Confirmações:** ${analysis.confirmations.length}\n`;
  md += `- 🔧 **Correções:** ${analysis.corrections.length}\n`;
  md += `- 💭 **Sentimentos:** ${analysis.sentiments.length}\n`;
  md += `- ⚠️ **Possíveis erros:** ${analysis.errors.length}\n\n`;
  
  md += `---\n\n`;
  md += `## 💬 Conversa Completa\n\n`;
  
  if (messages[0]?.type === 'raw') {
    // Fallback: texto bruto
    md += `\`\`\`\n${messages[0].content}\n\`\`\`\n`;
  } else {
    // Mensagens estruturadas
    messages.forEach((msg, idx) => {
      const isUser = msg.author.includes('Deivison') || msg.author === 'unknown';
      const emoji = isUser ? '👤' : '🤖';
      const author = isUser ? 'Deivison' : 'Grok';
      
      md += `### ${emoji} ${author} ${msg.timestamp ? `(${msg.timestamp})` : ''}\n\n`;
      md += `${msg.content}\n\n`;
      md += `---\n\n`;
    });
  }
  
  return md;
}

// 🚀 Execução principal
(async () => {
  console.log('🎯 DevSan Scrape v3.0 - Captação Inteligente Grok\n');
  console.log(`📥 Link: ${GROK_LINK}\n`);
  
  const metadata = extractMetadata(GROK_LINK);
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });
  
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
  });
  
  console.log('🌐 Acessando página...');
  await page.goto(GROK_LINK, { waitUntil: 'networkidle', timeout: 60000 });
  
  // Scroll para carregar tudo
  await autoScroll(page);
  
  // Extrai conversa
  const messages = await extractConversation(page);
  
  // Análise contextual
  const analysis = await analyzeContext(messages);
  
  await browser.close();
  
  // Salva JSON
  const jsonData = {
    metadata,
    messages,
    analysis,
    linkOriginal: GROK_LINK
  };
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  const jsonFile = path.join(OUTPUT_DIR, `${metadata.uuid}.json`);
  fs.writeFileSync(jsonFile, JSON.stringify(jsonData, null, 2));
  console.log(`\n💾 JSON salvo: ${jsonFile}`);
  
  // Gera Markdown
  const markdown = generateMarkdown(metadata, messages, analysis);
  const mdFile = path.join(OUTPUT_DIR, `${metadata.uuid}.md`);
  fs.writeFileSync(mdFile, markdown);
  console.log(`📄 Markdown salvo: ${mdFile}`);
  
  console.log('\n✅ Captação completa!');
  console.log(`\n📊 Estatísticas:`);
  console.log(`   - Mensagens: ${messages.length}`);
  console.log(`   - Confirmações: ${analysis.confirmations.length}`);
  console.log(`   - Correções: ${analysis.corrections.length}`);
  console.log(`   - Sentimentos: ${analysis.sentiments.length}`);
})();