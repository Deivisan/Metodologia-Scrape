# 🛠️ Guia de Configuração: Workshop DevOpsDays FSA

Este guia detalha os passos necessários para preparar o seu ambiente Ubuntu 24.04 LTS para o workshop. Todo o fluxo é nativo Linux, garantindo máxima performance e isolamento.

Todas as configurações, repositórios e execuções ficarão isoladas sob o usuário específico **devopsdays**. Ferramentas de sistema (como Docker e Nginx) serão instaladas globalmente, mas configuradas para uso focado neste perfil.

> 🔐 **Credenciais do Usuário devopsdays:**
> - **Senha:** `cetensufrb`
> - **sudo:** sem senha (configurado automaticamente)

---

## 🔍 Fase 1: Verificação de Hardware e Sistema

Antes de iniciar, valide se sua máquina possui os requisitos necessários executando os comandos abaixo no terminal:

```bash
# 1. Verificar a versão do Sistema Operacional (Recomendado: Ubuntu 24.04)
lsb_release -a

# 2. Verificar memória RAM disponível (Recomendado: mínimo de 4GB livres)
free -m

# 3. Verificar espaço em disco (Recomendado: ~2GB livres para a stack)
df -h /
```

---

## 🚀 Fase 2: Passo a Passo Manual e Detalhado

Siga estes passos se preferir entender e executar cada etapa da configuração.

### 1. Criação do Usuário Isolado

Para manter a organização e segurança do seu sistema pessoal, criaremos um perfil exclusivo para o evento.

```bash
# Crie o usuário com a senha especificada
sudo useradd -m -s /bin/bash devopsdays
echo "devopsdays:cetensufrb" | sudo chpasswd

# Conceda permissões de administrador (sudo) sem senha
echo "devopsdays ALL=(ALL) NOPASSWD: ALL" | sudo tee /etc/sudoers.d/devopsdays

# Adicione ao grupo docker
sudo usermod -aG docker devopsdays
```

### 0. Atualização do Sistema e Limpeza de Cache

Antes de instalar qualquer coisa, é **essencial** atualizar o sistema e limpar caches para liberar espaço em disco e garantir que você tenha as versões mais recentes de tudo.

```bash
# 1. Atualizar lista de pacotes
sudo apt update

# 2. Atualizar todos os pacotes instalados para suas últimas versões
sudo apt upgrade -y

# 3. Remover pacotes obsoletos e desnecessários
sudo apt autoremove -y

# 4. Limpar cache do apt (pacotes .deb baixados que ficam em cache)
sudo apt clean

# 5. Remover resíduos de pacotes antigos
sudo apt autoclean

# 6. Verificar espaço em disco após limpeza
df -h /
```

> 💡 **Dica:** Execute esses comandos periodicamente para manter o sistema leve e atualizado.

### 3. Instalação do Nginx

O Nginx atuará como o servidor web e proxy reverso da nossa aplicação.

```bash
sudo apt install nginx -y

# Confirme se o serviço iniciou corretamente automaticamente
systemctl status nginx --no-pager
```

### 4. Instalação do AWS CLI v2 (Isolado no Usuário)

Instalaremos a interface de linha de comando da AWS de forma que seus executáveis fiquem restritos ao perfil devopsdays.

```bash
# Mude para o usuário devopsdays
su - devopsdays

# Instalar dependências necessárias
sudo apt install curl unzip -y

# Baixar os binários
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip

# Instalar na pasta local do usuário
./aws/install -i ~/.local/aws-cli -b ~/.local/bin

# Recarregar as variáveis de ambiente e testar
source ~/.bashrc
aws --version
```

> ⚠️ **Nota:** Todos os comandos acima do passo 4 devem ser executados como usuário `devopsdays` (após `su - devopsdays`).

### 5. Instalação do Docker & Docker Compose

Necessário para rodar o LocalStack (simulador da nuvem AWS).

```bash
# Volte para o usuário com sudo (Ctrl+D ou exit)
exit

# Adicionar certificados e a chave GPG oficial do Docker
sudo apt install ca-certificates curl -y
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Adicionar o repositório oficial ao APT
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar o Docker Engine e complementos
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

# O grupo docker já foi adicionado ao usuário devopsdays no passo 1
```

### 6. Setup do Repositório e Ambiente Simulado

Agora vamos clonar o código oficial do workshop e iniciar a infraestrutura.

```bash
# Mude para o usuário devopsdays
su - devopsdays

# Instalar o Git
sudo apt install git -y

# Clonar o repositório (estará dentro da pasta /home/devopsdays/)
git clone https://github.com/Jonta-Sancar/dod-fsa.git
cd dod-fsa

# Iniciar o LocalStack em background
docker compose up -d

# Verificar se os containers estão rodando
docker ps
```

---

## 🤖 Fase 3: Script de Auto-Setup Consolidado (Modo Ninja)

Se você quiser automatizar todo o processo acima em qualquer computador com Ubuntu, basta salvar o código abaixo em um arquivo chamado `setup_dod.sh` e executá-lo. Ele faz a verificação, cria o usuário e instala tudo sozinho.

### Como usar:

```bash
nano setup_dod.sh
# (Cole o código abaixo, salve com Ctrl+O, Enter, Ctrl+X)
chmod +x setup_dod.sh
sudo ./setup_dod.sh
```

### Código do setup_dod.sh:

```bash
#!/bin/bash
# Script Consolidado DevOpsDays FSA - Instalação Automática

echo "🌵 Iniciando validação de sistema e instalação..."

# 1. Checagens rápidas
echo "Verificando espaço em disco..."
FREE_SPACE=$(df -m / | awk 'NR==2 {print $4}')
if [ "$FREE_SPACE" -lt 2048 ]; then
    echo "⚠️ Atenção: Menos de 2GB de espaço livre."
fi

# 2. Criar usuário com senha e sudo sem senha (se não existir)
if id "devopsdays" &>/dev/null; then
    echo "Usuário devopsdays já existe."
else
    echo "Criando usuário devopsdays..."
    useradd -m -s /bin/bash devopsdays
    echo "devopsdays:cetensufrb" | chpasswd
    echo "devopsdays ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/devopsdays
    chmod 440 /etc/sudoers.d/devopsdays
fi

# 3. Adicionar usuário ao grupo docker
usermod -aG docker devopsdays

# 4. Atualizações, limpeza e Nginx globais
echo "Atualizando sistema e limpando cache..."
apt-get update && apt-get upgrade -y
apt-get autoremove -y
apt-get clean
apt-get autoclean

echo "Instalando dependências e Nginx..."
apt-get install -y nginx curl unzip git ca-certificates

# 5. Instalar Docker
echo "Configurando Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 6. Configurar AWS CLI e projeto no perfil do usuário
echo "Configurando perfil do usuário devopsdays..."
su - devopsdays -c '
    # Adicionar ao PATH
    echo "export PATH=\$PATH:~/.local/bin" >> ~/.bashrc
    
    # AWS CLI restrito ao usuário
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    ./aws/install -i ~/.local/aws-cli -b ~/.local/bin
    rm -rf awscliv2.zip aws/
    
    # Clonar repo e iniciar docker
    git clone https://github.com/Jonta-Sancar/dod-fsa.git
    cd dod-fsa
    docker compose up -d
'

echo "✅ Instalação concluída com sucesso!"
echo "➡️ Faça login com: su - devopsdays (Senha: cetensufrb)"
echo "➡️ sudo funciona sem senha para este usuário"
```

---

## 🧹 Fase 4: Script de Desinstalação (Limpeza Total)

Finalizou o workshop e quer deixar seu computador limpo exatamente como estava antes? Salve o código abaixo como `teardown_dod.sh` e execute.

### Como usar:

```bash
nano teardown_dod.sh
# (Cole o código abaixo, salve com Ctrl+O, Enter, Ctrl+X)
chmod +x teardown_dod.sh
sudo ./teardown_dod.sh
```

### Código do teardown_dod.sh:

```bash
#!/bin/bash
# Script de Limpeza DevOpsDays FSA

echo "🗑️ Iniciando limpeza do ambiente..."

# 1. Parar e remover containers do projeto
echo "Parando containers do LocalStack..."
su - devopsdays -c 'cd ~/dod-fsa && docker compose down' 2>/dev/null

# 2. Desinstalar pacotes globais (CUIDADO: remove o Docker do sistema)
echo "Removendo Nginx e Docker..."
systemctl stop nginx
apt-get purge -y nginx nginx-common docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
apt-get autoremove -y

# 3. Remover resíduos de repositórios do docker
rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.asc
rm -f /etc/sudoers.d/devopsdays

# 4. Excluir o usuário e todos os seus arquivos (AWS CLI e repositório inclusos)
echo "Excluindo usuário devopsdays e seu diretório /home..."
deluser --remove-home devopsdays

echo "✨ Limpeza concluída! Seu sistema voltou ao estado original."
```

---

## ✅ Verificação de Funcionalidade

Após executar a Fase 2 ou 3, verifique se tudo está funcionando:

```bash
# Login como devopsdays
su - devopsdays

# Testar AWS CLI
aws --version

# Testar Docker
docker ps

# Verificar LocalStack
curl http://localhost:4566/_localstack/health

# Ver Nginx
curl http://localhost
```

---

## 📋 Resumo dos Comandos

| Fase | Comando | Descrição |
|------|---------|-----------|
| 1 | `lsb_release -a` | Verificar versão do SO |
| 1 | `free -m` | Verificar RAM disponível |
| 1 | `df -h /` | Verificar espaço em disco |
| 2 | `sudo apt update` | Atualizar lista de pacotes |
| 2 | `sudo apt upgrade -y` | Atualizar todos os pacotes |
| 2 | `sudo apt autoremove -y` | Remover pacotes obsoletos |
| 2 | `sudo apt clean` | Limpar cache do apt |
| 2 | `sudo apt autoclean` | Remover resíduos antigos |
| 2 | `useradd -m devopsdays` | Criar usuário isolado |
| 2 | `echo "devopsdays:cetensufrb" | chpasswd` | Definir senha |
| 2 | `echo "devopsdays ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/devopsdays` | sudo sem senha |
| 2 | `sudo apt install nginx -y` | Instalar Nginx |
| 2 | `./aws/install -i ~/.local/aws-cli -b ~/.local/bin` | AWS CLI (usuário) |
| 2 | `sudo apt install docker-ce...` | Instalar Docker (global) |
| 2 | `git clone https://github.com/Jonta-Sancar/dod-fsa.git` | Clonar repo |
| 2 | `docker compose up -d` | Iniciar LocalStack |

---

## 🔗 Links Úteis

| Link | Status | Observação |
|------|--------|-------------|
| [Repositório Oficial do Workshop](https://github.com/Jonta-Sancar/dod-fsa) | ✅ OK | Repo existe e está ativo |
| [Documentação Docker](https://docs.docker.com/) | ✅ OK | Link oficial |
| [AWS CLI v2](https://aws.amazon.com/cli/) | ✅ OK | Link oficial |
| [LocalStack Docs](https://docs.localstack.cloud/overview/) | ✅ OK | Documentação oficial |
| [LocalStack Cloud](https://localstack.cloud/) | ✅ OK | Site oficial |

---

## 📦 O que fica no usuário devopsdays vs Global

### 🔐 Isolado no Usuário devopsdays:
- AWS CLI v2 (`~/.local/aws-cli`)
- Repositório clonado (`~/dod-fsa`)
- Variáveis de ambiente (`.bashrc`)
- Containers Docker do LocalStack

### 🌐 Global (sudo):
- Nginx
- Docker Engine + Docker Compose
- Pacotes do sistema (git, curl, unzip)

---

> **Nota:** Este guia faz parte da metodologia de web scraping e automação do repositório Metodologia-Scrape.
> 
> **Credenciais:** Usuário: `devopsdays` | Senha: `cetensufrb` | sudo: sem senha