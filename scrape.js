/**
 * 🕷️ Scrape Universal v6.0 - Data Extraction Framework
 * Autor: Deivison Santana (@deivisan)
 * 
 * Script universal para extração de dados estruturados de páginas web (foco em conversas de IA e documentação).
 * Compatível com:
 * - Android (Termux): Detecta e usa o Chromium nativo.
 * - Desktop (VS Code/Terminal): Usa o navegador padrão do Puppeteer ou Path do sistema.
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

puppeteer.use(StealthPlugin());

// --- DETECÇÃO DE AMBIENTE ---
const TERMUX_CHROMIUM_PATH = '/data/data/com.termux/files/usr/bin/chromium-browser';
const IS_TERMUX = fs.existsSync(TERMUX_CHROMIUM_PATH);

// --- CONFIGURAÇÃO ---
const CONFIG = {
  targetUrl: process.argv[2],
  outputDir: path.resolve(process.cwd(), 'captures'), // Salva relativo onde o comando foi rodado
  scroll: { enabled: true, delay: 1500, maxScrolls: 50 },
  
  // Opções de Lançamento do Navegador
  launchOptions: {
    headless: "new",
    executablePath: IS_TERMUX ? TERMUX_CHROMIUM_PATH : undefined, // Auto-detecta no Desktop, força no Termux
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu'
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
  
  return { uuid, sourceUrl: url, capturedAt: timestamp, environment: IS_TERMUX ? 'Termux' : 'Desktop' };
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

  const browser = await puppeteer.launch(CONFIG.launchOptions);
  const page = await browser.newPage();
  const metadata = getMetadata(CONFIG.targetUrl);

  try {
    // Configuração de Viewport e User-Agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto(CONFIG.targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });

    // Scroll Infinito Inteligente
    if (CONFIG.scroll.enabled) {
      console.log('📜 Rolando página...');
      let lastHeight = await page.evaluate('document.body.scrollHeight');
      let scrolls = 0;
      
      while (scrolls < CONFIG.scroll.maxScrolls) {
        await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
        await new Promise(r => setTimeout(r, CONFIG.scroll.delay));
        let newHeight = await page.evaluate('document.body.scrollHeight');
        if (newHeight === lastHeight) break;
        lastHeight = newHeight;
        scrolls++;
      }
    }

    // Extração de Dados
    console.log('🔍 Extraindo e estruturando dados...');
    const rawMessages = await page.evaluate((sel) => {
      const nodes = [];
      // Tenta encontrar o container principal
      for (const s of sel.containers) {
        const els = document.querySelectorAll(s);
        if (els.length > 0) {
          els.forEach(el => {
            // Busca blocos de código internos
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
      // Fallback para texto bruto se não achar estrutura
      if (nodes.length === 0) {
        return [{ text: document.body.innerText, type: 'raw' }];
      }
      return nodes;
    }, CONFIG.selectors);

    // Processamento Pós-Browser (Node.js)
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

    // Salvar Arquivos
    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir, { recursive: true });

    // 1. JSON Completo
    const jsonPath = path.join(CONFIG.outputDir, `${metadata.uuid}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify({ metadata, conversation: structuredData }, null, 2));

    // 2. Markdown Limpo
    let mdContent = `# 📝 Captura: ${metadata.uuid}\n\n`;
    mdContent += `**Data:** ${new Date().toLocaleString()} | **Origem:** ${metadata.sourceUrl}\n\n---\n\n`;
    
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

    console.log(`✅ Sucesso!\n   JSON: ${jsonPath}\n   MD:   ${mdPath}`);

  } catch (err) {
    console.error(`💥 Erro Fatal: ${err.message}`);
  } finally {
    await browser.close();
  }
}

runScraper();
