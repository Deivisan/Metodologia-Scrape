"""
Logger - Sistema de Logging Estruturado
=========================================

Sistema de logging que salva em JSON para processamento posterior.
Suporta múltiplos níveis, arquivos rotativos, e exporta para JSON/Markdown.

Funcionalidades:
- Logs estruturados (JSON)
- Múltiplos níveis (DEBUG, INFO, WARNING, ERROR, SUCCESS)
- Arquivo de sessão único
- Exportação para JSON
- Análise de tendências
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, field, asdict
from enum import Enum
import threading


class LogLevel(Enum):
    """Níveis de log."""

    DEBUG = 10
    INFO = 20
    WARNING = 30
    ERROR = 40
    SUCCESS = 25  # Entre INFO e WARNING
    CONSOLE = 15  # Para mensagens de console do browser
    DOM_CHANGE = 18  # Para mudanças no DOM


@dataclass
class LogEntry:
    """Uma entrada de log."""

    timestamp: str
    level: str
    name: str
    message: str
    details: Optional[Dict[str, Any]] = None
    session_id: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


class AgentLogger:
    """
    Logger estruturado para agentes.

    Salva todos os logs em formato JSON para processamento.
    Cria um arquivo por sessão.

    Uso:
        logger = AgentLogger(name="meu_modulo", log_dir="./logs")
        logger.info("Mensagem de info", details={"key": "value"})
        logger.success("Operação realizada!")
        logger.error("Algo deu errado")
        logger.console({"type": "log", "text": "console msg"})
    """

    def __init__(
        self,
        log_dir: str = "./logs",
        name: str = "agent",
        level: LogLevel = LogLevel.DEBUG,
        session_id: Optional[str] = None,
    ):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self.name = name
        self.level = level
        self.session_id = session_id or datetime.now().strftime("%Y%m%d_%H%M%S")

        # Arquivo de log da sessão
        self.log_file = self.log_dir / f"session_{self.session_id}.jsonl"
        self.json_file = self.log_dir / f"session_{self.session_id}_structured.json"

        # Buffer de logs (para exportação)
        self._buffer: List[LogEntry] = []
        self._lock = threading.Lock()

        # Criar arquivos
        self._init_files()

        self.info(f"🚀 Logger iniciado: {name} | Session: {self.session_id}")

    def _init_files(self):
        """Inicializa arquivos de log."""
        # Arquivo JSON Lines (append)
        self.log_file.touch(exist_ok=True)

        # Arquivo JSON estruturado (será escrito no flush)
        self.json_file.touch(exist_ok=True)

    def _log(
        self, level: LogLevel, message: str, details: Optional[Dict[str, Any]] = None
    ):
        """Método interno de logging."""
        if level.value < self.level.value:
            return

        entry = LogEntry(
            timestamp=datetime.now().isoformat(),
            level=level.name,
            name=self.name,
            message=message,
            details=details,
            session_id=self.session_id,
        )

        # Adicionar ao buffer (thread-safe)
        with self._lock:
            self._buffer.append(entry)
            # Escrever no arquivo
            with open(self.log_file, "a", encoding="utf-8") as f:
                f.write(entry.to_json() + "\n")

        # Print colorido no console
        self._print(entry)

    def _print(self, entry: LogEntry):
        """Print formatado no console."""
        colors = {
            "DEBUG": "\033[90m",  # Cinza
            "INFO": "\033[94m",  # Azul
            "SUCCESS": "\033[92m",  # Verde
            "WARNING": "\033[93m",  # Amarelo
            "ERROR": "\033[91m",  # Vermelho
            "CONSOLE": "\033[95m",  # Magenta
            "DOM_CHANGE": "\033[96m",  # Ciano
        }

        reset = "\033[0m"
        color = colors.get(entry.level, "\033[0m")

        prefix = {
            "DEBUG": "🔹",
            "INFO": "ℹ️",
            "SUCCESS": "✅",
            "WARNING": "⚠️",
            "ERROR": "❌",
            "CONSOLE": "💬",
            "DOM_CHANGE": "🔄",
        }.get(entry.level, "•")

        print(
            f"{color}{prefix} [{entry.timestamp[:19]}] {entry.name}: {entry.message}{reset}"
        )

    # Métodos públicos de logging
    def debug(self, message: str, details: Optional[Dict] = None):
        self._log(LogLevel.DEBUG, message, details)

    def info(self, message: str, details: Optional[Dict] = None):
        self._log(LogLevel.INFO, message, details)

    def success(self, message: str, details: Optional[Dict] = None):
        self._log(LogLevel.SUCCESS, message, details)

    def warning(self, message: str, details: Optional[Dict] = None):
        self._log(LogLevel.WARNING, message, details)

    def error(self, message: str, details: Optional[Dict] = None):
        self._log(LogLevel.ERROR, message, details)

    def console(self, entry: Dict[str, Any]):
        """Log de mensagem de console do browser."""
        self._log(LogLevel.CONSOLE, f"Console {entry.get('type', 'log')}", entry)

    def dom_change(self, change):
        """Log de mudança no DOM."""
        self._log(LogLevel.DOM_CHANGE, f"Change: {change.type}", asdict(change))

    def export(self, filename: Optional[str] = None) -> str:
        """
        Exporta todos os logs para JSON estruturado.

        Args:
            filename: Nome do arquivo (opcional)

        Returns:
            str: Caminho do arquivo exportado
        """
        with self._lock:
            data = {
                "exported_at": datetime.now().isoformat(),
                "session_id": self.session_id,
                "logger_name": self.name,
                "entries": [e.to_dict() for e in self._buffer],
            }

        if not filename:
            filename = f"export_{self.session_id}.json"

        filepath = self.log_dir / filename
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        self.success(f"📦 Exportado: {filepath.name}")
        return str(filepath)

    def get_stats(self) -> Dict[str, Any]:
        """Retorna estatísticas dos logs."""
        with self._lock:
            entries = self._buffer

        stats = {
            "total": len(entries),
            "by_level": {},
            "first_timestamp": None,
            "last_timestamp": None,
        }

        for entry in entries:
            level = entry.level
            stats["by_level"][level] = stats["by_level"].get(level, 0) + 1

            if not stats["first_timestamp"]:
                stats["first_timestamp"] = entry.timestamp
            stats["last_timestamp"] = entry.timestamp

        return stats

    def clear(self):
        """Limpa o buffer de logs."""
        with self._lock:
            self._buffer.clear()
        self.info("🗑️ Log buffer limpo")


# Funções utilitárias
def create_logger(name: str, log_dir: str = "./logs") -> AgentLogger:
    """Factory para criar loggers."""
    return AgentLogger(name=name, log_dir=log_dir)


# Teste rápido
if __name__ == "__main__":
    logger = create_logger("test", log_dir="./logs")

    logger.debug("Debug message")
    logger.info("Info message")
    logger.success("Success!")
    logger.warning("Warning")
    logger.error("Error!")

    logger.console({"type": "log", "text": "browser console"})

    stats = logger.get_stats()
    print(f"\n📊 Stats: {stats}")

    logger.export()
