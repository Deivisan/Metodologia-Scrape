"""
Browser Manager - Playwright Persistente
=========================================

Gerencia um navegador Playwright que nunca fecha automaticamente.
Permite reconnect, mantém estado, e expõe métodos para interação.

Funcionalidades:
- Browser persistente (headless ou headed)
- Reconnection em quedas
- Contextos isolados por sessão
- Screenshots inteligentes
- Console/network logging
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, Callable
from dataclasses import dataclass, field

try:
    from playwright.async_api import async_playwright, Browser, Page, BrowserContext
except ImportError:
    raise ImportError(
        "Playwright não instalado. Execute: pip install playwright && playwright install"
    )

from .logger import AgentLogger


@dataclass
class BrowserConfig:
    """Configuração do navegador."""

    headless: bool = False
    viewport_width: int = 1920
    viewport_height: int = 1080
    user_agent: str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
    locale: str = "pt-BR"
    timezone_id: str = "America/Sao_Paulo"
    accept_downloads: bool = True
    record_video: bool = False
    record_har: bool = False


@dataclass
class BrowserState:
    """Estado atual do navegador."""

    is_connected: bool = False
    page_url: str = ""
    page_title: str = ""
    message_count: int = 0
    last_activity: datetime = field(default_factory=datetime.now)
    console_logs: list = field(default_factory=list)
    network_requests: list = field(default_factory=list)


class BrowserManager:
    """
    Gerenciador de navegador Playwright persistente.

    Uso:
        manager = BrowserManager(config=BrowserConfig(headless=False))
        await manager.start()
        page = await manager.get_page()
        # ... interaja com a página ...
        await manager.take_screenshot("test.png")
    """

    def __init__(self, config: Optional[BrowserConfig] = None, log_dir: str = "./logs"):
        self.config = config or BrowserConfig()
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self.logger = AgentLogger(log_dir=self.log_dir, name="browser_manager")
        self.playwright = None
        self.browser: Optional[Browser] = None
        self.context: Optional[BrowserContext] = None
        self.page: Optional[Page] = None
        self.state = BrowserState()

        # Callbacks de eventos
        self.on_page_change: Optional[Callable] = None
        self.on_console_message: Optional[Callable] = None
        self.on_network_request: Optional[Callable] = None

    async def start(self) -> bool:
        """
        Inicia o navegador Playwright.

        Returns:
            bool: True se iniciou com sucesso
        """
        try:
            self.logger.info("🚀 Iniciando Playwright...")
            self.playwright = await async_playwright().start()

            # Launch browser
            self.logger.info(
                f"📦 Launching browser (headless={self.config.headless})..."
            )
            self.browser = await self.playwright.chromium.launch(
                headless=self.config.headless,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-gpu" if self.config.headless else "--start-maximized",
                    f"--window-size={self.config.viewport_width},{self.config.viewport_height}",
                ],
            )

            # Create context
            self.logger.info("📄 Criando contexto...")
            self.context = await self.browser.new_context(
                viewport={
                    "width": self.config.viewport_width,
                    "height": self.config.viewport_height,
                },
                user_agent=self.config.user_agent,
                locale=self.config.locale,
                timezone_id=self.config.timezone_id,
                accept_downloads=self.config.accept_downloads,
                java_script_enabled=True,
            )

            # Create page
            self.page = await self.context.new_page()

            # Setup event handlers
            await self._setup_event_handlers()

            self.state.is_connected = True
            self.logger.success("✅ Browser iniciado com sucesso!")
            return True

        except Exception as e:
            self.logger.error(f"❌ Erro ao iniciar browser: {e}")
            return False

    async def _setup_event_handlers(self):
        """Configura handlers de eventos."""

        # Console messages
        self.page.on("console", lambda msg: self._handle_console(msg))

        # Network requests
        self.page.on("request", lambda request: self._handle_request(request))

        # Page changes
        self.page.on("framenavigated", lambda frame: self._handle_navigation(frame))

        self.logger.debug("🎯 Event handlers configurados")

    def _handle_console(self, msg):
        """Handler de mensagens de console."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "type": msg.type,
            "text": msg.text,
            "location": msg.location,
        }
        self.state.console_logs.append(entry)

        if self.on_console_message:
            self.on_console_message(entry)

        self.logger.console(entry)

    def _handle_request(self, request):
        """Handler de requests de rede."""
        entry = {
            "timestamp": datetime.now().isoformat(),
            "url": request.url,
            "method": request.method,
            "resource_type": request.resource_type,
        }
        self.state.network_requests.append(entry)

        if self.on_network_request:
            self.on_network_request(entry)

    def _handle_navigation(self, frame):
        """Handler de navegação."""
        if frame == self.page.main_frame:
            self.state.page_url = self.page.url
            self.state.page_title = self.page.title()
            self.state.last_activity = datetime.now()

            if self.on_page_change:
                self.on_page_change(
                    {
                        "url": self.state.page_url,
                        "title": self.state.page_title,
                    }
                )

            self.logger.info(f"📍 Navegou para: {self.state.page_title}")

    async def navigate(self, url: str, wait_until: str = "networkidle") -> bool:
        """
        Navega para uma URL.

        Args:
            url: URL para navegar
            wait_until: Condição de espera ('load', 'domcontentloaded', 'networkidle')

        Returns:
            bool: True se navegou com sucesso
        """
        try:
            self.logger.info(f"🌐 Navegando para: {url}")
            await self.page.goto(url, wait_until=wait_until, timeout=60000)
            await self.page.wait_for_timeout(3000)  # Aguardar hydration
            return True
        except Exception as e:
            self.logger.error(f"❌ Erro na navegação: {e}")
            return False

    async def get_page(self) -> Page:
        """Retorna a página atual."""
        if not self.page:
            raise RuntimeError("Browser não iniciado. Chame start() primeiro.")
        return self.page

    async def get_html(self, selector: Optional[str] = None) -> str:
        """Retorna HTML da página ou de um elemento."""
        if selector:
            element = await self.page.query_selector(selector)
            return await element.inner_html() if element else ""
        return await self.page.content()

    async def get_text(self, selector: str) -> str:
        """Retorna texto de um elemento."""
        element = await self.page.query_selector(selector)
        return await element.inner_text() if element else ""

    async def evaluate(self, expression: str) -> Any:
        """Executa JavaScript na página."""
        return await self.page.evaluate(expression)

    async def take_screenshot(
        self, name: str, selector: Optional[str] = None, full_page: bool = False
    ) -> str:
        """
        Tira um screenshot.

        Args:
            name: Nome do arquivo (sem extensão)
            selector: Elemento específico (opcional)
            full_page: Screenshot da página completa

        Returns:
            str: Caminho do arquivo salvo
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{name}_{timestamp}.png"
        filepath = self.log_dir / "screenshots" / filename
        filepath.parent.mkdir(parents=True, exist_ok=True)

        try:
            if selector:
                element = await self.page.query_selector(selector)
                if element:
                    await element.screenshot(path=str(filepath))
                else:
                    self.logger.warning(f"⚠️ Elemento não encontrado: {selector}")
                    return ""
            else:
                await self.page.screenshot(
                    path=str(filepath), full_page=full_page, type="png"
                )

            self.logger.success(f"📸 Screenshot: {filepath.name}")
            return str(filepath)
        except Exception as e:
            self.logger.error(f"❌ Erro no screenshot: {e}")
            return ""

    async def scroll_to_bottom(self) -> int:
        """Rola até o final da página e retorna número de scrolls."""
        scroll_count = 0
        last_height = await self.page.evaluate("document.body.scrollHeight")

        while scroll_count < 50:
            await self.page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
            await self.page.wait_for_timeout(1500)

            new_height = await self.page.evaluate("document.body.scrollHeight")
            if new_height == last_height:
                break

            last_height = new_height
            scroll_count += 1

        return scroll_count

    async def wait_for_selector(self, selector: str, timeout: int = 10000) -> bool:
        """Aguarda um elemento aparecer."""
        try:
            await self.page.wait_for_selector(selector, timeout=timeout)
            return True
        except:
            return False

    async def reconnect(self) -> bool:
        """
        Tenta reconectar ao navegador se a conexão caiu.

        Returns:
            bool: True se reconectou
        """
        if self.state.is_connected:
            return True

        self.logger.info("🔄 Tentando reconectar...")

        try:
            # Tenta criar nova página no contexto existente
            if self.context and not self.context.is_closed():
                self.page = await self.context.new_page()
                await self._setup_event_handlers()
                self.state.is_connected = True
                self.logger.success("✅ Reconectado!")
                return True
        except Exception as e:
            self.logger.error(f"❌ Erro na reconexão: {e}")

        # Se não conseguir reconectar, reinicia
        return await self.start()

    async def close(self):
        """Fecha o navegador e limpa recursos."""
        try:
            if self.page:
                await self.page.close()
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()

            self.state.is_connected = False
            self.logger.info("🔒 Browser fechado")
        except Exception as e:
            self.logger.error(f"❌ Erro ao fechar browser: {e}")

    def get_state(self) -> Dict[str, Any]:
        """Retorna estado atual do navegador."""
        return {
            "is_connected": self.state.is_connected,
            "page_url": self.state.page_url,
            "page_title": self.state.page_title,
            "message_count": self.state.message_count,
            "last_activity": self.state.last_activity.isoformat(),
            "console_logs_count": len(self.state.console_logs),
            "network_requests_count": len(self.state.network_requests),
        }


# Teste rápido
if __name__ == "__main__":

    async def test():
        manager = BrowserManager()
        if await manager.start():
            await manager.navigate("https://grok.com/share")
            await manager.take_screenshot("teste")
            await manager.close()

    asyncio.run(test())
