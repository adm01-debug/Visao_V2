

## Acessibilidade dos skeletons (aria-busy + screen readers)

Garantir que todo estado de loading anuncie corretamente para tecnologias assistivas: `aria-busy`, `role`, `aria-live` e texto alternativo escondido visualmente.

### Estado atual

- `SkeletonFallback` já tem `role="status"` + `aria-live="polite"` + `aria-label` + `<span className="sr-only">` ✅ (referência boa).
- `Skeleton` base (`src/components/ui/skeleton.tsx`) e `BrandedSkeleton`: **sem** atributos ARIA. Renderizam puros `<div>` decorativos.
- `Shimmer`, `CardSkeleton`, `CameraGridSkeleton`, `ListSkeleton`, `TableSkeleton`, `StatsSkeleton`, `ChartSkeleton`, `PageLoadingSkeleton` em `src/components/ui/LoadingState.tsx`: **sem** ARIA.
- Page-level skeletons (`DashboardSkeleton`, `CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`, `PeopleSkeleton`, `RecordingsSkeleton`, `AnalyticsSkeleton`, `SecuritySkeleton`, `SettingsSkeleton`): **sem** ARIA.
- `TabsSkeleton` tem `aria-hidden="true"` ✅ (correto — é só reserva de altura).
- Páginas refatoradas (`CamerasPage`, `AlertsPage`, `ZonesPage`) renderizam shell + região de conteúdo trocada por skeleton, mas a região não declara `aria-busy`.

### Princípios aplicados

1. **Skeletons primitivos** (`Skeleton`, `Shimmer`, `BrandedSkeleton`, `SkeletonLoader`): puramente decorativos → `aria-hidden="true"`. Quem anuncia é o **container**.
2. **Skeletons compostos visíveis ao usuário** (page-level e seções como `CameraGridSkeleton`, `ListSkeleton`, `TableSkeleton`, `StatsSkeleton`): ganham `role="status"` + `aria-live="polite"` + `aria-busy="true"` + `aria-label` em PT-BR ("Carregando câmeras…", etc.) + `<span className="sr-only">` com o mesmo texto para fallback de leitores antigos.
3. **Regiões de conteúdo trocadas dentro de páginas com shell estável** (`CamerasPage`, `AlertsPage`, `ZonesPage`): o `<div>` que envolve o skeleton recebe `aria-busy={loading}` e `aria-live="polite"`. Quando `loading` vira `false`, o `aria-busy` cai automaticamente e leitores de tela anunciam o novo conteúdo.
4. **`SkeletonErrorBoundary`**: já delega ao `SkeletonFallback` que tem ARIA correto — sem mudança.

### Mudanças por arquivo

**Primitivos (marcar como decorativos):**
- ✏️ `src/components/ui/skeleton.tsx` — adicionar `aria-hidden="true"` em `Skeleton`, `BrandedSkeleton`, `StatSkeleton`, `AlertSkeleton`, `CameraSkeleton`.
- ✏️ `src/components/ui/LoadingState.tsx` — adicionar `aria-hidden="true"` em `Skeleton` e `Shimmer` (componentes primitivos).
- ✏️ `src/components/skeleton/SkeletonLoader.tsx` — adicionar `aria-hidden="true"`.
- ✏️ `src/components/TableSkeleton.tsx` (componente solto) — adicionar `role="status"` + `aria-busy="true"` + `aria-label="Carregando tabela…"` + `sr-only`.

**Skeletons compostos / page-level (anunciar loading):**

Padrão aplicado em cada um:
```
<div role="status" aria-live="polite" aria-busy="true" aria-label="Carregando {recurso}…">
  …conteúdo decorativo existente…
  <span className="sr-only">Carregando {recurso}…</span>
</div>
```

- ✏️ `src/components/ui/LoadingState.tsx` — `CardSkeleton`, `CameraGridSkeleton`, `ListSkeleton`, `TableSkeleton`, `StatsSkeleton`, `ChartSkeleton`, `PageLoadingSkeleton`.
- ✏️ `src/components/PageSkeletons.tsx` — `CardSkeleton`, `TableSkeleton` (variantes locais).
- ✏️ `src/components/skeletons/DashboardSkeleton.tsx` — label "Carregando painel…".
- ✏️ `src/components/skeletons/CamerasSkeleton.tsx` — label "Carregando câmeras…".
- ✏️ `src/components/skeletons/AlertsSkeleton.tsx` — label "Carregando alertas…".
- ✏️ `src/components/skeletons/ZonesSkeleton.tsx` — label "Carregando zonas…".
- ✏️ `src/components/skeletons/PeopleSkeleton.tsx` — "Carregando pessoas…".
- ✏️ `src/components/skeletons/RecordingsSkeleton.tsx` — "Carregando gravações…".
- ✏️ `src/components/skeletons/AnalyticsSkeleton.tsx` — "Carregando análises…".
- ✏️ `src/components/skeletons/SecuritySkeleton.tsx` — "Carregando segurança…".
- ✏️ `src/components/skeletons/SettingsSkeleton.tsx` — "Carregando configurações…".
- ✏️ `src/components/dashboard/DashboardSkeleton.tsx` — `StatsSkeleton`, `CameraGridSkeleton`, `AlertsSidebarSkeleton`, `DashboardSkeleton` (root).

**Páginas com shell estável (region wrapper):**
- ✏️ `src/pages/CamerasPage.tsx` — adicionar `aria-busy={loading}` + `aria-live="polite"` no wrapper que troca grid/lista por skeleton.
- ✏️ `src/pages/AlertsPage.tsx` — idem na região de lista.
- ✏️ `src/pages/ZonesPage.tsx` — idem na região de tabela.

(Confirmar nomes/caminhos exatos dos wrappers via leitura no momento da implementação; se a estrutura usar nome diferente, aplicar ao container imediato do skeleton.)

**Documentação:**
- ✏️ `docs/SKELETON_VALIDATION.md` — nova seção "Acessibilidade" com a regra: primitivos = `aria-hidden`, compostos = `role=status + aria-live=polite + aria-busy + aria-label + sr-only`. Inclui checklist para futuros skeletons.

### Critérios de aceitação

- Inspecionar `<DashboardSkeleton />` no DevTools mostra `role="status"`, `aria-busy="true"`, `aria-live="polite"`, `aria-label="Carregando painel…"` e um `<span class="sr-only">`.
- Skeletons primitivos (`<Skeleton />`, `<BrandedSkeleton />`) aparecem com `aria-hidden="true"` e sem `role`.
- Em `/cameras`, `/alerts`, `/zones`: o container do conteúdo declara `aria-busy="true"` enquanto `loading`, e `false` (ou ausente) após.
- Leitor de tela (NVDA/VoiceOver) anuncia "Carregando câmeras…" uma vez ao entrar na rota e o anúncio do conteúdo real assim que `loading` termina.
- `npm run check:skeletons` continua verde (TS strict, lint, build, mobile-nav).
- Nenhuma regressão visual: ARIA é invisível.

### Riscos

- **Risco:** múltiplos `role="status"` aninhados podem causar leitura duplicada por alguns screen readers.
  - **Mitigação:** marcar primitivos como `aria-hidden`; apenas o container externo de cada seção carrega o `role="status"`.
- **Risco:** `aria-live="polite"` em grandes árvores pode disparar anúncio quando shimmer re-renderiza.
  - **Mitigação:** o conteúdo dentro do container é `aria-hidden`, então mudanças visuais não geram anúncio. Apenas o `aria-label` é lido (estático).
- **Risco:** wrappers em `CamerasPage`/`AlertsPage`/`ZonesPage` podem ter estrutura ligeiramente diferente do esperado.
  - **Mitigação:** ler cada arquivo durante a implementação e aplicar no `<div>` que faz a troca condicional `loading ? <Skeleton/> : <Content/>`.

