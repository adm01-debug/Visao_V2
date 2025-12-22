# Testing Guide - VISÃO

## Overview
Este projeto usa Vitest para testes unitários e de integração.

## Executar Testes

```bash
# Todos os testes
npm test

# Com coverage
npm run test:coverage

# Com UI
npm run test:ui
```

## Estrutura de Testes

```
src/
├── hooks/__tests__/    # Testes de hooks
├── components/__tests__/ # Testes de componentes
└── test/
    └── setup.ts        # Configuração global
```

## Convenções
- Arquivos de teste: `*.test.ts` ou `*.test.tsx`
- Use `describe` para agrupar testes relacionados
- Use `it` ou `test` para casos individuais
- Mock externos com `vi.mock()`

## Exemplo
```typescript
import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';

describe('useMyHook', () => {
  it('should return expected value', () => {
    const { result } = renderHook(() => useMyHook());
    expect(result.current).toBeDefined();
  });
});
```
