# 🤝 Contributing Guide - Projeto VISÃO

## Como Contribuir

---

## 1. Primeiros Passos

```bash
# Fork o repositório
# Clone seu fork
git clone https://github.com/SEU_USER/vis-o.git

# Adicione upstream
git remote add upstream https://github.com/adm01-debug/vis-o.git
```

---

## 2. Setup Local

```bash
cd vis-o
npm install
cp .env.example .env
npm run dev
```

---

## 3. Criar Branch

```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/correcao-bug
```

### Convenção de Nomes

| Tipo | Prefixo |
|------|---------|
| Feature | `feature/` |
| Bugfix | `fix/` |
| Docs | `docs/` |
| Refactor | `refactor/` |

---

## 4. Commits

### Conventional Commits

```bash
feat: adiciona reconhecimento de placas
fix: corrige delay no streaming
docs: atualiza README
refactor: melhora performance do hook
test: adiciona testes para alerts
```

---

## 5. Antes do PR

```bash
# Lint
npm run lint

# Tipos
npm run typecheck

# Testes
npm run test

# Build
npm run build
```

---

## 6. Pull Request

1. Push para seu fork
2. Abra PR para `main`
3. Preencha o template
4. Aguarde review

### Template PR

```markdown
## Descrição
Breve descrição da mudança

## Tipo
- [ ] Feature
- [ ] Bugfix
- [ ] Docs
- [ ] Refactor

## Checklist
- [ ] Testes passando
- [ ] Lint sem erros
- [ ] Documentação atualizada
```

---

## 7. Code Review

- Seja respeitoso
- Explique o "porquê"
- Sugira melhorias
- Aprove quando estiver OK

---

## 8. Após Merge

```bash
git checkout main
git pull upstream main
git branch -d feature/minha-feature
```

---

## 9. Issues

### Reportar Bug
- Descreva o problema
- Passos para reproduzir
- Comportamento esperado
- Screenshots/logs

### Sugerir Feature
- Descreva a feature
- Caso de uso
- Mockups (se aplicável)

---

## 10. Código de Conduta

- Seja respeitoso
- Aceite feedback
- Ajude outros
- Mantenha profissionalismo

---

**Última atualização:** 06/01/2026
