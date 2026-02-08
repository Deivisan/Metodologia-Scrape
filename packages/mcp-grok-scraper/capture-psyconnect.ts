#!/usr/bin/env bun
/**
 * 🎯 CAPTURA DIRETA DO GROK SHARE - PsyConnect
 * Usa Google Chrome Stable + Puppeteer Stealth
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Configuração
const CHROME_PATH = '/usr/bin/google-chrome-stable';
const OUTPUT_DIR = join(dirname(fileURLToPath(import.meta.url)), 'captures');
const TARGET_URL = 'https://grok.com/share/c2hhcmQtMg_6ba1c2ef-4658-49d2-96ae-558947e4e289';

puppeteer.use(StealthPlugin());

async function captureGrok() {
  console.log('🎯 INICIANDO CAPTURA DO GROK SHARE...\n');
  
  let browser;
  
  try {
    // Launch Chrome
    console.log('🚀 Lançando Google Chrome Stable...');
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: CHROME_PATH,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        `--window-size=1920,1080`
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36');
    
    console.log(`🌐 Navegando para: ${TARGET_URL}`);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Aguardar Cloudflare
    console.log('⏳ Aguardando Cloudflare...');
    await new Promise(r => setTimeout(r, 10000));
    
    // Scroll completo
    console.log('📜 Scrollando...');
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    for (let i = 0; i < 50; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, 3000));
      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === lastHeight) break;
      lastHeight = newHeight;
      console.log(`  Scroll ${i + 1}: ${newHeight}px`);
    }
    
    // Extrair tudo
    console.log('🔍 Extraindo conteúdo completo...');
    const result = await page.evaluate(() => {
      // Pegar TODOS os textos da página
      const allTexts: string[] = [];
      
      // Iterar por todos os elementos de texto
      document.querySelectorAll('div, span, p, h1, h2, h3, h4, h5, h6, li, td, th').forEach(el => {
        const text = el.innerText?.trim();
        if (text && text.length > 10 && !text.includes('Sign in') && !text.includes('Continue')) {
          allTexts.push(text);
        }
      });
      
      // Pegar HTML completo
      const fullHtml = document.documentElement.outerHTML;
      
      return {
        title: document.title,
        url: window.location.href,
        capturedAt: new Date().toISOString(),
        allTexts,
        fullHtml,
        scrollHeight: document.body.scrollHeight
      };
    });
    
    console.log(`📊 Textos extraídos: ${result.allTexts.length}`);
    
    // Salvar
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const uuid = `psyconnect_${Date.now()}`;
    
    // JSON completo
    const jsonPath = join(OUTPUT_DIR, `${uuid}_full.json`);
    writeFileSync(jsonPath, JSON.stringify(result, null, 2));
    console.log(`💾 Salvo: ${jsonPath}`);
    
    // Markdown com todo o conteúdo
    const mdPath = join(OUTPUT_DIR, `${uuid}.md`);
    let md = `# ${result.title}\n\n`;
    md += `**Data:** ${new Date().toLocaleString('pt-BR')}\n`;
    md += `**URL:** ${TARGET_URL}\n`;
    md += `**Texts extraídos:** ${result.allTexts.length}\n\n`;
    md += `---\n\n`;
    
    md += `## TODO O CONTEÚDO DA PÁGINA\n\n`;
    result.allTexts.forEach((text, i) => {
      md += `### Trecho ${i + 1}\n\n${text}\n\n---\n\n`;
    });
    
    writeFileSync(mdPath, md);
    console.log(`💾 Salvo: ${mdPath}`);
    
    await browser.close();
    
    console.log('\n✅ CAPTURA COMPLETA COM SUCESSO!');
    console.log(`📁 Arquivos em: ${OUTPUT_DIR}`);
    
    return { success: true, textsCount: result.allTexts.length };
    
  } catch (error: any) {
    if (browser) await browser.close();
    console.error('❌ Erro:', error.message);
    return { success: false, error: error.message };
  }
}

captureGrok();
