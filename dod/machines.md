# Máquinas Configuradas — DevOpsDays FSA

| # | Hostname | IP | MAC | Status | Data | Observação |
|---|----------|----|-----|--------|------|------------|
| 15 | LAB-INFO-02-15 | 10.17.15.142 | 18:a5:9c:b0:8b:6b | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| 16 | LAB-INFO-02-16 | 10.17.15.122 | 10:dc:b6:25:c0:1b | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| 2  | LAB-INFO-02-02 | 10.17.15.161 | 10:dc:b6:25:92:b2 | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| ?  | ? | 10.17.15.123 | 10:dc:b6:25:95:5a | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| 18 | LAB-INFO-02-18 | 10.17.15.163 | 10:dc:b6:25:bc:8f | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| 17 | LAB-INFO-02-17 | 10.17.15.164 | 18:a5:9c:b0:8a:d4 | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| 19 | LAB-INFO-02-19 | 10.17.15.165 | 10:dc:b6:25:ba:ab | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| 1  | LAB-INFO-02-01 | 10.17.15.168 | 10:dc:b6:25:8e:f5 | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |
| ?  | ? | 10.17.15.171 | 18:a5:9c:b0:90:34 | ✅ OK | 2026-05-12 | Nginx host, LocalStack container, AWS CLI host |

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
