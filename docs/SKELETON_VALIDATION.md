# Skeleton Validation Pipeline

Pré-flight focado para garantir que mudanças em skeletons (filtros, tabs, listas) não
quebrem layout, tipos ou imports nas páginas **Câmeras**, **Alertas** e **Zonas**.

## Quando rodar

- Após qualquer alteração em `src/components/skeletons/**`.
- Após editar `src/pages/CamerasPage.tsx`, `src/pages/AlertsPage.tsx` ou `src/pages/ZonesPage.tsx`.
- Antes de abrir PR que toque em estados de `loading`.

## Como rodar

```bash
npm run check:skeletons              # pipeline completo (~30–60s)
npm run check:skeletons -- --skip-build   # iteração rápida (sem vite build)
```

## Etapas

| # | Etapa | Falha quando… | Fallback isolado |
|---|---|---|---|
| 1 | `tsc --noEmit` | qualquer erro de tipo no projeto | `npm run type-check` |
| 2 | `eslint --max-warnings 0` nas páginas-alvo + skeletons | warning ou erro de lint | `npx eslint src/pages/CamerasPage.tsx` |
| 3 | scan de imports órfãos (`Skeleton`, `FiltersBarSkeleton`, `TabsSkeleton`, etc.) | símbolo importado e não usado no JSX | inspeção manual no arquivo apontado |
| 4 | `check:mobile-nav` | regressão de `mb-mobile-nav` | `npm run check:mobile-nav` |
| 5 | `vite build` | falha de build / chunk | `npm run build` |

## Mapa erro → arquivo provável

- **TS error em `loading`** → `AlertStatsCards.tsx` ou `AlertSeveritySummary.tsx` (props opcionais).
- **Import órfão de `CamerasSkeleton`** → `CamerasPage.tsx` (refator removeu uso direto).
- **Lint warning `react/jsx-key`** → loops em `FiltersBarSkeleton.tsx` / `TabsSkeleton.tsx`.
- **Falha em `check:mobile-nav`** → página redeclarando `mb-mobile-nav` ou wrapper customizado novo.
- **Falha em `vite build`** → checar import circular entre `skeletons/index` e páginas.

## Regra de uso dos skeletons

> **Page-level skeletons (`CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`) são
> reservados para fallback de `React.lazy` / `Suspense` no `App.tsx`** — quando o bundle
> da página inteira ainda não chegou e nem o shell pode ser montado.
>
> Estados `loading` **dentro da página** (após o bundle carregado) devem manter o shell
> real (header + filtros + tabs + contadores) visível e trocar **apenas** a região de
> conteúdo por skeletons granulares (`CameraSkeleton`, `AlertSkeleton`, `StatSkeleton`,
> `TableSkeleton`, `ListSkeleton`). Inputs/selects ficam `disabled={loading}`.
>
> Isso elimina o CLS na faixa de filtros — substituir o shell inteiro por
> `CamerasSkeleton`/`AlertsSkeleton`/`ZonesSkeleton` em early-return é uma **regressão
> conhecida** e deve ser rejeitado em review.

## Fallback e Error Boundary

Para evitar tela em branco caso um skeleton branded (`BrandedSkeleton`,
`DashboardSkeleton`, `CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`)
falhe ao carregar — chunk corrompido, erro de runtime ou import dinâmico
rejeitado — o sistema usa uma cadeia dupla de defesa em `src/lib/lazyLoad.tsx`:

```
<SkeletonErrorBoundary>                  ← captura falha do componente lazy
  <Suspense fallback={
    <SkeletonErrorBoundary>{fallback}</SkeletonErrorBoundary>  ← captura falha do próprio skeleton
  }>
    <LazyComponent />
  </Suspense>
</SkeletonErrorBoundary>
```

Quando qualquer boundary captura um erro, ele renderiza
`SkeletonFallback` — um skeleton genérico **sem dependências externas**
(apenas `cn` + Tailwind `animate-pulse`) e loga via `logger.error`. Em DEV,
o stack completo também vai para `console.error` para visibilidade no DevTools.

`BrandedSkeleton` faz render condicional do ícone `Shield` (`lucide-react`)
para tolerar falha isolada da biblioteca de ícones.

## Observações

- Pipeline **não substitui** os gates de CI (`type-check:strict`, `lint:ci`, `test:ci`,
  `check:bundle-size`); é um agregador rápido para o ciclo skeleton.
- Saída é silenciosa em sucesso; em falha, imprime apenas o stdout/stderr da etapa que
  quebrou para facilitar diagnóstico.
