

## Decisão: não substituir

A proposta vai **na direção oposta** do que acabamos de implementar e aprovar nas duas últimas tarefas. Recomendo **não executar** e explico abaixo.

### Estado atual (após tarefas anteriores aprovadas)

As páginas `CamerasPage`, `AlertsPage` e `ZonesPage` foram refatoradas para:

1. Renderizar **sempre** o shell (header, filtros, tabs, contadores) — mesmo durante `loading`.
2. Substituir **apenas** a região de conteúdo (grid/lista/tabela) por skeletons granulares (`CameraSkeleton`, `ListSkeleton`, `TableSkeleton`).
3. Desabilitar inputs/selects via `disabled={loading}` enquanto carrega.

Isso eliminou o CLS na faixa de filtros — objetivo central da tarefa anterior.

### O que aconteceria se voltássemos a usar `CamerasSkeleton` / `AlertsSkeleton` / `ZonesSkeleton`

Esses componentes são **page-level skeletons** que redesenham o header + filtros + conteúdo do zero como blocos `<Skeleton>`. Usá-los como early-return reintroduz exatamente o problema que acabamos de corrigir:

- A faixa de filtros real só aparece quando `loading` vira `false`, causando salto vertical (CLS).
- Os shells reais (com `disabled`) deixam de ser renderizados → perdemos a estabilidade conquistada.
- O gate `npm run check:skeletons` provavelmente continuaria passando (não detecta CLS), mas o comportamento visual regrediria.

### Onde os page-level skeletons continuam corretos

`CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton` ainda têm uso legítimo como **fallback de `React.lazy` / Suspense** no `App.tsx` — quando o bundle da página inteira ainda não chegou e nem o shell pode ser montado. Esse uso permanece intacto e não deve mudar.

### Recomendação

**Não fazer a substituição.** Em vez disso, posso:

- **Opção A** — Encerrar como "no-op intencional" e adicionar uma nota em `docs/SKELETON_VALIDATION.md` explicando a regra:
  > Page-level skeletons (`CamerasSkeleton` etc.) são reservados para Suspense de lazy-load. Estados `loading` dentro da página devem trocar apenas a região de conteúdo, mantendo o shell visível.
- **Opção B** — Se houver uma motivação que eu não captei (ex.: reverter a refatoração anterior, ou aplicar isso em outras páginas que ainda usam early-return), me diga qual e eu refaço o plano.
- **Opção C** — Se o objetivo era apenas garantir que `CamerasSkeleton`/`AlertsSkeleton`/`ZonesSkeleton` continuem sendo **usados em algum lugar** (e não viraram código morto após a refatoração), posso auditar `App.tsx` e os `Suspense` boundaries para confirmar.

Qual opção seguimos?

