"""
Memory System - Sistema de Memória Persistente
===============================================

Sistema de memória que aprende com sessões anteriores.
Salva contexto, métricas, e permite "lifelong learning".

Funcionalidades:
- Salvar sessões completas
- Aprender padrões de sucesso/falha
- Recomendar configurações
- Persistir em JSON
- Import/export para backup
"""

import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict, field
from collections import defaultdict

from .logger import AgentLogger


@dataclass
class SessionMemory:
    """Memória de uma sessão."""

    session_id: str
    started_at: str
    ended_at: str
    url: str
    message_count: int
    user_messages: int
    ai_messages: int
    screenshots: List[str]
    config_used: Dict[str, Any]
    success: bool
    error: Optional[str] = None
    duration_seconds: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PatternLearned:
    """Padrão aprendido com sessões anteriores."""

    pattern_type: str  # 'selector', 'timing', 'success_config'
    pattern: str
    success_count: int
    failure_count: int
    last_used: str
    recommendation_score: float  # 0-1

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class MemorySystem:
    """
    Sistema de memória que aprende com o tempo.

    Armazena sessões, analisa padrões, e recomenda configurações.

    Uso:
        memory = MemorySystem(memory_dir="./memory")

        # Salvar sessão
        memory.save_session(session_data)

        # Aprender padrões
        memory.learn_patterns()

        # Obter recomendações
        recommendations = memory.get_recommendations()
    """

    def __init__(self, memory_dir: str = "./memory"):
        self.memory_dir = Path(memory_dir)
        self.memory_dir.mkdir(parents=True, exist_ok=True)

        # Subdiretórios
        self.sessions_dir = self.memory_dir / "sessions"
        self.patterns_dir = self.memory_dir / "patterns"
        self.sessions_dir.mkdir(exist_ok=True)
        self.patterns_dir.mkdir(exist_ok=True)

        self.logger = AgentLogger(log_dir=str(self.memory_dir), name="memory_system")

        # Dados em memória
        self.sessions: List[SessionMemory] = []
        self.patterns: Dict[str, List[PatternLearned]] = defaultdict(list)

        # Carregar dados existentes
        self._load_all()

    def _load_all(self):
        """Carrega todos os dados do disco."""
        self.logger.info("📂 Carregando memória...")

        # Carregar sessões
        for f in self.sessions_dir.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    self.sessions.append(SessionMemory(**data))
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao carregar {f.name}: {e}")

        # Carregar padrões
        for f in self.patterns_dir.glob("*.json"):
            try:
                with open(f, "r", encoding="utf-8") as fp:
                    data = json.load(fp)
                    pattern_type = f.stem
                    self.patterns[pattern_type] = [PatternLearned(**p) for p in data]
            except Exception as e:
                self.logger.warning(f"⚠️ Erro ao carregar padrão {f.name}: {e}")

        self.logger.success(
            f"✅ Carregado: {len(self.sessions)} sessões, {sum(len(p) for p in self.patterns.values())} padrões"
        )

    def _save_session(self, session: SessionMemory):
        """Salva uma sessão individual."""
        filepath = self.sessions_dir / f"{session.session_id}.json"
        with open(filepath, "w", encoding="utf-8") as fp:
            json.dump(session.to_dict(), fp, indent=2, ensure_ascii=False)

    def _save_patterns(self, pattern_type: str):
        """Salva padrões de um tipo."""
        filepath = self.patterns_dir / f"{pattern_type}.json"
        with open(filepath, "w", encoding="utf-8") as fp:
            json.dump(
                [p.to_dict() for p in self.patterns.get(pattern_type, [])], fp, indent=2
            )

    def save_session(self, session_data: Dict[str, Any]) -> str:
        """
        Salva uma sessão completa.

        Args:
            session_data: Dados da sessão

        Returns:
            str: session_id gerado
        """
        session_id = session_data.get(
            "session_id", datetime.now().strftime("%Y%m%d_%H%M%S")
        )

        session = SessionMemory(
            session_id=session_id,
            started_at=session_data.get("started_at", datetime.now().isoformat()),
            ended_at=datetime.now().isoformat(),
            url=session_data.get("url", ""),
            message_count=session_data.get("message_count", 0),
            user_messages=session_data.get("user_messages", 0),
            ai_messages=session_data.get("ai_messages", 0),
            screenshots=session_data.get("screenshots", []),
            config_used=session_data.get("config", {}),
            success=session_data.get("success", True),
            error=session_data.get("error"),
            duration_seconds=session_data.get("duration_seconds", 0.0),
        )

        self.sessions.append(session)
        self._save_session(session)

        self.logger.info(f"💾 Sessão salva: {session_id}")

        # Atualizar padrões
        self._update_patterns(session)

        return session_id

    def _update_patterns(self, session: SessionMemory):
        """Atualiza padrões baseado na sessão."""

        # Pattern: URL patterns
        if session.success:
            url_pattern = (
                session.url.split("/share/")[0]
                if "/share/" in session.url
                else session.url
            )
            self._upsert_pattern(
                "url_patterns",
                url_pattern,
                session.success,
                config={"url": url_pattern},
            )

        # Pattern: Selectors que funcionaram
        config = session.config_used or {}
        selectors = config.get("message_selectors", [])
        if selectors and session.success:
            for selector in selectors:
                self._upsert_pattern(
                    "selectors",
                    selector,
                    session.success,
                    config={"selector": selector},
                )

        # Pattern: Configurações de sucesso
        if session.success:
            self._upsert_pattern(
                "success_configs",
                f"poll_{config.get('poll_interval', 5)}_headless_{config.get('headless', False)}",
                session.success,
                config=config,
            )

    def _upsert_pattern(
        self, pattern_type: str, pattern: str, success: bool, config: Dict[str, Any]
    ):
        """Adiciona ou atualiza um padrão."""
        patterns = self.patterns.get(pattern_type, [])

        # Verificar se já existe
        existing = None
        for p in patterns:
            if p.pattern == pattern:
                existing = p
                break

        if existing:
            if success:
                existing.success_count += 1
            else:
                existing.failure_count += 1
            existing.last_used = datetime.now().isoformat()
            existing.recommendation_score = existing.success_count / (
                existing.success_count + existing.failure_count + 1
            )
        else:
            patterns.append(
                PatternLearned(
                    pattern_type=pattern_type,
                    pattern=pattern,
                    success_count=1 if success else 0,
                    failure_count=0 if success else 1,
                    last_used=datetime.now().isoformat(),
                    recommendation_score=1.0 if success else 0.0,
                    **config,
                )
            )

        self.patterns[pattern_type] = patterns
        self._save_patterns(pattern_type)

    def learn_patterns(self) -> Dict[str, Any]:
        """
        Analisa sessões e gera recomendações.

        Returns:
            Dict com análise e recomendações
        """
        analysis = {
            "total_sessions": len(self.sessions),
            "successful_sessions": sum(1 for s in self.sessions if s.success),
            "failed_sessions": sum(1 for s in self.sessions if not s.success),
            "success_rate": 0.0,
            "avg_messages_per_session": 0,
            "best_selectors": [],
            "best_poll_interval": None,
            "recommendations": [],
        }

        if not self.sessions:
            return analysis

        # Calcular métricas
        successful = [s for s in self.sessions if s.success]
        analysis["success_rate"] = len(successful) / len(self.sessions)

        if successful:
            analysis["avg_messages_per_session"] = sum(
                s.message_count for s in successful
            ) / len(successful)

        # Melhores seletores (por taxa de sucesso)
        selector_success = defaultdict(lambda: {"success": 0, "total": 0})
        for s in self.sessions:
            selectors = (s.config_used or {}).get("message_selectors", [])
            for sel in selectors:
                selector_success[sel]["total"] += 1
                if s.success:
                    selector_success[sel]["success"] += 1

        sorted_selectors = sorted(
            selector_success.items(),
            key=lambda x: x[1]["success"] / max(x[1]["total"], 1),
            reverse=True,
        )

        analysis["best_selectors"] = [
            {
                "selector": sel,
                "success_rate": data["success"] / max(data["total"], 1),
                "uses": data["total"],
            }
            for sel, data in sorted_selectors[:5]
        ]

        # Melhor poll interval
        poll_intervals = defaultdict(lambda: {"success": 0, "total": 0})
        for s in self.sessions:
            interval = (s.config_used or {}).get("poll_interval", 5)
            poll_intervals[interval]["total"] += 1
            if s.success:
                poll_intervals[interval]["success"] += 1

        best_interval = max(
            poll_intervals.items(),
            key=lambda x: x[1]["success"] / max(x[1]["total"], 1),
        )
        analysis["best_poll_interval"] = {
            "interval": best_interval[0],
            "success_rate": best_interval[1]["success"]
            / max(best_interval[1]["total"], 1),
        }

        # Gerar recomendações
        recommendations = []

        if analysis["success_rate"] < 0.5:
            recommendations.append(
                {
                    "type": "warning",
                    "message": "Taxa de sucesso baixa. Considere revisar seletores.",
                    "action": "Revisar melhores seletores",
                }
            )

        if analysis["best_selectors"]:
            top_selector = analysis["best_selectors"][0]
            if top_selector["success_rate"] > 0.8:
                recommendations.append(
                    {
                        "type": "suggestion",
                        "message": f"Seletor '{top_selector['selector']}' tem alta taxa de sucesso",
                        "action": "Usar este seletor como padrão",
                    }
                )

        if analysis["best_poll_interval"]:
            recommendations.append(
                {
                    "type": "optimization",
                    "message": f"poll_interval={analysis['best_poll_interval']['interval']}s tem melhor resultado",
                    "action": f"Configurar poll_interval={analysis['best_poll_interval']['interval']}",
                }
            )

        analysis["recommendations"] = recommendations

        self.logger.info(f"📊 Análise: {analysis['success_rate'] * 100:.1f}% sucesso")

        return analysis

    def get_recommendations(self) -> Dict[str, Any]:
        """Retorna recomendações baseadas em padrões aprendidos."""
        return self.learn_patterns()

    def get_best_config(self) -> Dict[str, Any]:
        """Retorna melhor configuração baseada em histórico."""
        analysis = self.learn_patterns()

        config = {
            "message_selectors": [],
            "voice_selectors": [],
            "poll_interval": 5,
            "headless": False,
        }

        # Pegar melhores seletores
        for sel_info in analysis.get("best_selectors", [])[:3]:
            config["message_selectors"].append(sel_info["selector"])

        # Melhor poll interval
        if analysis.get("best_poll_interval"):
            config["poll_interval"] = analysis["best_poll_interval"]["interval"]

        return config

    def export_memory(self, filename: str = None) -> str:
        """
        Exporta toda a memória para um arquivo.

        Args:
            filename: Nome do arquivo (opcional)

        Returns:
            str: Caminho do arquivo exportado
        """
        if not filename:
            filename = f"memory_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"

        filepath = self.memory_dir / filename

        data = {
            "exported_at": datetime.now().isoformat(),
            "sessions": [s.to_dict() for s in self.sessions],
            "patterns": {k: [p.to_dict() for p in v] for k, v in self.patterns.items()},
        }

        with open(filepath, "w", encoding="utf-8") as fp:
            json.dump(data, fp, indent=2, ensure_ascii=False)

        self.logger.success(f"📦 Memória exportada: {filepath}")
        return str(filepath)

    def clear_old_sessions(self, days: int = 30) -> int:
        """
        Remove sessões antigas.

        Args:
            days: Idade mínima para remover

        Returns:
            int: Número de sessões removidas
        """
        from datetime import timedelta

        cutoff = datetime.now() - timedelta(days=days)
        old_count = 0

        for session in self.sessions[:]:
            session_date = datetime.fromisoformat(session.started_at)
            if session_date < cutoff:
                # Remover arquivo
                filepath = self.sessions_dir / f"{session.session_id}.json"
                if filepath.exists():
                    filepath.unlink()
                self.sessions.remove(session)
                old_count += 1

        self.logger.info(f"🗑️ {old_count} sessões antigas removidas")
        return old_count

    def print_stats(self):
        """Imprime estatísticas da memória."""
        analysis = self.learn_patterns()

        print("\n📊 Memory Stats:")
        print("-" * 40)
        print(f"  Total Sessions: {analysis['total_sessions']}")
        print(f"  Success Rate: {analysis['success_rate'] * 100:.1f}%")
        print(f"  Avg Messages: {analysis['avg_messages_per_session']:.1f}")
        print(
            f"  Best Poll: {analysis.get('best_poll_interval', {}).get('interval', 'N/A')}s"
        )
        print("-" * 40)

        if analysis.get("recommendations"):
            print("💡 Recomendações:")
            for rec in analysis["recommendations"]:
                print(f"  - {rec['message']}")
            print("-" * 40)


# Teste rápido
if __name__ == "__main__":
    memory = MemorySystem(memory_dir="./test_memory")

    # Simular algumas sessões
    memory.save_session(
        {
            "session_id": "test_001",
            "message_count": 50,
            "user_messages": 25,
            "ai_messages": 25,
            "success": True,
            "config": {"message_selectors": ["div.message"], "poll_interval": 5},
        }
    )

    memory.save_session(
        {
            "session_id": "test_002",
            "message_count": 30,
            "user_messages": 15,
            "ai_messages": 15,
            "success": True,
            "config": {
                "message_selectors": ["div.message", "article"],
                "poll_interval": 10,
            },
        }
    )

    memory.print_stats()

    print("\n🏆 Melhor configuração:")
    print(memory.get_best_config())
