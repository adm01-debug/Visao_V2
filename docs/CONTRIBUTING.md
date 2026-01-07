# 🤝 Contributing Guide - Projeto VISÃO

## Como Contribuir

---

## 1. Fork e Clone

```bash
git clone https://github.com/SEU_USER/vis-o.git
cd vis-o
npm install
```

---

## 2. Criar Branch

```bash
git checkout -b feature/minha-feature
# ou
git checkout -b fix/meu-bugfix
```

---

## 3. Convenções de Commit

| Tipo | Uso |
|------|-----|
| `feat:` | Nova feature |
| `fix:` | Correção de bug |
| `docs:` | Documentação |
| `style:` | Formatação |
| `refactor:` | Refatoração |
| `test:` | Testes |
| `chore:` | Manutenção |

---

## 4. Antes do PR

```bash
# Lint
npm run lint

# Testes
npm run test

# Type check
npm run typecheck

# Build
npm run build
```

---

## 5. Pull Request

1. Título descritivo
2. Descrição do que foi feito
3. Screenshots se visual
4. Link para issue (se houver)

---

## 6. Code Review

- Aguarde 1+ aprovação
- Responda comentários
- Faça alterações solicitadas

---

## 7. Estrutura do Projeto

```
src/
├── components/   # Componentes React
├── hooks/        # Custom hooks
├── pages/        # Páginas/rotas
├── services/     # Serviços/APIs
├── stores/       # Estado global
└── types/        # TypeScript types
```

---

## 8. Testes

```bash
# Unitários
npm run test

# E2E
npm run test:e2e

# Cobertura
npm run coverage
```

---

## 9. Storybook

```bash
# Criar story para novo componente
npm run storybook
```

---

## 10. Dúvidas?

- Issues: GitHub Issues
- Discussões: GitHub Discussions

---

**Obrigado por contribuir! 🎉**
