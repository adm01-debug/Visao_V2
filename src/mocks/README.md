# 🎭 Mocks do VISÃO (MSW)

## Estrutura

```
mocks/
├── browser.ts    # Setup para browser
├── server.ts     # Setup para Node/testes
├── handlers.ts   # Handlers de requisição
└── index.ts      # Export central
```

## Uso

### Em testes (Vitest)
```typescript
import { server } from "@/mocks/server";

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Em desenvolvimento (browser)
```typescript
// main.tsx
if (import.meta.env.DEV) {
  const { worker } = await import("@/mocks/browser");
  await worker.start();
}
```

## Handlers Disponíveis

### Autenticação
- POST /auth/login
- POST /auth/register
- POST /auth/logout

### Câmeras
- GET /cameras
- GET /cameras/:id
- POST /cameras
- PUT /cameras/:id
- DELETE /cameras/:id

### Alertas
- GET /alerts
- GET /alerts/:id
- POST /alerts/acknowledge

### Usuários
- GET /users
- GET /users/:id
- PUT /users/:id

---

*Atualizado em 10/01/2026*

