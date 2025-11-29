# 🕷️ Metodologia Scrape - Framework de Captação Inteligente

> **Status:** v3.0 Universal (Refatorado pelo Gemini)
> **Foco:** Estruturação de Dados Não-Estruturados, Contexto Conversacional e Resiliência

---

## 🎯 Visão Geral

Este repositório contém uma metodologia robusta e scripts reutilizáveis para **Web Scraping Inteligente**, com foco especial na captação de conversas complexas de IA (como Grok, ChatGPT) e transformação em dados estruturados (Markdown/JSON).

A filosofia aqui não é apenas "baixar o HTML", mas sim **entender o contexto**.

### 🧩 Pilares da Metodologia

1.  **Estrutura Hierárquica:** Identificação clara de falantes, timestamps e metadados.
2.  **Análise Contextual:** O script não apenas extrai texto, ele *analisa* se houve confirmação, correção ou erro na interação.
3.  **Resiliência:** Lógica de scroll infinito, timeouts adaptativos e seletores múltiplos (fallback).
4.  **Universalidade:** O código é modular, permitindo adaptar a lógica de extração (`extractConversation`) para qualquer site (ex: documentação, blogs, chats).

---

## 🛠️ Ferramentas Utilizadas

*   **Node.js (v20+):** Runtime JavaScript rápido e moderno.
*   **Playwright:** Biblioteca de automação de navegador (mais confiável que Puppeteer para sites modernos/SPA).
*   **Chromium Headless:** Navegador leve para execução em servidores/CLI.
*   **FS/Path:** Manipulação nativa de arquivos para organização automática.

---

## 🚀 Como Usar

### 1. Instalação

Clone este repositório e instale as dependências:

```bash
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape
npm install playwright
npx playwright install chromium
```

### 2. Execução Básica

Para capturar uma conversa pública (ex: Grok Share) e gerar um relatório Markdown + JSON:

```bash
node scrape.js "https://grok.com/share/seu-link-aqui"
```

### 3. Output

O script criará automaticamente uma pasta `../Transcricoes` contendo:
*   `UUID.json`: Dados brutos e estruturados para análise de máquina.
*   `UUID.md`: Relatório legível para humanos, formatado como um chat.

---

## 🧠 A Lógica por Trás do Script

O arquivo `scrape.js` opera em 4 fases distintas:

### Fase 1: Navegação e Scroll (O "Crawler")
Sites modernos (SPAs) carregam conteúdo dinamicamente. O script implementa um `autoScroll` inteligente que:
*   Desce a página gradualmente.
*   Verifica se a altura da página mudou.
*   Para automaticamente quando atinge o fim ou um limite de segurança.

### Fase 2: Extração (O "Parser")
Em vez de confiar em um único seletor CSS (que pode quebrar amanhã), usamos uma estratégia de **Múltiplos Seletores**:
```javascript
const selectors = [
  '[role="article"]',       // Padrão semântico (Melhor)
  '[data-testid*="message"]', // Padrão de teste (Robusto)
  '.message',               // Padrão de classe (Genérico)
];
```
Se todos falharem, ele cai para um modo "Raw" (texto bruto) para garantir que *algo* seja salvo.

### Fase 3: Análise de Contexto (A "IA Simbólica")
Uma função `analyzeContext` varre as mensagens extraídas buscando padrões linguísticos:
*   **Confirmações:** "Entendeu?", "Certo".
*   **Correções:** "Não é isso", "Na verdade".
*   **Sentimentos:** Palavras-chave que indicam frustração ou sucesso.

### Fase 4: Geração de Relatório (O "Reporter")
Transforma os dados em um Markdown bonito, com emojis para diferenciar usuários, citações e metadados no topo.

---

## 🔮 Casos de Uso e Adaptação

Este script foi desenhado inicialmente para **Transcrições do Grok**, mas a estrutura `extractConversation(page)` pode ser substituída para captar:

*   **Documentação Técnica:** Extrair `h1`, `h2`, `code` de sites de docs.
*   **Notícias:** Extrair `article`, `author`, `date`.
*   **Comentários:** Extrair threads de discussões em fóruns.

Basta alterar a lógica dentro de `page.evaluate()` na função de extração.

---

## ⚖️ Considerações Éticas

*   **Rate Limiting:** O script possui delays (`SCROLL_DELAY`) para não sobrecarregar o servidor alvo.
*   **Dados Públicos:** Use apenas em URLs públicas ou conteúdo que você tem direito de acessar.
*   **User-Agent:** O script se identifica como um navegador Linux padrão para evitar bloqueios simples, mas respeite o `robots.txt`.

---

*Desenvolvido por Deivison Santana (@deivisan) - Potencializado por Gemini*