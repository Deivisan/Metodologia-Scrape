# 🤖 ORQUESTRADOR DOD — AGENTIC

> **Posto:** PC do instrutor na mesma rede que as 19 máquinas do lab.
> **Missão:** Receber IPs, instalar a stack completa em cada máquina via SSH, reportar status.

---

## 🔐 ACESSO PADRÃO (TODAS IGUAIS)

| | Valor |
|---|---|
| SSH user | `aluno` |
| SSH senha | `cetensufrb` |
| Root senha | `8u@3tArb!` |
| sudo | `aluno` tem acesso via `su` |

**Fluxo de conexão SSH:**
```
ssh aluno@<IP>
su - (senha: 8u@3tArb!)
```

---

## 📋 STACK INSTALADA (POR MÁQUINA)

### No HOST (sistema)
- `nginx` — servidor web na porta 80
- `aws cli v2` — em `/home/devopsdays/.local/bin/aws`
- `git` + `curl` + `wget` — utilitários
- `repo dod-fsa` — clonado em `/home/devopsdays/dod-fsa/`

### Em CONTAINER (Docker)
- `dod-localstack` — LocalStack 3.5.0 na porta 4566

---

## 🔧 PRIMEIRA VEZ: PREPARAR O ORQUESTRADOR

```bash
# Instalar ferramentas
apt-get install -y sshpass

# Clonar repo (se não tiver)
git clone https://github.com/Deivisan/Metodologia-Scrape.git
cd Metodologia-Scrape
```

---

## 🚀 INSTALAR EM UMA MÁQUINA (PROVA REAL)

Sempre testar em 1 antes de批量:

```bash
# 1. Verificar conexão SSH
sshpass -p 'cetensufrb' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -l aluno <IP> 'echo OK'

# 2. Habilitar SSH root (se necessário)
sshpass -p 'cetensufrb' ssh -o StrictHostKeyChecking=no -l aluno <IP> \
  'echo "8u@3tArb!" | su -c "sed -i s/#PermitRootLogin/prohibit-password/PermitRootLogin/ /etc/ssh/sshd_config; systemctl restart ssh" root'

# 3. Instalar stack via bootstrap
sshpass -p '8u@3tArb!' ssh -o StrictHostKeyChecking=no root@<IP> \
  'curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | bash'

# 4. Verificar
sshpass -p '8u@3tArb!' ssh -o StrictHostKeyChecking=no root@<IP> \
  'curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | bash -s -- --verify'
```

---

## 🚀 INSTALAR EM N MÁQUINAS (PARALELO)

```bash
# Loop paralelo via SSH
for IP in $(cat <<<"10.17.15.142
10.17.15.143"); do
    (
        echo "[$IP] Iniciando..."
        sshpass -p '8u@3tArb!' ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 root@$IP \
            'curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | bash' \
            && echo "[$IP] ✅ OK" || echo "[$IP] ❌ ERRO"
    ) &
done
wait
```

---

## 🔍 VERIFICAR MÁQUINAS

```bash
# Check rápido — SSH root + systemctl/status
for IP in $(cat <<<"10.17.15.142
10.17.15.143"); do
    sshpass -p '8u@3tArb!' ssh -o StrictHostKeyChecking=no root@$IP 'echo -n "$IP: "; systemctl is-active nginx docker; curl -s -o /dev/null -w "nginx=%{http_code} " http://localhost/; docker ps --format "{{.Names}}"' &
done
wait
```

---

## 🧹 TEARDOWN (LIMPEZA)

```bash
sshpass -p '8u@3tArb!' ssh -o StrictHostKeyChecking=no root@<IP> \
  'curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | bash -s -- --teardown'
```

---

## 📄 SCRIPTS DISPONÍVEIS

| Script | O que faz |
|---|---|
| `setup_dod.sh` | Tudo: nginx (host), docker, localstack (container), aws cli (host), repo |
| `verify_dod.sh` | Verifica: nginx, localstack, aws cli, repo |
| `teardown_dod.sh` | Remove tudo |
| `bootstrap.sh` | Entry point curl — chama setup/verify/teardown |
| `discover.sh` | Escaneia rede, casa MAC→IP (lê macs.json ou macs.txt) |
| `machines.md` | Log das máquinas configuradas |

---

## 📊 LOG DE MÁQUINAS

Veja `dod/machines.md` — lista as 19 máquinas com IP, MAC, hostname e status.

---

## ⚡ REGRAS DE OURO

1. **Sempre testar em 1 antes** — nunca批量 em 19 de uma vez
2. **SSH root precisa de PermitRootLogin yes** — verificar na primeira máquina
3. **curl sempre instalado primeiro** — se falhar, instalar na mão
4. **LocalStack demora ~60s no primeiro start** — health check pode timeoutar (normal)
5. **Se bootstrap falhar** — SSH manual + debug
6. **Parallel jobs** — `&` + `wait` é suficiente pra 19 máquinas

---

## 🔧 DEBUG

```bash
# Ver logs LocalStack
docker logs dod-localstack

# Ver nginx
systemctl status nginx
tail -f /var/log/nginx/error.log

# Ver AWS CLI
su - devopsdays -c '~/.local/bin/aws --version'
su - devopsdays -c 'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 ~/.local/bin/aws --endpoint-url=http://localhost:4566 s3 ls'

# Ver containers
docker ps
```
