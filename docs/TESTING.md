# 🧪 Guia de Testes - VISÃO

## Estrutura de Testes

```
src/
├── components/__tests__/   # Testes de componentes
├── hooks/__tests__/        # Testes de hooks
└── test/setup.ts           # Configuração global
```

## Executando Testes

```bash
# Todos os testes
npm run test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

## Padrões

### Componentes
```tsx
import { render, screen } from "@testing-library/react";
import Component from "../Component";

describe("Component", () => {
  it("renders correctly", () => {
    render(<Component />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });
});
```

### Hooks
```tsx
import { renderHook, act } from "@testing-library/react";
import { useHook } from "../useHook";

describe("useHook", () => {
  it("returns correct value", () => {
    const { result } = renderHook(() => useHook());
    expect(result.current).toBeDefined();
  });
});
```

## Coverage Mínimo

- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

