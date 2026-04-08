import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

puppeteer.use(StealthPlugin());

const URL = 'https://grok.com/share/c2hhcmQtMg_74da205a-21b8-4696-bf67-fd587f9b477d';
const OUTPUT_DIR = './captures';

async function captureGrokConversation() {
  console.log('🎯 Capturando conversa do Grok...');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/usr/bin/google-chrome-stable',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
  try {
    console.log('🌐 Carregando página...');
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Aguardar Cloudflare
    console.log('⏳ Aguardando Cloudflare...');
    await page.waitForSelector('h1, .message, [data-testid]', { timeout: 30000 }).catch(() => {});
    
    // Scroll para carregar tudo
    console.log('📜 Scrolling...');
    await page.evaluate(async () => {
      for (let i = 0; i < 10; i++) {
        window.scrollTo(0, document.body.scrollHeight);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    });
    
    // Extrair conteúdo
    console.log('📝 Extraindo conteúdo...');
    const content = await page.evaluate(() => {
      const messages = Array.from(document.querySelectorAll('[data-testid], .message, .conversation-message'));
      return messages.map(el => el.textContent || '').join('\n\n');
    });
    
    const title = await page.title();
    
    // Salvar
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const filename = `grok_conversation_${Date.now()}.md`;
    const filepath = join(OUTPUT_DIR, filename);
    
    const markdown = `# ${title}\n\n**URL:** ${URL}\n**Data:** ${new Date().toISOString()}\n\n---\n\n${content}`;
    
    writeFileSync(filepath, markdown);
    console.log(`✅ Salvo em: ${filepath}`);
    
    // Screenshot
    const screenshotPath = join(OUTPUT_DIR, `grok_conversation_${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot: ${screenshotPath}`);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await browser.close();
  }
}

captureGrokConversation();
