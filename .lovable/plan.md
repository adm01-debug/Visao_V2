

## Fallback de skeleton para evitar tela em branco

Garantir que, se um componente branded de skeleton (ex.: `BrandedSkeleton`, `CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`, `DashboardSkeleton`) falhar ao carregar — seja por erro de import dinâmico, chunk corrompido ou exceção de runtime —, o usuário veja um skeleton genérico em vez de tela em branco.

### Estado atual

- Page-level skeletons (`CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`, `DashboardSkeleton`) são usados como `Suspense` fallback no lazy-load das páginas (via `LazyPages` / `App.tsx`).
- `BrandedSkeleton` (em `src/components/ui/skeleton.tsx`) é usado dentro de vários skeletons granulares (cards de câmera, mapas, etc.).
- Hoje **não há** Error Boundary em volta desses fallbacks. Se o próprio chunk do skeleton falhar (raro mas possível em rede instável ou após deploy quebrado), o `Suspense` pode ficar pendurado e o usuário vê tela branca.
- Também não há try/catch em volta de `BrandedSkeleton` quando ele monta o `<Shield>` icon — se `lucide-react` falhar de forma isolada, o slot fica vazio.

### Mudanças

**1. Novo componente** `src/components/skeletons/SkeletonFallback.tsx`
   - Skeleton genérico mínimo, **sem dependências externas** além de `cn` e Tailwind (não importa `lucide-react`, `framer-motion` nem `@/components/ui/skeleton`).
   - Renderiza 3 barras cinzas animadas via puro `animate-pulse` do Tailwind.
   - Aceita prop `label?` para texto acessível (`aria-label`, default: "Carregando…").
   - ~30 linhas, zero risco de cascata de falha.

**2. Novo componente** `src/components/skeletons/SkeletonErrorBoundary.tsx`
   - `class SkeletonErrorBoundary extends React.Component` com `componentDidCatch` que loga via `logger.error` (já existente em `src/lib/logger.ts`) e renderiza `<SkeletonFallback />`.
   - Aceita `children` e prop opcional `fallback?: ReactNode` para customização.
   - Reseta estado quando `children` muda (via `getDerivedStateFromProps` comparando key).

**3. Wrapper de Suspense + ErrorBoundary** em `src/lib/lazyLoad.tsx`
   - Atualizar `withLazyLoad` (e o uso direto de `Suspense` no App) para envolver o fallback assim:
     ```
     <SkeletonErrorBoundary>
       <Suspense fallback={<SkeletonErrorBoundary>{fallback}</SkeletonErrorBoundary>}>
         <LazyComponent />
       </Suspense>
     </SkeletonErrorBoundary>
     ```
   - O ErrorBoundary externo cobre falhas no `LazyComponent` real; o interno cobre falhas no próprio `fallback` (ex.: `DashboardSkeleton` quebrado).

**4. Hardening do `BrandedSkeleton`** em `src/components/ui/skeleton.tsx`
   - Envolver o `<Shield />` em try/catch via componente wrapper que cai para um `<div className="w-8 h-8 rounded bg-muted-foreground/20" />` se o ícone não montar. Implementação: pequeno `IconOrFallback` interno que usa Error Boundary local.
   - Alternativa mais leve: render condicional `{Shield ? <Shield /> : <div className="w-8 h-8" />}` — escolher essa, evitando boundary duplicado.

**5. Aplicar boundary nos pontos de uso de page-level skeletons**
   - `src/App.tsx` (ou onde `<Suspense fallback={<DashboardSkeleton />}>` é declarado): substituir pelos wrappers de `lazyLoad.tsx` já hardened. Sem mudanças adicionais nas páginas.

### Critérios de aceitação

- Se `DashboardSkeleton` lançar erro durante render (simulável via teste), o `<SkeletonFallback />` aparece e o app não fica em branco.
- Se um chunk lazy falhar (`import()` rejeita), o `<SkeletonFallback />` aparece com label "Carregando…" e o erro vai para `logger.error`.
- `BrandedSkeleton` sem `lucide-react` disponível ainda renderiza o shimmer + um placeholder cinza no centro.
- `npm run check:skeletons` continua verde (TS, lint, mobile-nav, build).
- Sem regressão visual: em rota normal, o usuário vê os mesmos skeletons branded de hoje.

### Arquivos a criar/editar

- ➕ `src/components/skeletons/SkeletonFallback.tsx` (novo, ~30 linhas)
- ➕ `src/components/skeletons/SkeletonErrorBoundary.tsx` (novo, ~50 linhas)
- ✏️ `src/components/ui/skeleton.tsx` — hardening do `BrandedSkeleton` (~5 linhas)
- ✏️ `src/lib/lazyLoad.tsx` — envolver `withLazyLoad` com `SkeletonErrorBoundary` interno+externo
- ✏️ `docs/SKELETON_VALIDATION.md` — adicionar seção curta "Fallback e Error Boundary" explicando a cadeia de defesa

### Riscos

- **Risco:** Error Boundary excessivo pode mascarar erros reais em desenvolvimento.
  - **Mitigação:** em `import.meta.env.DEV`, além de renderizar o fallback, re-loga com stack completa via `console.error` para visibilidade no DevTools.
- **Risco:** `SkeletonErrorBoundary` precisa ser componente de classe (React não tem hook equivalente para `componentDidCatch`).
  - **Mitigação:** aceitar — é o único caminho oficial; manter o arquivo pequeno e isolado.
- **Risco:** dupla camada de boundary pode adicionar nós extras na árvore React.
  - **Mitigação:** impacto desprezível (~2 nós por rota lazy); ganho de resiliência compensa.

