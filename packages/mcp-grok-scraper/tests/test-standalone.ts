/**
 * 🧪 TESTE STANDALONE - PUPPETEER STEALTH (SEM MCP)
 * 
 * Teste direto do scraping sem dep de MCP Server
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

puppeteer.use(StealthPlugin());

const URL = process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_b6476b3c-6941-47a0-a6cc-b87b1ffd5286';
const OUTPUT_DIR = join(process.cwd(), 'captures');
const HEADLESS = process.env.HEADLESS !== 'false';

console.log('\n🎯 TESTE STANDALONE PUPPETEER STEALTH');
console.log('═'.repeat(60));
console.log(`🌐 URL: ${URL}`);
console.log(`🎭 Headless: ${HEADLESS}`);
console.log(`📂 Output: ${OUTPUT_DIR}\n`);

const start = Date.now();

try {
  console.log('🚀 Lançando browser...');
  
  const browser = await puppeteer.launch({
    headless: HEADLESS ? 'new' : false,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    delete (navigator as any).webdriver;
  });
  
  console.log('🌐 Navegando...');
  await page.goto(URL, { waitUntil: 'networkidle2', timeout: 90000 });
  
  console.log('⏳ Aguardando Cloudflare resolver...');
  let resolved = false;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const title = await page.title();
    
    if (!title.includes('Just a moment') && !title.includes('Cloudflare')) {
      console.log(`✅ Cloudflare OK! Título: ${title.substring(0, 50)}`);
      resolved = true;
      break;
    }
    
    if (i % 10 === 0 && i > 0) console.log(`   ${i}s...`);
  }
  
  if (!resolved) console.warn('⚠️ Cloudflare pode não ter resolvido');
  
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('📜 Scrollando...');
  let scrolls = 0;
  let lastHeight = await page.evaluate('document.body.scrollHeight');
  
  for (let i = 0; i < 50; i++) {
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(r => setTimeout(r, 2500));
    
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === lastHeight) break;
    
    lastHeight = newHeight;
    scrolls++;
  }
  
  console.log(`✅ Scroll completo (${scrolls} iterações)`);
  
  console.log('🔍 Extraindo...');
  const result = await page.evaluate(() => {
    const selectors = [
      'div[class*="message-bubble"]',
      'div[class*="response-content"]',
      'article',
      '[data-testid*="message"]',
      'div.prose'
    ];
    
    const elements: HTMLElement[] = [];
    for (const sel of selectors) {
      elements.push(...Array.from(document.querySelectorAll<HTMLElement>(sel)));
    }
    
    const unique = Array.from(new Set(elements));
    const messages = unique
      .map((el, i) => ({
        index: i,
        text: el.innerText?.trim().substring(0, 5000),
        html: el.outerHTML?.substring(0, 1000)
      }))
      .filter(m => m.text && m.text.length > 10);
    
    return {
      title: document.title,
      messageCount: messages.length,
      messages
    };
  });
  
  console.log(`📊 Mensagens: ${result.messageCount}`);
  
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const uuid = `test_${Date.now()}`;
  
  writeFileSync(join(OUTPUT_DIR, `${uuid}.json`), JSON.stringify({
    url: URL,
    title: result.title,
    messageCount: result.messageCount,
    messages: result.messages,
    metadata: {
      capturedAt: new Date().toISOString(),
      scrolls,
      headless: HEADLESS
    }
  }, null, 2));
  
  console.log(`\n✅ SUCESSO em ${((Date.now() - start) / 1000).toFixed(2)}s`);
  console.log(`📄 Arquivo: ${uuid}.json`);
  
  await browser.close();
  process.exit(0);
  
} catch (error: any) {
  console.error(`\n❌ ERRO: ${error.message}`);
  process.exit(1);
}
