/**
 * 🎯 SCRAPE SESSION-NATIVE v7.5 - BUN + EDGE PERSISTENT
 * Autor: Deivison Santana (@deivisan)
 * 
 * 🎓 METODOLOGIA DE TREINAMENTO:
 * 
 * 1. PRINCÍPIO: Sessão Real > Anônimo
 *    - Usa perfil persistente do Edge (cookies/sessão reais)
 *    - Primeira execução: faz login manual se necessário
 *    - Execuções futuras: sessão já está logada
 * 
 * 2. DETECÇÃO INTELIGENTE DE PERFIL:
 *    - Busca em todos os caminhos possíveis do Edge
 *    - Se não existir, cria perfil novo em ./edge-profile
 *    - Permite reutilização de sessão
 * 
 * 3. COMPORTAMENTO NATIVO:
 *    - NÃO abre/fecha perfil a cada execução
 *    - Mantém aba aberta para re-captura (atualização)
 *    - Scroll ilimitado (como usuário real)
 *    - Respeita Cloudflare (aguarda resolução)
 * 
 * 4. ARTEFATOS GERADOS:
 *    - JSON: Captura integral (íntegra)
 *    - MD: Conteúdo refinado (útil)
 *    - HTML: DOM integral
 *    - PNG: Screenshot full-page
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join, basename, dirname } from 'path';
import { chromium } from 'playwright';

// ============================================
// DETECÇÃO INTELIGENTE DE AMBIENTE
// ============================================

const EDGE_PATHS = {
  executable: [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env.PROGRAMFILES}\\Microsoft\\Edge\\Application\\msedge.exe`,
    `${process.env['PROGRAMFILES(X86)']}\\Microsoft\\Edge\\Application\\msedge.exe`
  ],
  profiles: [
    `${process.env.LOCALAPPDATA}\\Microsoft\\Edge\\User Data`,
    `${process.env.USERPROFILE}\\AppData\\Local\\Microsoft\\Edge\\User Data`,
    `${process.env.APPDATA}\\Microsoft\\Edge\\User Data`
  ]
};

function detectEdgeBinary() {
  for (const path of EDGE_PATHS.executable) {
    if (existsSync(path)) {
      console.log(`✅ Edge binary: ${path}`);
      return path;
    }
  }
  throw new Error('❌ Edge não encontrado. Instale o Microsoft Edge.');
}

function detectOrCreateProfile() {
  // Primeiro, tentar encontrar perfil existente
  for (const basePath of EDGE_PATHS.profiles) {
    if (existsSync(basePath)) {
      const profiles = ['Default', 'Profile 1', 'Profile 2'];
      for (const profile of profiles) {
        const profilePath = join(basePath, profile);
        if (existsSync(profilePath)) {
          const cookiesPath = join(profilePath, 'Cookies');
          if (existsSync(cookiesPath)) {
            console.log(`✅ Perfil existente: ${profilePath}`);
            return profilePath;
          }
        }
      }
    }
  }
  
  // Se não existir, criar perfil persistente local
  const localProfile = join(process.cwd(), 'edge-profile');
  mkdirSync(localProfile, { recursive: true });
  console.log(`✅ Perfil criado: ${localProfile}`);
  console.log(`💡 Na primeira execução, faça login manual. As sessões serão salvas.`);
  return localProfile;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
  // Binário e perfil
  edgeExecutablePath: detectEdgeBinary(),
  userDataDir: detectOrCreateProfile(),
  
  // URL alvo
  targetUrl: process.argv[2] || 'https://grok.com/share/c2hhcmQtMg_4afc2b31-2aca-48ff-b6fe-0c680b805199',
  
  // Diretório de saída
  outputDir: join(process.cwd(), 'captures'),
  
  // Scroll ILIMITADO (como usuário real)
  scroll: {
    enabled: true,
    delay: 2500,      // Delay maior para conteúdo dinâmico
    maxScrolls: 9999, // ILIMITADO
    stopOnSameHeight: 3
  },
  
  // Anti-detection sutil
  stealth: {
    webdriver: false,
    plugins: [1, 2, 3, 4, 5],
    languages: ['pt-BR', 'pt', 'en-US', 'en'],
    chrome: true,
    webgl: true,
    automation: false
  },
  
  // Timeout configurável
  timeouts: {
    cloudflare: 120,      // 2 min para Cloudflare
    pageLoad: 120000,     // 2 min para carregar página
    navigation: 180000,   // 3 min para navegação
    browserLaunch: 300000 // 5 min para iniciar browser
  },
  
  // Seletores para conversas de IA
  selectors: {
    containers: [
      '[data-testid*="message"]',
      '[data-testid*="conversation"]',
      '[data-testid*="chat"]',
      '[role="article"]',
      'article',
      'div[class*="message"]',
      'div[class*="Conversation"]',
      'div[class*="ChatMessage"]',
      'div[class*="chat-message"]',
      'div[class*="thread"]',
      'main div',
      '[data-root]',
      'div[data-testid*="conversation-turn"]'
    ],
    codeBlocks: ['pre', 'code', 'div[class*="code"]', 'div[class*="syntax-highlight"]', '[class*="code-block"]'],
    timestamp: 'time'
  }
};

// ============================================
// HELPERS
// ============================================

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getMetadata(url) {
  const timestamp = new Date().toISOString();
  let uuid = `capture_${Date.now()}`;
  
  if (url) {
    try {
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/').filter(p => p.length > 0);
      if (parts.length > 0) {
        const lastPart = parts[parts.length - 1];
        // Se for share link, usar o ID
        if (lastPart.length > 10) {
          uuid = lastPart;
        }
      }
    } catch (e) {}
  }
  
  return {
    uuid,
    sourceUrl: url,
    capturedAt: timestamp,
    environment: 'PC-Desktop',
    os: 'Windows',
    browser: 'Edge',
    edgeVersion: basename(CONFIG.edgeExecutablePath),
    engine: 'playwright-edge-session',
    methodology: 'SESSION_NATIVE_v7.5',
    profileUsed: CONFIG.userDataDir
  };
}

function identifySpeaker(text, html) {
  const lowerText = text.toLowerCase();
  const lowerHtml = html.toLowerCase();
  
  // Sinais visuais (classes/attrs)
  if (lowerHtml.includes('user') || lowerHtml.includes('human') || lowerHtml.includes('avatar')) return 'User';
  if (lowerHtml.includes('assistant') || lowerHtml.includes('ai-') || lowerHtml.includes('bot') || lowerHtml.includes('model')) return 'AI';
  if (lowerHtml.includes('grok') || lowerHtml.includes('xai') || lowerHtml.includes('x-ai')) return 'AI';
  
  // Heurística de conteúdo
  if (lowerText.startsWith('olá') || lowerText.startsWith('bom dia') || lowerText.startsWith('boa tarde')) return 'User';
  if (lowerText.includes('here is') || lowerText.includes('here\'s') || lowerText.includes('claro') || lowerText.includes('certainly')) return 'AI';
  
  return 'Unknown';
}

async function extractMessages(page) {
  const result = await page.evaluate((selectors) => {
    const nodes = [];
    const seenTexts = new Set();
    
    for (const s of selectors.containers) {
      const els = document.querySelectorAll(s);
      if (els.length > 0) {
        els.forEach((el, idx) => {
          const text = el.innerText?.trim();
          if (!text || text.length < 5 || seenTexts.has(text)) return;
          seenTexts.add(text);
          
          const codeBlocks = [];
          el.querySelectorAll(selectors.codeBlocks.join(',')).forEach(cb => {
            const content = cb.innerText?.trim();
            if (content && content.length > 0) {
              codeBlocks.push({
                lang: cb.className || 'text',
                content: content
              });
            }
          });
          
          nodes.push({
            html: el.outerHTML,
            text: text,
            timestamp: el.querySelector(selectors.timestamp)?.getAttribute('datetime'),
            codeBlocks: codeBlocks.length > 0 ? codeBlocks : null,
            index: idx
          });
        });
        break;
      }
    }
    
    if (nodes.length === 0) {
      return [{ text: document.body.innerText?.trim(), type: 'raw' }];
    }
    
    return nodes;
  }, CONFIG.selectors);
  
  return result;
}

async function scrollToBottom(page) {
  if (!CONFIG.scroll.enabled) return;
  
  console.log(`📜 Scroll ILIMITADO (delay: ${CONFIG.scroll.delay}ms)...`);
  
  let lastHeight = await page.evaluate('document.body.scrollHeight');
  let sameHeightCount = 0;
  let scrolls = 0;
  
  while (scrolls < CONFIG.scroll.maxScrolls) {
    await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
    await delay(CONFIG.scroll.delay);
    
    const newHeight = await page.evaluate('document.body.scrollHeight');
    
    if (newHeight === lastHeight) {
      sameHeightCount++;
      if (sameHeightCount >= CONFIG.scroll.stopOnSameHeight) {
        console.log(`✅ Scroll: ${scrolls} scrolls, altura: ${newHeight}px`);
        break;
      }
    } else {
      sameHeightCount = 0;
      scrolls++;
      if (scrolls % 10 === 0) {
        console.log(`   Scroll ${scrolls}: ${newHeight}px`);
      }
    }
    
    lastHeight = newHeight;
  }
}

async function waitForCloudflare(page) {
  console.log(`⏳ Cloudflare (timeout: ${CONFIG.timeouts.cloudflare}s)...`);
  
  for (let i = 0; i < CONFIG.timeouts.cloudflare; i++) {
    await delay(1000);
    const title = await page.title();
    const url = page.url();
    
    if (!title.includes('Just a moment') && 
        !title.includes('Um momento') && 
        !title.includes('Cloudflare') &&
        !url.includes('__cf_chl') &&
        !url.includes('challenge')) {
      console.log(`✅ Cloudflare OK: ${title.substring(0, 50)}`);
      return true;
    }
    
    if (i % 20 === 0 && i > 0) {
      console.log(`   ⏳ ${i}s...`);
    }
  }
  
  console.log(`⚠️ Cloudflare timeout, continuando...`);
  return false;
}

async function waitForContent(page, maxWait = 30) {
  console.log(`⏳ Aguardando conteúdo (${maxWait}s)...`);
  
  for (let i = 0; i < maxWait; i++) {
    await delay(1000);
    const bodyText = await page.evaluate('document.body.innerText.length');
    const hasMessages = await page.evaluate(() => {
      return document.querySelectorAll('[class*="message"], [class*="Conversation"], article').length;
    });
    
    if (bodyText > 100 && hasMessages > 0) {
      console.log(`✅ Conteúdo carregado: ${bodyText} chars, ${hasMessages} elementos`);
      return true;
    }
    
    if (i % 10 === 0 && i > 0) {
      console.log(`   ⏳ ${i}s (chars: ${bodyText})`);
    }
  }
  
  console.log(`⚠️ Conteúdo não carregado completamente`);
  return false;
}

async function saveCapture(rawMessages, page, metadata) {
  mkdirSync(CONFIG.outputDir, { recursive: true });
  
  // Processar mensagens
  const structured = [];
  let lastSpeaker = null;
  
  rawMessages.forEach((msg, i) => {
    if (msg.type === 'raw') {
      structured.push({ author: 'System', content: msg.text, type: 'raw', index: i });
      return;
    }
    
    const speaker = identifySpeaker(msg.text, msg.html);
    let finalSpeaker = speaker;
    
    // Alternância inteligente
    if (speaker === 'Unknown') {
      finalSpeaker = lastSpeaker === 'AI' ? 'User' : (lastSpeaker === 'User' ? 'AI' : 'Unknown');
    }
    
    structured.push({ 
      author: finalSpeaker, 
      content: msg.text, 
      codeBlocks: msg.codeBlocks,
      timestamp: msg.timestamp,
      index: i 
    });
    lastSpeaker = finalSpeaker;
  });
  
  // Capturar artefatos
  const htmlDump = await page.content();
  const screenshotBuffer = await page.screenshot({ fullPage: true });
  
  // JSON COMPLETO (íntegra)
  const jsonData = {
    metadata,
    conversation: structured,
    rawMessages,
    capturedAt: new Date().toISOString()
  };
  
  const jsonPath = join(CONFIG.outputDir, `${metadata.uuid}.json`);
  writeFileSync(jsonPath, JSON.stringify(jsonData, null, 2));
  
  // MARKDOWN (conteúdo útil)
  let mdContent = `# 📝 ${metadata.uuid}\n\n`;
  mdContent += `**Data:** ${new Date().toLocaleString('pt-BR')}  \n`;
  mdContent += `**Origem:** ${metadata.sourceUrl}  \n`;
  mdContent += `**Engine:** ${metadata.engine}  \n`;
  mdContent += `**Perfil:** ${basename(metadata.profileUsed)}  \n`;
  mdContent += `**Mensagens:** ${structured.length}\n\n`;
  mdContent += `---\n\n`;
  
  structured.forEach((msg) => {
    const icon = msg.author === 'User' ? '👤' : (msg.author === 'AI' ? '🤖' : '📝');
    mdContent += `### ${icon} ${msg.author}\n\n${msg.content}\n\n`;
    if (msg.codeBlocks && msg.codeBlocks.length > 0) {
      msg.codeBlocks.forEach(cb => {
        mdContent += `\`\`\`\n${cb.content}\n\`\`\`\n\n`;
      });
    }
    mdContent += `---\n\n`;
  });
  
  const mdPath = join(CONFIG.outputDir, `${metadata.uuid}.md`);
  writeFileSync(mdPath, mdContent);
  
  // HTML integral
  const htmlPath = join(CONFIG.outputDir, `${metadata.uuid}.html`);
  writeFileSync(htmlPath, htmlDump);
  
  // Screenshot
  const pngPath = join(CONFIG.outputDir, `${metadata.uuid}.png`);
  writeFileSync(pngPath, screenshotBuffer);
  
  return { jsonPath, mdPath, htmlPath, pngPath, messageCount: structured.length };
}

// ============================================
// NÚCLEO PRINCIPAL
// ============================================

async function runScraper() {
  console.log('');
  console.log('═'.repeat(60));
  console.log('🎯 SCRAPE SESSION-NATIVE v7.5');
  console.log('═'.repeat(60));
  console.log(`🌐 Alvo: ${CONFIG.targetUrl}`);
  console.log(`📂 Output: ${CONFIG.outputDir}`);
  console.log(`🧭 Edge: ${basename(CONFIG.edgeExecutablePath)}`);
  console.log(`👤 Perfil: ${basename(CONFIG.userDataDir)}`);
  console.log('═'.repeat(60));
  
  const metadata = getMetadata(CONFIG.targetUrl);
  
  console.log('🚀 Iniciando browser...');
  
  // Usar launchPersistentContext - mais simples e mantém sessão
  const context = await chromium.launchPersistentContext(
    CONFIG.userDataDir,
    {
      headless: false,  // VISÍVEL
      executablePath: CONFIG.edgeExecutablePath,
      viewport: { width: 1920, height: 1080 },
      locale: 'pt-BR',
      ignoreHTTPSErrors: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--window-size=1920,1080',
        '--lang=pt-BR'
      ]
    }
  );
  
  // Pegar aba existente ou criar nova
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();
  
  // Anti-detection sutil
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en-US', 'en'] });
    Object.defineProperty(navigator, 'chrome', { get: () => ({ runtime: {} }) });
    delete navigator.webdriver;
  });
  
  try {
    console.log('🌐 Navegando...');
    await page.goto(CONFIG.targetUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: CONFIG.timeouts.pageLoad 
    });
    console.log('✅ Página carregada');
    
    // Aguardar Cloudflare
    await waitForCloudflare(page);
    
    // Aguardar conteúdo
    await waitForContent(page);
    
    // Scroll completo
    await scrollToBottom(page);
    
    // Extrair mensagens
    console.log('🔍 Extraindo...');
    const rawMessages = await extractMessages(page);
    console.log(`📊 Mensagens: ${rawMessages.length}`);
    
    // Salvar
    console.log('💾 Salvando...');
    const paths = await saveCapture(rawMessages, page, metadata);
    
    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ CAPTURA CONCLUÍDA!');
    console.log('═'.repeat(60));
    console.log(`📄 JSON: ${paths.jsonPath}`);
    console.log(`📝 MD:   ${paths.mdPath}`);
    console.log(`🌐 HTML: ${paths.htmlPath}`);
    console.log(`🖼️ PNG:  ${paths.pngPath}`);
    console.log(`💬 Mensagens: ${paths.messageCount}`);
    console.log('═'.repeat(60));
    
  } finally {
    // Manter contexto aberto para reutilização!
    console.log('💡 Contexto mantido aberto para próximas execuções.');
    // await context.close();  // NÃO FECHAR - manter sessão!
  }
}

// Executar
runScraper();
