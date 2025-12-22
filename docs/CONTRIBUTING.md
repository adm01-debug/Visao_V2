# Contributing Guide - VISÃO

## Como Contribuir

1. Fork o repositório
2. Crie uma branch: `git checkout -b feature/minha-feature`
3. Faça commit: `git commit -m "feat: adiciona feature"`
4. Push: `git push origin feature/minha-feature`
5. Abra um Pull Request

## Padrões de Commit
Usamos Conventional Commits:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

## Code Style
- TypeScript strict mode
- ESLint + Prettier
- Componentes funcionais com hooks

## Testes
- Escreva testes para novas features
- Mantenha cobertura > 80%
- `npm test` antes de PR
