"""
DOM Observer - Mutation Observer para Detectar Mudanças
========================================================

Implementa um sistema de observação do DOM que detecta:
- Novas mensagens added
- Mudanças em mensagens existentes
- Toggle de modo voz on/off
- Mudanças de layout/estrutura

Usa JavaScript injetado na página para observer mutações.
"""

import asyncio
import json
from datetime import datetime
from typing import Optional, Callable, Dict, Any, List
from dataclasses import dataclass, field
from pathlib import Path

try:
    from playwright.async_api import Page
except ImportError:
    Page = None

from .logger import AgentLogger


@dataclass
class DOMChange:
    """Representa uma mudança detectada no DOM."""

    timestamp: str
    type: str  # 'added', 'removed', 'modified', 'attribute'
    selector: str
    html_preview: str
    text_preview: str
    is_message: bool = False
    message_index: Optional[int] = None
    is_user: Optional[bool] = None  # True=user, False=AI


@dataclass
class DOMState:
    """Estado atual do DOM."""

    html: str = ""
    message_count: int = 0
    messages: List[Dict[str, Any]] = field(default_factory=list)
    voice_indicator: Optional[str] = None
    last_change: Optional[DOMChange] = None


class DOMObserver:
    """
    Observer do DOM que detecta mudanças em tempo real.

    Injeta JavaScript na página para criar um MutationObserver
    que reporta todas as mudanças relevantes.

    Uso:
        observer = DOMObserver(page, log_dir="./logs")
        await observer.start()
        # Callback será chamado a cada mudança detectada
    """

    # Seletores para mensagens do Grok (podem ser modificados via self-modifier)
    MESSAGE_SELECTORS = [
        'div[class*="message-bubble"]',
        'div[class*="response-content"]',
        'article[data-testid*="message"]',
        'div[class*="Conversation"]',
        "div.prose",  # Grok usa Tailwind prose
        ".markdown",
        '[data-testid*="conversation-message"]',
        'div[class*="chat-message"]',
    ]

    # Seletores para indicador de voz
    VOICE_SELECTORS = [
        '[data-testid*="voice"]',
        '[class*="voice"]',
        '[aria-label*="voice"]',
        '[class*="microphone"]',
        '[data-testid*="microphone"]',
    ]

    def __init__(
        self,
        page: Page,
        log_dir: str = "./logs",
        on_change: Optional[Callable[[DOMChange], None]] = None,
    ):
        self.page = page
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self.logger = AgentLogger(log_dir=self.log_dir, name="dom_observer")

        self.on_change = on_change
        self.state = DOMState()
        self.is_observing = False
        self._observer_script = ""
        self._setup_observer_script()

    def _setup_observer_script(self):
        """Configura o script JavaScript do observer."""
        selectors = json.dumps(self.MESSAGE_SELECTORS)
        voice_selectors = json.dumps(self.VOICE_SELECTORS)

        self._observer_script = f"""
        (function() {{
            const MESSAGE_SELECTORS = {selectors};
            const VOICE_SELECTORS = {voice_selectors};
            
            let lastHtml = document.body.innerHTML;
            let messageCount = 0;
            
            // Função para encontrar mensagens
            function findMessages() {{
                let messages = [];
                MESSAGE_SELECTORS.forEach(selector => {{
                    document.querySelectorAll(selector).forEach((el, idx) => {{
                        if (!messages.find(m => m.el === el)) {{
                            messages.push({{
                                el: el,
                                index: idx,
                                text: el.innerText?.substring(0, 500) || '',
                                html: el.outerHTML?.substring(0, 200) || '',
                                isUser: el.innerText?.includes('Human:') || 
                                       el.querySelector('[data-user="human"]') !== null ||
                                       el.className.includes('user')
                            }});
                        }}
                    }});
                }});
                return messages;
            }}
            
            // Função para detectar modo voz
            function detectVoiceMode() {{
                for (let selector of VOICE_SELECTORS) {{
                    const el = document.querySelector(selector);
                    if (el) {{
                        // Verifica se está ativo
                        const hasActive = el.classList.contains('active') || 
                                         el.getAttribute('aria-pressed') === 'true' ||
                                         el.getAttribute('data-state') === 'on';
                        return {{
                            active: hasActive || document.querySelector('[data-testid*="voice"]')?.innerText?.includes('Listening'),
                            selector: selector
                        }};
                    }}
                }}
                return {{ active: false, selector: null }};
            }}
            
            // Observer mutations
            const observer = new MutationObserver((mutations) => {{
                const now = new Date().toISOString();
                const currentHtml = document.body.innerHTML;
                const messages = findMessages();
                const voice = detectVoiceMode();
                
                // Detectar mudanças
                if (currentHtml !== lastHtml || messages.length !== messageCount) {{
                    const newMessages = messages.filter((m, i) => i >= messageCount);
                    
                    window.postMessage({{
                        type: 'DOM_CHANGE',
                        timestamp: now,
                        messageCount: messages.length,
                        previousCount: messageCount,
                        newMessages: newMessages.map(m => ({{
                            index: m.index,
                            text: m.text?.substring(0, 300),
                            isUser: m.isUser
                        }})),
                        voiceMode: voice,
                        htmlPreview: currentHtml?.substring(0, 500)
                    }}, '*');
                    
                    lastHtml = currentHtml;
                    messageCount = messages.length;
                }}
            }});
            
            // Configurar e iniciar
            observer.observe(document.body, {{
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            }});
            
            // Reportar estado inicial
            setTimeout(() => {{
                window.postMessage({{
                    type: 'DOM_INITIAL_STATE',
                    timestamp: now,
                    messageCount: messageCount,
                    voiceMode: voice,
                    messages: findMessages().map(m => ({{
                        index: m.index,
                        text: m.text?.substring(0, 300),
                        isUser: m.isUser
                    }}))
                }}, '*');
            }}, 1000);
            
            console.log('🔍 DOM Observer iniciado');
        }})();
        """

    async def start(self):
        """Inicia a observação do DOM."""
        if not self.page:
            raise RuntimeError("Page não fornecida")

        self.logger.info("🚀 Iniciando DOM Observer...")

        # Configurar handler de mensagens do window
        self.page.on("console", lambda msg: self._handle_window_message(msg))

        # Injetar script
        await self.page.evaluate(self._observer_script)

        self.is_observing = True
        self.logger.success("✅ DOM Observer ativo")

    def _handle_window_message(self, msg):
        """Processa mensagens do window.postMessage."""
        try:
            if msg.type == "console" and "DOM_CHANGE" in str(msg.text):
                # Extrair JSON da mensagem
                text = msg.text
                start = text.find("{")
                end = text.rfind("}") + 1
                data = json.loads(text[start:end])

                self._process_dom_change(data)
        except Exception as e:
            self.logger.debug(f"ℹ️ Mensagem ignorada: {e}")

    def _process_dom_change(self, data: Dict[str, Any]):
        """Processa uma mudança detectada."""
        change = DOMChange(
            timestamp=data.get("timestamp", datetime.now().isoformat()),
            type="message_added" if data.get("newMessages") else "modified",
            selector="body",
            html_preview=data.get("htmlPreview", ""),
            text_preview=str(data.get("newMessages", [])),
            is_message=True,
            message_index=data.get("newMessages", [{}])[-1].get("index")
            if data.get("newMessages")
            else None,
            is_user=data.get("newMessages", [{}])[-1].get("isUser")
            if data.get("newMessages")
            else None,
        )

        self.state.message_count = data.get("messageCount", 0)
        self.state.last_change = change

        if self.on_change:
            self.on_change(change)

        self.logger.dom_change(change)

    async def get_current_state(self) -> Dict[str, Any]:
        """Retorna estado atual do DOM."""
        return await self.page.evaluate("""
            () => {
                const messages = [];
                document.querySelectorAll('div[class*="message-bubble"], div[class*="response-content"]').forEach((el, i) => {
                    messages.push({
                        index: i,
                        text: el.innerText?.substring(0, 500),
                        html: el.outerHTML?.substring(0, 200)
                    });
                });
                return {
                    html: document.body.innerHTML.substring(0, 1000),
                    messageCount: messages.length,
                    messages: messages,
                    url: window.location.href,
                    title: document.title
                };
            }
        """)

    async def get_messages(self) -> List[Dict[str, Any]]:
        """Retorna todas as mensagens detectadas."""
        return await self.page.evaluate("""
            () => {
                const messages = [];
                const selectors = [
                    'div[class*="message-bubble"]',
                    'div[class*="response-content"]',
                    'article',
                    '[data-testid*="message"]'
                ];
                selectors.forEach(selector => {
                    document.querySelectorAll(selector).forEach((el, i) => {
                        messages.push({
                            index: messages.length,
                            text: el.innerText?.substring(0, 3000) || '',
                            html: el.outerHTML?.substring(0, 500) || '',
                            selector: selector
                        });
                    });
                });
                return messages;
            }
        """)

    async def is_voice_active(self) -> bool:
        """Verifica se modo voz está ativo."""
        result = await self.page.evaluate("""
            () => {
                const voiceSelectors = [
                    '[data-testid*="voice"]',
                    '[class*="voice"]',
                    '[aria-label*="voice"]'
                ];
                for (let s of voiceSelectors) {
                    const el = document.querySelector(s);
                    if (el && (el.classList.contains('active') || el.getAttribute('aria-pressed') === 'true')) {
                        return true;
                    }
                }
                // Também verificar texto "Listening"
                return document.body.innerText.includes('Listening') || 
                       document.body.innerText.includes('Ouvindo');
            }
        """)
        return result

    def update_selectors(
        self, message_selectors: List[str] = None, voice_selectors: List[str] = None
    ):
        """Atualiza os seletores (para self-modifier)."""
        if message_selectors:
            self.MESSAGE_SELECTORS = message_selectors
        if voice_selectors:
            self.VOICE_SELECTORS = voice_selectors

        # Recriar script com novos seletores
        self._setup_observer_script()
        self.logger.info(
            f"📝 Seletores atualizados: {len(self.MESSAGE_SELECTORS)} selectors"
        )

    async def stop(self):
        """Para a observação."""
        self.is_observing = False
        self.logger.info("🔒 DOM Observer parado")


# Teste rápido
if __name__ == "__main__":

    async def test():
        # Este teste requer um navegador rodando
        print("Para testar, execute via scripts/main_agent.py")
        print("DOM Observer precisa de uma página para funcionar")

    asyncio.run(test())
