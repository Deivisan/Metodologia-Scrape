/**
 * 🕷️ Scrape Universal v5.4 (Minimal Test) - Framework de Captação Inteligente
 * Autor: Deivison Santana (@deivisan)
 * 
 * Versão mínima para depuração de sintaxe e validação de ambiente Termux/Puppeteer.
 * Apenas navega e extrai o innerText do body.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

puppeteer.use(StealthPlugin());

const CONFIG = {
  targetUrl: process.argv[2],
  outputDir: path.join(__dirname, 'captures'),
  executablePath: '/data/data/com.termux/files/usr/bin/chromium-browser',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

function extractMetadata(url) {
  const timestamp = new Date().toISOString();
  const urlObj = new URL(url);
  const pathParts = urlObj.pathname.split('/');
  const uuid = pathParts[pathParts.length - 1] || `capture_${Date.now()}`;
  return { uuid, sourceUrl: url, capturedAt: timestamp };
}

(async () => {
  if (!CONFIG.targetUrl) {
    console.error('❌ Erro: URL não fornecida.');
    process.exit(1);
  }
  
  console.log(`🚀 Iniciando Scraper v5.4 (Minimal Test)`);
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

    await page.goto(CONFIG.targetUrl, { waitUntil: 'networkidle2', timeout: 90000 });
    
    // Extrai apenas o texto bruto do corpo da página
    const content = await page.evaluate(() => document.body.innerText);
    
    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    
    const outputPath = path.join(CONFIG.outputDir, `${metadata.uuid}_raw.txt`);
    fs.writeFileSync(outputPath, content);
    
    console.log(`✅ Conteúdo bruto salvo em: ${outputPath}`);

  } catch (error) {
    console.error('💥 Erro:', error.message);
  } finally {
    if (browser) await browser.close();
  }
})();