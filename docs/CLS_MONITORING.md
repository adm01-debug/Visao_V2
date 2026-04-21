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
- Para ocultar o badge (ex.: screenshots de QA): `?nocls=1` na URL.

## Em PROD

- Sem badge, sem `console.log`.
- Quando uma rota termina com `cls >= 0.1`, dispara
  `logger.warn('Route CLS exceeded 0.1', { path, cls, shiftCount, topSources })`
  uma única vez por rota.
- `selector` em prod é truncado: `tagName.firstClass` (sem `id`, sem texto).

## Validação manual

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
