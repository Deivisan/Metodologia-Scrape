/**
 * 🎯 SCRAPE GROK - PUPPETEER STEALTH EDITION
 * Autor: Deivison Santana (@deivisan)
 * 
 * Usa Puppeteer-Extra com Stealth Plugin para bypass Cloudflare
 * Chromium bundled (não precisa de browser externo)
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Ativar stealth mode
puppeteer.use(StealthPlugin());

const URL = process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_4afc2b31-2aca-48ff-b6fe-0c680b805199';
const OUTPUT_DIR = join(process.cwd(), 'captures');

console.log('═'.repeat(60));
console.log('🎯 SCRAPE GROK - STEALTH EDITION');
console.log('═'.repeat(60));
console.log(`🌐 URL: ${URL}`);
console.log(`📂 Output: ${OUTPUT_DIR}`);
console.log('');

async function run() {
  console.log('🚀 Iniciando Chromium com Stealth...');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      '--no-sandbox',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled',
      '--disable-dev-shm-usage'
    ]
  });
  
  const page = await browser.newPage();
  
  // Configurações anti-detecção
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  // Remover webdriver
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    delete navigator.webdriver;
  });
  
  console.log('🌐 Navegando...');
  await page.goto(URL, { waitUntil: 'networkidle0', timeout: 90000 });
  
  // Aguardar Cloudflare resolver
  console.log('⏳ Aguardando Cloudflare resolver (até 60s)...');
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const title = await page.title();
    
    if (!title.includes('Just a moment') && 
        !title.includes('Cloudflare') &&
        !title.includes('Um momento')) {
      console.log(`✅ Cloudflare resolvido! Título: ${title.substring(0, 50)}`);
      break;
    }
    
    if (i % 10 === 0 && i > 0) {
      console.log(`   ⏳ ${i}s...`);
    }
  }
  
  // Aguardar React hidratar
  console.log('⏳ Aguardando conteúdo carregar (10s)...');
  await new Promise(r => setTimeout(r, 10000));
  
  // Scroll completo
  console.log('📜 Scrollando...');
  let lastHeight = await page.evaluate('document.body.scrollHeight');
  let scrolls = 0;
  
  while (scrolls < 50) {
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await new Promise(r => setTimeout(r, 2500));
    
    const newHeight = await page.evaluate('document.body.scrollHeight');
    if (newHeight === lastHeight) break;
    
    lastHeight = newHeight;
    scrolls++;
    console.log(`   Scroll ${scrolls}: ${newHeight}px`);
  }
  
  // Extrair
  console.log('🔍 Extraindo...');
  const result = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      body: document.body.innerText,
      html: document.documentElement.outerHTML,
      messages: Array.from(document.querySelectorAll('div[class*="message"], div[class*="Conversation"], article, [data-testid*="message"], div[class*="chat"]'))
        .slice(0, 100)
        .map((el, i) => ({
          index: i,
          text: el.innerText?.substring(0, 3000),
          html: el.outerHTML?.substring(0, 500)
        }))
        .filter(m => m.text && m.text.length > 10)
    };
  });
  
  console.log(`📊 Mensagens: ${result.messages?.length || 0}`);
  
  // Salvar
  mkdirSync(OUTPUT_DIR, { recursive: true });
  const uuid = `grok_${Date.now()}`;
  
  writeFileSync(join(OUTPUT_DIR, `${uuid}.json`), JSON.stringify({
    metadata: {
      url: URL,
      title: result.title,
      capturedAt: new Date().toISOString(),
      method: 'puppeteer-stealth-chromium',
      scrollCount: scrolls
    },
    messages: result.messages
  }, null, 2));
  
  let md = `# ${result.title}\n\n`;
  md += `**Data:** ${new Date().toLocaleString('pt-BR')}  \n`;
  md += `**URL:** ${URL}  \n`;
  md += `**Mensagens:** ${result.messages?.length || 0}\n\n`;
  md += `---\n\n`;
  
  result.messages?.forEach((msg, i) => {
    md += `### Mensagem ${i + 1}\n\n${msg.text}\n\n---\n\n`;
  });
  
  writeFileSync(join(OUTPUT_DIR, `${uuid}.md`), md);
  writeFileSync(join(OUTPUT_DIR, `${uuid}.html`), result.html);
  await page.screenshot({ path: join(OUTPUT_DIR, `${uuid}.png`), fullPage: true });
  
  console.log('');
  console.log('═'.repeat(60));
  console.log('✅ CAPTURA CONCLUÍDA!');
  console.log('═'.repeat(60));
  console.log(`📄 JSON: ${OUTPUT_DIR}/${uuid}.json`);
  console.log(`📝 MD:   ${OUTPUT_DIR}/${uuid}.md`);
  console.log(`🖼️ PNG:  ${OUTPUT_DIR}/${uuid}.png`);
  console.log(`💬 Mensagens: ${result.messages?.length || 0}`);
  console.log('');
  console.log('💡 Chromium permanece aberto!');
  
  return browser;
}

run()
  .then(() => console.log('\n✅ Sucesso!'))
  .catch(err => {
    console.error('\n❌ Erro:', err.message);
    process.exit(1);
  });
