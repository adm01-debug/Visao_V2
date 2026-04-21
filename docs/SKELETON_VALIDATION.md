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

## Acessibilidade dos skeletons

Todo estado de loading deve ser anunciado corretamente para tecnologias assistivas (NVDA, VoiceOver, JAWS).

### Regras

**Skeletons primitivos** (puramente decorativos — `Skeleton`, `Shimmer`, `BrandedSkeleton`, `SkeletonLoader`, `StatSkeleton`, `AlertSkeleton`, `CameraSkeleton`):

- Sempre marcados com `aria-hidden="true"`.
- Não carregam `role`, `aria-label` nem `aria-live` — quem anuncia é o container externo.

**Skeletons compostos / page-level** (`DashboardSkeleton`, `CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`, `PeopleSkeleton`, `RecordingsSkeleton`, `AnalyticsSkeleton`, `SecuritySkeleton`, `SettingsSkeleton`, `CardSkeleton`, `ListSkeleton`, `TableSkeleton`, `StatsSkeleton`, `ChartSkeleton`, `PageLoadingSkeleton`, `CameraGridSkeleton`, `AlertsSidebarSkeleton`):

```tsx
<div
  role="status"
  aria-live="polite"
  aria-busy="true"
  aria-label="Carregando {recurso}…"
  className="…"
>
  {/* shimmer/conteúdo decorativo */}
  <span className="sr-only">Carregando {recurso}…</span>
</div>
```

**Páginas com shell estável** (`CamerasPage`, `AlertsPage`, `ZonesPage`):

A região de conteúdo que troca entre skeleton e dados reais recebe:

```tsx
<div aria-busy={loading} aria-live="polite">
  {loading ? <Skeleton/> : <Content/>}
</div>
```

Quando `loading` vira `false`, o `aria-busy` cai automaticamente e leitores de tela anunciam o conteúdo recém-renderizado.

### Checklist para novos skeletons

- [ ] Primitivo decorativo? → `aria-hidden="true"`, sem outros atributos.
- [ ] Visível ao usuário durante o load? → `role="status"` + `aria-live="polite"` + `aria-busy="true"` + `aria-label` em PT-BR + `<span className="sr-only">` redundante.
- [ ] Está dentro de uma página com shell estável? → o wrapper que faz `loading ? <Skeleton/> : <Content/>` declara `aria-busy={loading}` + `aria-live="polite"`.
- [ ] Validar com leitor de tela: anúncio único ao entrar; anúncio de conteúdo após carregamento.

### Validação manual

1. Abra a página em DEV.
2. Ative NVDA (Windows) ou VoiceOver (`Cmd+F5`, macOS).
3. Navegue até a rota — deve ouvir "Carregando câmeras…" (ou label equivalente).
4. Quando o carregamento termina, o leitor anuncia o novo conteúdo automaticamente.
5. Inspecione no DevTools: o container do skeleton tem `role="status"`, `aria-busy="true"`; primitivos internos têm `aria-hidden="true"`.
