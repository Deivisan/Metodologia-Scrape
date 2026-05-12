# 🤖 PROMPT MASTER — ORQUESTRADOR DOD

> **Função:** Orquestrador responsável por distribuir e executar os scripts DOD em 19 máquinas.
> **Posto:** Um dos PCs da rede (qualquer um, desde que tenha acesso SSH aos demais).
> **Missão:** Descobrir as máquinas pelos MACs, instalar a stack em todas, verificar e reportar.

---

## 🧭 MAPA DA PASTA `dod/`

```
dod/
│
├── macs.txt               ← COMEÇE AQUI. Lista dos 19 MACs
├── discover.sh            ← Escaneia rede, casa MAC → IP, gera hosts.txt
├── hosts.txt              ← GERADO pelo discover.sh (IP NOME MAC)
│
├── bootstrap.sh           ← Entrypoint curl (setup/verify/teardown via --flag)
├── setup_dod.sh           ← Instala tudo (nginx, docker, aws, repo, stack)
├── teardown_dod.sh        ← Remove tudo
├── verify_dod.sh          ← Verifica instalação
│
├── tracker.sh             ← Dashboard CLI (terminal)
├── dashboard.py           ← Dashboard WEB (localhost:8000)
├── deploy.sh              ← Deploy SSH paralelo (alternativa)
│
├── EXECUTAR.md            ← Guia passo a passo completo
└── prompt-master-dod.md   ← ← VOCÊ ESTÁ AQUI
```

---

## 🎯 FLUXO DE EXECUÇÃO (O QUE FAZER)

### ⚙️ 1. PREPARAR O PC ORQUESTRADOR

```bash
# Instalar dependências mínimas
apt-get install -y git curl python3 arp-scan sshpass

# Clonar o repositório
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape
```

### 📝 2. PREENCHER OS MACS

Edite `dod/macs.txt` com os 19 endereços MAC:

```txt
# Formato: MAC_ADDRESS  NOME_OPCIONAL
aa:bb:cc:dd:ee:01   pc-lab-01
aa:bb:cc:dd:ee:02   pc-lab-02
aa:bb:cc:dd:ee:03   pc-lab-03
...
```

> 💡 **Dica:** Se você não tem os MACs, pode pular essa etapa e ir direto para o `discover.sh --scan` que ele lista todos os dispositivos na rede.

### 🔍 3. DESCOBRIR OS IPs (AUTOMÁTICO)

```bash
sudo ./dod/discover.sh
```

Isso vai:
- Escanear a rede local (usa `arp-scan`, fallback `nmap`, fallback `ping + ip neigh`)
- Para cada MAC do `macs.txt`, encontrar o IP atual
- Gerar `dod/hosts.txt` automaticamente

Resultado esperado:
```
━━━ CORRESPONDÊNCIA MAC → IP ━━━
MAC                IP                 NOME                STATUS
────────────────────────────────────────────────────────────────────
aa:bb:cc:dd:ee:01  192.168.1.10       pc-lab-01           ✅
aa:bb:cc:dd:ee:02  192.168.1.11       pc-lab-02           ✅
...
aa:bb:cc:dd:ee:19  ?                  pc-lab-19           ❌  ← desligado ou fora da rede
```

> ⚠️ Se algum MAC não for encontrado, a máquina pode estar desligada ou em rede diferente. Verifique antes de prosseguir.

### ✅ 4. TESTAR CONECTIVIDADE

```bash
# Testar SSH em todas as máquinas
./dod/tracker.sh --status
```

### 🧪 5. TESTE EM 1 MÁQUINA (PROVA REAL)

Sempre teste em **uma** máquina antes de disparar nas 19:

```bash
# Setup manual em uma
ssh root@192.168.1.10 "curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash"

# Verificar
ssh root@192.168.1.10 "curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash -s -- --verify"
```

Se falhar → debugar e corrigir antes de continuar.
Se passar → pode disparar nas 19.

### 🚀 6. EXECUTAR NAS 19 MÁQUINAS

**Opção A — Dashboard Web (recomendado):**
```bash
# Terminal 1: servidor web
python3 ./dod/dashboard.py

# Navegador: http://localhost:8000
# Clique em ▶ Setup
```

**Opção B — Terminal CLI:**
```bash
./dod/tracker.sh
```

Ambos mostram resultado em tempo real:
```
#    IP              NOME        STATUS     DETALHES
1    192.168.1.10    pc-lab-01   ✅ OK      exit 0
2    192.168.1.11    pc-lab-02   ⏳ RUN     instalando docker...
...
```

### 🔍 7. VERIFICAR TODAS

```bash
# Dashboard: clique em 🔍 Verificar
# Ou terminal:
./dod/tracker.sh --verify
```

### 🧹 8. LIMPAR TUDO (QUANDO TERMINAR)

```bash
# Dashboard: clique em 🗑️ Limpar
# Ou terminal:
./dod/tracker.sh --teardown
```

---

## 🔐 CREDENCIAIS (TODAS IGUAIS)

| Campo | Valor |
|-------|-------|
| Usuário SSH | `root` |
| Senha SSH | `8u@3tArb!` |
| Usuário criado | `devopsdays` |
| Senha devopsdays | `cetensufrb` |

---

## 🧠 REGRAS DE OURO PARA O ORQUESTRADOR

1. **MACs primeiro** — se você tem os 19 MACs, o `discover.sh` acha os IPs sozinho
2. **Sempre teste em 1 antes** — não queime 19 máquinas de uma vez
3. **Não feche o terminal do dashboard** — senão perde o progresso
4. **Senha SSH igual pra todas** — `8u@3tArb!`
5. **Cada máquina leva ~3-5min** para instalar tudo
6. **Roda em paralelo** — 19 máquinas levam ~10min no total
7. **Se uma falhar** — o log aparece na tabela, debugue por SSH
8. **Cache do raw.githubusercontent** — se der 404, espera 2 minutos e tenta de novo

---

## 🆘 RESOLUÇÃO DE PROBLEMAS COMUNS

| Problema | Causa | Solução |
|----------|-------|---------|
| MAC não encontrado | Máquina desligada | Ligar e rodar `discover.sh` de novo |
| `ssh: Connection refused` | SSH não instalado | `apt-get install openssh-server` na máquina |
| `Permission denied` | Senha errada | Confirmar `8u@3tArb!` |
| Dashboard não sobe | Python sem porta | `python3 -m http.server 8000` pra testar |
| `arp-scan: not found` | Não instalado | `apt-get install arp-scan` (ou usa fallback) |
| `hosts.txt` vazio | Nenhum MAC encontrado | Verificar `macs.txt` e rede |
| Seu PC orquestrador precisa virar alvo também? | Rode o bootstrap local: `./dod/bootstrap.sh` |

---

## 📦 RESUMO DOS SCRIPTS (O QUE CADA UM FAZ)

| Script | Função |
|--------|--------|
| `bootstrap.sh` | Entrypoint via curl. Aceita `--verify` e `--teardown` |
| `setup_dod.sh` | Instala nginx, docker, aws cli, clona repo, sobe stack |
| `teardown_dod.sh` | Remove containers, nginx, docker, usuário |
| `verify_dod.sh` | Verifica: usuário, docker, containers, localstack, aws, nginx |
| `discover.sh` | Escaneia rede, casa MACs com IPs, gera hosts.txt |
| `tracker.sh` | Dashboard via terminal com tabela ao vivo |
| `dashboard.py` | Dashboard via navegador (localhost:8000) |
| `deploy.sh` | Deploy SSH paralelo (alternativa avançada) |

---

## 🏁 CHECKLIST DO ORQUESTRADOR

- [ ] `git clone` feito
- [ ] `dod/macs.txt` preenchido com 19 MACs
- [ ] `sudo ./dod/discover.sh` rodado
- [ ] `dod/hosts.txt` gerado com IPs
- [ ] Teste em 1 máquina passou
- [ ] Dashboard rodando (`python3 dod/dashboard.py`)
- [ ] ▶ Setup clicado / tracker disparado
- [ ] 19/19 ✅ concluídos
- [ ] 🔍 Verify rodou em todas
- [ ] 🧹 Teardown (se necessário)

---

> **Missão do orquestrador:** Dois terminais abertos. Um com o dashboard (`:8000`), outro para debug. Monitorar a tabela até todos ficarem ✅ OK. Se algo falhar, SSH direto na máquina e resolve.
