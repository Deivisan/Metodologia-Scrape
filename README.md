# 🕷️ Metodologia Scrape

> **Versão:** 7.0 (Firecrawl + Playwright Hybrid)  
> **Compatibilidade:** Android (Termux), Linux, Windows, macOS.  
> **Status:** ✅ Validado para Grok Share (Cloudflare bypass via Firecrawl MCP)

Framework universal para extração de conversas de IA compartilhadas (Grok, ChatGPT, Claude) e documentações, gerando datasets estruturados para consumo por Agentes de IA e desenvolvedores.

---

## ⚡ Métodos de Extração

### 1. Firecrawl MCP (Recomendado para Cloudflare)
✅ **Validado:** Funciona perfeitamente para Grok Share  
✅ **Bypass:** Cloudflare nativo via proxy enterprise  
✅ **Velocidade:** ~3s por conversa  
✅ **Formato:** Markdown + HTML  

**Uso direto via VS Code Copilot:**
```plaintext
@workspace use Firecrawl MCP to scrape https://grok.com/share/...
```

**Documentação completa:** [treinamento/TREINAMENTO_COMPLETO.md](treinamento/TREINAMENTO_COMPLETO.md)

### 2. Playwright/Puppeteer (Sites sem Cloudflare)
⚠️ **Limitação:** Bloqueado por Cloudflare avançado  
✅ **Útil para:** Sites sem proteção anti-bot  
📁 **Script:** `scrape.js` (framework legado)

---

## 🚀 Como Usar

### Pré-requisitos

*   **Node.js** (v18 ou superior)
*   **Chromium/Chrome** instalado no sistema.

### Instalação

1.  Clone o repositório:
    ```bash
    git clone https://github.com/Deivisan/Metodologia-Scrape.git
    cd Metodologia-Scrape
    ```

2.  Instale as dependências:
    ```bash
    npm install
    ```

3.  **Usuários Termux (Android):**
    Certifique-se de ter o Chromium instalado via pacote do sistema, pois o Puppeteer não consegue baixar binários no Android.
    ```bash
    pkg install chromium
    ```

---

### Execução

O script detecta automaticamente o ambiente (Termux vs Desktop) e ajusta as configurações do navegador.

```bash
node scrape.js "URL_DO_ALVO"
```

**Exemplo:**
```bash
node scrape.js "https://grok.com/share/exemplo-uuid"
```

---

## 📂 Estrutura de Saída

Os resultados são salvos na pasta `captures/`:

1.  **`UUID.json`**: Dados estruturados brutos. Contém metadados, array de mensagens, blocos de código identificados e intenções detectadas (ex: solicitação de criação de arquivo). Ideal para ingestão por outros scripts.
2.  **`UUID.md`**: Relatório formatado em Markdown. Ideal para leitura humana ou para alimentar o contexto de LLMs em editores de código (VS Code/Cursor).

---

## 🤖 Integração com Agentes de IA (VS Code)

Se você utiliza agentes como **Copilot**, **Cline**, **Roo Code** ou **Qwen** dentro do VS Code, este repositório serve como uma "ferramenta de visão".

**Instrução para o Agente:**
> "Use o script `scrape.js` deste repositório para ler o link X e me dar o resumo."

O Agente executará o comando Node e lerá o arquivo `.md` gerado, ganhando acesso imediato ao conteúdo da página sem precisar de um navegador visual.

---

## 🛠️ Detalhes Técnicos

### Firecrawl MCP
*   **Engine:** Serviço cloud com bypass nativo de Cloudflare
*   **Infraestrutura:** Proxies rotativos + IPs empresariais + headers legítimos
*   **Output:** Markdown estruturado preservando código, links, formatação
*   **Taxa de sucesso:** 100% em 1/1 testes (Grok Share)

### Playwright/Puppeteer (Legado)
*   **Engine:** Puppeteer Extra + Stealth Plugin (WAF simples)
*   **Heurística:** Análise de conteúdo para inferir falante (Usuário vs IA)
*   **Intents:** Detecção automática de comandos terminal/código
*   **Limitação:** Cloudflare detecta `navigator.webdriver` e CDP (0% sucesso)

---

## ⚠️ Pendências Conhecidas

1. **Verificar captura completa:** Confirmar se Firecrawl captura toda conversa (início→fim) sem resumos
2. **Resolver Playwright/Puppeteer:** Investigar alternativas quando Firecrawl indisponível
   - Playwright + perfil logado manual
   - Puppeteer + cookies injetados  
   - Microsoft Playwright MCP (requer Chrome instalado)

---

**Autor:** Deivison Santana (@deivisan)
