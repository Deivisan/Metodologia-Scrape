# 🕷️ Metodologia Scrape

> **Versão:** 6.0 (Universal)
> **Compatibilidade:** Android (Termux), Linux, Windows, macOS.

Uma ferramenta CLI robusta para extrair, estruturar e analisar conversas de interfaces web (como Grok, ChatGPT) e documentações, gerando datasets limpos para consumo por Agentes de IA e desenvolvedores.

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

*   **Engine:** Puppeteer Extra + Stealth Plugin (para evitar bloqueios simples de WAF).
*   **Heurística:** O script não depende apenas de seletores CSS fixos. Ele analisa o conteúdo do texto para inferir quem está falando (Usuário vs IA), garantindo coerência mesmo se o layout do site mudar.
*   **Intents:** O parser identifica automaticamente quando um comando de terminal ou código é fornecido, marcando-o no JSON para fácil extração.

---

**Autor:** Deivison Santana (@deivisan)
