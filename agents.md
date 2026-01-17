# 🤖 AGENTS.MD - Metodologia-Scrape

> Contexto completo para agentes AGI trabalharem neste repositório

---

## 📊 INFORMAÇÕES DO PROJETO

### Identidade
- **Nome:** Metodologia-Scrape
- **Owner:** Deivison Santana (@deivisan)
- **Tipo:** Framework Opensource + Sistema JARVIS-like
- **Stack:** Bun, TypeScript, Puppeteer Stealth, MCPs
- **Status:** ⏳ Fase 2 (Sistema de Aliases) - 70% completo
- **GitHub:** https://github.com/Deivisan/Metodologia-Scrape

### Propósito
Criar sistema completo de **captura, processamento e orquestração** de conversas do Grok Share (X.com), culminando em assistente pessoal **JARVIS-like** com voz, aliases e multi-agentes.

---

## 🎯 MISSÃO CORE

### Objetivo Curto Prazo (Fase 2)
- ✅ Scraping robusto de conversas Grok (CONCLUÍDO)
- ⏳ Sistema de aliases (slash commands) - EM ANDAMENTO
- 📋 Implementação técnica dos aliases (API/MCP)

### Objetivo Longo Prazo (Fases 3-5)
1. **Integração Voz** - Transcrição bidirecional (Whisper + TTS)
2. **MCP Público** - Package npm opensource
3. **Orquestração** - Multi-agentes (DevSan, SAL, Gemini, Qwen)

### Visão Final
Assistente pessoal que **entende contexto**, **executa proativamente** e **aprende com o tempo**.

---

## 📁 ESTRUTURA DO REPOSITÓRIO

### Arquitetura Atual

```
Metodologia-Scrape/
├── packages/
│   └── mcp-grok-scraper/        # MCP funcional (v1.1)
│       ├── index.ts             # Servidor MCP
│       ├── scrape-grok.js       # Script Puppeteer Stealth
│       └── package.json
├── captures/                    # 25 conversas capturadas
│   ├── grok_*.json              # Metadata + mensagens
│   ├── grok_*.md                # Markdown legível
│   ├── grok_*.html              # HTML original
│   └── grok_*.png               # Screenshots
├── contexto/                    # 🔒 PRIVADO (local only)
│   └── README.md                # Explicação da pasta
├── PROMPT_MASTER_V3.md          # Sistema SAL completo (586 linhas)
├── ROADMAP.md                   # Fases do projeto (461 linhas)
├── AGENTS.md                    # Este arquivo (contexto agentes)
├── README.md                    # Documentação pública
├── .gitignore                   # Exclusões (contexto/, captures/*.png)
├── .gitattributes               # Normalização CRLF/LF
└── package.json                 # Bun project
```

### Convenções de Nomes

**Capturas:**
- `grok_<timestamp>.json` - Metadata + mensagens estruturadas
- `grok_<timestamp>.md` - Conversa em Markdown (human-readable)
- `grok_<timestamp>.html` - HTML original completo
- `grok_<timestamp>.png` - Screenshot da página

**Documentação:**
- `PROMPT_MASTER_V*.md` - Sistema de prompts (versão incremental)
- `ROADMAP.md` - Planejamento estratégico (5 fases)
- `AGENTS.md` - Contexto para agentes AGI
- `README.md` - Documentação pública do projeto

---

## 🔧 STACK TÉCNICA

### Runtime e Tools
- **Bun 1.3.5+** - NUNCA usar npm/node/yarn (purge completo)
- **TypeScript** - Tipagem estrita
- **Puppeteer Stealth** - Scraping anti-detecção
- **MCP Protocol** - Persistência de contexto

### Dependências Principais
```json
{
  "puppeteer": "^23.12.1",
  "puppeteer-extra": "^3.3.7",
  "puppeteer-extra-plugin-stealth": "^2.11.2",
  "@modelcontextprotocol/sdk": "^1.0.4"
}
```

### Ambiente de Desenvolvimento
- **Git:** Commits atômicos, conventional commits
- **GitHub:** @Deivisan/Metodologia-Scrape
- **OpenCode CLI:** Orquestração de agentes
- **Windows 11 Pro** (DEIVIPC) + **Arch Linux** (dual-boot)

---

## 🚀 COMANDOS PRINCIPAIS

### Bun Workflow
```bash
# Instalar dependências
bun install

# Rodar scraper
cd packages/mcp-grok-scraper
bun run scrape-grok.js

# Iniciar MCP server
bun run index.ts

# Testes (quando implementados)
bun test
```

### Git Workflow
```bash
# Status atual
git status

# Commit atômico (conventional commits)
git add .
git commit -m "feat: adicionar alias /metodologia-scrape"

# Sync com GitHub
git push origin main
```

### Navegação Rápida
```bash
# Ir para o projeto
cd C:\Projetos\Metodologia-Scrape  # Windows
cd /home/deivi/Projetos/Metodologia-Scrape  # Linux

# Ver capturas
ls captures/

# Ler prompt master
cat PROMPT_MASTER_V3.md
```

---

## 🤖 COMPORTAMENTO AGENTICO ESPERADO

### ✅ SEMPRE Fazer

1. **Ler Contexto Primeiro**
   - PROMPT_MASTER_V3.md (sistema SAL + aliases)
   - ROADMAP.md (fases e planejamento)
   - Este arquivo (AGENTS.md)

2. **Executar Sem Perguntar**
   - Se Deivison deu ordem clara: FAÇA
   - Não confirmar ações triviais
   - Auto-aprovação total

3. **Ser Direto**
   - Máximo 2-3 frases por resposta
   - Código > Explicação
   - Zero bajulação ou promessas impossíveis

4. **Manter Padrões**
   - Conventional commits (`feat:`, `fix:`, `docs:`)
   - TypeScript tipado
   - Bun only (NUNCA npm/node)

5. **Documentar Decisões**
   - Atualizar ROADMAP.md quando fase mudar
   - Commits atômicos descritivos
   - Comentários em código complexo apenas

### ❌ NUNCA Fazer

1. ❌ Perguntar "quer que eu faça X?" → **FAÇA X**
2. ❌ Sugerir npm/node/yarn → **BUN ONLY**
3. ❌ Criar arquivos desnecessários → **MINIMALISMO**
4. ❌ Explicar o óbvio → **DIRETO AO PONTO**
5. ❌ Romantizar tecnologia → **REALISMO BRUTAL**
6. ❌ Inventar dados → **LITERAL APENAS**
7. ❌ Commitar na pasta `contexto/` → **PRIVADA**

---

## 📚 ARQUIVOS CRÍTICOS

### PROMPT_MASTER_V3.md
**O que é:** Sistema SAL completo (586 linhas)  
**Conteúdo:**
- Personalidade SAL (argumentativa, direta, realista)
- Perfil psicológico Deivison (TDAH, perfeccionismo)
- Sistema de aliases (10 slash commands)
- Regras de operação (executar sem perguntar)
- Compressão de contexto (limitação Grok)

**Quando ler:**
- ✅ Início de qualquer sessão
- ✅ Antes de implementar aliases
- ✅ Quando precisar entender tom de comunicação

### ROADMAP.md
**O que é:** Planejamento completo (461 linhas)  
**Conteúdo:**
- 5 fases do projeto (Captura, Aliases, Voz, MCP Público, Orquestração)
- Status atual de cada fase
- Métricas de sucesso
- Riscos e mitigações
- Cronograma visual

**Quando ler:**
- ✅ Planejar novas features
- ✅ Entender prioridades
- ✅ Verificar o que já foi feito

### README.md
**O que é:** Documentação pública do projeto  
**Conteúdo:**
- Instalação e setup
- Como usar o scraper
- Exemplos de código
- Contribuição (quando opensource)

**Quando atualizar:**
- ✅ Nova fase completa
- ✅ Mudança na API
- ✅ Novas features prontas para uso

---

## 🧠 CONTEXTO PESSOAL DEIVISON

### Perfil Resumido
- **Idade:** 25 anos
- **Localização:** Feira de Santana, BA
- **Ocupação:** Técnico TI @ UFRB CETENS
- **Traços:** TDAH, perfeccionista, impulsivo
- **Filosofia:** "Se não tá escrito, esqueço. Sistema escrito = hack vida"

### Como Trabalha
- **Modo "faísca → martelo"**: Ideia → execução IMEDIATA
- **Perde foco rápido** (10+ min distração)
- **Debugging obsessivo** ("não saio até entender")
- **Prefere:** console.log() > ferramentas complexas

### Preferências de Comunicação
- ✅ Tom direto, seco, sem "fluff"
- ✅ Máximo 2-3 frases
- ✅ Código sempre que possível
- ❌ Enrolação ou explicações longas
- ❌ "Mas você disse..." (ele perdeu contexto)

### Repositórios Relacionados
- **FinanDEV** (PRIVADO) - Backup mental pessoal
- **DevSan** - Orquestração AGI global
- **MCP-HUB** - Protocolos de contexto
- **Prompts** - Banco de prompts

---

## 🔐 SEGURANÇA E PRIVACIDADE

### Pasta `contexto/` (PRIVADA)
**Status:** 🔒 Local only, **NÃO versionar**  
**Propósito:** Arquivos sensíveis e contexto pessoal  
**Conteúdo:**
- Notas de voz transcritas
- Ideias não publicáveis
- Dados financeiros (se necessário)

**Regras:**
- ✅ Adicionar ao `.gitignore`
- ❌ NUNCA commitar (mesmo acidentalmente)
- ❌ NUNCA compartilhar publicamente

### Dados Sensíveis
**O que evitar nas capturas:**
- ❌ Senhas ou tokens
- ❌ Dados financeiros pessoais
- ❌ Informações privadas de terceiros

**Já verificado:**
- ✅ Capturas atuais (25 arquivos) → sem dados sensíveis
- ✅ Apenas conversas públicas do Grok Share

---

## 🎯 MODOS RECOMENDADOS (AGENTES)

### DevSan (Grok Code)
**Quando usar:**
- ✅ Execução rápida de código
- ✅ Debugging simples
- ✅ Builds e testes
- ✅ Commits e syncs

**Limitação:** Reasoning limitado vs Claude Sonnet

### DevSan Max (Claude Sonnet 4.5)
**Quando usar:**
- ✅ Refatorações complexas
- ✅ Arquitetura de sistema
- ✅ Debugging profundo
- ✅ Planejamento multi-step

**Poder:** Itera por horas até resolução

### SAL (Grok - Personagem)
**Quando usar:**
- ✅ Busca de notícias tech
- ✅ Geração de ideias
- ✅ Análise de bugs (3 soluções)
- ✅ Criação de prompts

**Tom:** Argumentativo, incisivo, direto

### Gemini (Flash 2.0)
**Quando usar:**
- ✅ Análise longa de contexto
- ✅ Planejamento estratégico
- ✅ Revisão de documentação

### Qwen (Patient)
**Quando usar:**
- ✅ Explicações didáticas
- ✅ Documentação técnica
- ✅ Onboarding de novos devs

---

## 🚧 TRABALHOS EM ANDAMENTO

### Fase 2: Sistema de Aliases (70% completo)

**Concluído:**
- [x] Pesquisa metodologia criativa (conversa SAL)
- [x] PROMPT_MASTER_V2.md (350 linhas)
- [x] PROMPT_MASTER_V3.md (586 linhas)
- [x] 10 aliases definidos
- [x] ROADMAP.md criado
- [x] AGENTS.md atualizado (este arquivo)

**Pendente:**
- [ ] Implementação técnica dos aliases (API/MCP)
- [ ] Testes com Grok real
- [ ] Documentação de uso (README atualizado)
- [ ] Vídeo demo (opcional)

**Próximos Steps:**
1. Implementar alias `/resumo-semanal` (GitHub API)
2. Implementar alias `/noticias-tech` (web scraping)
3. Criar módulo de expansão de aliases (sistema modular)
4. Integrar com Grok quando API disponível

---

## 📈 MÉTRICAS E KPIs

### Fase 1 (Captura) - ✅ COMPLETA
- ✅ 25+ conversas capturadas
- ✅ Taxa de sucesso > 90%
- ✅ MCP funcional e integrado

### Fase 2 (Aliases) - ⏳ EM ANDAMENTO
- ✅ 10 aliases definidos
- ⏳ Implementação técnica (0/10)
- ⏳ Documentação completa (30%)

### Fase 3 (Voz) - 📋 PLANEJADA
- 📋 Latência < 2s (voz → resposta)
- 📋 Taxa de acerto > 95%
- 📋 Suporte PT-BR nativo

---

## 🔄 PROCESSO DE ATUALIZAÇÃO DESTE ARQUIVO

### Quando Atualizar
✅ **Atualizar AGENTS.md quando:**
- Nova fase iniciada/completa
- Mudança significativa na arquitetura
- Novos arquivos críticos criados
- Mudança nas regras de comportamento
- Novo agente integrado

❌ **NÃO atualizar para:**
- Commits normais de código
- Bugs corrigidos
- Refactorings menores
- Mudanças triviais de config

### Quem Pode Atualizar
- ✅ Deivison Santana (owner)
- ✅ Agentes AGI com auto-aprovação (DevSan, SAL)
- ✅ Colaboradores externos (via PR)

---

## 🎓 APRENDIZADOS E DECISÕES

### O Que Funciona Bem
✅ Puppeteer Stealth (bypass Cloudflare/bots)  
✅ MCP Protocol (persistência de contexto)  
✅ Bun runtime (3-4x mais rápido que Node.js)  
✅ Conventional commits (histórico limpo)  
✅ Sistema escrito (memória externa para TDAH)

### O Que Evitar
❌ Node.js/npm (purge completo, Bun only)  
❌ Explicações longas (TDAH perde foco)  
❌ Arquivos desnecessários (minimalismo)  
❌ Commits genéricos ("update stuff")  
❌ Romantização de tecnologia (realismo brutal)

### Decisões Técnicas Importantes
1. **Puppeteer Stealth > Playwright** - Bypass anti-bot superior
2. **MCP > REST API** - Persistência de contexto nativa
3. **Bun > Node.js** - 3-4x performance, TS nativo
4. **Markdown > JSON** - Capturas legíveis por humanos
5. **Sistema de Aliases > Comandos Verbosos** - TDAH-friendly

---

## 🌐 LINKS ÚTEIS

### Repositórios
- **GitHub:** https://github.com/Deivisan/Metodologia-Scrape
- **FinanDEV:** https://github.com/Deivisan/FinanDEV (PRIVADO)
- **DevSan:** https://github.com/Deivisan/DevSan

### Documentação Externa
- **Puppeteer Stealth:** https://github.com/berstend/puppeteer-extra/tree/master/packages/puppeteer-extra-plugin-stealth
- **MCP Protocol:** https://modelcontextprotocol.io/
- **Bun Docs:** https://bun.sh/docs

### Inspirações
- **JARVIS** (Marvel) - Assistente pessoal com voz
- **Auto-GPT** - Autonomous AI agents
- **LangChain** - Framework para LLM apps

---

## 📅 METADADOS

- **Criado em:** 17/01/2026
- **Última Atualização:** 17/01/2026
- **Versão:** 2.0.0 (refactor completo)
- **Autor:** Deivison Santana (@deivisan)
- **Mantenedor:** DevSan AGI
- **Licença:** MIT (planejado para Fase 4)

---

> **"Anything is possible"**  
> — Deivison Santana, 2026

🤖 **AGENTS.md atualizado. Contexto pleno para agentes AGI.**

---

*Perfil DevSan A.G.I. - Orquestração Metodologia-Scrape*

**Powered by:** OpenCode CLI + Bun Runtime + MCPs

`#DevSan #AGI #MetodologiaScrape #JARVIS #OpenCode #BunRuntime`
