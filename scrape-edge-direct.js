/**
 * 🎯 SCRAPE EDGE DIRETO - USA SUA SESSÃO REAL
 * Autor: Deivison Santana (@deivisan)
 * 
 * Este script USA O EDGE DIRETAMENTE com seus cookies/sessão
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';

const URL = process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_4afc2b31-2aca-48ff-b6fe-0c680b805199';
const OUTPUT_DIR = join(process.cwd(), 'captures');

// Detectar Edge
const EDGE_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];

let EDGE_PATH = null;
for (const p of EDGE_PATHS) {
  if (existsSync(p)) {
    EDGE_PATH = p;
    break;
  }
}

if (!EDGE_PATH) {
  console.error('❌ Edge não encontrado!');
  process.exit(1);
}

console.log('🚀 ABRINDO EDGE COM SUA SESSÃO REAL...');
console.log(`🌐 URL: ${URL}`);
console.log('');

async function run() {
  const browser = await chromium.launch({
    headless: false,
    executablePath: EDGE_PATH,
    channel: 'msedge',  // IMPORTANTE: usar canal do Edge
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--lang=pt-BR',
      '--start-maximized'
    ]
  });

  const page = await browser.newPage();
  
  console.log('🌐 Navegando...');
  
  // Timeout maior e esperar load completo
  await page.goto(URL, { 
    waitUntil: 'load',
    timeout: 90000 
  });
  
  console.log('✅ Página carregada!');
  console.log('⏳ Aguardando React hidratar...');
  await page.waitForTimeout(8000);
  
  // Scroll completo
  console.log('📜 Scrollando...');
  let lastHeight = await page.evaluate('document.body.scrollHeight');
  let scrolls = 0;
  
  while (scrolls < 50) {
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await page.waitForTimeout(2000);
    
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === lastHeight) break;
    
    lastHeight = newHeight;
    scrolls++;
    console.log(`   Scroll ${scrolls}: ${newHeight}px`);
  }
  
  // Extrair
  console.log('🔍 Extraindo...');
  const content = await page.evaluate(() => {
    // Tentar encontrar mensagens
    const messages = Array.from(document.querySelectorAll('[class*="message"], [class*="Conversation"], article, [data-testid*="message"]'))
      .map(el => ({
        text: el.innerText?.substring(0, 500),
        html: el.outerHTML?.substring(0, 200)
      }))
      .filter(m => m.text && m.text.length > 20);
    
    return {
      title: document.title,
      url: window.location.href,
      body: document.body.innerText?.substring(0, 10000),
      messages: messages,
      html: document.documentElement.outerHTML?.substring(0, 50000)
    };
  });
  
  // Salvar
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const uuid = `capture_${Date.now()}`;
  
  writeFileSync(join(OUTPUT_DIR, `${uuid}.json`), JSON.stringify({
    url: URL,
    title: content.title,
    capturedAt: new Date().toISOString(),
    method: 'edge-direct-session',
    messageCount: content.messages?.length || 0
  }, null, 2));
  
  writeFileSync(join(OUTPUT_DIR, `${uuid}.md`), `# ${content.title}\n\n${content.body}\n\n---\nMensagens: ${JSON.stringify(content.messages, null, 2)}`);
  
  writeFileSync(join(OUTPUT_DIR, `${uuid}.html`), content.html || '');
  
  console.log('');
  console.log('✅ CAPTURA FEITA!');
  console.log(`📁 ${OUTPUT_DIR}/${uuid}.*`);
  console.log(`💬 Mensagens: ${content.messages?.length || 0}`);
  console.log('');
  console.log('💡 EDGE CONTINUA ABERTO!');
  
  // Manter aberto
  return browser;
}

run()
  .then(() => {
    console.log('\n⏳ Script concluído. Edge permanece aberto.');
    console.log('Para fechar: taskkill /IM msedge.exe');
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  });
