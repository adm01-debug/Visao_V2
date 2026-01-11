# 🧪 Guia de Testes

## Estrutura de Testes

```
tests/
├── unit/           # Testes unitários
├── integration/    # Testes de integração
├── e2e/           # Testes end-to-end (Cypress)
└── performance/   # Testes de performance
```

## Executar Testes

### Unit Tests (Vitest)

```bash
# Todos os testes
npm run test

# Modo watch
npm run test -- --watch

# Cobertura
npm run coverage
```

### E2E Tests (Cypress)

```bash
# Interface gráfica
npm run cypress:open

# Headless
npm run cypress:run
```

## Padrões de Teste

### Hook Tests

```typescript
import { renderHook, act } from '@testing-library/react';
import { useCamera } from '../useCamera';

describe('useCamera', () => {
  it('should initialize with empty cameras', () => {
    const { result } = renderHook(() => useCamera());
    expect(result.current.cameras).toEqual([]);
  });
});
```

### Component Tests

```typescript
import { render, screen } from '@testing-library/react';
import { Button } from '../Button';

describe('Button', () => {
  it('should render correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

## Cobertura Mínima

| Tipo | Meta |
|------|------|
| Statements | 80% |
| Branches | 70% |
| Functions | 80% |
| Lines | 80% |

## Mocking

### Supabase

```typescript
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockResolvedValue({ data: [], error: null })
  }
}));
```

### API Calls

```typescript
import { server } from '@/mocks/server';
import { rest } from 'msw';

server.use(
  rest.get('/api/cameras', (req, res, ctx) => {
    return res(ctx.json([{ id: 1, name: 'Camera 1' }]));
  })
);
```
