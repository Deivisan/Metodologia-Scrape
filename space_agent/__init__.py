"""
SPACE Agent - Self-Modifying Intelligent Browser Agent
======================================================

Autor: Deivison Santana (@deivisan)
Versão: 1.0.0
Data: 2026-01-18

Este módulo implementa um agente que:
- Rode indefinitely no navegador (Playwright persistente)
- Capture conversas em tempo real
- Auto-edite seu próprio código durante execução
- Aprenda com sessões anteriores (lifelong learning)
- Implemente o SPACE Protocol

使用方法:
    python scripts/main_agent.py --url "https://grok.com/share/..."
"""

from .core.browser_manager import BrowserManager
from .core.dom_observer import DOMObserver
from .core.message_parser import MessageParser
from .core.self_modifier import SelfModifier
from .core.memory_system import MemorySystem
from .core.logger import AgentLogger
from .protocols.space_protocol import SPACEProtocol, SpaceSession

__version__ = "1.0.0"
__author__ = "Deivison Santana (@deivisan)"

__all__ = [
    "BrowserManager",
    "DOMObserver",
    "MessageParser",
    "SelfModifier",
    "MemorySystem",
    "AgentLogger",
    "SPACEProtocol",
    "SpaceSession",
]
