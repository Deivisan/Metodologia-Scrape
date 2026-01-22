/**
 * 🧪 TESTE STANDALONE OTIMIZADO - COM MÉTRICAS COMPLETAS
 * 
 * Testa o scraper otimizado com instrumentação de performance
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

puppeteer.use(StealthPlugin());

// ============================================
// 🎨 LOGGING COLORIDO
// ============================================

type LogLevel = 'info' | 'success' | 'warn' | 'error' | 'metric';

const COLORS: Record<LogLevel, string> = {
  info: '\x1b[36m',
  success: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  metric: '\x1b[35m'
};

function log(level: LogLevel, message: string, data?: any) {
  const timestamp = new Date().toISOString().substring(11, 23);
  const color = COLORS[level];
  const prefix: Record<LogLevel, string> = {
    info: 'ℹ️  ',
    success: '✅',
    warn: '⚠️ ',
    error: '❌',
    metric: '📊'
  };
  console.log(`${color}${timestamp} ${prefix[level]} ${message}\x1b[0m`);
  if (data) console.log(JSON.stringify(data, null, 2));
}

// ============================================
// ⏱️ TRACKER DE PERFORMANCE
// ============================================

interface StageTime {
  name: string;
  start: number;
  end?: number;
  duration?: number;
}

class PerformanceTracker {
  private stages: Map<string, StageTime> = new Map();
  private totalStart: number = 0;

  start(name: string) {
    this.stages.set(name, { name, start: Date.now() });
    if (!this.totalStart) this.totalStart = Date.now();
    log('info', `🚀 INICIANDO: ${name}`);
  }

  end(name: string) {
    const stage = this.stages.get(name);
    if (stage) {
      stage.end = Date.now();
      stage.duration = stage.end - stage.start;
      log('success', `✅ FINALIZADO: ${name}`, { duration: `${stage.duration}ms` });
    }
  }

  getReport() {
    const stages = Array.from(this.stages.values());
    const totalDuration = Date.now() - this.totalStart;
    const stageTimes = stages.reduce((acc, s) => ({ ...acc, [s.name]: s.duration }), {} as Record<string, number>);
    
    const sorted = [...stages].sort((a, b) => (b.duration || 0) - (a.duration || 0));
    
    return {
      totalDuration: `${totalDuration}ms`,
      stages: stages.map(s => ({
        name: s.name,
        duration: `${s.duration}ms`,
        percentage: ((s.duration || 0) / totalDuration * 100).toFixed(1) + '%'
      })),
      biggestBottleneck: sorted[0]?.name || 'N/A',
      stageTimes
    };
  }
}

// ============================================
// ⚙️ CONFIGURAÇÃO OTIMIZADA
// ============================================

const CONFIG = {
  url: process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_b6476b3c-6941-47a0-a6cc-b87b1ffd5286',
  outputDir: join(process.cwd(), 'captures'),
  headless: process.env.HEADLESS !== 'false',
  
  // OTIMIZADO
  timeout: 60000,
  cloudflareWait: 30000,
  scrollDelay: 1000,  // Reduzido de 1500 para 1000
  maxScrolls: 30
};

// ============================================
// 🎯 TESTE PRINCIPAL
// ============================================

async function runOptimizedTest() {
  const metrics = new PerformanceTracker();
  
  console.log('\n' + '═'.repeat(60));
  log('info', '🧪 TESTE OTIMIZADO - MCP GROK SCRAPER v2.1.0');
  console.log('═'.repeat(60));
  log('info', `🌐 URL: ${CONFIG.url}`);
  log('info', `🎭 Headless: ${CONFIG.headless}`);
  log('info', `📂 Output: ${CONFIG.outputDir}`);
  log('metric', '⚙️ Config Otimizada', { 
    scrollDelay: CONFIG.scrollDelay, 
    cloudflareWait: CONFIG.cloudflareWait 
  });
  console.log('');
  
  let browser: any;
  
  try {
    // 🚀 ETAPA 1: Launch
    metrics.start('launchBrowser');
    const launchStart = Date.now();
    
    browser = await puppeteer.launch({
      headless: CONFIG.headless ? 'new' : false,
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
    
    metrics.end('launchBrowser');
    
    // 🌐 ETAPA 2: Navegação
    metrics.start('navigation');
    await page.goto(CONFIG.url, { waitUntil: 'networkidle2', timeout: CONFIG.timeout });
    metrics.end('navigation');
    
    // 🛡️ ETAPA 3: Cloudflare
    metrics.start('cloudflareBypass');
    const cfStart = Date.now();
    let cfChecks = 0;
    
    while (Date.now() - cfStart < CONFIG.cloudflareWait) {
      cfChecks++;
      const title = await page.title();
      if (!title.includes('Just a moment') && !title.includes('Cloudflare')) {
        log('success', `🛡️ Cloudflare OK (${cfChecks} verificações)`);
        break;
      }
      await new Promise(r => setTimeout(r, 500));
    }
    metrics.end('cloudflareBypass');
    
    // ⏳ ETAPA 4: React Hydrate (OTIMIZADO)
    metrics.start('reactHydrate');
    await new Promise(r => setTimeout(r, 2000)); // Reduzido de 3s para 2s
    metrics.end('reactHydrate');
    
    // 📜 ETAPA 5: Scroll Adaptativo
    metrics.start('scroll');
    const scrollStart = Date.now();
    let scrollCount = 0;
    let stable = 0;
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    let currentHeight = lastHeight;
    
    log('info', `📏 Altura inicial: ${lastHeight}px`);
    
    for (let i = 0; i < CONFIG.maxScrolls; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, CONFIG.scrollDelay));
      
      const newHeight = await page.evaluate('document.body.scrollHeight');
      
      if (newHeight === currentHeight) {
        stable++;
        if (stable >= 2) {
          log('success', `✅ Scroll completo em ${i + 1} iterações`);
          break;
        }
      } else {
        stable = 0;
      }
      
      currentHeight = newHeight;
      scrollCount++;
    }
    metrics.end('scroll');
    
    // 🔍 ETAPA 6: Extração
    metrics.start('extraction');
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
        messages,
        fullHtml: document.documentElement.outerHTML
      };
    });
    metrics.end('extraction');
    
    log('success', `🔍 ${result.messageCount} mensagens extraídas`);
    
    // 💾 ETAPA 7: Salvamento
    metrics.start('save');
    mkdirSync(CONFIG.outputDir, { recursive: true });
    const uuid = `test_optimized_${Date.now()}`;
    
    const report = metrics.getReport();
    
    writeFileSync(join(CONFIG.outputDir, `${uuid}.json`), JSON.stringify({
      url: CONFIG.url,
      title: result.title,
      messageCount: result.messageCount,
      messages: result.messages,
      metadata: {
        capturedAt: new Date().toISOString(),
        scrollCount,
        headless: CONFIG.headless,
        stageTimes: report.stageTimes
      }
    }, null, 2));
    metrics.end('save');
    
    await browser.close();
    
    // ════════════════════════════════════════
    // 📊 RELATÓRIO FINAL
    // ════════════════════════════════════════
    console.log('\n' + '═'.repeat(60));
    log('metric', '📊 RELATÓRIO DE PERFORMANCE');
    console.log('═'.repeat(60));
    log('metric', `⏱️ TEMPO TOTAL: ${report.totalDuration}`);
    log('metric', `📝 MENSAGENS: ${result.messageCount}`);
    log('metric', `📜 SCROLLS: ${scrollCount}`);
    console.log('-'.repeat(60));
    
    report.stages.forEach(stage => {
      const bar = '█'.repeat(Math.floor(parseFloat(stage.percentage) / 5));
      console.log(`  ${stage.name.padEnd(20)} ${stage.duration.padEnd(10)} ${stage.percentage.padStart(6)} ${bar}`);
    });
    
    console.log('-'.repeat(60));
    log('warn', `⚠️ MAIOR GARGALO: ${report.biggestBottleneck}`);
    console.log('═'.repeat(60));
    
    console.log(`\n✅ SUCESSO em ${report.totalDuration}`);
    console.log(`📄 Arquivo: ${uuid}.json\n`);
    
    process.exit(0);
    
  } catch (error: any) {
    if (browser) await browser.close();
    log('error', `❌ ERRO: ${error.message}`);
    process.exit(1);
  }
}

runOptimizedTest();
