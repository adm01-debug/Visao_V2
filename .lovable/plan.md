

## Medição de CLS no front para validar skeletons

Adicionar instrumentação leve de Cumulative Layout Shift (CLS) que registre, em DEV e opcionalmente em produção, o quanto a UI "salta" durante a transição loading → dados — confirmando empiricamente que o trabalho recente nos skeletons (shell estável + skeletons granulares) eliminou o problema.

### Estado atual

- `web-vitals` já está disponível como import dinâmico em `src/main.tsx`, mas só loga no console em DEV (`onCLS(console.log)`).
- Não há atribuição por rota nem por elemento — vê-se um número agregado, sem saber qual página/transição causou shift.
- Não há thresholds nem alertas; é fácil regredir sem perceber.
- `src/lib/logger.ts` já existe (logger estruturado) e `src/hooks/useAnalytics.ts` expõe `trackEvent`.

### Mudanças

**1. Novo módulo** `src/lib/clsMonitor.ts` (~80 linhas)
   - Usa `PerformanceObserver({ type: 'layout-shift', buffered: true })` nativo (sem depender de `web-vitals`).
   - Mantém **CLS por sessão de rota**: reseta o acumulador quando `location.pathname` muda.
   - Para cada `LayoutShift` com `value > 0` e sem `hadRecentInput`, captura:
     - timestamp relativo ao mount da rota
     - valor do shift
     - `sources[].node` (quando disponível) → serializa para `tagName.className#id` (truncado)
   - Expõe API: `startCLSMonitor()`, `getCurrentCLS()`, `getShiftLog()`, `resetForRoute(path)`.
   - Thresholds: `good < 0.1`, `needs-improvement < 0.25`, `poor >= 0.25` (padrão Web Vitals).
   - Em DEV: `console.warn` quando CLS de rota cruza 0.1, com tabela dos top-3 shifts (timestamp, valor, elemento).
   - Em PROD: silencioso por padrão; apenas reporta via `logger.warn` quando CLS final da rota >= 0.1 (limitado a 1 evento por rota para não spammar).

**2. Hook** `src/hooks/useRouteCLS.ts` (~30 linhas)
   - Lê `useLocation()` do react-router.
   - No `useEffect` de mudança de path: chama `resetForRoute(newPath)` e agenda um snapshot final 3s após "load completo" (heurística: quando React Query não tem mais queries `isLoading`).
   - Snapshot inclui `{ path, cls, shiftCount, topSources }` e é despachado via `trackEvent('cls.route', {...})` (já existente em `useAnalytics`).

**3. Integração no `MainLayout`**
   - Montar o hook uma única vez no layout autenticado (`src/components/layout/MainLayout.tsx` ou equivalente — confirmar via leitura do arquivo).
   - Não tocar páginas individuais.

**4. Inicialização em `src/main.tsx`**
   - Substituir o bloco atual de `web-vitals` (que só loga CLS isolado) por `startCLSMonitor()` chamado uma vez, antes do `createRoot`.
   - Manter o restante de `web-vitals` (LCP/FID/FCP/TTFB) como está — não é o foco desta tarefa.

**5. Painel de debug opcional** `src/components/debug/CLSBadge.tsx` (~40 linhas)
   - Apenas renderiza em `import.meta.env.DEV`.
   - Badge fixo bottom-right com cor por threshold (verde/amarelo/vermelho) mostrando `CLS atual da rota: 0.0XX`.
   - Click expande lista dos últimos 5 shifts com elemento/valor.
   - Montado em `App.tsx` dentro do shell, **fora** do roteador (para sobreviver a trocas de rota).

**6. Documentação** `docs/CLS_MONITORING.md` (novo, ~40 linhas)
   - Como interpretar valores no console DEV.
   - Como validar manualmente: navegar para `/cameras` ou `/alerts` com throttle 3G no DevTools, observar badge — esperar `< 0.05` se skeletons estão bem feitos.
   - Como desligar (apenas remover `startCLSMonitor()`).
   - Mapa: shift acima de 0.1 numa rota com loading → revisar skeleton da seção apontada em `topSources`.

### Critérios de aceitação

- Em DEV, navegando para `/dashboard`, `/cameras`, `/alerts`, `/zones` com throttle 3G simulado, o badge mostra `CLS < 0.1` e nenhum `console.warn` de threshold.
- Se intencionalmente removermos um skeleton (teste de regressão), o badge fica amarelo/vermelho e o console.warn lista o elemento culpado.
- Em PROD, nenhum console.log de CLS aparece; apenas `logger.warn` se `cls >= 0.1` ao final da rota.
- `npm run check:skeletons` continua verde (TS, lint, build).
- Bundle: `clsMonitor.ts` é puro JS, sem deps; `CLSBadge` só importa em DEV (tree-shaken em prod via `import.meta.env.DEV` guard no `App.tsx`).

### Arquivos a criar/editar

- ➕ `src/lib/clsMonitor.ts` (novo, ~80 linhas, sem dependências)
- ➕ `src/hooks/useRouteCLS.ts` (novo, ~30 linhas)
- ➕ `src/components/debug/CLSBadge.tsx` (novo, ~40 linhas, DEV-only)
- ➕ `docs/CLS_MONITORING.md` (novo, ~40 linhas)
- ✏️ `src/main.tsx` — chamar `startCLSMonitor()` antes do `createRoot`
- ✏️ `src/components/layout/MainLayout.tsx` (caminho a confirmar) — montar `useRouteCLS()`
- ✏️ `src/App.tsx` — montar `<CLSBadge />` em DEV

### Riscos

- **Risco:** `PerformanceObserver` para `layout-shift` não é suportado em Safari < 16.4 e Firefox.
  - **Mitigação:** wrap em `try/catch` + checagem de `'PerformanceObserver' in window` e `PerformanceObserver.supportedEntryTypes?.includes('layout-shift')`. No-op silencioso quando indisponível.
- **Risco:** badge DEV pode interferir em screenshots de QA / E2E.
  - **Mitigação:** badge tem `data-testid="cls-debug-badge"` e é facilmente filtrável; documentar em `CLS_MONITORING.md` como ocultar via querystring `?nocls=1`.
- **Risco:** "fim do load" é heurístico (3s após last query) e pode reportar cedo demais para listas com paginação infinita.
  - **Mitigação:** primeira versão usa heurística simples; documentar limitação. Iteração futura pode plugar em React Query devtools API. Para o objetivo (validar skeletons das 3 páginas), é suficiente.
- **Risco:** sources de shift podem expor dados sensíveis em classes/IDs se logarmos em prod.
  - **Mitigação:** em prod, log apenas `tagName` + 1º className truncado a 20 chars, sem `id`, sem texto de filhos.

