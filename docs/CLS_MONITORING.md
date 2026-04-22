# Monitoramento de CLS (Cumulative Layout Shift)

Instrumentação leve para validar empiricamente que os skeletons branded
(shell estável + skeletons granulares) eliminaram saltos de layout durante
a transição loading → dados.

## Como funciona

- `src/lib/clsMonitor.ts` usa `PerformanceObserver({ type: 'layout-shift' })`
  e mantém um acumulador **por rota** (resetado em `useRouteCLS` quando o
  `pathname` muda).
- Cada `LayoutShift` sem `hadRecentInput` é somado ao CLS da rota e
  registrado com `selector`, `value` e `timestamp` relativo ao mount.
- Thresholds Web Vitals: `good < 0.1`, `needs-improvement < 0.25`, `poor >= 0.25`.

## Em DEV

- Badge fixo em `bottom-right` mostra o CLS atual da rota
  (`<CLSBadge />` montado em `App.tsx`).
- Verde (`< 0.1`), amarelo (`< 0.25`), vermelho (`>= 0.25`).
- Click expande os 5 shifts mais recentes (selector + valor).
- Quando o CLS cruza `0.1`, um `console.warn` exibe os top-3 shifts em tabela.
- Além disso, um **toast `sonner`** (`useCLSAlert`) é disparado uma vez por rota,
  mostrando `CLS X.XXX em /rota` + maior shift (selector + valor) e link para
  `/cls-report`. Reseta no próximo `pathname`.
- Para ocultar o badge (ex.: screenshots de QA): `?nocls=1` na URL.

### Overlay de shifts

Componente `CLSShiftOverlay` (DEV) destaca visualmente os elementos que mais
geraram CLS na rota atual com boxes coloridos (top 1 = vermelho, 2-3 = âmbar,
demais = primary) e rótulos `#N selector +valor`.

- Toggle: **Alt+Shift+L** ou botão **🎯 Marcar** no painel expandido do badge.
- Estado persistido em `localStorage` (`visao:cls-overlay:v1`).
- Reposiciona em `scroll`/`resize` e re-poll por 8s após o toggle para
  capturar shifts tardios.
- Usa `WeakRef` para o nó DOM original capturado pelo `PerformanceObserver`,
  garantindo que o overlay aponte para o elemento real (não para um seletor
  reconstruído).
- `pointer-events: none` — não interfere em cliques.

## Log de navegação (antes vs depois)

A cada navegação, o `useRouteCLS` chama `appendNavigationCLS(report)` 3s após
o "load completo", gravando uma entrada em `localStorage`
(`visao:cls-nav-log:v1`, máx. 500 entradas, FIFO) com:

```
{ sessionId, capturedAt, path, cls, rating, shiftCount, shiftWindowMs, topSources[] }
```

- `sessionId` é único por aba (sessionStorage) — facilita comparar runs.
- Em DEV: `console.info` curto por entrada + `window.__clsNavLog` no console:
  `__clsNavLog.get()`, `__clsNavLog.download('ndjson'|'json')`, `.clear()`, `.sessionId()`.
- Em PROD: silencioso, exceto `logger.warn` quando `cls >= 0.1`.
- Em `/cls-report` há o botão **Exportar log** que baixa
  `cls-nav-log_<sessionId>.ndjson` (uma entrada por linha — fácil de `diff`).

Fluxo recomendado para comparar antes/depois:
1. Antes da mudança: navegue pelas rotas, abra `/cls-report` → **Exportar log**.
2. Faça a refatoração.
3. Recarregue a aba (gera novo `sessionId`), repita as navegações, exporte
   novamente e compare os arquivos com `diff`/`jq`.

## Em PROD

- Sem badge, sem `console.log`.
- Quando uma rota termina com `cls >= 0.1`, dispara
  `logger.warn('Route CLS exceeded 0.1', { path, cls, shiftCount, topSources })`
  uma única vez por rota.
- `selector` em prod é truncado: `tagName.firstClass` (sem `id`, sem texto).

## Validação manual

## Regressão automatizada (Playwright)

Suite `tests/e2e/cls-regression.spec.ts` injeta um `PerformanceObserver`
para `layout-shift` **antes** do JS da página, navega por uma lista de
rotas e falha se o CLS final ultrapassar o threshold.

```bash
npm run test:cls-regression                       # default: 0.1 em /cameras,/alerts,/zones,/dashboard
CLS_THRESHOLD=0.05 npm run test:cls-regression    # threshold mais estrito
CLS_ROUTES=/cameras,/alerts npm run test:cls-regression
CLS_SETTLE_MS=5000 npm run test:cls-regression    # janela maior para shifts tardios
```

- Cada teste anexa `cls-<rota>.json` ao relatório com `cls`, `shiftCount`
  e `topSources` para diagnóstico imediato.
- Thresholds por rota podem ser sobrescritos no objeto `ROUTE_THRESHOLDS`
  do próprio spec (útil para isolar regressão conhecida sem mascarar
  outras rotas).
- Roda em modo `serial` para isolar medições entre rotas.

1. Abrir DevTools → Network → throttle `Slow 3G`.
2. Navegar para `/dashboard`, `/cameras`, `/alerts`, `/zones`.
3. Esperar o badge ficar verde com `CLS < 0.05`.
4. Se ficar amarelo/vermelho: clicar no badge, identificar o `selector`
   listado e revisar o skeleton da seção apontada.

## Como desligar

Remover a chamada `startCLSMonitor()` em `src/main.tsx` e `<CLSBadge />`
em `src/App.tsx`. Os arquivos podem ficar — são tree-shakable.

## Limitações conhecidas

- `PerformanceObserver` para `layout-shift` não é suportado em Safari < 16.4
  e Firefox antigo. Nesses navegadores o monitor é no-op silencioso.
- "Fim do load" é heurístico: 3s após `useIsFetching() === 0`. Listas com
  paginação infinita podem reportar antes da paginação carregar — é
  aceitável para o objetivo de validar skeletons iniciais.
