

## Verificar CLS na transição loading → dados nos skeletons principais

Confirmar que skeletons de Dashboard, listas e tabelas reservam a mesma altura/largura que o conteúdo final, evitando Cumulative Layout Shift (CLS) durante a hidratação.

### Investigação a realizar

1. **Medir CLS real** via `browser--performance_profile` em `/dashboard`, `/cameras`, `/alerts`, `/people`. Meta: CLS < 0.1 (Web Vitals "good").
2. **Comparar dimensões skeleton vs. real** — ler pares de arquivos:
   - `DashboardStats` (4 cards) vs. `dashboard/StatsSkeleton` → confirmar `grid-cols-2 md:grid-cols-4` + altura fixa por card.
   - `DashboardCameraGrid` vs. `CameraGridSkeleton` → confirmar `aspect-video` no skeleton (já presente em `LoadingState.tsx`).
   - `DashboardAlerts` vs. `AlertsSidebarSkeleton` → conferir altura mínima da coluna lateral.
   - `TableSkeleton` vs. tabelas reais (PeoplePage, RecognitionLogsPage) → conferir número de colunas e altura de linha.
3. **Validar wrappers** — `AnimatedTransition` em `Dashboard.tsx` faz crossfade entre skeleton e conteúdo; confirmar que o pai tem altura estável (sem `h-auto` colapsando).

### Critérios de aceitação

- CLS reportado pelo profiler em cada rota: **< 0.1**.
- Cada skeleton tem mesmas dimensões macro do conteúdo final (grid cols, aspect ratio, altura mínima).
- Nenhum "salto" visível ao trocar de loading para dados (verificação por screenshot antes/depois).

### Correções esperadas (aplicar somente se a medição falhar)

| Problema provável | Correção |
|---|---|
| Skeleton de stats sem altura mínima | Adicionar `min-h-[88px]` ao `CardSkeleton` em `LoadingState.tsx` |
| Camera grid skeleton com aspect ratio diferente do `VideoStreamPlayer` real | Alinhar `aspect-video` em ambos |
| `AlertsSidebarSkeleton` colapsando | Adicionar `min-h-[600px]` ou usar `lg:h-full` |
| `TableSkeleton` com nº de colunas hardcoded ≠ real | Passar `cols` corretos via prop em cada página |
| `AnimatedTransition` causando reflow | Garantir `position: relative` + `min-height` no wrapper |

### Validação final

1. `browser--performance_profile` em 4 rotas após qualquer fix.
2. Screenshots comparativos (loading × loaded) para `/dashboard` em viewport 1366×768 e 390×844 (mobile).
3. Confirmar que `mb-mobile-nav` continua intacto (não regredir o gate `npm run check:mobile-nav`).

### Arquivos potencialmente editados

- ✏️ `src/components/ui/LoadingState.tsx` — alturas mínimas em `CardSkeleton`, `CameraGridSkeleton`.
- ✏️ `src/components/dashboard/StatsSkeleton.tsx` (se existir separado) — alinhar grid.
- ✏️ `src/components/dashboard/AlertsSidebarSkeleton.tsx` — altura mínima.
- ✏️ `src/components/TableSkeleton.tsx` — aceitar `rowHeight` prop opcional.
- ✏️ `src/components/ui/AnimatedTransition.tsx` — wrapper com `min-height` herdado do filho.

### Riscos

- **Risco:** alturas fixas podem quebrar responsividade em conteúdo dinâmico (ex: alertas variáveis).
  - **Mitigação:** usar `min-h-*` (não `h-*`) para permitir crescimento, apenas reservando espaço inicial.
- **Risco:** profiler do browser indisponível neste ambiente.
  - **Mitigação:** fallback para inspeção estática comparando classes Tailwind dos pares skeleton/real e reportar achados; rodar profiler quando o preview estiver acessível.

