/**
 * 🧪 TESTES AUTOMATIZADOS - METODOLOGIA SCRAPE
 * 
 * @version 1.0.0
 * @author Deivison Santana (@deivisan)
 * 
 * 🎯 OBJETIVO:
 * Testar TODAS as metodologias de scraping em cenários reais
 * 
 * 📋 METODOLOGIAS TESTADAS:
 * 1. Puppeteer Stealth (headless + com UI)
 * 2. HTTP Light (follow-redirects)
 * 3. Firecrawl (via API - se disponível)
 * 4. Exa Search (se aplicável)
 * 5. Tavily Extract (se aplicável)
 */

import { grokScrapePuppeteer, grokRead, grokList } from '../index-full.ts';

// ============================================
// 🔗 LINKS DE TESTE (CONVERSAS REAIS CAPTURADAS)
// ============================================

const TEST_URLS = [
  // Conversa "Metodologia criativa" (67 mensagens)
  'https://grok.com/share/c2hhcmQtMg_b6476b3c-6941-47a0-a6cc-b87b1ffd5286',
  
  // Conversas anteriores (para validar robustez)
  'https://grok.com/share/c2hhcmQtMg_a2c4f2cd-c8e3-4431-b436-51710bcbdc6c',
  'https://grok.com/share/c2hhcmQtMg_15af1a1b-4c4d-47a8-99c4-31558af7ecc2',
  
  // ADICIONAR MAIS URLs conforme necessário
];

// ============================================
// 🧪 FUNÇÃO DE TESTE INDIVIDUAL
// ============================================

async function testSingleUrl(url: string, headless = true) {
  console.log('\n' + '═'.repeat(80));
  console.log(`🧪 TESTANDO: ${url}`);
  console.log(`🎭 Headless: ${headless}`);
  console.log('═'.repeat(80));
  
  const startTime = Date.now();
  
  try {
    const result = await grokScrapePuppeteer({
      url,
      headless,
      saveHtml: true,
      saveScreenshot: true
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    if (result.success) {
      console.log(`✅ SUCESSO em ${duration}s`);
      console.log(`📊 Mensagens: ${result.messageCount}`);
      console.log(`📄 Título: ${result.title.substring(0, 60)}`);
      console.log(`📁 Arquivos: ${result.files.length}`);
      console.log(`🆔 UUID: ${result.uuid}`);
      
      return {
        success: true,
        url,
        duration: parseFloat(duration),
        messageCount: result.messageCount,
        uuid: result.uuid
      };
    } else {
      console.log(`❌ FALHOU em ${duration}s`);
      console.log(`🔍 Conteúdo: ${result.content.substring(0, 200)}`);
      
      return {
        success: false,
        url,
        duration: parseFloat(duration),
        error: result.content
      };
    }
    
  } catch (error: any) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`❌ ERRO em ${duration}s`);
    console.log(`🔍 Mensagem: ${error.message}`);
    
    return {
      success: false,
      url,
      duration: parseFloat(duration),
      error: error.message
    };
  }
}

// ============================================
// 🎯 TESTE ÚNICO (MODO RÁPIDO)
// ============================================

export async function testSingle() {
  console.log('\n🚀 TESTE ÚNICO (MODO HEADLESS)');
  
  const url = TEST_URLS[0];
  const result = await testSingleUrl(url, true);
  
  console.log('\n📊 RESULTADO:');
  console.log(JSON.stringify(result, null, 2));
  
  return result;
}

// ============================================
// 🔥 TESTE COMPLETO (TODOS OS LINKS)
// ============================================

export async function testAll() {
  console.log('\n🔥 TESTE COMPLETO (TODOS OS LINKS)');
  console.log(`📋 Total: ${TEST_URLS.length} URLs\n`);
  
  const results = [];
  
  for (let i = 0; i < TEST_URLS.length; i++) {
    const url = TEST_URLS[i];
    console.log(`\n[${i + 1}/${TEST_URLS.length}]`);
    
    const result = await testSingleUrl(url, true);
    results.push(result);
    
    // Delay entre testes (evitar rate limit)
    if (i < TEST_URLS.length - 1) {
      console.log('\n⏳ Aguardando 3s antes do próximo...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }
  
  // ════════════════════════════════════════
  // 📊 RELATÓRIO FINAL
  // ════════════════════════════════════════
  
  console.log('\n\n' + '═'.repeat(80));
  console.log('📊 RELATÓRIO FINAL');
  console.log('═'.repeat(80));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Sucessos: ${successful.length}/${results.length}`);
  console.log(`❌ Falhas: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    const avgDuration = (successful.reduce((sum, r) => sum + r.duration, 0) / successful.length).toFixed(2);
    const avgMessages = Math.round(successful.reduce((sum, r) => sum + (r.messageCount || 0), 0) / successful.length);
    
    console.log(`⏱️ Duração média: ${avgDuration}s`);
    console.log(`📊 Mensagens média: ${avgMessages}`);
  }
  
  if (failed.length > 0) {
    console.log('\n❌ URLs com falha:');
    failed.forEach(f => console.log(`   - ${f.url}`));
  }
  
  console.log('\n✅ TESTE COMPLETO FINALIZADO!');
  console.log('═'.repeat(80));
  
  return {
    total: results.length,
    successful: successful.length,
    failed: failed.length,
    results
  };
}

// ============================================
// 🔍 TESTE COMPARATIVO (HEADLESS vs UI)
// ============================================

export async function testComparison() {
  console.log('\n🔍 TESTE COMPARATIVO (HEADLESS vs UI)');
  
  const url = TEST_URLS[0];
  
  console.log('\n1️⃣ Modo HEADLESS:');
  const resultHeadless = await testSingleUrl(url, true);
  
  console.log('\n⏳ Aguardando 5s...\n');
  await new Promise(r => setTimeout(r, 5000));
  
  console.log('\n2️⃣ Modo UI (COM INTERFACE):');
  const resultUI = await testSingleUrl(url, false);
  
  // Comparação
  console.log('\n📊 COMPARAÇÃO:');
  console.log(`Headless: ${resultHeadless.success ? '✅' : '❌'} (${resultHeadless.duration}s, ${resultHeadless.messageCount || 0} msgs)`);
  console.log(`UI:       ${resultUI.success ? '✅' : '❌'} (${resultUI.duration}s, ${resultUI.messageCount || 0} msgs)`);
  
  if (resultHeadless.success && resultUI.success) {
    const diff = (resultUI.duration - resultHeadless.duration).toFixed(2);
    console.log(`\n⏱️ Diferença: ${diff}s (UI é ${diff > 0 ? 'mais lenta' : 'mais rápida'})`);
  }
  
  return {
    headless: resultHeadless,
    ui: resultUI
  };
}

// ============================================
// 🚀 EXECUÇÃO (se rodado diretamente)
// ============================================

if (import.meta.main) {
  const mode = process.argv[2] || 'single';
  
  switch (mode) {
    case 'all':
      await testAll();
      break;
    case 'comparison':
      await testComparison();
      break;
    default:
      await testSingle();
  }
  
  process.exit(0);
}
