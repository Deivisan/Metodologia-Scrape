#!/bin/bash

#==============================================
# Script de Verificação DevOpsDays FSA
# Verifica todos os serviços
#==============================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  🔍 DevOpsDays FSA - Verificação${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

ERRORS=0
SUCCESS=0

#==============================================
# 1. Verificar Usuário
#==============================================
echo -e "${CYAN}[1] Verificando usuário devopsdays...${NC}"

if id devopsdays &>/dev/null; then
    echo -e "${GREEN}✓ Usuário devopsdays existe${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ Usuário devopsdays não existe${NC}"
    ((ERRORS++))
fi

# Verificar grupos
if groups devopsdays | grep -q docker; then
    echo -e "${GREEN}✓ Usuário no grupo docker${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ Usuário não está no grupo docker${NC}"
    ((ERRORS++))
fi

#==============================================
# 2. Verificar Docker
#==============================================
echo -e "${CYAN}[2] Verificando Docker...${NC}"

if command -v docker &>/dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    echo -e "${GREEN}✓ Docker: $DOCKER_VERSION${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ Docker não instalado${NC}"
    ((ERRORS++))
fi

if systemctl is-active --quiet docker; then
    echo -e "${GREEN}✓ Docker daemon ativo${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ Docker daemon inativo${NC}"
    ((ERRORS++))
fi

#==============================================
# 3. Verificar Containers
#==============================================
echo -e "${CYAN}[3] Verificando containers...${NC}"

if id devopsdays &>/dev/null; then
    CONTAINER_COUNT=$(su - devopsdays -c 'docker ps 2>/dev/null' | tail -n +2 | wc -l)
    
    if [ "$CONTAINER_COUNT" -ge 3 ]; then
        echo -e "${GREEN}✓ $CONTAINER_COUNT containers rodando${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  Apenas $CONTAINER_COUNT containers${NC}"
    fi
    
    echo -e "${CYAN}   Containers:${NC}"
    su - devopsdays -c 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"' 2>/dev/null | while read line; do
        echo -e "${CYAN}   $line${NC}"
    done
fi

#==============================================
# 4. Verificar LocalStack
#==============================================
echo -e "${CYAN}[4] Verificando LocalStack...${NC}"

# Verificar porta
if ss -tlnp 2>/dev/null | grep -q ':4566'; then
    echo -e "${GREEN}✓ Porta 4566 listenning${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ LocalStack não está na porta 4566${NC}"
    ((ERRORS++))
fi

# Verificar health
HEALTH=$(curl -s --max-time 5 http://localhost:4566/_localstack/health 2>/dev/null)
if echo "$HEALTH" | grep -q "services"; then
    echo -e "${GREEN}✓ LocalStack respondendo${NC}"
    ((SUCCESS++))
    
    # Ver serviços disponíveis
    SERVICES=$(echo "$HEALTH" | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d.get('services',{})))" 2>/dev/null || echo "0")
    echo -e "${GREEN}   $SERVICES serviços disponíveis${NC}"
else
    echo -e "${RED}✗ LocalStack não responde${NC}"
    ((ERRORS++))
fi

#==============================================
# 5. Verificar AWS CLI
#==============================================
echo -e "${CYAN}[5] Verificando AWS CLI...${NC}"

if [ -f /home/devopsdays/.local/bin/aws ]; then
    AWS_VERSION=$(su - devopsdays -c '~/.local/bin/aws --version' 2>/dev/null | cut -d' ' -f1)
    echo -e "${GREEN}✓ AWS CLI: $AWS_VERSION${NC}"
    ((SUCCESS++))
else
    echo -e "${RED}✗ AWS CLI não encontrado${NC}"
    ((ERRORS++))
fi

# Testar AWS CLI com LocalStack
if [ -f /home/devopsdays/.local/bin/aws ]; then
    RESULT=$(su - devopsdays -c 'AWS_ACCESS_KEY_ID=test AWS_SECRET_ACCESS_KEY=test AWS_DEFAULT_REGION=us-east-1 ~/.local/bin/aws --endpoint-url=http://localhost:4566 sts get-caller-identity' 2>/dev/null)
    if echo "$RESULT" | grep -q "UserId"; then
        echo -e "${GREEN}✓ AWS CLI conectando no LocalStack${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  AWS CLI não conecta no LocalStack${NC}"
    fi
fi

#==============================================
# 6. Verificar Nginx (Sistema)
#==============================================
echo -e "${CYAN}[6] Verificando Nginx (sistema)...${NC}"

if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx ativo${NC}"
    ((SUCCESS++))
else
    echo -e "${YELLOW}⚠️  Nginx inativo${NC}"
fi

# Verificar porta 80
if ss -tlnp 2>/dev/null | grep -q ':80 '; then
    echo -e "${GREEN}✓ Porta 80 respondendo${NC}"
    ((SUCCESS++))
    
    # Testar resposta
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Nginx respondendo HTTP $HTTP_CODE${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx respondeu HTTP $HTTP_CODE${NC}"
    fi
else
    echo -e "${RED}✗ Porta 80 não respondendo${NC}"
    ((ERRORS++))
fi

#==============================================
# 7. Verificar Nginx (Container)
#==============================================
echo -e "${CYAN}[7] Verificando Nginx (container)...${NC}"

# Verificar porta 8080
if ss -tlnp 2>/dev/null | grep -q ':8080'; then
    echo -e "${GREEN}✓ Porta 8080 listenning${NC}"
    ((SUCCESS++))
    
    # Testar resposta
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/ 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Nginx container respondendo HTTP $HTTP_CODE${NC}"
        ((SUCCESS++))
    else
        echo -e "${YELLOW}⚠️  Nginx container respondeu HTTP $HTTP_CODE${NC}"
    fi
else
    echo -e "${RED}✗ Porta 8080 não respondendo${NC}"
    ((ERRORS++))
fi

#==============================================
# 8. Verificar repo
#==============================================
echo -e "${CYAN}[8] Verificando repositório...${NC}"

if [ -d /home/devopsdays/dod-fsa ]; then
    echo -e "${GREEN}✓ Repositório dod-fsa existe${NC}"
    ((SUCCESS++))
    
    if [ -f /home/devopsdays/dod-fsa/docker-compose.yml ]; then
        echo -e "${GREEN}✓ docker-compose.yml existe${NC}"
        ((SUCCESS++))
    fi
else
    echo -e "${RED}✗ Repositório dod-fsa não existe${NC}"
    ((ERRORS++))
fi

#==============================================
# Resumo Final
#==============================================
echo -e ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  📊 RESUMO${NC}"
echo -e "${BLUE}═���═��═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Verificações successfuls: $SUCCESS${NC}"
echo -e "${RED}✗ Erros: $ERRORS${NC}"
echo ""

if [ "$ERRORS" -eq 0 ]; then
    echo -e "${GREEN}🎉 Ambiente 100% funcional!${NC}"
    echo ""
    exit 0
else
    echo -e "${YELLOW}⚠️  Ambiente com problemas menores (pode funcionar)${NC}"
    echo ""
    exit 1
fi