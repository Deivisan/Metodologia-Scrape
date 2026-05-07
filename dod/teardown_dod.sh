#!/bin/bash
set -e

#==============================================
# Script de Limpeza DevOpsDays FSA
# Desinstalação Completa
#==============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🗑️ DevOpsDays FSA - Limpeza Completa${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Verificar se é root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}✗ Este script deve ser executado como root (sudo)${NC}"
    exit 1
fi

#==============================================
# 1. Parar e remover containers
#==============================================
echo -e "${YELLOW}[1/5] Parando containers...${NC}"

if id "devopsdays" &>/dev/null; then
    su - devopsdays -c 'cd ~/dod-fsa && docker compose down' 2>/dev/null || true
    echo -e "${GREEN}✓ Containers parados${NC}"
else
    echo -e "${YELLOW}⚠️  Usuário devopsdays não existe, pulando containers${NC}"
fi

#==============================================
# 2. Remover Nginx
#==============================================
echo -e "${YELLOW}[2/5] Removendo Nginx...${NC}"

systemctl stop nginx 2>/dev/null || true
apt-get purge -y nginx nginx-common nginx-core 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true

echo -e "${GREEN}✓ Nginx removido${NC}"

#==============================================
# 3. Remover Docker
#==============================================
echo -e "${YELLOW}[3/5] Removendo Docker...${NC}"

apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin 2>/dev/null || true
apt-get autoremove -y -qq 2>/dev/null || true

echo -e "${GREEN}✓ Docker removido${NC}"

#==============================================
# 4. Remover arquivos de configuração
#==============================================
echo -e "${YELLOW}[4/5] Removendo configurações...${NC}"

rm -f /etc/apt/sources.list.d/docker.list
rm -f /etc/apt/keyrings/docker.asc
rm -f /etc/sudoers.d/devopsdays

# Limpar caches do apt
apt-get clean -qq
apt-get autoclean -qq

echo -e "${GREEN}✓ Configurações removidas${NC}"

#==============================================
# 5. Remover usuário devopsdays
#==============================================
echo -e "${YELLOW}[5/5] Removendo usuário devopsdays...${NC}"

if id "devopsdays" &>/dev/null; then
    deluser --remove-home devopsdays 2>/dev/null || true
    echo -e "${GREEN}✓ Usuário devopsdays removido${NC}"
else
    echo -e "${YELLOW}⚠️  Usuário devopsdays não existe${NC}"
fi

#==============================================
# Resumo Final
#==============================================
echo -e ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Limpeza concluída!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}📝 O sistema voltou ao estado original.${NC}"
echo -e "${YELLOW}🔄 Reinicie o sistema para completasr a remoção.${NC}"
echo ""