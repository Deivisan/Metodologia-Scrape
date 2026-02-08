#!/usr/bin/env bun

const url = process.argv[2];

if (!url) {
  console.error('❌ URL não fornecida.\n👉 Uso: bun scrape-simple.js <URL>');
  process.exit(1);
}

console.log(`🚀 Iniciando scrape simples com Bun`);
console.log(`🎯 Alvo: ${url}`);

try {
  const response = await fetch(url);
  const html = await response.text();
  console.log(`📄 HTML length: ${html.length}`);

  // Salvar em arquivo
  const fs = require('fs');
  const path = require('path');
  const outputDir = path.resolve(process.cwd(), 'captures');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const uuid = `capture_${Date.now()}`;
  const htmlPath = path.join(outputDir, `${uuid}.html`);
  fs.writeFileSync(htmlPath, html);
  console.log(`✅ HTML salvo em: ${htmlPath}`);

  // Extrair título
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1] : 'Sem título';
  console.log(`📝 Título: ${title}`);

  // Extrair dados de WIZ_global_data (dados estruturados do Google)
  let wizData = null;
  const wizMatch = html.match(/window\.WIZ_global_data\s*=\s*({[\s\S]*?});/);
  if (wizMatch) {
    try {
      wizData = JSON.parse(wizMatch[1]);
      console.log('✅ Dados WIZ_global_data extraídos');
    } catch (e) {
      console.log('⚠️ Erro ao parsear WIZ_global_data:', e.message);
    }
  }

  // Procurar por dados da conversa em wizData
  let conversation = [];
  if (wizData) {
    // Procurar por chaves relacionadas a conversa
    const keys = Object.keys(wizData);
    for (const key of keys) {
      const value = wizData[key];
      if (typeof value === 'string' && (value.includes('Anúncio') || value.includes('HDs'))) {
        conversation.push({ key, value: value.substring(0, 500) });
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'string' && (item.includes('Anúncio') || item.includes('HDs'))) {
            conversation.push({ key, item: item.substring(0, 500) });
          }
        });
      }
    }
  }

  // Extrair texto usando regex e parsing simples como fallback
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const bodyText = bodyHtml.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  console.log(`📝 Texto do body (primeiros 500 chars): ${bodyText.substring(0, 500)}`);

  // Procurar por texto relevante da conversa
  let extracted = [];
  const sentences = bodyText.split(/[.!?]+/);
  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.includes('Anúncio') || trimmed.includes('HDs') || trimmed.includes('venda') || 
        trimmed.includes('conversa') || trimmed.includes('Gemini')) {
      extracted.push(trimmed);
    }
  }

  if (conversation.length > 0) {
    console.log('🔍 Conversa extraída de WIZ_global_data:');
    conversation.forEach((item, i) => console.log(`${i+1}. ${JSON.stringify(item)}`));
  }

  if (extracted.length > 0) {
    console.log('🔍 Conteúdo extraído do HTML:');
    extracted.forEach((txt, i) => console.log(`${i+1}. ${txt.substring(0, 200)}...`));
  } else {
    console.log('⚠️ Nenhum conteúdo específico encontrado.');
  }

  // Salvar dados extraídos
  const jsonPath = path.join(outputDir, `${uuid}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify({
    title,
    wizData: wizData ? Object.keys(wizData) : null,
    conversation,
    extracted,
    bodySnippet: bodyText.substring(0, 1000)
  }, null, 2));
  console.log(`✅ Dados salvos em: ${jsonPath}`);

} catch (error) {
  console.error('❌ Erro:', error.message);
}