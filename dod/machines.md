# Máquinas Configuradas — DevOpsDays FSA

| # | Hostname | IP | MAC | Status | Data | Observação |
|---|----------|----|-----|--------|------|------------|
| 15 | LAB-INFO-02-15 | 10.17.15.142 | 18:a5:9c:b0:8b:6b | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |

---

## Legenda

- **Pendente** — não configurada
- **⚡ Setup** — instalação em andamento
- **✅ OK** — configurada e verificada
- **❌ Erro** — falha na instalação
- **🧹 Teardown** — limpeza realizada

## Como usar

Liste IPs das máquinas pendentes, passe para o orquestrador (este script),
e ele dispara o setup em paralelo via SSH.
