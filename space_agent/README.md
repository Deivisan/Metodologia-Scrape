# SPACE Agent - Self-Modifying Intelligent Browser Agent

> 🚀 Agente que roda **indefinidamente** no navegador, captura conversas em tempo real, aprende com sessões anteriores e pode **se auto-modificar** durante execução.

---

## 📋 O Que É

O SPACE Agent é um sistema que:

1. **Roda persistentemente** no navegador (Playwright)
2. **Captura conversas** de IA em tempo real
3. **Distingue** mensagens do usuário vs AI
4. **Tira screenshots** automaticamente
5. **Aprende** com sessões anteriores
6. **Se auto-modifica** (atualiza seletores, configs em runtime)

---

## 🏗️ Estrutura

```
space_agent/
├── __init__.py                 # Exports principais
├── core/
│   ├── browser_manager.py      # Playwright persistente
│   ├── dom_observer.py         # Mutation Observer
│   ├── message_parser.py       # Parser user/AI
│   ├── self_modifier.py        # Auto-edição de código
│   ├── memory_system.py        # Memória persistente
│   └── logger.py               # Logging estruturado
├── protocols/
│   └── space_protocol.py       # SPACE Protocol v1.0
├── scripts/
│   └── main_agent.py           # Script principal
├── captures/                   # Capturas JSON
├── logs/                       # Logs de sessão
├── memory/                     # Memória aprendida
└── backups/                    # Backups de modificações
```

---

## 🚀 Uso

### Instalação

```bash
# Instalar dependências
pip install playwright
playwright install

# OU com uv
uv pip install playwright
playwright install
```

### Executar

```bash
# Com URL direta
python scripts/main_agent.py --url "https://grok.com/share/SEU_LINK"

# Headless (sem interface)
python scripts/main_agent.py --url "URL" --headless

# Com intervalos customizados
python scripts/main_agent.py --url "URL" --poll-interval 10 --screenshot-interval 120
```

### Controles em Tempo de Execução

| Tecla | Ação |
|-------|------|
| `s` + Enter | Screenshot manual |
| `c` + Enter | Mostrar status |
| `m` + Enter | Mostrar memória |
| `q` + Enter | Sair (graceful) |

---

## 🔧 Auto-Modificação

O agente pode se modificar **durante execução**:

```python
from space_agent import SPACEAgent

agent = SPACEAgent()

# Modificar seletores CSS
agent.modify_selectors(
    message_selectors=['div.nova-classe'],
    voice_selectors=['[data-voice="on"]']
)

# Modificar configuração
agent.modify_config(
    poll_interval=10,
    capture_screenshots=False
)

# Adicionar padrões de detecção
agent.add_ai_pattern(r"^NovoBot:")
agent.add_user_pattern(r"^Usuário:")
```

---

## 📊 SPACE Protocol

O SPACE Protocol define como capturar e versionar conversas:

```
S - Synchronized Context
P - Persistent Metadata  
A - Agent Awareness
C - Capture Intelligence
E - Execution Flow
```

### Estrutura de Captura

```json
{
  "id": "space_20260118_143022",
  "channel": "grok-voice",
  "captures": [
    {
      "id": "cap_14_3022_123456",
      "timestamp": "2026-01-18T14:30:22.123Z",
      "trigger": "auto-poll",
      "message_count": 47,
      "user_messages": 23,
      "ai_messages": 24,
      "voice_active": true,
      "messages": [
        {"index": 0, "text": "...", "is_user": true},
        {"index": 1, "text": "...", "is_user": false}
      ]
    }
  ]
}
```

---

## 🧠 Aprendizado

O agente aprende com cada sessão:

1. **Seletores que funcionam** → Salva e usa em sessões futuras
2. **Poll interval ideal** → Ajusta baseado em sucesso
3. **Taxa de sucesso** → Calcula e reporta

```python
agent.memory.print_stats()

# Output:
# 📊 Memory Stats:
#   Total Sessions: 15
#   Success Rate: 93.3%
#   Avg Messages: 47.2
#   Best Poll: 5s
```

---

## 📸 Screenshots

- Automáticos a cada X segundos
- Manual com tecla `s`
- Salvos em `captures/`

---

## ⚠️ Limitações Conhecidas

1. **Grok Share links são necessários** - O agente precisa de um link compartilhado
2. **DOM do Grok pode mudar** - Seletores podem precisar de atualização
3. **Browser consome memória** - Não deixei rodando infinitamente sem monitoramento
4. **Não é web-native** - Precisa de Playwright/Chromium

---

## 🔮 Roadmap

- [ ] Suporte a outros modelos (Claude, ChatGPT)
- [ ] Webhook para notificações
- [ ] Interface web para visualização
- [ ] Integração com Mem0 MCP
- [ ] Modo streaming (não polling)

---

**Autor:** Deivison Santana (@deivisan)  
**Versão:** 1.0.0  
**Data:** 2026-01-18
