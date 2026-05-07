#!/bin/bash
set -e

#==============================================
# Script Consolidado DevOpsDays FSA
# Instalação Automática Completa
#==============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🌵 DevOpsDays FSA - Instalação Automática${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

#==============================================
# 1. Verificações Iniciais
#==============================================
echo -e "${YELLOW}[1/8] Verificando sistema...${NC}"

# Verificar espaço em disco
FREE_SPACE=$(df -m / | awk 'NR==2 {print $4}')
if [ "$FREE_SPACE" -lt 2048 ]; then
    echo -e "${RED}⚠️  Atenção: Menos de 2GB de espaço livre (${FREE_SPACE}MB).${NC}"
    echo -e "${YELLOW}🔄 Continuando mesmo assim...${NC}"
fi

echo -e "${GREEN}✓ Espaço em disco: ${FREE_SPACE}MB${NC}"

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗ Este script deve serExecutado como root (sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Executando como root${NC}"

#==============================================
# 2. Limpeza de Caches (liberar espaço)
#==============================================
echo -e "${YELLOW}[2/8] Limpando caches e atualizando sistema...${NC}"

apt-get update -qq
apt-get upgrade -y -qq
apt-get autoremove -y -qq
apt-get clean -qq
apt-get autoclean -qq

echo -e "${GREEN}✓ Sistema atualizado e caches limpos${NC}"

#==============================================
# 3. Criação do Usuário devopsdays
#==============================================
echo -e "${YELLOW}[3/8] Criando usuário devopsdays...${NC}"

if id "devopsdays" &>/dev/null; then
    echo -e "${YELLOW}⚠️  Usuário devopsdays já existe. Pulando criação.${NC}"
else
    useradd -m -s /bin/bash devopsdays
    echo "devopsdays:cetensufrb" | chpasswd
    echo "devopsdays ALL=(ALL) NOPASSWD: ALL" | tee /etc/sudoers.d/devopsdays > /dev/null
    chmod 440 /etc/sudoers.d/devopsdays
    echo -e "${GREEN}✓ Usuário devopsdays criado${NC}"
fi

# Adicionar ao grupo docker
usermod -aG docker devopsdays
echo -e "${GREEN}✓ Usuário adicionado ao grupo docker${NC}"

#==============================================
# 4. Instalação do Nginx
#==============================================
echo -e "${YELLOW}[4/8] Instalando Nginx e dependências...${NC}"

apt-get install -y -qq nginx curl unzip git ca-certificates > /dev/null

# Verificar se Nginx iniciou
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx instalado e rodando${NC}"
else
    systemctl start nginx
    echo -e "${GREEN}✓ Nginx instalado (iniciado)${NC}"
fi

#==============================================
# 5. Instalação do Docker
#==============================================
echo -e "${YELLOW}[5/8] Instalando Docker e Docker Compose...${NC}"

# Configurar repo Docker
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -qq
apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin > /dev/null

# Iniciar Docker se não estiver
if ! systemctl is-active --quiet docker; then
    systemctl start docker
fi

echo -e "${GREEN}✓ Docker e Docker Compose instalados${NC}"

#==============================================
# 6. AWS CLI v2 (usuário devopsdays)
#==============================================
echo -e "${YELLOW}[6/8] Instalando AWS CLI v2...${NC}"

su - devopsdays -c '
    # Configurar PATH
    if ! grep -q "~/.local/bin" ~/.bashrc 2>/dev/null; then
        echo "export PATH=\$PATH:~/.local/bin" >> ~/.bashrc
    fi
    
    # Baixar e instalar AWS CLI
    cd /home/devopsdays
    curl -sL "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip -q awscliv2.zip
    ./aws/install -i ~/.local/aws-cli -b ~/.local/bin
    rm -rf awscliv2.zip aws/
    
    echo "AWS CLI installed"
'

echo -e "${GREEN}✓ AWS CLI v2 instalado${NC}"

#==============================================
# 7. Repositório dod-fsa
#==============================================
echo -e "${YELLOW}[7/8] Clonando repositório dod-fsa...${NC}"

su - devopsdays -c '
    cd /home/devopsdays
    
    # Clonar repo se não existir
    if [ ! -d "dod-fsa" ]; then
        git clone -q https://github.com/Jonta-Sancar/dod-fsa.git
    fi
    
    cd dod-fsa
    
    # Corrigir versão do LocalStack (versão gratuita)
    sed -i "s|image: localstack/localstack$|image: localstack/localstack:3.5.0|" docker-compose.yml 2>/dev/null || true
    sed -i "s|image: localstack/localstack:latest$|image: localstack/localstack:3.5.0|" docker-compose.yml 2>/dev/null || true
    
    # Corrigir caminho do volume nginx
    sed -i "s|./html:/usr/share/nginx/html:ro|./resources/html:/usr/share/nginx/html:ro|" docker-compose.yml 2>/dev/null || true
    
    echo "Repository configured"
'

echo -e "${GREEN}✓ Repositório clonado e configurado${NC}"

#==============================================
# 8. Iniciar Containers
#==============================================
echo -e "${YELLOW}[8/8] Iniciando containers Docker...${NC}"

su - devopsdays -c 'cd /home/devopsdays/dod-fsa && docker compose up -d'

# Aguardar LocalStack iniciar
echo -e "${YELLOW}⏳ Aguardando LocalStack iniciar...${NC}"
sleep 10

# Verificar containers
CONTAINERS=$(su - devopsdays -c 'docker ps -q' | wc -l)
if [ "$CONTAINERS" -ge 3 ]; then
    echo -e "${GREEN}✓ $CONTAINERS containers iniciados${NC}"
else
    echo -e "${YELLOW}⚠️  Verificando containers...${NC}"
fi

#==============================================
# Resumo Final
#==============================================
echo -e ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Instalação concluída com sucesso!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📝 Credenciais:${NC}"
echo -e "   Usuário: ${YELLOW}devopsdays${NC}"
echo -e "   Senha:   ${YELLOW}cetensufrb${NC}"
echo -e "   sudo:   ${YELLOW}sem senha${NC}"
echo ""
echo -e "${GREEN}🔗 Serviços accessibleis:${NC}"
echo -e "   LocalStack: ${YELLOW}http://localhost:4566${NC}"
echo -e "   Nginx (container): ${YELLOW}http://localhost:8080${NC}"
echo -e "   Nginx (sistema):  ${YELLOW}http://localhost${NC}"
echo ""
echo -e "${GREEN}📝 Para acessar:${NC}"
echo -e "   ${CYAN}su - devopsdays${NC}"
echo -e "   ${CYAN}docker ps${NC}"
echo -e "   ${CYAN}~/.local/bin/aws --version${NC}"
echo ""