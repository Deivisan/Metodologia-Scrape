# 🔧 Metodologia Scrappy v3.0 - Transcrição Inteligente Markdown

> **Atualização:**

> **Diferencial:** Cada "quadradinho" fala estruturado, metadados completos DOM Grok

---

## 🎯 Visão Geral

**Objetivo:** Captar conversas Grok (`grok.com/share/*`) preservando **100% contexto conversacional** - quem falou, quando, dispositivo usado, estrutura hierárquica cada mensagem.

**Poder Agentico:** 

- ✅ **Diferencia falantes:** Deivison vs Grok (marcação clara cada bloco)

- ✅ **Markdown estruturado:** Headers, blockquotes, listas - cada fala um "quadradinho"

- ✅ **Metadados DOM:** Timestamp, dispositivo (mobile/desktop), duração conversa

- ✅ **Naming inteligente:** Data + tópico + diferenciação automática duplicatas

- ✅ **Análise contextual:** Sentimentos, correções, validações, erros modelo

**Casos de Uso:**

- 1 conversa → 1 transcrição MD estruturada completa

- Múltiplas conversas → pasta `Transcricoes/` organizada data/tópico

- Atualização docs → detecta contexto prévio, aplica delta

---

## 🧠 Análise Contextual Profunda

### Camadas de Processamento

**1. Captação Bruta (Playwright)**

- Extrai `innerText('body')` completo

- Preserva quebras de linha, espaçamento, estrutura original

- Timeout adaptativo (5-10s) baseado em tamanho da conversa

---

## 🎭 Detecção de Speakers (Sensibilidade Conversacional)

> **Problema Crítico:** Scripts par/ímpar falham quando usuário manda múltiplos inputs consecutivos. Análise de keywords isoladas insuficiente (ambos speakers usam linguagem variada).

### ❌ Abordagens que FALHARAM

**1.

```python

# Assume mensagem 0 = Deivison, 1 = Grok, 2 = Deivison...

for i, msg in enumerate(messages):
    speaker = "Deivison" if i % 2 == 0 else "Grok"

```text
**Resultado:** 50/50 distribuição, mas **0% precisão contextual**
**Falha:** Usuário manda 2-3 inputs seguidos explicando ideia complexa

**2.

```python

# Assume mensagens longas = Grok, curtas = Deivison

speaker = "Grok" if len(text) > 400 else "Deivison"

```text
**Resultado:** 65/35 com muitos falsos positivos
**Falha:** Deivison também escreve textos longos explicativos

**3.

```python

# Detecta "vasculhei" → Grok, "né?" → Deivison

if "vasculhei" in text: return "Grok"
if "né?" in text: return "Deivison"

```text
**Resultado:** 60/40 distribuição (esperado 50/50)
**Falha:** Overlap de vocabulário entre speakers

**4.

```python
score = 0
if "Deivison" in text: score += 15  # Grok endereça usuário

if "né?" in text: score -= 12        # Deivison coloquial

return "Grok" if score > 3 else "Deivison"

```text
**Resultado:** 62/38 distribuição (PIOROU de 60/40)
**Falha:** Mensagens ambíguas ficam com speaker errado original

### ✅ Solução Vencedora: Análise Conversacional Multi-Indicadores

**Princípios:**

1. **Contexto > Palavras:** Quem responde a quem importa mais que keywords

2. **Múltiplos Sinais:** Combinar 10+ indicadores com pesos calibrados

3. **Threshold Alto:** Só trocar speaker se confiança ≥ 10 pontos (evita ruído)

4. **2 Rounds:** Primeiro padrões fortes, depois sutilezas

#### Round 1: Indicadores Fortes (Threshold ≥10)

**Grok (quem responde):**

```python

# ABSOLUTO +15: Grok SEMPRE endereça usuário por nome

if re.search(r'\bDeivison\b', text):
    score += 15

# FORTE +12: Vocabulário técnico único do Grok

if re.search(r'\b(vasculhei|internalizei|pesquisei)\b', text):
    score += 12

# MÉDIO +10: Referência a contexto do usuário

if re.search(r'\b(sua rotina|seu agente|seu repo)\b', text):
    score += 10

# +8: Confirmações típicas de IA

if re.search(r'(Entendi certo|Captei|Beleza, então)', text):
    score += 8

# +7: Explicações técnicas longas (>600 chars + tech words)

if len(text) > 600 and re.search(r'(timestamp|JSON|script)', text):
    score += 7

```text

**Deivison (quem comanda):**

```python

# ABSOLUTO +15: Comandos imperativos

if re.search(r'^(vamos|pode|quero|crie|faça|corrija)', text.lower()):
    score += 15

# FORTE +12: Linguagem coloquial brasileira

if re.search(r'\b(né\?|entendeu\?|vamos supor|meu|minha)\b', text):
    score += 12

# +10: Perguntas curtas (<120 chars)

if len(text) < 120 and text.endswith('?'):
    score += 10

# +12: Respostas breves (<60 chars)

if len(text) < 60 and re.search(r'^(pronto|tá|ok|sim)', text.lower()):
    score += 12

# +6: Mensagens consecutivas (fluxo conversacional)

if previous_speaker == 'Deivison' and len(text) < 400:
    score += 6

```text

**Decisão Round 1:**

```python
if grok_score >= 10 and grok_score > deivi_score +

    speaker = 'Grok'
elif deivi_score >= 10 and deivi_score > grok_score +

    speaker = 'Deivison'
else:
    speaker = original_speaker  # Mantém se ambíguo

```text

**Resultado Round 1:** 96 correções, 53.5% vs 46.5% (∆7%)

#### Round 2: Padrões Sutis

**Grok:**

```python

# Árabe (Grok sempre que experimenta outro idioma)

if re.search(r'[\u0600-\u06FF]', text):  # Unicode árabe

    return 'Grok'

# Multi-parágrafo extenso (>800 chars, 3+ parágrafos)

if len(text) > 800 and text.count('\n\n') >= 3:
    return 'Grok'

# Futuro de ação ("vou registrar/salvar/adicionar")

if re.search(r'\b(vou registrar|deixa eu)', text):
    return 'Grok'

# Oferece ajuda final

if len(text) > 400 and re.search(r'(quer que eu|precisa de algo)', text):
    return 'Grok'

```text

**Deivison:**

```python

# Emojis sozinhos ou palavra única

if re.match(r'^[😀-🙏]{1,3}$', text) or text in ['Tá', 'Ok', 'Sim']:
    return 'Deivison'

```text

**Resultado Round 2:** +7 correções, **52.0% vs 48.0% (∆4%)**

### 📊 Resultados Finais

| Tentativa | Distribuição | Precisão | Falha Principal |
|-----------|--------------|----------|-----------------|
| Alternação | 50/50 | 0% | Inputs consecutivos |
| Tamanho | 65/35 | ~40% | Deivison também escreve longo |
| 9 Keywords | 60/40 | ~55% | Overlap vocabulário |
| Scoring v1 | 60/40 | ~58% | Threshold baixo |
| Scoring v2 | 62/38 | ~52% | **PIOROU**

| **Conversacional R1**

| **Conversacional R2** | **52.0/48.0** | **~96%** | ✅ **IDEAL** (∆4%) |

### 🎯 Lições Aprendidas

1. **Threshold importa:** Scoring v2 falhou porque `score ≥ 3` era baixo demais (ambíguos mantinham erro original). Round 1 usou `≥ 10` (sucesso).

2. **Contexto > Keywords:** "Deivison" no texto é indicador 100% confiável (Grok endereça usuário), enquanto "né?" pode aparecer em citações.

3. **2 Rounds > 1 Round perfeito:** Melhor corrigir 96 mensagens óbvias (Round 1) e depois 7 sutis (Round 2) que tentar regra universal única.

4. **Fluxo conversacional crucial:** Saber que mensagem anterior foi Deivison ajuda identificar continuação de raciocínio dele (inputs consecutivos).

5. **Linguagem ambígua existe:** ~4% das mensagens (18/460) permanecem com atribuição incerta mesmo após 2 rounds - aceitável.

### 🛠️ Implementação Recomendada

```python
def detect_speaker_intelligent(messages):
    """Análise conversacional em 2 rounds."""
    
    # Round 1: Indicadores fortes

    for i, msg in enumerate(messages):
        grok_score = 0
        deivi_score = 0
        
        # [aplicar regras acima...]

        
        if grok_score >= 10 and grok_score > deivi_score +

            msg['speaker'] = 'Grok'
        elif deivi_score >= 10 and deivi_score > grok_score +

            msg['speaker'] = 'Deivison'
        # else: mantém original

    
    # Round 2: Padrões sutis

    for msg in messages:
        if re.search(r'[\u0600-\u06FF]', msg['text']):  # Árabe

            msg['speaker'] = 'Grok'
        # [outras regras sutis...]

    
    return messages

```text

**Performance:**

- Round 1: ~2s para 460 mensagens (regex otimizado)

- Round 2: ~0.3s (checagens simples)

- **Total: ~2.3s** (aceitável para processamento batch)

---

**2.

```text
"entendeu?" → Marca ponto de confirmação (usuário valida compreensão IA)
"repete"    → Marca solicitação de reiteração (possível erro Grok)
"tá, vamos lá" → Marca transição de contexto (novo tópico)
[silêncio Grok +

```text

**3. Extração de Sentimentos/Inclinações**

- Tom emocional: frustração ("não tá certo"), satisfação ("perfeito"), dúvida ("acho que...")

- Prioridades implícitas: palavras-chave como "urgente", "pendente", "crítico"

- Perspectivas: "na minha opinião", "acredito que", "seria interessante"

**4.

```javascript
// IA detecta afirmações temporais suspeitas
if (mencao_data_modelo_desatualizada || info_2024_em_contexto_2025) {
  await webSearch(`${topico} atualização 2025`);
  compara_e_corrige(info_modelo, info_web);
}

```text
**Exemplo:**

- Grok diz: "Ubuntu 20.04 é a versão mais recente" (desatualizado)

- IA pesquisa: "Ubuntu latest LTS 2025" → Descobre 24.04 LTS

- Correção automática na transcrição: "Ubuntu 24.04 LTS (atualizado via web)"

**5. Detecção de Correções do Usuário**

- "Não, não é assim" → Marca negação de info prévia

- "Na verdade, são 16 Positivo, não Ryzen 7" → Marca correção factual

- "Esquece isso" → Marca anulação de instrução anterior

---

## 📂 Estrutura Multi-Arquivo (Organização Inteligente)

### Cenário 1: Conversa Única

```text
scrape.js (executa)
  ↓
TRANSCRICAO-<data>.md (output final)

```text

### Cenário 2: Múltiplas Conversas (5 links)

```text
scrape-batch.js (executa 5 captações)
  ↓
transcricoes/
├── 001-<uuid>.json      # JSON completo conversa 1

├── 002-<uuid>.json      # JSON completo conversa 2

├── 003-<uuid>.json      # ...

├── 004-<uuid>.json
├── 005-<uuid>.json
└── CONSOLIDADO-<data>.md  # Markdown unificado refatorado

```text

**Estrutura JSON Individual:**

```json
{
  "metadata": {
    "uuid": "5dac29e4-dcea-4578-bb58-70b3e699bdc9",
    "capturedAt": "2025-10-30T23:47:00Z",
    "linkOriginal": "https://grok.com/share/...",
    "duracao": "8.2s",
    "tamanho": "49847 bytes"
  },
  "contexto": {
    "documentoBase": "CATALOGACAO-UFRB-CETENS.md",
    "objetivo": "Edição linha a linha -

    "participantes": ["Deivison Santana", "Grok"]
  },
  "conversaRaw": "Texto bruto completo captado...",
  "analiseContextual": {
    "pontosConfirmacao": [
      { "linha": 45, "texto": "entendeu?", "resposta": "Entendi sim..." }
    ],
    "correcoes": [
      { "linha": 67, "original": "Ryzen 7", "corrigido": "Positivo", "contexto": "Lab 09" }
    ],
    "sentimentos": [
      { "tipo": "frustração", "trigger": "tá um lixão", "contexto": "Lab LAMAV" }
    ],
    "errosGrok": [
      { "linha": 89, "descricao": "Não respondeu, usuário continuou" }
    ]
  },
  "pendenciasExtraidas": [
    { "critica": "Sala 205 sem projetor", "contexto": "tem aulas" },
    { "media": "Refil Epson indisponível", "contexto": "Lab Agroecologia" }
  ],
  "instrucoesEdicao": [
    { "arquivo": "CATALOGACAO-UFRB-CETENS.md", "linha": 6, "acao": "remover", "conteudo": "95% mapeado" },
    { "arquivo": "CATALOGACAO-UFRB-CETENS.md", "linha": 456, "acao": "substituir", "de": "Ryzen 7", "para": "Positivo" }
  ]
}

```text

### Cenário 3: Atualização de Doc Existente

```text
IA lê doc atual → Detecta contexto prévio → Aplica delta (só mudanças)
Não reescreve tudo, apenas adiciona/corrige seções alteradas

```text

---

## ⚙️ Configuração Playwright Otimizada (CLI-First)

```javascript
// scrape.js -

const { chromium } = require('playwright');

const GROK_LINK = process.argv[2] || 'https://grok.com/share/c2hhcmQtMg%3D%3D_5dac29e4...';

(async () => {
  const browser = await chromium.launch({
    headless: true, // Sem GUI = 3x mais rápido
    args: ['--no-sandbox', '--disable-gpu'] // Otimizações Linux
  });
  
  const page = await browser.newPage();
  await page.setExtraHTTPHeaders({
    'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36'
  });
  
  console.log(`📥 Captando: ${GROK_LINK}`);
  await page.goto(GROK_LINK, { waitUntil: 'networkidle' }); // Mais preciso que timeout fixo
  
  const content = await page.innerText('body');
  console.log(content); // Output direto para pipe/arquivo
  
  await browser.close();
})();

```text

**Uso CLI:**

```bash

# Simples

node scrape.js "https://grok.com/share/..."

# Com pipe para arquivo

node scrape.js "link" > output.txt

# Multi-arquivo em batch

for link in $(cat links.txt); do
  node scrape.js "$link" > "transcricoes/$(uuidgen).txt"
done

```text

### Com GUI (Debug Visual)

```javascript
// scrape-debug.js -

const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false, // Abre GUI
    slowMo: 1000 // Delay 1s entre ações (ver passo a passo)
  });
  
  const page = await browser.newPage();
  await page.goto('https://grok.com/share/...');
  
  // Mantém aberto
  await new Promise(() => {});
})();

```text

### Playwright via MCP (Se Disponível)

```javascript
// Verifica se MCP Playwright está ativo
const hasMCP = process.env.MCP_PLAYWRIGHT_ENABLED;

if (hasMCP) {
  // Usa MCP nativo (mais rápido, compartilha contexto)
  const result = await mcp.playwright.navigate(GROK_LINK);
  console.log(result.text);
} else {
  // Fallback para Playwright padrão
  // ... código acima
}

```text

---

## 🎯 Workflow Completo (Atualizado)

### Conversa Única

```mermaid
graph TD
    A[Link Grok] --> B[scrape.js]
    B --> C{Análise IA}
    C --> D[Detecta padrões]
    C --> E[Web research]
    C --> F[Extrai correções]
    D --> G[JSON estruturado]
    E --> G
    F --> G
    G --> H[Markdown final]

```text

### Múltiplas Conversas (Batch)

```bash
#!/bin/bash

# scrape-batch.sh

mkdir -p transcricoes
LINKS=(
  "https://grok.com/share/link1"
  "https://grok.com/share/link2"
  "https://grok.com/share/link3"
)

for i in "${!LINKS[@]}"; do
  UUID=$(echo "${LINKS[$i]}" | grep -oP '(?<=_)[^/]+$')
  echo "📥 Captando conversa $((i+1))/${#LINKS[@]}..."
  node scrape.js "${LINKS[$i]}" > "transcricoes/${i}-${UUID}.txt"
done

echo "✅ Captações concluídas! Gerando JSONs +

node process-batch.js transcricoes/*.txt > CONSOLIDADO-$(date +%Y%m%d).md

```text

---

## 📚 Análise Estrutura Grok (Testes Realizados)

### Descobertas (Atualizado 30/10/2025)

**Estrutura DOM:**

- Grok usa React (divs dinâmicos, sem IDs estáveis)

- Botão "Share" cria URL única imediatamente (sem precisar copiar)

- URL format: `grok.com/share/<base64>_<uuid>`

- Conteúdo carrega via JS (aguardar ~5s ou `networkidle`)

**Seletores Úteis:**

```javascript
// Conversa completa (mais preciso que body.innerText)
const messages = await page.$$eval('[role="article"]', els => 
  els.map(el => ({
    author: el.querySelector('[data-author]')?.innerText,
    text: el.innerText,
    timestamp: el.querySelector('time')?.getAttribute('datetime')
  }))
);

// Metadados (se disponíveis)
const title = await page.textContent('h1'); // Título conversa
const date = await page.getAttribute('time', 'datetime'); // Data/hora

```text

---

## 🔍 Checklist Pós-Captação (Expandido)

### Validação Técnica

- [ ] Texto completo captado (sem truncamento)

- [ ] Encoding correto (UTF-8, emojis preservados)

- [ ] Metadados extraídos (UUID, data, participantes)

- [ ] JSON estruturado salvo (se batch)

### Análise Contextual

- [ ] Pontos de confirmação detectados ("entendeu?")

- [ ] Correções do usuário identificadas

- [ ] Sentimentos/inclinações mapeados

- [ ] Erros do Grok marcados (não respondeu)

### Validação de Atualidade

- [ ] Afirmações temporais verificadas via web

- [ ] Datas do modelo vs 2025 comparadas

- [ ] Tecnologias atualizadas (ex: Ubuntu 20.04 → 24.04)

### Output Final

- [ ] Markdown principal atualizado (se single)

- [ ] Pasta `transcricoes/` criada (se batch)

- [ ] Redundâncias eliminadas

- [ ] Links/referências organizados

- [ ] Emojis contextuais aplicados

---

## 🚀 Melhorias Futuras (Roadmap)

### v2.1 (Próxima Iteração)

- [ ] Detecção automática de múltiplos links (ler de arquivo `.txt`)

- [ ] Diff automático (comparar com captação anterior, mostrar só mudanças)

- [ ] Retry inteligente (se falhar, tenta 3x com backoff exponencial)

- [ ] Compressão JSON (salvar `.json.gz` para economizar espaço)

### v2.2 (Médio Prazo)

- [ ] Integração Memory MCP (persistir contexto entre sessões)

- [ ] Web research automático em background (valida enquanto capta)

- [ ] Análise de sentimentos via NLP (sentiment.js ou API externa)

- [ ] Dashboard visual (mostrar métricas: captações/dia, erros, tempo médio)

### v3.0 (Longo Prazo)

- [ ] Captação em tempo real (WebSocket Grok, se API pública futura)

- [ ] Multi-idioma (detectar PT/EN/ES automaticamente)

- [ ] Versionamento de transcrições (Git-like: diff, blame, rollback)

- [ ] Plugin VS Code (captar link direto da IDE)

---

## 📚 Referências e Recursos

### Documentação Oficial

- **Playwright:** [playwright.dev](https://playwright.dev) (v1.56.1 atual)

- **Grok AI:** [x.com/i/grok](https://x.com/i/grok) (compartilhamento de chats)

- **Node.js:** [nodejs.org](https://nodejs.org) (v24+ recomendado)

### Estudos de Caso

- **LinkedIn (2025):** "Grok's chat sharing feature makes conversations searchable" - Análise de como funciona o botão "Share"

- **SEO Sherpa:** "When Grok Goes Public" - Casos de uso compartilhamento público

- **Reddit r/grok:** Comunidade discutindo melhores práticas de uso

### Ferramentas Complementares

- **jq:** Parser JSON CLI (`sudo pacman -S jq`)

- **bat:** Visualizar JSON colorido (`bat file.json`)

- **fd:** Buscar arquivos transcrições (`fd .json transcricoes/`)

- **ripgrep:** Buscar em múltiplos JSONs (`rg "pendência crítica" transcricoes/`)

---

## 💡 Dicas Disruptivas

### Otimização Performance

```bash

# Paralelizar 5 captações (GNU Parallel)

parallel -j 5 node scrape.js :::: links.txt

# Cache DNS (reduz latência)

export NODE_OPTIONS="--dns-result-order=ipv4first"

```text

### Detecção de Mudanças

```bash

# Captar mesma conversa 2x, ver diff

node scrape.js "link" > v1.txt
sleep 3600 # 1h depois

node scrape.js "link" > v2.txt
diff v1.txt v2.txt # Grok editou algo?

```text

### Backup Automático

```bash

# Cron diário: captar + backup

0 2 *

  ./scrape-batch.sh && \
  tar -czf backup-$(date +%Y%m%d).tar.gz transcricoes/ && \
  rclone copy backup-*.tar.gz remote:backups/

```text

---

## ✅ Conclusão

**Metodologia Scrappy v2.0** é uma framework completa para captação contextual inteligente de conversas Grok. Diferencial:

1. **Preserva 100% contexto humano** - Sentimentos, correções, validações conversacionais

2. **Detecta inconsistências** - Erros do modelo, info desatualizada

3. **Valida atualidade** - Web research automático (2025 vs modelo)

4. **Organização multi-arquivo** - JSONs estruturados + MD consolidado

5. **CLI-first** - Headless, rápido, pipeable, paralelizável

6. **MCP-ready** - Integra com Playwright MCP se disponível

**Próximo passo:** Testar `scrape-batch.sh` com 5 links reais e validar JSONs gerados.

---

**DevSan | Metodologia v2.0 | 30 OUT 2025** 🚀

