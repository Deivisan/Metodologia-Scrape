# 📐 Metodologia de Extração e Estruturação de Dados

Esta metodologia define os padrões para transformar conteúdo web não estruturado (HTML, SPAs) em dados semânticos úteis para desenvolvimento e automação via IA.

## 1. Princípios Fundamentais

### A. Contexto é Rei
Capturar apenas o texto é insuficiente. Para que uma IA compreenda uma conversa ou documentação, ela precisa saber:
*   **Origem:** Quem produziu a informação (Humano, Máquina, Sistema)?
*   **Temporalidade:** Quando a informação foi gerada?
*   **Tipo:** É um texto descritivo? Um bloco de código executável? Um comando de terminal?

### B. Agnosticismo de Plataforma
Os scripts de extração devem ser capazes de rodar em qualquer ambiente computacional moderno que suporte Node.js:
*   Servidores Linux (Headless)
*   Dispositivos Móveis (via Termux)
*   Desktops de Desenvolvimento (Windows/Mac/Linux)

### C. Resiliência
A web é volátil. Seletores CSS mudam. Conexões caem. O scraper deve:
1.  Tentar múltiplos métodos de localização de elementos (Seletores semânticos > IDs > Classes).
2.  Falhar graciosamente (gerar um dump "Raw" se a estruturação falhar).
3.  Simular comportamento humano (scroll, user-agent) para acessar o conteúdo.

---

## 2. Estrutura de Dados (Schema)

O output padrão da metodologia é um objeto JSON contendo:

```json
{
  "metadata": {
    "source": "URL",
    "timestamp": "ISO8601",
    "environment": "Termux/Desktop"
  },
  "conversation": [
    {
      "index": 0,
      "author": "User/AI/System",
      "content": "Texto completo...",
      "code": [
        { "lang": "javascript", "content": "console.log('...')" }
      ],
      "intents": {
        "files": [{ "action": "create", "path": "script.js" }],
        "commands": ["npm install"]
      }
    }
  ]
}
```

## 3. Fluxo de Trabalho com Agentes

1.  **Descoberta:** O desenvolvedor fornece uma URL ao Agente.
2.  **Execução:** O Agente invoca o `scrape.js`.
3.  **Ingestão:** O Agente lê o Markdown gerado para entender o problema/solução.
4.  **Ação:** O Agente utiliza os blocos de código e comandos extraídos no JSON para executar a tarefa solicitada.
