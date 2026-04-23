---
name: e2e-discover-auth-routes
description: Helper tests/e2e/helpers/discoverAuthRoutes.ts faz parsing estático de App.tsx para descobrir rotas autenticadas (ProtectedLayoutRoute/ProtectedRoute) — elimina drift de listas manuais
type: feature
---
**Arquivo:** `tests/e2e/helpers/discoverAuthRoutes.ts`

**O que faz:** lê `src/App.tsx` e extrai paths de toda `<Route path="X" element={...}>` cujo `element` contém `ProtectedLayoutRoute` ou `ProtectedRoute`. Resultado é única fonte de verdade para varreduras E2E que precisam iterar rotas autenticadas.

**API pública:**
- `getAuthenticatedRoutes()` — lista completa, ordenada, deduplicada. Cache por mtime de `App.tsx`. Lança erro se 0 rotas (sinal de regex quebrada após refactor).
- `getAuthenticatedRoutesForSweep()` — filtra `/dev/*` para varreduras massivas (estende o filtro conforme necessário).

**Como funciona:**
1. `stripComments()` remove `//` e `/* */` (evita capturar rotas comentadas).
2. Regex `/<Route\s+path=(["'])([^"']+)\1\s+element=\{([\s\S]*?)\}\s*\/?>/g` casa o path e o conteúdo do element.
3. Filtra: ignora `*`, paths não iniciados em `/`, `<Navigate>` puro sem guard.
4. Mantém apenas rotas com `ProtectedRoute` ou `ProtectedLayoutRoute`.

**Limitações intencionais:**
- Apenas paths estáticos (sem `:id`).
- Não resolve aliases (`/login` → `/auth` via `<Navigate>`).
- Aceita aninhamento (ex.: `<ProtectedLayoutRoute><ProtectedRoute minRole="admin">...`).

**Vantagens vs lista manual:**
- Adicionar rota nova em `App.tsx` cobre todos os specs automaticamente.
- Remover rota não deixa órfão no spec.
- Detecção de regressão: `mobile-nav-class-presence.spec.ts` agora valida 34 rotas (vs 21 hardcoded antes — 13 estavam órfãs).

**Specs migrados:**
- `tests/e2e/mobile-nav-class-presence.spec.ts` (consome `getAuthenticatedRoutesForSweep`).

**Próximos candidatos:** `mobile-nav-padding.spec.ts`, `mobile-nav-scroll-positions.spec.ts`, `qa-console-sweep.spec.ts` — todos têm listas hardcoded similares.

**Debug standalone:** `npx tsx tests/e2e/helpers/discoverAuthRoutes.ts` imprime a lista descoberta.
