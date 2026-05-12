# ▶️ PROMPT DE EXECUÇÃO — DOD DEPLOY

> Siga esta sequência. Teste em 1 máquina primeiro, depois expanda.

---

## ☝️ FASE 0 — PRÉ-REQUISITOS

### No celular (Termux):
```bash
pkg update && pkg install openssh sshpass python curl -y
```

### Na máquina de controle (seu PC Linux):
```bash
# já tem tudo se seguiu a stack do projeto
```

### Arquivo de hosts — duas opções:

**Opção A (recomendada) — Usar MACs (IPs descobertos automagicamente):**

Crie `dod/macs.txt` com os MACs que você tem:
```txt
# MAC_ADDRESS        NOME_OPCIONAL
aa:bb:cc:dd:ee:01   pc-lab-01
aa:bb:cc:dd:ee:02   pc-lab-02
aa:bb:cc:dd:ee:03   pc-lab-03
...
```

Depois descubra os IPs automaticamente:
```bash
sudo ./dod/discover.sh
```
Isso escaneia a rede, casa cada MAC com seu IP atual, e gera `hosts.txt`.

**Opção B — IPs fixos (se você já sabe os IPs):**

Crie `dod/hosts.txt` diretamente:
```txt
# IP_DAS_MAQUINAS
192.168.1.10  pc-lab-01
192.168.1.11  pc-lab-02
192.168.1.12  pc-lab-03
...
192.168.1.30  pc-lab-20
```

### Credenciais (todas as máquinas):
- **Usuário:** `root`
- **Senha:** `8u@3tArb!`

---

## ✌️ FASE 1 — TESTE DE CONECTIVIDADE (OBRIGATÓRIO)

Testar se as máquinas respondem:

```bash
# via curl direto (sem baixar nada)
curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/tracker.sh | bash -s -- --status
```

Isso vai pingar cada IP e mostrar:
```
✅ online  → SSH responde
⚠️  ssh fail → SSH recusou (verificar senha/user)
❌ offline → máquina desligada/sem rede
```

**Se alguma estiver offline, resolver antes de prosseguir.**

---

## 🤟 FASE 2 — TESTE EM 1 MÁQUINA (PROVA REAL)

Antes de disparar nas 20, valida em UMA:

```bash
# setup manual em 1 máquina
ssh root@192.168.1.10 "curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash"
```

Aguardar terminar (uns 2-3 minutos). Verificar:

```bash
# verificar se funcionou
ssh root@192.168.1.10 "curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash -s -- --verify"
```

Resultado esperado:
```
✅ Usuário devopsdays existe
✅ Docker instalado e rodando
✅ 3+ containers rodando
✅ LocalStack saudável
✅ AWS CLI instalado
✅ Nginx respondendo
```

**Se falhar, não prossiga — debugue antes.**

---

## 🫶 FASE 3 — DASHBOARD WEB (ACOMPANHAMENTO)

Iniciar o servidor web no seu PC para acompanhar AO VIVO:

```bash
# (recomendado: abrir em aba separada do terminal)
python3 dod/dashboard.py
```

Acessar no navegador: **http://localhost:8000**

Botões na interface:
- **▶ Setup** → dispara instalação em TODAS as máquinas
- **🔍 Verificar** → verifica todas (pós-setup)
- **🗑️ Limpar** → remove tudo de todas
- **📄 JSON** → dados brutos em JSON

A página atualiza sozinha a cada 5 segundos.

---

## 🫶 FASE 4 — EXECUÇÃO NAS 20 MÁQUINAS

### Opção A — Pelo Dashboard Web (recomendado)
1. Abrir http://localhost:8000
2. Clicar **▶ Setup**
3. Acompanhar a tabela atualizando em tempo real
4. Cada máquina passa por: `⏸️ Pendente → ⏳ Rodando → ✅ OK / ❌ Falha`

### Opção B — Pelo terminal (se preferir CLI)
```bash
# Setup em todas
curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/tracker.sh | bash

# Verificar todas depois
curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/tracker.sh | bash -s -- --verify
```

---

## 🫶 FASE 5 — PÓS-EXECUÇÃO

### Se todas funcionaram:
```bash
# verificacao final em massa
ssh root@192.168.1.10 "curl -fsSL .../bootstrap.sh | bash -s -- --verify"
# repetir para cada máquina, ou usar o tracker --verify
```

### Se alguma falhou:
1. Ver o log no Dashboard (coluna Log)
2. Ou SSH direto e roda manual:
   ```bash
   ssh root@192.168.1.XX
   curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/bootstrap.sh | sudo bash
   ```

### Para limpar tudo depois:
```bash
# Dashboard: clicar em 🗑️ Limpar
# ou terminal:
curl -fsSL https://raw.githubusercontent.com/Deivisan/Metodologia-Scrape/master/dod/tracker.sh | bash -s -- --teardown
```

---

## ⚠️ REGRAS DE OURO

1. **SEMPRE testar em 1 máquina antes** (Fase 2)
2. **Máquinas precisam de internet** para baixar os pacotes
3. **Senha root**: `8u@3tArb!` (igual em todas)
4. **Dashboard só funciona enquanto o terminal estiver aberto**
5. **Não fechar o terminal do dashboard** senão perde o progresso
6. **Pode abrir o dashboard de qualquer dispositivo na mesma rede**:
   ```
   http://SEU_IP:8000
   ```
7. **Cada máquina leva ~3-5 minutos** para instalar tudo
8. **20 máquinas × ~4min = ~80min total** (mas roda em paralelo, então ~10min)

---

## 🆘 SOLUÇÃO DE PROBLEMAS

| Problema | Causa | Solução |
|----------|-------|---------|
| `ssh: connect to host XX port 22: Connection refused` | SSH não está rodando | `systemctl start sshd` na máquina |
| `Permission denied` | Senha errada | Verificar `8u@3tArb!` |
| `curl: (22) 404` | URL errada ou cache CDN | Esperar 2min, tentar de novo |
| `apt-get: command not found` | Não é Ubuntu/Debian | Verificar distro, instalar manual |
| `docker: command not found` | Docker não instalou | Rodar `apt-get install docker` manual |
| Dashboard não atualiza | Fechou o terminal | Rodar `dashboard.py` de novo |
