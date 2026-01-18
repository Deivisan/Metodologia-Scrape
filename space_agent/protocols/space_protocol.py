"""
SPACE Protocol Implementation
=============================

Implementação do SPACE Protocol (Synchronized Protocol for Autonomous Conversational Exchange).

Este protocolo define como capturar, versionar e persistir conversas de IA
de forma estruturada, permitindo que agentes saibam exatamente o que foi
dito, quando foi dito, e em que contexto.

SPACE = Synchronized Persistent Autonomous Conversational Exchange

Estrutura:
- S: Synchronized Context (contexto sincronizado entre agent e conversa)
- P: Persistent Metadata (metadados persistentes para cada captura)
- A: Agent Awareness (agente sabe quem falou - user vs AI)
- C: Capture Intelligence (captura inteligente, não duplica)
- E: Execution Flow (fluxo de execução rastreável)
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict, field

from .logger import AgentLogger


@dataclass
class SpaceSession:
    """
    Representa uma sessão SPACE completa.

    Esta é a estrutura principal que contém tudo sobre uma sessão
    de conversa capturada.
    """

    # Identificação
    id: str
    created_at: str
    channel: str  # 'grok-voice', 'grok-text', 'claude-voice', etc.

    # Contexto da conversa
    conversation: Dict[str, Any] = field(default_factory=dict)

    # Capturas
    captures: List[Dict[str, Any]] = field(default_factory=list)

    # Prompts inseridos
    prompts: List[Dict[str, Any]] = field(default_factory=list)

    # Artefatos (arquivos, imagens, etc)
    artifacts: List[Dict[str, Any]] = field(default_factory=list)

    # Estado do canal
    channel_state: Dict[str, Any] = field(default_factory=dict)

    # Metadados da sessão
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)

    def to_json(self, indent: int = 2) -> str:
        return json.dumps(self.to_dict(), indent=indent, ensure_ascii=False)

    def save(self, dir_path: str):
        """Salva a sessão em disco."""
        filepath = Path(dir_path) / f"{self.id}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(self.to_json())
        return str(filepath)


@dataclass
class Capture:
    """Uma captura individual."""

    id: str
    timestamp: str
    trigger: str  # 'manual', 'auto-poll', 'new-message', 'screenshot'

    # Conteúdo
    html: str
    text: str

    # Mensagens extraídas
    messages: List[Dict[str, Any]] = field(default_factory=list)
    new_messages: List[Dict[str, Any]] = field(default_factory=list)

    # Estado do canal
    voice_active: bool = False
    voice_toggles: int = 0

    # Metadados
    message_count: int = 0
    user_messages: int = 0
    ai_messages: int = 0

    # Sucesso
    success: bool = True
    error: Optional[str] = None

    # Screenshots
    screenshot_path: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class SPACEProtocol:
    """
    Implementação do SPACE Protocol.

    Gerencia sessões de captura de conversas de IA,
    mantendo contexto, metadados e rastreabilidade.

    Uso:
        protocol = SPACEProtocol(output_dir="./captures")

        # Iniciar sessão
        session = protocol.start_session(
            url="https://grok.com/share/...",
            channel="grok-voice"
        )

        # Registrar captura
        protocol.register_capture(session, capture_data)

        # Finalizar
        protocol.end_session(session)
    """

    def __init__(self, output_dir: str = "./captures", log_dir: str = "./logs"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)

        self.logger = AgentLogger(log_dir=self.log_dir, name="space_protocol")
        self.current_session: Optional[SpaceSession] = None

    def start_session(
        self, url: str, channel: str, initial_context: Dict[str, Any] = None
    ) -> SpaceSession:
        """
        Inicia uma nova sessão SPACE.

        Args:
            url: URL da conversa
            channel: Canal ('grok-voice', 'claude-voice', etc)
            initial_context: Contexto inicial (opcional)

        Returns:
            SpaceSession: A sessão criada
        """
        session_id = f"space_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

        self.current_session = SpaceSession(
            id=session_id,
            created_at=datetime.now().isoformat(),
            channel=channel,
            conversation={
                "url": url,
                "title": "",
                "persistent": True,  # Grok Share links são persistentes
                "initial_context": initial_context or {},
            },
            channel_state={
                "voice_active": False,
                "voice_toggle_count": 0,
                "started_at": datetime.now().isoformat(),
            },
        )

        self.logger.info(f"🚀 Sessão SPACE iniciada: {session_id} | {channel}")

        # Salvar imediatamente
        self._save_session(self.current_session)

        return self.current_session

    def register_capture(
        self, session: SpaceSession, capture_data: Dict[str, Any]
    ) -> Capture:
        """
        Registra uma captura na sessão.

        Args:
            session: Sessão ativa
            capture_data: Dados da captura

        Returns:
            Capture: A captura criada
        """
        capture_id = f"cap_{datetime.now().strftime('%H%M%S_%f')}"

        capture = Capture(
            id=capture_id,
            timestamp=datetime.now().isoformat(),
            trigger=capture_data.get("trigger", "manual"),
            html=capture_data.get("html", ""),
            text=capture_data.get("text", ""),
            messages=capture_data.get("messages", []),
            new_messages=capture_data.get("new_messages", []),
            voice_active=capture_data.get("voice_active", False),
            voice_toggles=capture_data.get("voice_toggles", 0),
            message_count=capture_data.get("message_count", 0),
            user_messages=capture_data.get("user_messages", 0),
            ai_messages=capture_data.get("ai_messages", 0),
            success=capture_data.get("success", True),
            error=capture_data.get("error"),
            screenshot_path=capture_data.get("screenshot_path"),
        )

        session.captures.append(capture.to_dict())

        # Atualizar estado do canal
        session.channel_state["last_capture"] = datetime.now().isoformat()
        session.channel_state["total_captures"] = len(session.captures)
        session.channel_state["voice_active"] = capture.voice_active
        session.channel_state["voice_toggle_count"] = (
            capture.voice_toggles + session.channel_state.get("voice_toggle_count", 0)
        )

        self.logger.info(
            f"📸 Captura registrada: {capture_id} | {len(capture.new_messages)} novas msgs"
        )

        # Salvar sessão
        self._save_session(session)

        return capture

    def register_prompt(
        self, session: SpaceSession, prompt_content: str, source: str = "manual"
    ):
        """
        Registra um prompt inserido na conversa.

        Args:
            session: Sessão ativa
            prompt_content: Conteúdo do prompt
            source: Origem ('manual', 'system', 'agent')
        """
        prompt = {
            "id": f"prompt_{datetime.now().strftime('%H%M%S_%f')}",
            "timestamp": datetime.now().isoformat(),
            "content": prompt_content,
            "source": source,
            "length": len(prompt_content),
        }

        session.prompts.append(prompt)
        self.logger.info(f"📝 Prompt registrado: {source}")

        self._save_session(session)

    def register_artifact(
        self, session: SpaceSession, artifact_type: str, name: str, path: str = None
    ):
        """
        Registra um artefato (arquivo, imagem, etc).

        Args:
            session: Sessão ativa
            artifact_type: Tipo ('file', 'image', 'code', 'screenshot')
            name: Nome do artefato
            path: Caminho (opcional)
        """
        artifact = {
            "id": f"art_{datetime.now().strftime('%H%M%S_%f')}",
            "timestamp": datetime.now().isoformat(),
            "type": artifact_type,
            "name": name,
            "path": path,
        }

        session.artifacts.append(artifact)
        self.logger.info(f"📦 Artefato registrado: {artifact_type} - {name}")

        self._save_session(session)

    def update_conversation_info(
        self, session: SpaceSession, title: str = None, url: str = None
    ):
        """Atualiza informações da conversa."""
        if title:
            session.conversation["title"] = title
        if url:
            session.conversation["url"] = url

        self._save_session(session)

    def end_session(self, session: SpaceSession) -> Dict[str, Any]:
        """
        Finaliza uma sessão e gera relatório.

        Args:
            session: Sessão a finalizar

        Returns:
            Dict com relatório da sessão
        """
        report = {
            "session_id": session.id,
            "channel": session.channel,
            "started_at": session.created_at,
            "ended_at": datetime.now().isoformat(),
            "total_captures": len(session.captures),
            "total_prompts": len(session.prompts),
            "total_artifacts": len(session.artifacts),
            "total_messages": 0,
            "user_messages": 0,
            "ai_messages": 0,
            "voice_toggles": session.channel_state.get("voice_toggle_count", 0),
            "duration_seconds": 0,
            "status": "completed",
        }

        # Calcular métricas
        for capture in session.captures:
            report["total_messages"] += capture.get("message_count", 0)
            report["user_messages"] += capture.get("user_messages", 0)
            report["ai_messages"] += capture.get("ai_messages", 0)

        # Calcular duração
        started = datetime.fromisoformat(session.created_at)
        ended = datetime.fromisoformat(report["ended_at"])
        report["duration_seconds"] = (ended - started).total_seconds()

        session.metadata["end_report"] = report
        session.metadata["status"] = "completed"

        self._save_session(session)

        self.logger.success(
            f"✅ Sessão finalizada: {session.id} | "
            f"{report['total_captures']} capturas | "
            f"{report['duration_seconds']:.1f}s"
        )

        return report

    def _save_session(self, session: SpaceSession):
        """Salva a sessão em disco."""
        filepath = self.output_dir / f"{session.id}.json"
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(session.to_json())

    def load_session(self, session_id: str) -> Optional[SpaceSession]:
        """Carrega uma sessão do disco."""
        filepath = self.output_dir / f"{session_id}.json"
        if not filepath.exists():
            return None

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)
            return SpaceSession(**data)

    def get_session_summary(self, session: SpaceSession) -> str:
        """Gera um resumo formatado da sessão."""
        lines = [
            f"📋 SESSION: {session.id}",
            f"📅 Criado: {session.created_at}",
            f"📡 Canal: {session.channel}",
            f"🔗 URL: {session.conversation.get('url', 'N/A')}",
            "-" * 40,
            f"📸 Capturas: {len(session.captures)}",
            f"📝 Prompts: {len(session.prompts)}",
            f"📦 Artefatos: {len(session.artifacts)}",
            f"🎤 Voice Toggles: {session.channel_state.get('voice_toggle_count', 0)}",
        ]

        if session.captures:
            last_capture = session.captures[-1]
            lines.extend(
                [
                    "-" * 40,
                    f"Última captura: {last_capture.get('timestamp', 'N/A')}",
                    f"Mensagens: {last_capture.get('message_count', 0)}",
                    f"Novas: {len(last_capture.get('new_messages', []))}",
                ]
            )

        return "\n".join(lines)


# Funções utilitárias
def create_space_session(
    url: str, channel: str, output_dir: str = "./captures"
) -> SpaceSession:
    """Factory para criar sessões SPACE."""
    protocol = SPACEProtocol(output_dir=output_dir)
    return protocol.start_session(url, channel)


# Teste rápido
if __name__ == "__main__":
    protocol = SPACEProtocol()

    # Iniciar sessão
    session = protocol.start_session(
        url="https://grok.com/share/test123", channel="grok-voice"
    )

    # Registrar captura
    protocol.register_capture(
        session,
        {
            "trigger": "auto-poll",
            "message_count": 10,
            "user_messages": 5,
            "ai_messages": 5,
            "new_messages": [{"index": 5, "text": "Nova mensagem", "is_user": True}],
            "voice_active": True,
            "voice_toggles": 2,
            "messages": [{"index": i, "text": f"Mensagem {i}"} for i in range(10)],
        },
    )

    # Registrar prompt
    protocol.register_prompt(session, "Você é o SAL, um assistente...", source="system")

    # Finalizar
    report = protocol.end_session(session)

    print("\n" + "=" * 50)
    print(protocol.get_session_summary(session))
    print("=" * 50)
    print("\n📊 Relatório:")
    for k, v in report.items():
        print(f"  {k}: {v}")
