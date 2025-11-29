# 🕷️ Metodologia Scrape: Agent-First Data Extraction Framework

> **Versão:** 5.3 (Stealth Edition)
> **Autor:** Deivison Santana (@deivisan)
> **Status:** 🟢 Production Ready (Termux/Android Compatible)

Este repositório não é apenas um web scraper; é uma **Interface de Inteligência** que transforma o caos da web (HTML não estruturado, SPAs, Chats de IA) em dados estruturados prontos para consumo por Agentes de IA e automação.

---

## 🧠 O Conceito "Agent-First"

A maioria dos scrapers foca em baixar HTML. Este framework foca em **Entender o Contexto**.

1.  **Estrutura Hierárquica:** Não extraímos apenas texto; identificamos *Quem* falou (Falante), *Quando* (Timestamp) e *Como* (Bloco de Código vs Texto).
2.  **Detecção de Intenção:** O script analisa o conteúdo para identificar:
    *   🛠️ **Comandos de Terminal** sugeridos.
    *   📂 **Ações de Arquivo** (Criar/Editar).
    *   🌐 **Pesquisas Web** implícitas.
    *   ✅ **Validação Humana** (O usuário aceitou ou rejeitou a resposta?).
3.  **Resiliência:** Projetado para rodar em ambientes hostis (como celulares Android via Termux) e evadir proteções modernas (Cloudflare).

---

## 🛠️ Tecnologias & Arquitetura

*   **Engine:** `Puppeteer-Extra` com `Stealth Plugin` (Evasão de Bot Detection).
*   **Ambiente:** Otimizado para **Termux/Android** (usa Chromium nativo via `pkg install chromium`).
*   **Output:** Gera simultaneamente:
    *   📄 **Markdown:** Legível para humanos e LLMs.
    *   JSON **JSON:** Estruturado para automação e ingestão por APIs.

---

## 🚀 Como Usar (Termux/Linux)

### 1. Instalação

```bash
# 1. Instalar dependências de sistema (Termux)
pkg install chromium nodejs git

# 2. Clonar e instalar pacotes Node
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape
npm install
```

### 2. Execução

Para capturar uma conversa pública (ex: Grok, ChatGPT) ou qualquer site:

```bash
node scrape.js "https://grok.com/share/seu-link-aqui"
```

### 3. Resultado

Os arquivos serão salvos em `captures/`:
*   `UUID.json`: Contém a árvore de objetos, metadados e análise de intenções.
*   `UUID.md`: O relatório formatado.

---

## 🔮 Heurísticas Avançadas (v5.3)

O script `scrape.js` possui algoritmos específicos para lidar com chats de IA onde os metadados são escassos:

*   **Detecção de Falante:** Usa padrões de linguagem natural ("Eu sou Grok", "Crie um código") e alternância de turnos para identificar se o texto pertence ao **Usuário** ou à **IA**, mesmo sem seletores CSS claros.
*   **Extração de Código:** Identifica blocos de código (` ``` `) e preserva a linguagem para syntax highlighting.
*   **Evasão Cloudflare:** Detecta challenges e aguarda resolução automática ou manual.

---

## 📂 Estrutura do Repositório

*   `scrape.js`: O cérebro da operação. Script Node.js robusto.
*   `Metodologia-Scrape.md`: O manifesto teórico.
*   `captures/`: Diretório de saída (ignorado no git, mas útil para testes locais).

---

> *"Dados são o novo petróleo, mas dados estruturados são a gasolina refinada que move os Agentes."*