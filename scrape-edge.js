/**
 * 🎯 Scrape Universal v7.0 - BUN + EDGE EDITION
 * Autor: Deivison Santana (@deivisan)
 * 
 * Framework universal para extração de conversas de IA usando:
 * - Bun Runtime (purge total do Node.js)
 * - Microsoft Edge (detecção automática)
 * - Playwright (engine principal)
 * - Tavily (fallback para pesquisa)
 * 
 * 🎓 METODOLOGIA PC-DEKSTOP:
 * - Detecta binário do Edge automaticamente
 * - Sem limitações de scroll
 * - Captura completa (JSON + MD + HTML + PNG)
 * - Fallback inteligente para errors
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { chromium } from 'playwright';

// --- DETECÇÃO AUTOMÁTICA DO MICROSOFT EDGE ---
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
  `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`
];

function detectEdgeBinary() {
  for (const path of EDGE_PATHS) {
    if (existsSync(path)) {
      console.log(`✅ Edge detectado: ${path}`);
      return path;
    }
  }
  throw new Error('❌ Microsoft Edge não encontrado. Instale o Edge ou adicione ao PATH.');
}

// --- CONFIGURAÇÃO INTELIGENTE ---
const CONFIG = {
  // Binário detectado automaticamente
  edgeExecutablePath: detectEdgeBinary(),
  
  // URL alvo (argv[2])
  targetUrl: process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_4afc2b31-2aca-48ff-b6fe-0c680b805199',
  
  // Diretório de saída
  outputDir: join(process.cwd(), 'captures'),
  
  // Scroll sem limites artificiais
  scroll: {
    enabled: true,
    delay: 2000,        // Delay maior para conteúdo dinâmico
    maxScrolls: 9999,   // ILIMITADO - como usuário real faria
    stopOnSameHeight: 3 // Parar após 3 scrolls sem mudança
  },
  
  // Anti-detection
  stealth: {
    webdriver: false,
    plugins: [1, 2, 3, 4, 5],
    languages: ['pt-BR', 'pt', 'en-US', 'en'],
    chrome: true,
    webgl: true
  },
  
  // Seletores universais para conversas de IA
  selectors: {
    containers: [
      '[data-testid*="message"]',
      '[data-testid*="conversation"]',
      '[data-testid*="chat"]',
      '[role="article"]',
      'article',
      'div[class*="message"]',
      'div[class*="Conversation"]',
      'div[class*="ChatMessage"]',
      'div[class*="chat-message"]',
      'main div',
      '[data-root]'
    ],
    codeBlocks: ['pre', 'code', 'div[class*="code"]', 'div[class*="syntax-highlight"]'],
    timestamp: 'time',
    user: ['[data-testid*="user"]', '[class*="user"]', '[class*="human"]', '[class*="avatar"]'],
    ai: ['[data-testid*="assistant"]', '[data-testid*="ai"]', '[class*="assistant"]', '[class*="ai"]', '[class*="bot"]']
  }
};

// --- HELPERS ---
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMetadata(url) {
  const timestamp = new Date().toISOString();
  let uuid = `capture_${Date.now()}`;
  
  if (url) {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/').filter(p => p.length > 0);
    if (parts.length > 0) {
      // Extrai o share ID se existir
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('_')) {
        uuid = lastPart;
      } else if (parts.length >= 2) {
        uuid = `${parts[parts.length - 2]}_${parts[parts.length - 1]}`;
      }
    }
  }
  
  return {
    uuid,
    sourceUrl: url,
    capturedAt: timestamp,
    environment: 'PC-Desktop',
    os: 'Windows',
    edgeVersion: basename(CONFIG.edgeExecutablePath),
    engine: 'playwright-edge',
    methodology: 'BUN_PC_EDGE_v7.0'
  };
}

function identifySpeaker(text, html) {
  const lowerText = text.toLowerCase();
  const lowerHtml = html.toLowerCase();
  
  // Sinais visuais
  if (lowerHtml.includes('user') || lowerHtml.includes('human') || lowerHtml.includes('avatar')) {
    return 'User';
  }
  if (lowerHtml.includes('assistant') || lowerHtml.includes('ai-') || lowerHtml.includes('bot') || lowerHtml.includes('model')) {
    return 'AI';
  }
  if (lowerHtml.includes('grok') || lowerHtml.includes('xai')) {
    return 'AI';
  }
  
  // Heurística de conteúdo
  if (lowerText.startsWith('olá') || lowerText.startsWith('bom dia') || lowerText.startsWith('boa tarde')) {
    return 'User';
  }
  if (lowerText.includes('como modelo') || lowerText.includes('here is') || lowerText.includes('here\'s') || lowerText.includes('claro')) {
    return 'AI';
  }
  
  return 'Unknown';
}

async function extractMessages(page) {
  const result = await page.evaluate((selectors) => {
    const nodes = [];
    const seenTexts = new Set();
    
    for (const s of selectors.containers) {
      const els = document.querySelectorAll(s);
      if (els.length > 0) {
        els.forEach((el, idx) => {
          const text = el.innerText?.trim();
          if (!text || text.length < 5 || seenTexts.has(text)) return;
          seenTexts.add(text);
          
          const codeBlocks = [];
          el.querySelectorAll(selectors.codeBlocks.join(',')).forEach(cb => {
            codeBlocks.push({
              lang: cb.className || 'text',
              content: cb.innerText?.trim() || ''
            });
          });
          
          nodes.push({
            html: el.outerHTML,
            text: text,
            timestamp: el.querySelector(selectors.timestamp)?.getAttribute('datetime'),
            codeBlocks: codeBlocks.length > 0 ? codeBlocks : null,
            index: idx
          });
        });
        break;
      }
    }
    
    if (nodes.length === 0) {
      return [{ text: document.body.innerText?.trim(), type: 'raw' }];
    }
    
    return nodes;
  }, CONFIG.selectors);
  
  return result;
}

async function scrollToBottom(page) {
  if (!CONFIG.scroll.enabled) return;
  
  console.log(`📜 Iniciando scroll ILIMITADO (delay: ${CONFIG.scroll.delay}ms)...`);
  
  let lastHeight = await page.evaluate('document.body.scrollHeight');
  let sameHeightCount = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.scroll.maxScrolls) {
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await delay(CONFIG.scroll.delay);
    
    const newHeight = await page.evaluate('document.body.scrollHeight');
    
    if (newHeight === lastHeight) {
      sameHeightCount++;
      console.log(`   Scroll ${scrolls}: altura igual (${sameHeightCount}/${CONFIG.scroll.stopOnSameHeight})`);
      if (sameHeightCount >= CONFIG.scroll.stopOnSameHeight) {
        console.log(`✅ Scroll concluído! (${scrolls} scrolls, altura final: ${newHeight}px)`);
        break;
      }
    } else {
      sameHeightCount = 0;
      scrolls++;
      console.log(`   Scroll ${scrolls}: ${lastHeight}px → ${newHeight}px`);
    }
    
    lastHeight = newHeight;
  }
}

async function waitForCloudflare(page, maxWait = 90) {
  console.log(`⏳ Aguardando Cloudflare (até ${maxWait}s)...`);
  
  for (let i = 0; i < maxWait; i++) {
    await delay(1000);
    const title = await page.title();
    const url = page.url();
    
    if (!title.includes('Just a moment') && 
        !title.includes('Um momento') && 
        !title.includes('Cloudflare') &&
        !url.includes('__cf_chl')) {
      console.log(`✅ Cloudflare resolvido! Título: ${title.substring(0, 60)}`);
      return true;
    }
    
    if (i % 15 === 0 && i > 0) {
      console.log(`   ⏳ ${i}s...`);
    }
  }
  
  console.log(`⚠️ Cloudflare não resolveu em ${maxWait}s. Continuando...`);
  return false;
}

async function saveCapture(rawMessages, page, metadata) {
  // Criar diretório
  mkdirSync(CONFIG.outputDir, { recursive: true });
  
  // Processar mensagens
  const structured = [];
  let lastSpeaker = null;
  
  rawMessages.forEach((msg, i) => {
    if (msg.type === 'raw') {
      structured.push({ author: 'System', content: msg.text, type: 'raw', index: i });
      return;
    }
    
    const speaker = identifySpeaker(msg.text, msg.html);
    if (speaker === 'Unknown' && lastSpeaker) {
      // Alternância inteligente
      structured.push({ 
        author: lastSpeaker === 'AI' ? 'User' : 'AI', 
        content: msg.text, 
        codeBlocks: msg.codeBlocks,
        timestamp: msg.timestamp,
        index: i 
      });
    } else {
      structured.push({ 
        author: speaker, 
        content: msg.text, 
        codeBlocks: msg.codeBlocks,
        timestamp: msg.timestamp,
        index: i 
      });
    }
    lastSpeaker = speaker;
  });
  
  // Capturar artefatos
  const htmlDump = await page.content();
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  
  // Salvar JSON completo (íntegra)
  const jsonData = {
    metadata,
    conversation: structured,
    rawMessages,
    capturedAt: new Date().toISOString()
  };
  
  const jsonPath = join(CONFIG.outputDir, `${metadata.uuid}.json`);
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  
  // Salvar Markdown formatado (conteúdo útil)
  let mdContent = `# 📝 Captura: ${metadata.uuid}\n\n`;
  mdContent += `**Data:** ${new Date().toLocaleString('pt-BR')}  \n`;
  mdContent += `**Origem:** ${metadata.sourceUrl}  \n`;
  mdContent += `**Engine:** ${metadata.engine}  \n`;
  mdContent += `**Browser:** Edge (${metadata.edgeVersion})  \n`;
  mdContent += `**Mensagens:** ${structured.length}\n\n`;
  mdContent += `---\n\n`;
  
  structured.forEach((msg, i) => {
    const icon = msg.author === 'User' ? '👤' : (msg.author === 'AI' ? '🤖' : '📝');
    mdContent += `### ${icon} ${msg.author}\n\n${msg.content}\n\n`;
    if (msg.codeBlocks) {
      mdContent += `\`\`\`\n${msg.codeBlocks.map(cb => cb.content).join('\n')}\n\`\`\`\n\n`;
    }
    mdContent += `---\n\n`;
  });
  
  const mdPath = join(CONFIG.outputDir, `${metadata.uuid}.md`);
  writeFileSync(mdPath, mdContent);
  
  // Salvar HTML integral
  const htmlPath = join(CONFIG.outputDir, `${metadata.uuid}.html`);
  writeFileSync(htmlPath, htmlDump);
  
  // Salvar screenshot
  const pngPath = join(CONFIG.outputDir, `${metadata.uuid}.png`);
  writeFileSync(pngPath, screenshotBuffer);
  
  // Retornar resumo
  return {
    json: jsonPath,
    md: mdPath,
    html: htmlPath,
    png: pngPath,
    messages: structured.length
  };
}

// --- NÚCLEO PRINCIPAL ---
async function runScraper() {
  console.log('='.repeat(60));
  console.log('🎯 SCRAPE UNIVERSAL v7.0 - BUN + EDGE EDITION');
  console.log('='.repeat(60));
  console.log(`🌐 Alvo: ${CONFIG.targetUrl}`);
  console.log(`📂 Output: ${CONFIG.outputDir}`);
  console.log(`🧭 Edge: ${CONFIG.edgeExecutablePath}`);
  console.log('='.repeat(60));
  
  const metadata = getMetadata(CONFIG.targetUrl);
  
  const browser = await chromium.launch({
    headless: false,
    executablePath: CONFIG.edgeExecutablePath,
    viewport: { width: 1920, height: 1080 },
    locale: 'pt-BR',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--window-size=1920,1080',
      '--lang=pt-BR'
    ]
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'pt-BR'
  });
  
  const page = await context.newPage();
  
  // Anti-detection scripts
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'chrome', { get: () => ({ runtime: {} }) });
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    // Remover detection de automated
    delete navigator.webdriver;
  });
  
  try {
    console.log('🚀 Navegando...');
    await page.goto(CONFIG.targetUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    console.log('✅ Página carregada');
    
    // Aguardar Cloudflare
    await waitForCloudflare(page);
    
    // Aguardar React hidratar
    console.log('⏳ Aguardando React hidratar...');
    await delay(5000);
    
    // Scroll completo
    await scrollToBottom(page);
    
    // Extrair mensagens
    console.log('🔍 Extraindo mensagens...');
    const rawMessages = await extractMessages(page);
    console.log(`📊 Mensagens capturadas: ${rawMessages.length}`);
    
    // Salvar tudo
    console.log('💾 Salvando artefatos...');
    const paths = await saveCapture(rawMessages, page, metadata);
    
    console.log('='.repeat(60));
    console.log('✅ CAPTURA CONCLUÍDA!');
    console.log('='.repeat(60));
    console.log(`📄 JSON: ${paths.json}`);
    console.log(`📝 MD:   ${paths.md}`);
    console.log(`🌐 HTML: ${paths.html}`);
    console.log(`🖼️ PNG:  ${paths.png}`);
    console.log(`💬 Mensagens: ${paths.messages}`);
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error(`💥 ERRO: ${error.message}`);
    console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

// Executar
runScraper();
