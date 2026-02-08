"""
Message Parser - Parser de Mensagens User vs AI
================================================

Extrai, parseia e classifica mensagens do DOM.
Distingue entre mensagens do usuário e do agente de IA.

Funcionalidades:
- Classificação automática user/AI
- Extração de texto completo
- Detecção de metadata (timestamp, etc)
- Deduplicação de mensagens
- Compressão para tokens
"""

import re
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass, field
from pathlib import Path

from .logger import AgentLogger


@dataclass
class ParsedMessage:
    """Representa uma mensagem parseada."""

    index: int
    text: str
    html: str
    is_user: bool  # True=usuário, False=IA
    timestamp: Optional[str] = None
    tokens_estimate: int = 0
    selectors_used: List[str] = field(default_factory=list)
    has_code: bool = False
    code_language: Optional[str] = None


@dataclass
class ParseResult:
    """Resultado da análise de mensagens."""

    messages: List[ParsedMessage]
    user_count: int
    ai_count: int
    total_tokens: int
    last_index: int
    new_messages: List[ParsedMessage]
    is_complete: bool


class MessageParser:
    """
    Parser inteligente de mensagens.

    Usa múltiplas heurísticas para classificar user vs AI:
    1. Seletores CSS explícitos
    2. Padrões de texto (prefixos como "Human:", "Assistant:")
    3. Posição na conversa
    4. Estilo visual (classes CSS)

    Uso:
        parser = MessageParser()
        result = await parser.parse(html_content)
    """

    # Padrões para detectar mensagens de IA
    AI_PATTERNS = [
        r"^(Grok|Assistant|AI|Bot|Rex|SAL):",
        r"^(Thinking|Thought):",
        r"\[Thinking\.\.\.\]",
        r"<div[^>]*class=\"[^']*response[^']*\"",
        '<article[^>]*data-testid="',
        r"class=\"[^\"]*(?:ai|assistant|bot|response)[^\"]*\"",
    ]

    # Padrões para detectar mensagens de usuário
    USER_PATTERNS = [
        r"^(Human|User|You):",
        r"^E ?[aàí],",
        r"^Ó,",
        r"^Tá,",
        r"^Beleza",
        r"<div[^>]*class=\"[^\"]*(?:user|human|sender)[^\"]*\"",
        r"data-user=\"(?:human|user)\"",
    ]

    # Padrões para detectar código
    CODE_PATTERNS = [
        r"```(\w+)?",
        r"`[^`]+`",
        r"(?:function|const|let|var|def|class)\s+\w+",
        r"\{\s*[\w]+\s*:",
    ]

    def __init__(self, log_dir: str = "./logs"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.logger = AgentLogger(log_dir=self.log_dir, name="message_parser")

    def parse(
        self, html: str, existing_messages: List[ParsedMessage] = None
    ) -> ParseResult:
        """
        Faz parse do HTML e extrai mensagens.

        Args:
            html: HTML da página
            existing_messages: Lista de mensagens já processadas (para deduplicação)

        Returns:
            ParseResult: Resultado do parse
        """
        existing_messages = existing_messages or []

        messages = []
        user_count = 0
        ai_count = 0
        total_tokens = 0
        last_index = len(existing_messages)

        # Extrair mensagens do HTML
        raw_messages = self._extract_messages(html)

        # Filtrar mensagens já existentes
        new_messages = []
        for msg_data in raw_messages:
            msg = self._parse_message(msg_data, len(messages))

            # Verificar se já existe (deduplicação)
            if not self._is_duplicate(msg, existing_messages):
                messages.append(msg)
                total_tokens += msg.tokens_estimate

                if msg.is_user:
                    user_count += 1
                else:
                    ai_count += 1

                # Se é nova e depois do last_index, adicionar
                if msg.index >= last_index:
                    new_messages.append(msg)

        return ParseResult(
            messages=messages,
            user_count=user_count,
            ai_count=ai_count,
            total_tokens=total_tokens,
            last_index=messages[-1].index if messages else -1,
            new_messages=new_messages,
            is_complete=len(messages) > 0,
        )

    def _extract_messages(self, html: str) -> List[Dict[str, Any]]:
        """Extrai mensagens brutas do HTML."""
        import re

        messages = []

        # Padrão para divs de mensagens (ajustar conforme necessidade)
        pattern = r'<div[^>]*class="[^"]*message[^"]*"[^>]*>(.*?)</div>'

        for match in re.finditer(pattern, html, re.DOTALL | re.IGNORECASE):
            messages.append(
                {
                    "html": match.group(0),
                    "text": self._clean_text(match.group(1)),
                    "index": len(messages),
                }
            )

        # Se não encontrou pelo padrão, usar fallback
        if not messages:
            # Tentar extrair de outra forma
            prose_pattern = r'<div class="prose[^"]*">(.*?)</div>'
            for match in re.finditer(prose_pattern, html, re.DOTALL):
                messages.append(
                    {
                        "html": match.group(0),
                        "text": self._clean_text(match.group(1)),
                        "index": len(messages),
                    }
                )

        self.logger.debug(f"📊 Extraídas {len(messages)} mensagens brutas")
        return messages

    def _parse_message(
        self, msg_data: Dict[str, Any], current_index: int
    ) -> ParsedMessage:
        """Faz parse de uma mensagem individual."""
        text = msg_data.get("text", "")
        html = msg_data.get("html", "")

        # Classificar user vs AI
        is_user = self._classify_message(text, html)

        # Detectar código
        has_code, code_lang = self._detect_code(text)

        # Estimar tokens (aproximadamente 4 caracteres por token)
        tokens_estimate = len(text) // 4

        return ParsedMessage(
            index=current_index,
            text=text,
            html=html[:500] if html else "",
            is_user=is_user,
            tokens_estimate=tokens_estimate,
            has_code=has_code,
            code_language=code_lang,
        )

    def _classify_message(self, text: str, html: str) -> bool:
        """
        Classifica uma mensagem como usuário ou AI.

        Returns:
            True se é mensagem do usuário, False se é da AI
        """
        combined = (text + " " + html).lower()

        # Checar padrões de AI primeiro
        for pattern in self.AI_PATTERNS:
            if re.search(pattern, combined, re.IGNORECASE):
                return False  # É AI

        # Checar padrões de usuário
        for pattern in self.USER_PATTERNS:
            if re.search(pattern, combined):
                return True  # É usuário

        # Heurística: se começa com emoji ou indicador de conversa
        if re.match(r"^[\U0001F300-\U0001F9FF]\s", text):
            return True  # Geralmente usuário

        # Padrão específico do Grok: "E aí" geralmente é usuário
        if text.startswith("E ") or text.startswith("Ó ") or text.startswith("Tá "):
            return True

        # Default: primeira mensagem da conversa é do usuário
        # (Isso é uma heurística que pode falhar)
        return True

    def _detect_code(self, text: str) -> tuple:
        """Detecta se a mensagem contém código."""
        for pattern in self.CODE_PATTERNS:
            match = re.search(pattern, text)
            if match:
                lang = None
                if pattern.startswith("```"):
                    lang = match.group(1) if match.group(1) else "text"
                elif "function" in pattern or "const" in pattern:
                    lang = "javascript"
                elif "def " in pattern:
                    lang = "python"
                elif "class " in pattern:
                    lang = "python"  # ou Java, etc.
                return True, lang
        return False, None

    def _clean_text(self, text: str) -> str:
        """Limpa texto extraído do HTML."""
        # Remover tags HTML
        clean = re.sub(r"<[^>]+>", " ", text)
        # Remover espaços múltiplos
        clean = re.sub(r"\s+", " ", clean)
        # Remover emojis de sistema
        clean = re.sub(r"[\U0001F300-\U0001F9FF]", "", clean)
        # Limpar espaços
        clean = clean.strip()
        return clean

    def _is_duplicate(self, msg: ParsedMessage, existing: List[ParsedMessage]) -> bool:
        """Verifica se a mensagem já existe."""
        for existing_msg in existing:
            if existing_msg.text == msg.text and existing_msg.is_user == msg.is_user:
                return True
        return False

    def format_for_context(
        self, messages: List[ParsedMessage], max_tokens: int = 8000
    ) -> str:
        """
        Formata mensagens para uso como contexto.

        Args:
            messages: Lista de mensagens
            max_tokens: Limite de tokens

        Returns:
            str: Texto formatado
        """
        result = []
        current_tokens = 0

        # Inverter para mostrar mais recentes primeiro
        reversed_messages = list(reversed(messages))

        for msg in reversed_messages:
            prefix = "🧑" if msg.is_user else "🤖"
            line = f"{prefix} [{msg.index}] {msg.text[:500]}"

            line_tokens = len(line) // 4
            if current_tokens + line_tokens > max_tokens:
                break

            result.append(line)
            current_tokens += line_tokens

        # Reverter de volta
        result.reverse()

        return "\n".join(result)

    def summarize_conversation(self, messages: List[ParsedMessage]) -> Dict[str, Any]:
        """Gera um resumo da conversa."""
        if not messages:
            return {
                "message_count": 0,
                "user_messages": 0,
                "ai_messages": 0,
                "topics": [],
                "has_code": False,
                "summary": "Conversa vazia",
            }

        # Contar
        user_count = sum(1 for m in messages if m.is_user)
        ai_count = len(messages) - user_count

        # Detectar se tem código
        has_code = any(m.has_code for m in messages)

        # Extrair primeiras frases de cada mensagem do usuário
        user_inputs = []
        for m in messages:
            if m.is_user:
                first_sentence = m.text.split(".")[0][:100]
                if first_sentence:
                    user_inputs.append(first_sentence)

        return {
            "message_count": len(messages),
            "user_messages": user_count,
            "ai_messages": ai_count,
            "total_tokens_estimate": sum(m.tokens_estimate for m in messages),
            "has_code": has_code,
            "topics": user_inputs[:3],  # Primeiros 3 inputs
            "summary": f"{user_count} mensagens do usuário, {ai_count} da AI",
        }


# Teste rápido
if __name__ == "__main__":
    parser = MessageParser()

    # Simular parsing
    sample_html = """
    <div class="message-bubble">E aí, beleza?</div>
    <div class="response-content">Olá! Tudo bem com você?</div>
    <div class="message-bubble">Ó, você consegue fazer uma pesquisa?</div>
    <div class="response-content">Claro! O que você precisa?</div>
    """

    result = parser.parse(sample_html)
    print(f"Messages: {result.message_count}")
    print(f"User: {result.user_count}, AI: {result.ai_count}")
    print(f"Total tokens: {result.total_tokens}")
    print(f"Context format:")
    print(parser.format_for_context(result.messages))
