# 🧪 Testes do Projeto VISÃO

## Estrutura de Testes

```
tests/
├── e2e/              # Testes E2E com Cypress
├── hooks/            # Testes de hooks customizados
├── integration/      # Testes de integração
├── performance/      # Testes de performance
├── reporters/        # Reporters customizados
└── utils/            # Utilitários de teste

src/
├── components/__tests__/   # 181 testes de componentes
├── hooks/__tests__/        # 125 testes de hooks
├── services/__tests__/     # 39 testes de serviços
├── stores/__tests__/       # 21 testes de stores
├── contexts/__tests__/     # 10 testes de contextos
├── lib/__tests__/          # 84 testes de bibliotecas
├── utils/__tests__/        # 39 testes de utilitários
├── pages/__tests__/        # 40 testes de páginas
└── types/__tests__/        # Testes de tipos
```

## Cobertura Total

| Categoria | Quantidade |
|-----------|------------|
| Componentes | 181 |
| Hooks | 125 |
| Services | 39 |
| Stores | 21 |
| Contexts | 10 |
| Lib | 84 |
| Utils | 39 |
| Pages | 40 |
| **TOTAL** | **539+** |

## Executar Testes

```bash
# Todos os testes
npm run test

# Com cobertura
npm run coverage

# Watch mode
npm run test:watch

# E2E
npm run e2e
```

## Configuração

- **Framework**: Vitest
- **E2E**: Cypress
- **Coverage**: c8/istanbul

---

*Atualizado em 10/01/2026*

