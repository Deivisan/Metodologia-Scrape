#!/usr/bin/env bun
/**
 * Teste standalone do Grok Scraper MCP
 * Simula as funções sem precisar do servidor MCP rodando
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const CAPTURES_DIR = join(dirname(fileURLToPath(import.meta.url)), 'captures');

// Simula grok_list
function testList() {
  console.log('🧪 Testando grok_list...\n');
  
  const files = readdirSync(CAPTURES_DIR).filter(f => f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log('❌ Nenhuma captura encontrada');
    return;
  }
  
  console.log(`✅ ${files.length} captura(s) encontrada(s):\n`);
  
  files.forEach(file => {
    const content = JSON.parse(readFileSync(join(CAPTURES_DIR, file), 'utf-8'));
    console.log(`📄 ${file}`);
    console.log(`   UUID: ${content.uuid || 'N/A'}`);
    console.log(`   URL: ${content.url || 'N/A'}`);
    console.log(`   Título: ${content.title || 'N/A'}`);
    console.log(`   Mensagens: ${content.messageCount || content.messages?.length || 0}`);
    console.log(`   Data: ${content.capturedAt || 'N/A'}`);
    console.log('');
  });
}

// Simula grok_read
function testRead(uuid: string) {
  console.log(`🧪 Testando grok_read (UUID: ${uuid})...\n`);
  
  const files = readdirSync(CAPTURES_DIR).filter(f => f.includes(uuid) && f.endsWith('.json'));
  
  if (files.length === 0) {
    console.log(`❌ Captura com UUID ${uuid} não encontrada`);
    return;
  }
  
  const content = JSON.parse(readFileSync(join(CAPTURES_DIR, files[0]), 'utf-8'));
  
  console.log('✅ Captura encontrada:\n');
  console.log(`📄 Arquivo: ${files[0]}`);
  console.log(`🔗 URL: ${content.url}`);
  console.log(`📝 Título: ${content.title}`);
  console.log(`💬 Total de mensagens: ${content.messageCount || content.messages?.length || 0}`);
  console.log(`📅 Capturada em: ${content.capturedAt}\n`);
  
  if (content.messages && content.messages.length > 0) {
    console.log('📬 Primeiras 3 mensagens:\n');
    content.messages.slice(0, 3).forEach((msg: any, idx: number) => {
      console.log(`[${idx}] ${msg.text?.substring(0, 100)}${msg.text?.length > 100 ? '...' : ''}`);
    });
  }
}

// Simula grok_context
function testContext() {
  console.log('🧪 Testando grok_context...\n');
  
  const files = readdirSync(CAPTURES_DIR)
    .filter(f => f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (files.length === 0) {
    console.log('❌ Nenhuma captura encontrada');
    return;
  }
  
  const lastFile = files[0];
  const content = JSON.parse(readFileSync(join(CAPTURES_DIR, lastFile), 'utf-8'));
  
  console.log('✅ Última captura:\n');
  console.log(`📄 Arquivo: ${lastFile}`);
  console.log(`🔗 URL: ${content.url}`);
  console.log(`📝 Título: ${content.title}`);
  console.log(`💬 Total: ${content.messageCount || content.messages?.length || 0} mensagens`);
  console.log(`📅 Data: ${content.capturedAt}\n`);
  
  // Estatísticas
  if (content.messages) {
    const userMessages = content.messages.filter((_: any, idx: number) => idx % 2 === 0);
    const aiMessages = content.messages.filter((_: any, idx: number) => idx % 2 !== 0);
    
    console.log('📊 Estatísticas:');
    console.log(`   Usuário: ${userMessages.length} mensagens`);
    console.log(`   Grok: ${aiMessages.length} mensagens`);
    
    const avgUserLength = userMessages.reduce((acc: number, m: any) => acc + (m.text?.length || 0), 0) / userMessages.length;
    const avgAiLength = aiMessages.reduce((acc: number, m: any) => acc + (m.text?.length || 0), 0) / aiMessages.length;
    
    console.log(`   Média chars/msg (usuário): ${Math.round(avgUserLength)}`);
    console.log(`   Média chars/msg (Grok): ${Math.round(avgAiLength)}`);
  }
}

// Main
console.log('╔═══════════════════════════════════════════════╗');
console.log('║   🎯 TESTE STANDALONE - GROK SCRAPER MCP     ║');
console.log('╚═══════════════════════════════════════════════╝\n');

// Teste 1: Listar
testList();

console.log('\n' + '─'.repeat(50) + '\n');

// Teste 2: Ler primeira captura
const files = readdirSync(CAPTURES_DIR).filter(f => f.endsWith('.json'));
if (files.length > 0) {
  const firstUuid = files[0].replace('.json', '');
  testRead(firstUuid.split('_').slice(-1)[0] || firstUuid);
}

console.log('\n' + '─'.repeat(50) + '\n');

// Teste 3: Contexto
testContext();

console.log('\n' + '═'.repeat(50));
console.log('✅ TODOS OS TESTES CONCLUÍDOS!');
console.log('═'.repeat(50) + '\n');
