/**
 * 🕷️ Scrape Universal v6.0 - Data Extraction Framework
 * Autor: Deivison Santana (@deivisan)
 * 
 * Script universal para extração de dados estruturados de páginas web (foco em conversas de IA e documentação).
 * Compatível com:
 * - Android (Termux): Detecta e usa o Chromium nativo.
 * - Desktop (VS Code/Terminal): Usa o navegador padrão do Puppeteer ou Path do sistema.
 */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

// Engines (Playwright preferencial, Puppeteer opcional)
let playwrightChromium = null;
let puppeteer = null;
let StealthPlugin = null;

function canUsePlaywright() {
  try {
    // playwright-core não baixa browsers; usaremos o canal do Edge no Windows quando disponível
    // eslint-disable-next-line global-require
    playwrightChromium = require('playwright-core').chromium;
    return true;
  } catch (_) {
    return false;
  }
}

function canUsePuppeteer() {
  try {
    // eslint-disable-next-line global-require
    puppeteer = require('puppeteer-extra');
    // eslint-disable-next-line global-require
    StealthPlugin = require('puppeteer-extra-plugin-stealth');
    return true;
  } catch (e) {
    console.log('⚠️ puppeteer-extra não disponível:', e.message);
    return false;
  }
}

// --- DETECÇÃO DE AMBIENTE ---
const TERMUX_CHROMIUM_PATH = '/data/data/com.termux/files/usr/bin/chromium-browser';
const IS_TERMUX = fs.existsSync(TERMUX_CHROMIUM_PATH);

// --- CONFIGURAÇÃO ---
const CONFIG = {
  targetUrl: process.argv[2],
  outputDir: path.resolve(process.cwd(), 'captures'), // Salva relativo onde o comando foi rodado
  scroll: { enabled: true, delay: 1500, maxScrolls: 50 },
  engine: process.env.SCRAPE_ENGINE || 'auto', // auto | playwright | puppeteer
  
  // Opções de Lançamento do Navegador (Anti-Detecção Cloudflare)
  launchOptions: {
    headless: false,
    executablePath: IS_TERMUX ? TERMUX_CHROMIUM_PATH : 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe',
    channel: undefined, // Força executable path
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled', // 🔑 Remove sinais de automação
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-web-security', // ⚠️ Apenas para scraping
      '--flag-switches-begin',
      '--disable-site-isolation-trials',
      '--flag-switches-end',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    ]
  },

  // Seletores de Extração (Adaptáveis)
  selectors: {
    containers: [
      '[data-testid^="message-"]', 
      '[role="article"]', 
      '.message-row', 
      '.message', 
      'div[class*="message"]'
    ],
    codeBlocks: ['pre', 'code', 'div[class*="code-block"]'],
    timestamp: 'time'
  }
};

// --- HELPERS ---

function getMetadata(url) {
  const timestamp = new Date().toISOString();
  let uuid = `capture_${Date.now()}`;
  
  if (url) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(p => p.length > 0);
      if (parts.length > 0) uuid = parts[parts.length - 1];
    } catch (e) {}
  }
  
  return {
    uuid,
    sourceUrl: url,
    capturedAt: timestamp,
    environment: IS_TERMUX ? 'Termux' : 'Desktop',
    engine: null
  };
}

// --- NÚCLEO DE EXTRAÇÃO ---

/**
 * Identifica quem está falando baseado no conteúdo e estrutura.
 * Útil para chats onde o DOM não identifica explicitamente "User" ou "AI".
 */
function identifySpeaker(text, elementHTML, prevSpeaker) {
  const lowerText = text.toLowerCase();
  const html = elementHTML.toLowerCase();

  // 1. Sinais Visuais (Classes/Atributos)
  if (html.includes('user') || html.includes('human') || html.includes('avatar-user')) return 'User';
  if (html.includes('ai-') || html.includes('bot') || html.includes('model')) return 'AI';

  // 2. Heurística de Conteúdo (Padrões de Conversa)
  if (lowerText.startsWith('olá,') || lowerText.startsWith('bom dia') || lowerText.includes('crie um código') || lowerText.includes('analise isso')) return 'User';
  if (lowerText.includes('claro, aqui está') || lowerText.includes('como modelo de linguagem') || lowerText.includes('analisando o código')) return 'AI';

  // 3. Alternância (Fallback)
  if (prevSpeaker === 'AI') return 'User';
  if (prevSpeaker === 'User') return 'AI';

  return 'Unknown';
}

/**
 * Analisa o texto para identificar intenções úteis para Agentes de IA.
 */
function extractIntents(text, author) {
  if (author !== 'User') return {};

  const intents = {
    files: [],
    commands: [],
    search: []
  };

  // Detectar criação/edição de arquivos
  const fileMatch = text.match(/(?:crie|edite|gere|arquivo)\s+["']?([\w\-\.\/]+\.\w+)["']?/i);
  if (fileMatch) intents.files.push({ action: 'edit/create', path: fileMatch[1] });

  // Detectar comandos de terminal
  const cmdMatch = text.match(/(?:rode|execute|comando)\s*[`"']([^`"']+)["`']/i);
  if (cmdMatch) intents.commands.push(cmdMatch[1]);

  return intents;
}

async function runScraper() {
  if (!CONFIG.targetUrl) {
    console.error('❌ Erro: URL não fornecida.\n👉 Uso: node scrape.js <URL>');
    process.exit(1);
  }

  console.log(`🚀 Iniciando Scrape Universal v6.0 (${IS_TERMUX ? 'Android' : 'Desktop'})`);
  console.log(`🎯 Alvo: ${CONFIG.targetUrl}`);

  const metadata = getMetadata(CONFIG.targetUrl);

  const saveArtifacts = async ({ structuredData, rawMessages, htmlDump, screenshotBuffer }) => {
    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

    const jsonPath = path.join(CONFIG.outputDir, `${metadata.uuid}.json`);
    fs.writeFileSync(
      jsonPath,
      JSON.stringify(
        {
          metadata,
          conversation: structuredData,
          raw: rawMessages
        },
        null,
        2
      )
    );

    let mdContent = `# 📝 Captura: ${metadata.uuid}\n\n`;
    mdContent += `**Data:** ${new Date().toLocaleString()} | **Origem:** ${metadata.sourceUrl} | **Engine:** ${metadata.engine}\n\n`;
    mdContent += `**Artefatos:** ${metadata.uuid}.json / ${metadata.uuid}.md / ${metadata.uuid}.html / ${metadata.uuid}.png\n\n---\n\n`;

    structuredData.forEach(msg => {
      const icon = msg.author === 'User' ? '👤' : (msg.author === 'AI' ? '🤖' : '📝');
      mdContent += `### ${icon} ${msg.author}\n\n${msg.content}\n\n`;
      if (msg.intents) {
        mdContent += `> 🛠️ **Ações Detectadas:** ${JSON.stringify(msg.intents)}\n\n`;
      }
      mdContent += `---\n`;
    });

    const mdPath = path.join(CONFIG.outputDir, `${metadata.uuid}.md`);
    fs.writeFileSync(mdPath, mdContent);

    const htmlPath = path.join(CONFIG.outputDir, `${metadata.uuid}.html`);
    if (htmlDump) fs.writeFileSync(htmlPath, htmlDump);

    const pngPath = path.join(CONFIG.outputDir, `${metadata.uuid}.png`);
    if (screenshotBuffer) fs.writeFileSync(pngPath, screenshotBuffer);

    console.log(`✅ Sucesso!\n   JSON: ${jsonPath}\n   MD:   ${mdPath}`);
  };

  const postProcess = async (rawMessages) => {
    const structuredData = [];
    let lastSpeaker = null;

    rawMessages.forEach((msg, i) => {
      if (msg.type === 'raw') {
        structuredData.push({ author: 'System', content: msg.text, type: 'raw' });
        return;
      }

      const speaker = identifySpeaker(msg.text, msg.html, lastSpeaker);
      const intents = extractIntents(msg.text, speaker);

      structuredData.push({
        index: i,
        author: speaker,
        content: msg.text,
        timestamp: msg.timestamp,
        code: msg.codeBlocks,
        intents: (intents.files.length || intents.commands.length) ? intents : null
      });

      lastSpeaker = speaker;
    });

    return structuredData;
  };

  const extractRawMessages = async (page) => {
    return page.evaluate((sel) => {
      const nodes = [];
      for (const s of sel.containers) {
        const els = document.querySelectorAll(s);
        if (els.length > 0) {
          els.forEach(el => {
            const codeBlocks = [];
            el.querySelectorAll(sel.codeBlocks.join(',')).forEach(cb => {
              codeBlocks.push({
                lang: cb.className || 'text',
                content: cb.innerText
              });
            });

            nodes.push({
              html: el.outerHTML,
              text: el.innerText,
              timestamp: el.querySelector(sel.timestamp)?.getAttribute('datetime'),
              codeBlocks: codeBlocks.length > 0 ? codeBlocks : null
            });
          });
          break;
        }
      }
      if (nodes.length === 0) {
        return [{ text: document.body.innerText, type: 'raw' }];
      }
      return nodes;
    }, CONFIG.selectors);
  };

  // Helper para delay (compatível Puppeteer e Playwright)
  const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const doScroll = async (page) => {
    if (!CONFIG.scroll.enabled) return;

    console.log('📜 Rolando página...');
    let lastHeight = await page.evaluate('document.body.scrollHeight');
    let scrolls = 0;

    while (scrolls < CONFIG.scroll.maxScrolls) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await new Promise(r => setTimeout(r, CONFIG.scroll.delay));
      const newHeight = await page.evaluate('document.body.scrollHeight');
      if (newHeight === lastHeight) break;
      lastHeight = newHeight;
      scrolls++;
    }
  };

  const runWithPuppeteerStealth = async () => {
    if (!canUsePuppeteer()) {
      throw new Error('puppeteer-extra não encontrado. Rode: npm install puppeteer-extra puppeteer-extra-plugin-stealth puppeteer');
    }

    metadata.engine = 'puppeteer-stealth';
    
    // Aplicar Stealth Plugin
    puppeteer.use(StealthPlugin());
    
    // 🛡️ Usar PERFIL PADRÃO do usuário (tem histórico/cookies que passam Cloudflare)
    const userDataDir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome Dev', 'User Data');
    console.log(`📁 Perfil: ${userDataDir}`);
    
    console.log('🚀 Lançando Puppeteer com Stealth Plugin...');
    const browser = await puppeteer.launch({
      headless: false,
      executablePath: 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe',
      userDataDir,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--window-size=1920,1080',
        '--lang=pt-BR'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7'
    });

    try {
      console.log('🌐 Navegando para a página...');
      await page.goto(CONFIG.targetUrl, { 
        waitUntil: 'networkidle2', 
        timeout: 90000 
      });
      
      console.log('✅ Página carregada');
      
      // Aguardar Cloudflare Challenge ser resolvido automaticamente pelo Stealth Plugin
      console.log('⏳ Aguardando Cloudflare resolver (até 60s)...');
      
      let cloudflareResolved = false;
      for (let i = 0; i < 60; i++) {
        await delay(1000);
        const title = await page.title();
        const url = page.url();
        
        if (!title.includes('Just a moment') && 
            !title.includes('Um momento') && 
            !title.includes('Cloudflare') &&
            !url.includes('__cf_chl')) {
          console.log(`✅ Cloudflare RESOLVIDO! Título: ${title}`);
          cloudflareResolved = true;
          break;
        }
        
        if (i % 10 === 0 && i > 0) {
          console.log(`   ⏳ ${i}s esperando... Título: ${title.substring(0, 50)}`);
        }
      }
      
      if (!cloudflareResolved) {
        console.log('⚠️ Cloudflare não resolveu em 60s. Continuando...');
      }
      
      // Aguardar React/Next.js hidratar
      console.log('⏳ Aguardando React/Next.js hidratar...');
      await delay(3000);
      
      // Estratégia 1: Aguardar elementos específicos
      console.log('🔍 Procurando elementos da conversa...');
      const selectors = [
        'div[class*="Conversation"]',
        'div[class*="Message"]',
        '[data-testid*="message"]',
        'article',
        '[role="article"]',
        'div[class*="message"]',
        'main div'
      ];
      
      let foundSelector = null;
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`✅ Encontrado: ${selector}`);
          foundSelector = selector;
          break;
        } catch (e) {
          console.log(`⏭️ Não encontrado: ${selector}`);
        }
      }
      
      // Scroll
      try {
        await page.waitForSelector('body', { timeout: 5000 });
        console.log('📜 Rolando página...');
        await scrollToBottom(page);
      } catch (e) {
        console.log('⚠️ Erro ao rolar, continuando...', e.message);
      }
      
      // Extração
      console.log('🔍 Extraindo e estruturando dados...');
      const extractedData = await extractRawMessages(page);
      
      // Artefatos
      const rawHtml = await page.content();
      const title = await page.title();
      metadata.title = title;
      
      console.log(`📊 Mensagens capturadas: ${extractedData.messages.length}`);
      console.log(`📄 HTML size: ${rawHtml.length} bytes`);
      
      await page.screenshot({ path: screenshotPath, fullPage: true });
      
      const finalData = {
        ...extractedData,
        metadata
      };
      
      fs.writeFileSync(jsonPath, JSON.stringify(finalData, null, 2), 'utf-8');
      fs.writeFileSync(mdPath, generateMarkdown(finalData), 'utf-8');
      fs.writeFileSync(htmlPath, rawHtml, 'utf-8');
      
      await browser.close();
      
      console.log('✅ Sucesso!');
      console.log(`   JSON: ${jsonPath}`);
      console.log(`   MD:   ${mdPath}`);
      
    } catch (error) {
      console.error('❌ Erro:', error);
      await browser.close();
      throw error;
    }
  };

  const runWithPlaywright = async () => {
    if (IS_TERMUX) {
      throw new Error('Playwright não é suportado no Termux por padrão neste script. Use SCRAPE_ENGINE=puppeteer no Android.');
    }
    if (!canUsePlaywright()) {
      throw new Error('playwright-core não encontrado. Rode: npm install (neste repo) ou instale playwright-core.');
    }

    metadata.engine = 'playwright';
    
    // 🛡️ Configuração Anti-Cloudflare com perfil separado (não usar perfil padrão)
    const userDataDir = path.join(process.cwd(), 'chrome-profile-scrape');
    if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });
    
    const browser = await playwrightChromium.launchPersistentContext(
      userDataDir,
      {
        headless: false,
        executablePath: 'C:\\Program Files\\Google\\Chrome Dev\\Application\\chrome.exe',
        viewport: { width: 1920, height: 1080 },
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials'
        ]
      }
    );
    
    // PersistentContext já retorna páginas, pegar a primeira ou criar nova
    const pages = browser.pages();
    const page = pages.length > 0 ? pages[0] : await browser.newPage();
    
    // 🎭 Remover navigator.webdriver (sinal de automação)
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
      window.chrome = { runtime: {} };
    });

    try {
      console.log('🌐 Navegando para a página...');
      try {
        await page.goto(CONFIG.targetUrl, { waitUntil: 'commit', timeout: 60000 });
        console.log('✅ Página carregada (commit)');
      } catch (e) {
        console.log('⚠️ Timeout no goto, continuando...', e.message);
      }
      
      console.log('⏳ Aguardando Cloudflare resolver (até 60s)...');
      
      // Loop inteligente: Aguarda até Cloudflare ser resolvido
      let cloudflareResolved = false;
      for (let i = 0; i < 60; i++) {
        await delay(1000);
        const title = await page.title();
        const url = page.url();
        
        // Verifica se passou do Cloudflare (título não é "Just a moment" e URL não tem __cf_chl)
        if (!title.includes('Just a moment') && 
            !title.includes('Um momento') && 
            !title.includes('Cloudflare') &&
            !url.includes('__cf_chl')) {
          console.log(`✅ Cloudflare RESOLVIDO! Título: ${title}`);
          cloudflareResolved = true;
          break;
        }
        
        // Feedback visual a cada 10s
        if (i % 10 === 0 && i > 0) {
          console.log(`   ⏳ ${i}s esperando... Título atual: ${title.substring(0, 50)}`);
        }
      }
      
      if (!cloudflareResolved) {
        console.log('⚠️ Cloudflare não resolveu em 60s. Continuando de qualquer forma...');
      }
      
      // Aguardar mais um pouco para React/Next.js hidratar (3s é suficiente após Cloudflare)
      console.log('⏳ Aguardando React/Next.js hidratar...');
      await delay(3000);
      
      // Estratégia 1: Aguardar elementos específicos do Grok/ChatGPT/Claude
      console.log('🔍 Procurando elementos da conversa...');
      const selectors = [
        // Grok specific
        'div[class*="Conversation"]',
        'div[class*="Message"]',
        '[data-testid*="message"]',
        '[data-testid*="conversation"]',
        // Generic patterns
        'article',
        '[role="article"]',
        'div[class*="message"]',
        'div[class*="chat"]',
        'div[class*="thread"]',
        // Fallback: qualquer div com muito texto
        'main div'
      ];
      
      let foundSelector = null;
      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          console.log(`✅ Encontrado: ${selector}`);
          foundSelector = selector;
          break;
        } catch (e) {
          console.log(`⏭️ Não encontrado: ${selector}`);
        }
      }
      
      // Estratégia 2: Aguardar rede estabilizar (com try/catch pois pode dar timeout)
      try {
        await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
        console.log('✅ DOM carregado');
      } catch (e) {
        console.log('⚠️ Timeout esperando DOM, continuando...');
      }
      
      await doScroll(page);

      console.log('🔍 Extraindo e estruturando dados...');
      const rawMessages = await extractRawMessages(page);
      const structuredData = await postProcess(rawMessages);

      const htmlDump = await page.content();
      const screenshotBuffer = await page.screenshot({ fullPage: true });
      
      // Debug: salvar HTML e log
      console.log(`📊 Mensagens capturadas: ${structuredData.length}`);
      console.log(`📄 HTML size: ${htmlDump.length} bytes`);

      await saveArtifacts({ structuredData, rawMessages, htmlDump, screenshotBuffer });
    } finally {
      await browser.close();
    }
  };

  const runWithPuppeteer = async () => {
    if (!canUsePuppeteer()) {
      throw new Error('puppeteer-extra não encontrado. Rode: npm install (neste repo) ou use SCRAPE_ENGINE=playwright.');
    }

    metadata.engine = 'puppeteer';
    const browser = await puppeteer.launch(CONFIG.launchOptions);
    const page = await browser.newPage();

    try {
      await page.setViewport({ width: 1280, height: 800 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.goto(CONFIG.targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Aguardar conteúdo dinâmico carregar
      console.log('⏳ Aguardando conteúdo carregar...');
      await delay(5000); // 5 segundos para JS carregar
      
      // Tentar esperar por elementos específicos da conversa
      try {
        await page.waitForSelector('[data-testid^="message-"], .message, [role="article"]', { timeout: 10000 });
        console.log('✅ Elementos da conversa encontrados!');
      } catch (e) {
        console.log('⚠️ Elementos específicos não encontrados, continuando...');
      }
      
      // Log do HTML atual para debug
      const currentHTML = await page.content();
      console.log(`📄 HTML length: ${currentHTML.length}`);
      const hasMessages = currentHTML.includes('message') || currentHTML.includes('conversa');
      console.log(`💬 Possui mensagens: ${hasMessages}`);
      
      await doScroll(page);

      console.log('🔍 Extraindo e estruturando dados...');
      const rawMessages = await extractRawMessages(page);
      const structuredData = await postProcess(rawMessages);

      const htmlDump = await page.content();
      const screenshotBuffer = await page.screenshot({ fullPage: true });

      await saveArtifacts({ structuredData, rawMessages, htmlDump, screenshotBuffer });
    } finally {
      await browser.close();
    }
  };

  try {
    const wanted = (CONFIG.engine || 'auto').toLowerCase();
    
    // Puppeteer Stealth prioritário para Grok (melhor bypass Cloudflare)
    if (wanted === 'stealth' || wanted === 'puppeteer-stealth') {
      await runWithPuppeteerStealth();
      return;
    }
    if (wanted === 'playwright') {
      await runWithPlaywright();
      return;
    }
    if (wanted === 'puppeteer') {
      await runWithPuppeteer();
      return;
    }

    // auto - priorizar Puppeteer Stealth se disponível
    if (canUsePuppeteer()) {
      console.log('🎭 Usando Puppeteer Stealth (bypass Cloudflare)');
      await runWithPuppeteerStealth();
      return;
    }
    if (canUsePlaywright()) {
      await runWithPlaywright();
      return;
    }
    
    throw new Error('Nenhuma engine disponível. Instale puppeteer-extra ou playwright-core.');
  } catch (err) {
    console.error(`💥 Erro Fatal: ${err.message}`);
    process.exitCode = 1;
  }
}

runScraper();
