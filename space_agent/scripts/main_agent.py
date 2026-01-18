#!/usr/bin/env python3
"""
SPACE Agent - Self-Modifying Intelligent Browser Agent
=======================================================

🚀 AGENTE QUE RODE INDEFINIDAMENTE NO NAVEGADOR
🎯 Captura conversas em tempo real
🧠 Aprende com sessões anteriores
🔧 Auto-edita seu próprio código durante execução
📸 Screenshots inteligentes

 USO:
    python scripts/main_agent.py --url "https://grok.com/share/..."

 CONTROLES EM TEMPO DE EXECUÇÃO:
    • Ctrl+C: Graceful shutdown (salva tudo)
    • 's' + Enter: Tirar screenshot manual
    • 'c' + Enter: Mostrar status atual
    • 'm' + Enter: Mostrar memória aprendida
    • 'q' + Enter: Sair

 AUTO-MODIFICAÇÃO:
    O agente pode se modificar durante execução via SelfModifier.
    Para atualizar seletores, use o método modify_selectors().

 AUTOR: Deivison Santana (@deivisan)
 VERSÃO: 1.0.0
 DATA: 2026-01-18
"""

import asyncio
import json
import sys
import os
import signal
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
from dataclasses import asdict

# Adicionar parent ao path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.browser_manager import BrowserManager, BrowserConfig
from core.dom_observer import DOMObserver
from core.message_parser import MessageParser
from core.self_modifier import SelfModifier
from core.memory_system import MemorySystem
from core.logger import AgentLogger
from protocols.space_protocol import SPACEProtocol, SpaceSession


class SPACEAgent:
    """
    Agente principal que integra todos os módulos.

    Funcionalidades:
    - Browser persistente
    - Captura contínua de mensagens
    - Screenshots inteligentes
    - Auto-modificação
    - Aprendizado contínuo
    """

    # Configuração padrão (pode ser modificada via self-modifier)
    DEFAULT_CONFIG = {
        "url": "",
        "poll_interval": 5,  # segundos entre polls
        "screenshot_interval": 60,  # segundos entre screenshots automáticos
        "capture_screenshots": True,
        "headless": False,
        "message_selectors": [
            'div[class*="message-bubble"]',
            'div[class*="response-content"]',
            "article",
            '[data-testid*="message"]',
            'div[class*="Conversation"]',
            "div.prose",
            ".markdown",
        ],
        "voice_selectors": [
            '[data-testid*="voice"]',
            '[class*="voice"]',
            '[aria-label*="voice"]',
            '[class*="microphone"]',
        ],
    }

    def __init__(self, config: Dict[str, Any] = None):
        """
        Inicializa o agente.

        Args:
            config: Configuração inicial (opcional)
        """
        self.config = {**self.DEFAULT_CONFIG, **(config or {})}

        # Diretórios
        self.base_dir = Path(__file__).parent.parent
        self.log_dir = self.base_dir / "logs"
        self.captures_dir = self.base_dir / "captures"
        self.memory_dir = self.base_dir / "memory"
        self.backups_dir = self.base_dir / "backups"

        for d in [self.log_dir, self.captures_dir, self.memory_dir, self.backups_dir]:
            d.mkdir(parents=True, exist_ok=True)

        # Session ID
        self.session_id = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Logger
        self.logger = AgentLogger(
            log_dir=str(self.log_dir), name="space_agent", session_id=self.session_id
        )

        # Módulos
        self.browser = BrowserManager(
            config=BrowserConfig(headless=self.config["headless"]),
            log_dir=str(self.log_dir),
        )

        self.logger.info(f"🎯 Inicializando agente | Session: {self.session_id}")

        self.dom_observer = None
        self.message_parser = MessageParser(log_dir=str(self.log_dir))
        self.modifier = SelfModifier(
            script_path=str(Path(__file__)),
            config_path=str(self.base_dir / "config.json"),
            log_dir=str(self.log_dir),
            backup_dir=str(self.backups_dir),
        )
        self.memory = MemorySystem(memory_dir=str(self.memory_dir))
        self.protocol = SPACEProtocol(
            output_dir=str(self.captures_dir), log_dir=str(self.log_dir)
        )

        # Estado
        self.is_running = False
        self.current_session: Optional[SpaceSession] = None
        self.last_message_count = 0
        self.last_screenshot_time = 0
        self.start_time = datetime.now()

        # Callbacks de input
        self.input_callbacks = {
            "s": self._handle_screenshot,
            "c": self._handle_status,
            "m": self._handle_memory,
            "q": self._handle_quit,
        }

    async def start(self, url: str = None):
        """
        Inicia o agente.

        Args:
            url: URL da conversa (opcional, pode passar via --url)
        """
        target_url = url or self.config.get("url")

        if not target_url:
            self.logger.error(
                "❌ URL não fornecida. Use --url ou configure no config.json"
            )
            return False

        self.logger.info("🚀 Iniciando SPACE Agent...")

        # Iniciar browser
        if not await self.browser.start():
            self.logger.error("❌ Falha ao iniciar browser")
            return False

        # Iniciar sessão SPACE
        self.current_session = self.protocol.start_session(
            url=target_url, channel="grok-voice"
        )

        # Navegar para URL
        if not await self.browser.navigate(target_url):
            self.logger.error("❌ Falha ao navegar")
            return False

        # Iniciar DOM Observer
        self.dom_observer = DOMObserver(
            page=self.browser.page,
            log_dir=str(self.log_dir),
            on_change=self._on_dom_change,
        )
        await self.dom_observer.start()

        # Atualizar seletores com base na memória
        self._apply_best_config()

        self.is_running = True
        self.logger.success("✅ SPACE Agent ativo!")

        # Loop principal
        await self._main_loop()

    async def _main_loop(self):
        """Loop principal de captura."""
        self.logger.info("🔄 Entrando no loop principal...")

        # Primeiro scroll para carregar tudo
        scroll_count = await self.browser.scroll_to_bottom()
        self.logger.info(f"📜 Scroll inicial: {scroll_count} páginas")

        # Tirar screenshot inicial
        await self._take_screenshot("initial")

        # Loop de polling
        while self.is_running:
            try:
                await asyncio.sleep(self.config["poll_interval"])

                # Verificar se ainda conectado
                if not await self.browser.reconnect():
                    self.logger.warning("⚠️ Reconectando...")
                    continue

                # Fazer captura
                await self._capture()

                # Screenshot automático
                await self._auto_screenshot()

                # Processar input do usuário
                await self._check_input()

            except asyncio.CancelledError:
                self.logger.info("🛑 Loop cancelado")
                break
            except Exception as e:
                self.logger.error(f"❌ Erro no loop: {e}")
                await asyncio.sleep(5)  # Backoff

        await self._shutdown()

    async def _capture(self):
        """Faz uma captura completa."""
        try:
            # Obter mensagens do DOM
            messages = await self.dom_observer.get_messages()

            if not messages:
                return

            # Parsear mensagens
            existing_messages = []
            for cap in self.current_session.captures:
                existing_messages.extend(cap.get("messages", []))

            result = self.message_parser.parse(
                await self.browser.get_html(), existing_messages
            )

            # Verificar se há mensagens novas
            if result.new_messages:
                self.logger.info(f"📝 {len(result.new_messages)} mensagens novas")

            # Obter estado do modo voz
            voice_active = await self.dom_observer.is_voice_active()

            # Criar dados da captura
            capture_data = {
                "trigger": "auto-poll",
                "messages": [
                    {"index": m.index, "text": m.text[:500], "is_user": m.is_user}
                    for m in result.messages
                ],
                "new_messages": [
                    {"index": m.index, "text": m.text[:300], "is_user": m.is_user}
                    for m in result.new_messages
                ],
                "message_count": len(result.messages),
                "user_messages": result.user_count,
                "ai_messages": result.ai_count,
                "voice_active": voice_active,
                "html": await self.browser.get_html()[:5000],
                "success": True,
            }

            # Registrar captura
            self.protocol.register_capture(self.current_session, capture_data)

            # Atualizar memória
            self.memory.save_session(
                {
                    "session_id": self.current_session.id,
                    "message_count": len(result.messages),
                    "user_messages": result.user_count,
                    "ai_messages": result.ai_count,
                    "success": True,
                    "config": {
                        "message_selectors": self.config["message_selectors"],
                        "poll_interval": self.config["poll_interval"],
                        "headless": self.config["headless"],
                    },
                }
            )

        except Exception as e:
            self.logger.error(f"❌ Erro na captura: {e}")

    async def _auto_screenshot(self):
        """Tira screenshot automaticamente se intervalo passado."""
        if not self.config["capture_screenshots"]:
            return

        now = datetime.now().timestamp()

        if now - self.last_screenshot_time >= self.config["screenshot_interval"]:
            await self._take_screenshot("auto")
            self.last_screenshot_time = now

    async def _take_screenshot(self, reason: str = "manual"):
        """Tira um screenshot."""
        try:
            path = await self.browser.take_screenshot(
                name=f"{self.session_id}_{reason}", full_page=True
            )

            if path:
                self.protocol.register_artifact(
                    self.current_session,
                    "screenshot",
                    f"{reason}_{datetime.now().strftime('%H%M%S')}.png",
                    path,
                )
        except Exception as e:
            self.logger.warning(f"⚠️ Erro no screenshot: {e}")

    def _on_dom_change(self, change):
        """Callback para mudanças no DOM."""
        # Aqui você pode adicionar lógica adicional
        # para reagir a mudanças específicas
        pass

    def _apply_best_config(self):
        """Aplica configuração baseada em memória."""
        best_config = self.memory.get_best_config()

        if best_config.get("message_selectors"):
            self.config["message_selectors"] = best_config["message_selectors"]
            self.dom_observer.update_selectors(
                message_selectors=best_config["message_selectors"]
            )
            self.logger.info(f"📝 Seletores atualizados da memória")

    async def _check_input(self):
        """Verifica input do usuário (não-bloqueante)."""
        # Em produção, você usaria uma thread ou asyncio
        pass

    async def _handle_screenshot(self):
        """Handler para screenshot manual."""
        await self._take_screenshot("manual")

    async def _handle_status(self):
        """Handler para mostrar status."""
        state = self.browser.get_state()
        summary = self.protocol.get_session_summary(self.current_session)
        self.logger.info(
            f"\n{summary}\n\n📊 Browser State: {json.dumps(state, indent=2)}"
        )

    async def _handle_memory(self):
        """Handler para mostrar memória."""
        self.memory.print_stats()

    async def _handle_quit(self):
        """Handler para sair."""
        self.is_running = False

    async def _shutdown(self):
        """Desligamento gracioso."""
        self.logger.info("🔄 Shutdown...")

        # Finalizar sessão SPACE
        if self.current_session:
            report = self.protocol.end_session(self.current_session)

            # Salvar relatório
            report_path = self.log_dir / f"report_{self.session_id}.json"
            with open(report_path, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2, ensure_ascii=False)

        # Fechar browser
        await self.browser.close()

        # Exportar logs
        self.logger.export()

        # Exportar memória
        self.memory.export_memory()

        self.logger.success(f"✅ Agente finalizado. Session: {self.session_id}")

    # ==================== Métodos de Auto-Modificação ====================

    def modify_selectors(
        self, message_selectors: list = None, voice_selectors: list = None
    ):
        """
        Modifica seletores durante execução.

        Args:
            message_selectors: Novos seletores de mensagens
            voice_selectors: Novos seletores de voz
        """
        self.modifier.update_selectors(message_selectors, voice_selectors)

        # Aplicar imediatamente
        if message_selectors:
            self.config["message_selectors"] = message_selectors
            if self.dom_observer:
                self.dom_observer.update_selectors(message_selectors=message_selectors)

        if voice_selectors:
            self.config["voice_selectors"] = voice_selectors

    def modify_config(self, **kwargs):
        """
        Modifica configuração durante execução.

        Args:
            **kwargs: Configurações para atualizar
                - poll_interval: int
                - screenshot_interval: int
                - capture_screenshots: bool
                - headless: bool
        """
        self.modifier.update_config(**kwargs)

        # Aplicar imediatamente
        for key, value in kwargs.items():
            if key in self.config:
                self.config[key] = value

        self.logger.info(f"📝 Config atualizada: {list(kwargs.keys())}")

    def add_ai_pattern(self, pattern: str):
        """Adiciona padrão de detecção de AI."""
        self.modifier.add_ai_pattern(pattern)
        self.logger.info(f"✅ AI pattern: {pattern}")

    def add_user_pattern(self, pattern: str):
        """Adiciona padrão de detecção de usuário."""
        self.modifier.add_user_pattern(pattern)
        self.logger.info(f"✅ User pattern: {pattern}")


# ==================== Função Main ====================


def parse_args():
    """Parse argumentos de linha de comando."""
    import argparse

    parser = argparse.ArgumentParser(
        description="SPACE Agent - Self-Modifying Browser Agent"
    )

    parser.add_argument("--url", type=str, help="URL da conversa Grok Share")

    parser.add_argument(
        "--headless", action="store_true", help="Rodar em modo headless"
    )

    parser.add_argument(
        "--poll-interval", type=int, default=5, help="Intervalo entre polls (segundos)"
    )

    parser.add_argument(
        "--screenshot-interval",
        type=int,
        default=60,
        help="Intervalo entre screenshots (segundos)",
    )

    parser.add_argument(
        "--no-screenshots",
        action="store_true",
        help="Desabilitar screenshots automáticos",
    )

    return parser.parse_args()


def main():
    """Função principal."""
    args = parse_args()

    # Criar configuração
    config = {
        "url": args.url,
        "headless": args.headless,
        "poll_interval": args.poll_interval,
        "screenshot_interval": args.screenshot_interval,
        "capture_screenshots": not args.no_screenshots,
    }

    # Criar e iniciar agente
    agent = SPACEAgent(config=config)

    try:
        asyncio.run(agent.start())
    except KeyboardInterrupt:
        print("\n🛑 Interrupted by user")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
