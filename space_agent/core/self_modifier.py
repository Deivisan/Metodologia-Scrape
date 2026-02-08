"""
Self Modifier - Auto-Edição do Próprio Script
==============================================

Permite que o agente modifique seu próprio código durante execução.
Sistema de hot-reload que atualiza configurações e seletores sem restart.

Funcionalidades:
- Modificar seletores CSS em runtime
- Ajustar parâmetros de configuração
- Adicionar novos padrões de parsing
- Backup automático antes de modificar
- Rollback se algo der errado

ATENÇÃO: Este módulo modifica código em disco. Use com cuidado.

Uso:
    modifier = SelfModifier(script_path="scripts/main_agent.py")

    # Modificar seletores
    modifier.update_selectors(message_selectors=['novo_selector'])

    # Adicionar padrão de AI
    modifier.add_ai_pattern(r"novo_padrao:")

    # Rollback se necessário
    modifier.rollback()
"""

import json
import re
import ast
import os
import shutil
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any, Callable
from dataclasses import dataclass, asdict

from .logger import AgentLogger


@dataclass
class Modification:
    """Uma modificação feita no código."""

    timestamp: str
    file_path: str
    original_content: str
    modified_content: str
    description: str
    success: bool
    error: Optional[str] = None


@dataclass
class ScriptConfig:
    """Configuração do script que pode ser modificada."""

    message_selectors: List[str] = None
    voice_selectors: List[str] = None
    ai_patterns: List[str] = None
    user_patterns: List[str] = None
    poll_interval: int = 5
    capture_screenshots: bool = True
    screenshot_interval: int = 60
    max_messages_per_session: int = 500
    headless: bool = False

    def __post_init__(self):
        if self.message_selectors is None:
            self.message_selectors = []
        if self.voice_selectors is None:
            self.voice_selectors = []
        if self.ai_patterns is None:
            self.ai_patterns = []
        if self.user_patterns is None:
            self.user_patterns = []


class SelfModifier:
    """
    Sistema de auto-modificação do código.

    Permite modificar o comportamento do agente em runtime,
    atualizando o arquivo de script principal.

    Uso:
        modifier = SelfModifier(script_path="scripts/main_agent.py")

        # Modify selectors
        modifier.update_config(message_selectors=['new_selector'])

        # Add patterns
        modifier.add_ai_pattern(r"^NewAI:")
    """

    # Padrões regex para encontrar variáveis no código
    SELECTOR_PATTERN = r"(message_selectors|voice_selectors)\s*=\s*\[([^\]]*)\]"
    PATTERN_PATTERN = r"(ai_patterns|user_patterns)\s*=\s*\[([^\]]*)\]"
    CONFIG_PATTERN = r"(\w+)\s*=\s*(\d+|True|False)"  # Integers and booleans

    def __init__(
        self,
        script_path: str,
        config_path: str = None,
        log_dir: str = "./logs",
        backup_dir: str = "./backups",
    ):
        self.script_path = Path(script_path)
        self.config_path = Path(config_path) if config_path else None

        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self.backup_dir = Path(backup_dir)
        self.backup_dir.mkdir(parents=True, exist_ok=True)

        self.logger = AgentLogger(log_dir=self.log_dir, name="self_modifier")
        self.modifications: List[Modification] = []
        self.current_config = ScriptConfig()

        # Carregar configuração existente
        self._load_config()

    def _load_config(self):
        """Carrega configuração do arquivo ou usa defaults."""
        if self.config_path and self.config_path.exists():
            try:
                with open(self.config_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.current_config = ScriptConfig(**data)
                self.logger.info(f"📄 Config carregada de {self.config_path}")
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao carregar config: {e}")

    def _save_config(self):
        """Salva configuração atual."""
        if not self.config_path:
            self.config_path = self.script_path.parent / "config.json"

        try:
            with open(self.config_path, "w", encoding="utf-8") as f:
                json.dump(asdict(self.current_config), f, indent=2, ensure_ascii=False)
            self.logger.success(f"💾 Config salva em {self.config_path}")
        except Exception as e:
            self.logger.error(f"❌ Erro ao salvar config: {e}")

    def _create_backup(self) -> str:
        """Cria backup do arquivo atual."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_name = f"{self.script_path.stem}_{timestamp}{self.script_path.suffix}"
        backup_path = self.backup_dir / backup_name

        try:
            shutil.copy2(self.script_path, backup_path)
            self.logger.info(f"💾 Backup criado: {backup_path.name}")
            return str(backup_path)
        except Exception as e:
            self.logger.error(f"❌ Erro no backup: {e}")
            return ""

    def _record_modification(
        self,
        description: str,
        original: str,
        modified: str,
        success: bool,
        error: Optional[str] = None,
    ):
        """Registra uma modificação."""
        mod = Modification(
            timestamp=datetime.now().isoformat(),
            file_path=str(self.script_path),
            original_content=original,
            modified_content=modified,
            description=description,
            success=success,
            error=error,
        )
        self.modifications.append(mod)

    # ==================== Métodos de Modificação ====================

    def update_config(self, **kwargs):
        """
        Atualiza configuração do script.

        Args:
            **kwargs: chaves do ScriptConfig para atualizar
                - poll_interval: int (segundos entre polls)
                - capture_screenshots: bool
                - screenshot_interval: int (segundos)
                - max_messages_per_session: int
                - headless: bool

        Exemplo:
            modifier.update_config(poll_interval=10, headless=True)
        """
        self.logger.info(f"📝 Atualizando config: {kwargs}")

        original = self.current_config.__dict__.copy()
        self.current_config.__dict__.update(kwargs)
        self._save_config()

        self._record_modification(
            f"Update config: {list(kwargs.keys())}",
            str(original),
            str(self.current_config.__dict__),
            success=True,
        )

        self.logger.success(f"✅ Config atualizada")

    def update_selectors(
        self, message_selectors: List[str] = None, voice_selectors: List[str] = None
    ):
        """
        Atualiza seletores CSS para mensagens e indicador de voz.

        Args:
            message_selectors: Lista de seletores para mensagens
            voice_selectors: Lista de seletores para indicador de voz

        Exemplo:
            modifier.update_selectors(
                message_selectors=['div.nova-classe'],
                voice_selectors=['[data-voice="true"]']
            )
        """
        if message_selectors:
            self.logger.info(
                f"📝 Atualizando {len(message_selectors)} message_selectors"
            )
            self.current_config.message_selectors = message_selectors

        if voice_selectors:
            self.logger.info(f"📝 Atualizando {len(voice_selectors)} voice_selectors")
            self.current_config.voice_selectors = voice_selectors

        self._save_config()
        self._record_modification(
            f"Update selectors: {len(message_selectors or [])} msg, {len(voice_selectors or [])} voice",
            "",
            str(asdict(self.current_config)),
            success=True,
        )

    def add_ai_pattern(self, pattern: str):
        """
        Adiciona um padrão para detectar mensagens de AI.

        Args:
            pattern: Regex pattern (ex: r"^NovoBot:")

        Exemplo:
            modifier.add_ai_pattern(r"^NovoBot:")
        """
        if pattern not in self.current_config.ai_patterns:
            self.current_config.ai_patterns.append(pattern)
            self._save_config()
            self.logger.success(f"✅ AI pattern adicionado: {pattern}")
        else:
            self.logger.warning(f"⚠️ Pattern já existe: {pattern}")

    def add_user_pattern(self, pattern: str):
        """
        Adiciona um padrão para detectar mensagens de usuário.

        Args:
            pattern: Regex pattern (ex: r"^Usuário:")
        """
        if pattern not in self.current_config.user_patterns:
            self.current_config.user_patterns.append(pattern)
            self._save_config()
            self.logger.success(f"✅ User pattern adicionado: {pattern}")
        else:
            self.logger.warning(f"⚠️ Pattern já existe: {pattern}")

    def remove_ai_pattern(self, pattern: str):
        """Remove um padrão de AI."""
        if pattern in self.current_config.ai_patterns:
            self.current_config.ai_patterns.remove(pattern)
            self._save_config()
            self.logger.info(f"🗑️ AI pattern removido: {pattern}")

    def remove_user_pattern(self, pattern: str):
        """Remove um padrão de usuário."""
        if pattern in self.current_config.user_patterns:
            self.current_config.user_patterns.remove(pattern)
            self._save_config()
            self.logger.info(f"🗑️ User pattern removido: {pattern}")

    def apply_changes_directly(self, new_content: str) -> bool:
        """
        Aplica mudanças diretas ao arquivo de script.

        Args:
            new_content: Novo conteúdo do arquivo

        Returns:
            bool: True se succeeded
        """
        # Criar backup antes
        backup_path = self._create_backup()
        if not backup_path:
            self.logger.error("❌ Não foi possível criar backup")
            return False

        original = ""
        if self.script_path.exists():
            original = self.script_path.read_text(encoding="utf-8")

        try:
            self.script_path.write_text(new_content, encoding="utf-8")

            self._record_modification(
                "Direct content modification",
                original[:500] + "...",
                new_content[:500] + "...",
                success=True,
            )

            self.logger.success(f"✅ Arquivo modificado: {self.script_path.name}")
            return True

        except Exception as e:
            self.logger.error(f"❌ Erro ao modificar arquivo: {e}")

            # Rollback
            if original:
                self.script_path.write_text(original, encoding="utf-8")
                self.logger.info("🔄 Rollback executado")

            return False

    def rollback(self, index: int = -1) -> bool:
        """
        Faz rollback para uma versão anterior.

        Args:
            index: Índice da modificação (default: última)

        Returns:
            bool: True se succeeded
        """
        if not self.modifications:
            self.logger.warning("⚠️ Nenhuma modificação para rollback")
            return False

        target = self.modifications[index]

        if not target.success:
            self.logger.warning(f"⚠️ Modificação {index} não foi bem-sucedida")
            return False

        try:
            self.script_path.write_text(target.original_content, encoding="utf-8")
            self.logger.success(f"🔄 Rollback para modificação {index}")
            return True
        except Exception as e:
            self.logger.error(f"❌ Erro no rollback: {e}")
            return False

    def get_modifications(self) -> List[Dict[str, Any]]:
        """Retorna histórico de modificações."""
        return [asdict(m) for m in self.modifications]

    def get_config(self) -> Dict[str, Any]:
        """Retorna configuração atual."""
        return asdict(self.current_config)

    def print_config(self):
        """Imprime configuração atual."""
        print("\n📋 Configuração Atual:")
        print("-" * 40)
        for key, value in asdict(self.current_config).items():
            print(f"  {key}: {value}")
        print("-" * 40)

    def reload_from_disk(self):
        """Recarrega configuração do disco."""
        self._load_config()
        self.logger.info("📄 Config recarregada do disco")


# Teste rápido
if __name__ == "__main__":
    modifier = SelfModifier(
        script_path="scripts/main_agent.py", config_path="scripts/config.json"
    )

    modifier.print_config()

    # Simular algumas modificações
    modifier.update_selectors(
        message_selectors=["div.nova-mensagem"], voice_selectors=['[data-voice="on"]']
    )

    modifier.add_ai_pattern(r"^NewAI:")

    print("\n📝 Modificações:")
    for mod in modifier.get_modifications():
        print(f"  - {mod['description']}")
