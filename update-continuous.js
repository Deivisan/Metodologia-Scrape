/**
 * 🎯 UPDATE INCREMENTAL - MODO CONTÍNUO
 * Autor: Deivison Santana (@deivisan)
 * 
 * Mantém sessão aberta e atualiza captura periodicamente.
 * Ideal para capturar novas mensagens em tempo real.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Ativar stealth
puppeteer.use(StealthPlugin());

const URL = process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_4afc2b31-2aca-48ff-b6fe-0c680b805199';
const OUTPUT_DIR = join(process.cwd(), 'captures');
const INTERVAL = process.argv[3] ? parseInt(process.argv[3]) * 1000 : 60000; // 1 minuto default

console.log('═'.repeat(60));
console.log('🎯 MODO CONTÍNUO - UPDATE INCREMENTAL');
console.log('═'.repeat(60));
console.log(`🌐 URL: ${URL}`);
console.log(`⏱️ Intervalo: ${INTERVAL/1000}s`);
console.log('');
console.log('💡 O navegador vai permanecer ABERTO');
console.log('💡 Novas mensagens serão capturadas automaticamente');
console.log('💡 Pressione Ctrl+C para parar');
console.log('');

let captureCount = 0;
let lastMessageCount = 0;

async function capture(browser, isFirst = false) {
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });
  
  console.log(`${isFirst ? '🚀' : '🔄'} Capturando...`);
  
  try {
    await page.goto(URL, { waitUntil: 'networkidle0', timeout: 90000 });
    
    // Aguardar Cloudflare
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const title = await page.title();
      if (!title.includes('Just a moment')) break;
    }
    
    // Scroll para carregar tudo
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    for (let i = 0; i < 20; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, 1500));
      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === lastHeight) break;
      lastHeight = newHeight;
    }
    
    // Extrair mensagens
    const result = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('div[class*="message"], div[class*="Conversation"], article'))
        .map(el => el.innerText?.trim())
        .filter(t => t && t.length > 10);
      
      return {
        title: document.title,
        messageCount: messages.length,
        lastMessage: messages[messages.length - 1]?.substring(0, 200)
      };
    });
    
    // Salvar se houver mudanças
    if (result.messageCount >= lastMessageCount) {
      lastMessageCount = result.messageCount;
      captureCount++;
      
      const uuid = `update_${Date.now()}`;
      mkdirSync(OUTPUT_DIR, { recursive: true });
      
      writeFileSync(join(OUTPUT_DIR, `${uuid}.json`), JSON.stringify({
        url: URL,
        capturedAt: new Date().toISOString(),
        messageCount: result.messageCount,
        title: result.title,
        incremental: true
      }, null, 2));
      
      console.log(`✅ [${captureCount}] ${result.messageCount} mensagens (última: ${result.lastMessage?.substring(0, 50)}...)`);
    } else {
      console.log(`⏳ [${captureCount}] Sem novas mensagens`);
    }
    
  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
  }
  
  await page.close();
}

async function run() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--window-size=1920,1080']
  });
  
  // Primeira captura
  await capture(browser, true);
  
  // Loop de atualizações
  console.log('');
  console.log('⏳ Aguardando novas mensagens... (Ctrl+C para parar)');
  console.log('');
  
  while (true) {
    await new Promise(r => setTimeout(r, INTERVAL));
    await capture(browser, false);
  }
}

run().catch(err => {
  console.error('Erro fatal:', err.message);
  process.exit(1);
});
