

## Reservar espaço em filtros/tabs durante o loading

Garantir que as áreas de filtros, tabs e contadores em Alertas, Câmeras e Zonas mantenham altura/largura estáveis enquanto os dados chegam, eliminando o "salto" da UI no primeiro render.

### Problema observado

Hoje, quando `loading === true`, várias páginas renderizam **somente o skeleton do conteúdo principal** e ocultam toda a faixa de filtros/tabs/contadores. Quando os dados chegam, essa faixa aparece de uma vez e empurra o conteúdo para baixo — gerando CLS visível mesmo após os fixes anteriores nos skeletons de cards/tabelas.

Exemplo em `CamerasPage.tsx`: durante `loading` retorna apenas `<CamerasSkeleton />`, sem header, filtros nem o switcher de view mode. O mesmo padrão se repete em `AlertsPage` e `ZonesPage`.

### Mudanças

**1. Novo componente reutilizável** `src/components/skeletons/FiltersBarSkeleton.tsx`
   - Altura fixa (`h-10`) replicando a barra real: search input + N selects + view switcher.
   - Props: `searchWidth?`, `selectsCount?`, `showViewSwitcher?`, `showResetButton?`.
   - Usa `Skeleton` existente — mesmas dimensões dos componentes finais (`Input` h-10, `Select` h-10, botões h-10).

**2. Novo componente** `src/components/skeletons/TabsSkeleton.tsx`
   - Reserva altura da `TabsList` (h-10) com N "pílulas" cinzas.
   - Props: `tabsCount?` (default 3).

**3. Refatorar páginas para renderizar header+filtros sempre, e skeleton apenas no conteúdo:**

   - **`src/pages/CamerasPage.tsx`** — remover early `return <CamerasSkeleton />`. Em vez disso:
     - Sempre renderizar header (com contador "—" enquanto carrega).
     - Sempre renderizar barra de filtros (desabilitada durante loading via `disabled` prop).
     - Substituir apenas o `<div className="grid">` por `<CameraGridSkeleton count={8} />` quando `loading`.

   - **`src/pages/AlertsPage.tsx`** — mesmo padrão: manter `AlertSeveritySummary`+`AlertStatsCards`+filtros visíveis, trocar apenas a lista de alertas por `<ListSkeleton count={5} />`.
     - `AlertSeveritySummary` e `AlertStatsCards` precisam aceitar `loading?: boolean` para mostrar valores `—` em vez de zeros enganosos.

   - **`src/pages/ZonesPage.tsx`** — manter tabs e header; trocar apenas o conteúdo da tab ativa por `<TableSkeleton rows={6} />` ou equivalente.

**4. Atualizar `CamerasSkeleton.tsx`** para usar os novos blocos compostos (`FiltersBarSkeleton` + `CameraGridSkeleton`), eliminando duplicação de markup.

### Critérios de aceitação

- Em `/cameras`, `/alerts`, `/zones`: ao recarregar, o header, faixa de filtros e (quando aplicável) tabs aparecem **imediatamente** com altura estável; só o conteúdo abaixo troca de skeleton para dados.
- Nenhum botão/filtro fica clicável durante `loading` (atributo `disabled` aplicado).
- CLS visual percebido em torno da faixa de filtros ≈ 0 nas três rotas.
- `npm run check:mobile-nav` continua verde (não mexer em `mb-mobile-nav`).
- Sem hardcoded hex; usar tokens semânticos existentes.

### Arquivos a editar/criar

- ➕ `src/components/skeletons/FiltersBarSkeleton.tsx` (novo)
- ➕ `src/components/skeletons/TabsSkeleton.tsx` (novo)
- ✏️ `src/components/skeletons/CamerasSkeleton.tsx` (consumir novos blocos)
- ✏️ `src/pages/CamerasPage.tsx` (remover early return; skeleton só no grid)
- ✏️ `src/pages/AlertsPage.tsx` (manter shell; skeleton só na lista)
- ✏️ `src/pages/ZonesPage.tsx` (manter shell+tabs; skeleton só no conteúdo)
- ✏️ `src/components/alerts/AlertSeveritySummary.tsx` e `AlertStatsCards.tsx` (aceitar prop `loading`)

### Riscos

- **Risco:** filtros interativos durante loading podem disparar refetch antes da primeira resposta.
  - **Mitigação:** prop `disabled` em todos inputs/selects enquanto `loading === true`.
- **Risco:** `CamerasSkeleton` é importado por outras rotas (lazy fallback).
  - **Mitigação:** manter export default funcional; refatorar internamente sem quebrar API.
- **Risco:** `AlertSeveritySummary`/`AlertStatsCards` podem ter outros consumidores.
  - **Mitigação:** prop `loading` opcional com default `false` — comportamento preserva-se.

