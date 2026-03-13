#!/usr/bin/env bun
/**
 * 🕷️ Metodologia-Scrape v3.0 - Captura Completa Grok
 * Script standalone otimizado para extrair conversas inteiras
 * 
 * Autor: DevSan AGI (@deivisan)
 * Data: 2026-01-31
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Configuração
const CONFIG = {
  outputDir: '/home/deivi/Projetos/proximos-passos/for-grok/conversations',
  headless: true,
  timeout: 120000,
  waitTime: 10000
};

// URL da conversa
const url = process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_67c38a0e-78b5-42e7-af18-5b96b4e0a785';

console.log('🕷️ Metodologia-Scrape v3.0');
console.log('==========================');
console.log(`🎯 URL: ${url}`);
console.log(`📁 Output: ${CONFIG.outputDir}`);
console.log('');

async function scrapeGrok() {
  try {
    // Dynamic import do Puppeteer
    const puppeteer = await import('puppeteer-extra');
    const StealthPlugin = await import('puppeteer-extra-plugin-stealth');
    
    puppeteer.default.use(StealthPlugin.default());
    
    console.log('🚀 Iniciando browser...');
    const browser = await puppeteer.default.launch({
      headless: CONFIG.headless,
      executablePath: '/usr/bin/chromium',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('⏳ Navegando para URL...');
    await page.goto(url, { 
      waitUntil: 'networkidle2', 
      timeout: CONFIG.timeout 
    });
    
    // Aguarda carregamento completo
    console.log(`⏳ Aguardando ${CONFIG.waitTime/1000}s para renderização...`);
    await new Promise(r => setTimeout(r, CONFIG.waitTime));
    
    // Extrai conteúdo
    console.log('📜 Extraindo conversa...');
    const conversation = await page.evaluate(() => {
      const messages: any[] = [];
      
      // Tenta múltiplos seletores
      const selectors = [
        '[data-testid="message"]',
        '.message',
        '.chat-message',
        '[role="listitem"]',
        'div[class*="message"]',
        'article',
        '.prose',
        'main > div > div'
      ];
      
      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          elements.forEach((el, idx) => {
            const text = el.textContent?.trim();
            if (text && text.length > 10) {
              const isUser = idx % 2 === 0 || el.className.includes('user');
              messages.push({
                role: isUser ? 'user' : 'assistant',
                text: text.substring(0, 5000),
                selector
              });
            }
          });
          if (messages.length > 0) break;
        }
      }
      
      // Fallback: extrai todo texto estruturado
      if (messages.length === 0) {
        const bodyText = document.body.innerText;
        const chunks = bodyText.split(/\n{2,}/).filter(t => t.trim().length > 20);
        chunks.forEach((chunk, idx) => {
          messages.push({
            role: idx % 2 === 0 ? 'user' : 'assistant',
            text: chunk.substring(0, 5000),
            selector: 'fallback'
          });
        });
      }
      
      return {
        title: document.title,
        url: window.location.href,
        messageCount: messages.length,
        messages: messages.slice(0, 200) // Limita a 200 mensagens
      };
    });
    
    console.log(`✅ Encontradas ${conversation.messageCount} mensagens`);
    
    // Screenshot
    console.log('📸 Capturando screenshot...');
    const screenshotPath = join(CONFIG.outputDir, `grok_${Date.now()}.png`);
    await page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    
    // HTML bruto
    console.log('💾 Salvando HTML...');
    const html = await page.content();
    const htmlPath = join(CONFIG.outputDir, `grok_${Date.now()}.html`);
    writeFileSync(htmlPath, html);
    
    // Markdown formatado
    console.log('📝 Criando Markdown...');
    let mdContent = `# ${conversation.title}\n\n`;
    mdContent += `**URL:** ${url}\n`;
    mdContent += `**Data:** ${new Date().toISOString()}\n`;
    mdContent += `**Mensagens:** ${conversation.messageCount}\n\n`;
    mdContent += `---\n\n`;
    
    conversation.messages.forEach((msg: any, idx: number) => {
      mdContent += `### [${idx + 1}] ${msg.role === 'user' ? '👤 Usuário' : '🤖 Grok'}\n\n`;
      mdContent += `${msg.text}\n\n`;
      mdContent += `---\n\n`;
    });
    
    const mdPath = join(CONFIG.outputDir, `grok_${Date.now()}.md`);
    mkdirSync(CONFIG.outputDir, { recursive: true });
    writeFileSync(mdPath, mdContent);
    
    // JSON estruturado
    const jsonPath = join(CONFIG.outputDir, `grok_${Date.now()}.json`);
    writeFileSync(jsonPath, JSON.stringify({
      ...conversation,
      capturedAt: new Date().toISOString(),
      method: 'Metodologia-Scrape-v3.0-Puppeteer-Stealth'
    }, null, 2));
    
    await browser.close();
    
    console.log('');
    console.log('✅ CAPTURA CONCLUÍDA!');
    console.log('====================');
    console.log(`📄 Markdown: ${mdPath}`);
    console.log(`💻 HTML: ${htmlPath}`);
    console.log(`📸 Screenshot: ${screenshotPath}`);
    console.log(`📊 JSON: ${jsonPath}`);
    console.log(`💬 Total: ${conversation.messageCount} mensagens`);
    
    return mdPath;
    
  } catch (error) {
    console.error('❌ ERRO:', error);
    process.exit(1);
  }
}

scrapeGrok();
