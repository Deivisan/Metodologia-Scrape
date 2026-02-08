#!/usr/bin/env bun
/**
 * 🎯 TESTE COMPARATIVO - Puppeteer Stealth vs Playwright
 * 
 * Objetivo: Validar performance e taxa de sucesso com Cloudflare
 * Autor: DevSan AGI (@deivisan)
 * Data: 2026-01-17
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { chromium, firefox, webkit } from 'playwright';

puppeteer.use(StealthPlugin());

interface TestResult {
  method: string;
  browser: string;
  success: boolean;
  duration: number;
  messagesCount: number;
  error?: string;
}

const TEST_URL = 'https://grok.com/share/c2hhcmQtMg_f1b92fcc-c29d-41dc-b00d-23941b041dbe';
const TIMEOUT = 30000;

/**
 * Teste Puppeteer Stealth (Chromium)
 */
async function testPuppeteerStealth(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🎭 Testando: Puppeteer Stealth (Chromium)...');
    
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled'
      ]
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForTimeout(5000); // Cloudflare
    
    const title = await page.title();
    const messages = await page.$$eval('[role="article"]', els => els.length);
    
    await browser.close();
    
    return {
      method: 'Puppeteer Stealth',
      browser: 'Chromium',
      success: title.includes('Grok'),
      duration: Date.now() - startTime,
      messagesCount: messages
    };
    
  } catch (error: any) {
    return {
      method: 'Puppeteer Stealth',
      browser: 'Chromium',
      success: false,
      duration: Date.now() - startTime,
      messagesCount: 0,
      error: error.message
    };
  }
}

/**
 * Teste Playwright (Chromium)
 */
async function testPlaywrightChromium(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🌐 Testando: Playwright (Chromium)...');
    
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0'
    });
    
    const page = await context.newPage();
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    const messages = await page.locator('[role="article"]').count();
    
    await browser.close();
    
    return {
      method: 'Playwright',
      browser: 'Chromium',
      success: title.includes('Grok'),
      duration: Date.now() - startTime,
      messagesCount: messages
    };
    
  } catch (error: any) {
    return {
      method: 'Playwright',
      browser: 'Chromium',
      success: false,
      duration: Date.now() - startTime,
      messagesCount: 0,
      error: error.message
    };
  }
}

/**
 * Teste Playwright (Firefox)
 */
async function testPlaywrightFirefox(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🦊 Testando: Playwright (Firefox)...');
    
    const browser = await firefox.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    const messages = await page.locator('[role="article"]').count();
    
    await browser.close();
    
    return {
      method: 'Playwright',
      browser: 'Firefox',
      success: title.includes('Grok'),
      duration: Date.now() - startTime,
      messagesCount: messages
    };
    
  } catch (error: any) {
    return {
      method: 'Playwright',
      browser: 'Firefox',
      success: false,
      duration: Date.now() - startTime,
      messagesCount: 0,
      error: error.message
    };
  }
}

/**
 * Teste Playwright (WebKit)
 */
async function testPlaywrightWebkit(): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log('\n🍎 Testando: Playwright (WebKit)...');
    
    const browser = await webkit.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 }
    });
    
    const page = await context.newPage();
    await page.goto(TEST_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT });
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    const messages = await page.locator('[role="article"]').count();
    
    await browser.close();
    
    return {
      method: 'Playwright',
      browser: 'WebKit',
      success: title.includes('Grok'),
      duration: Date.now() - startTime,
      messagesCount: messages
    };
    
  } catch (error: any) {
    return {
      method: 'Playwright',
      browser: 'WebKit',
      success: false,
      duration: Date.now() - startTime,
      messagesCount: 0,
      error: error.message
    };
  }
}

/**
 * Execução principal
 */
async function main() {
  console.log('═'.repeat(60));
  console.log('🧪 TESTE COMPARATIVO - Multi-Browser Grok Scraping');
  console.log('═'.repeat(60));
  console.log(`📊 URL: ${TEST_URL}`);
  console.log(`⏱️  Timeout: ${TIMEOUT}ms`);
  
  const results: TestResult[] = [];
  
  // Testes sequenciais (evitar sobrecarga)
  results.push(await testPuppeteerStealth());
  results.push(await testPlaywrightChromium());
  results.push(await testPlaywrightFirefox());
  results.push(await testPlaywrightWebkit());
  
  // Relatório final
  console.log('\n═'.repeat(60));
  console.log('📊 RELATÓRIO FINAL');
  console.log('═'.repeat(60));
  
  console.table(results.map(r => ({
    'Método': r.method,
    'Browser': r.browser,
    'Status': r.success ? '✅ PASS' : '❌ FAIL',
    'Duração (s)': (r.duration / 1000).toFixed(2),
    'Mensagens': r.messagesCount,
    'Erro': r.error || '-'
  })));
  
  // Recomendação
  const winner = results.filter(r => r.success).sort((a, b) => a.duration - b.duration)[0];
  
  if (winner) {
    console.log(`\n🏆 VENCEDOR: ${winner.method} (${winner.browser})`);
    console.log(`   ⚡ Mais rápido: ${(winner.duration / 1000).toFixed(2)}s`);
    console.log(`   📊 Mensagens capturadas: ${winner.messagesCount}`);
  } else {
    console.log('\n❌ Nenhum método funcionou com sucesso!');
  }
  
  // Salvar resultados
  await Bun.write(
    'test-browser-comparison.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\n💾 Resultados salvos em: test-browser-comparison.json');
}

main().catch(console.error);
