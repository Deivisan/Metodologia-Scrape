# 🔒 Contexto Privado (Local Only)

**Status:** 🔒 **NÃO VERSIONAR** - Apenas local

---

## 📌 Propósito

Esta pasta contém arquivos sensíveis e contexto pessoal que **NÃO DEVEM** ser compartilhados publicamente no GitHub.

### O Que Vai Aqui

- ✅ Notas de voz transcritas (antes de limpar dados pessoais)
- ✅ Ideias não publicáveis (projetos confidenciais)
- ✅ Dados financeiros (se necessário)
- ✅ Testes com dados reais (senhas, tokens temporários)
- ✅ Rascunhos de prompts (antes de refinar)

### O Que NÃO Vai Aqui

- ❌ Código de produção (vai em `/packages/`)
- ❌ Documentação pública (vai em `/docs/` ou root)
- ❌ Capturas públicas do Grok Share (vai em `/captures/`)

---

## 🔐 Segurança

### Proteção Automática

- **`.gitignore`** configurado para ignorar `contexto/*` (exceto este README)
- **Git commits** NUNCA incluem arquivos desta pasta
- **Backup local** pode ser feito manualmente (fora do Git)

### Como Adicionar Arquivos

```bash
# Apenas copiar/criar arquivos normalmente
cp arquivo-sensivel.txt contexto/

# Git vai ignorar automaticamente
git status
# > contexto/ não aparece como modified
```

### Backup Manual (Opcional)

```bash
# Copiar para FinanDEV (privado)
cp -r contexto/ ../FinanDEV/Backup/Metodologia-Scrape/

# OU usar pendrive/nuvem pessoal
cp -r contexto/ /mnt/usb/backups/
```

---

## ⚠️ REGRAS IMPORTANTES

1. ❌ **NUNCA** executar `git add contexto/` (exceto README.md)
2. ❌ **NUNCA** remover `contexto/` do `.gitignore`
3. ✅ **SEMPRE** verificar `git status` antes de commits
4. ✅ **SEMPRE** manter dados sensíveis APENAS aqui

---

## 📂 Estrutura Sugerida

```
contexto/
├── README.md                  # Este arquivo (versionado)
├── transcricoes/              # Notas de voz brutas
│   └── 2026-01-17-sessao.md
├── ideias/                    # Projetos confidenciais
│   └── projeto-secreto.md
├── dados/                     # Dados pessoais
│   └── finanças-teste.json
└── temp/                      # Arquivos temporários
    └── teste-api-key.env
```

---

## 🚀 Integração com FinanDEV

Arquivos importantes aqui podem ser **copiados manualmente** para o FinanDEV (repositório privado) após revisão:

```bash
# Exemplo: Transcrição limpa vai para FinanDEV
cp contexto/transcricoes/2026-01-17-sessao.md ../FinanDEV/Transcricoes/
cd ../FinanDEV
git add Transcricoes/2026-01-17-sessao.md
git commit -m "feat: adicionar transcrição sessão Metodologia-Scrape"
git push
```

---

**Criado em:** 17/01/2026  
**Autor:** Deivison Santana (@deivisan)  
**Propósito:** Separar dados sensíveis do repositório público

🔒 **Privacidade garantida. Contexto protegido.**
