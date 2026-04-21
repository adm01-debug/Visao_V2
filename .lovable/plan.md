

## Plano: Skeletons branded animados nas páginas de listagem

### Problema
As páginas `CamerasPage`, `AlertsPage` e `ZonesPage` exibem skeletons genéricos básicos (apenas alguns retângulos cinza) durante o loading, que não refletem a estrutura real da página — causando "salto de layout" (CLS) quando os dados chegam.

Os skeletons branded ricos já existem em `src/components/skeletons/` (`CamerasSkeleton`, `AlertsSkeleton`, `ZonesSkeleton`) — com shimmer animado, `BrandedSkeleton` (watermark Shield VISÃO) e estrutura idêntica à página real — mas **não estão sendo usados**.

### Ação

**1. `src/pages/CamerasPage.tsx`** (linhas 72–82)
- Substituir o bloco `if (loading)` pelo import e uso de `<CamerasSkeleton />`.
- Remover import não utilizado de `Skeleton` se não houver outro uso.

**2. `src/pages/AlertsPage.tsx`** (linhas 113–121)
- Substituir o bloco `if (loading)` pelo import e uso de `<AlertsSkeleton />`.
- Limpar import de `Skeleton` se órfão.

**3. `src/pages/ZonesPage.tsx`** (linhas 116–132)
- Substituir o bloco `if (loading)` pelo import e uso de `<ZonesSkeleton />`.
- Manter `<PageMeta />` dentro do skeleton wrapper para SEO consistente.

**4. Verificação de animação shimmer**
- Confirmar que o keyframe `shimmer` referenciado em `src/components/ui/skeleton.tsx` (`after:animate-[shimmer_2s_infinite]`) existe em `tailwind.config.ts`. Se ausente, adicionar:
  ```ts
  shimmer: { '0%': { transform: 'translateX(-100%)' }, '100%': { transform: 'translateX(100%)' } }
  ```
- Também verificar `skeleton-brand-pulse` usado em `BrandedSkeleton`.

**5. Validação**
- `npx tsc --noEmit` para garantir build limpo.

### Resultado esperado
- Loading com layout idêntico ao conteúdo final (zero CLS).
- Shimmer animado contínuo + watermark Shield VISÃO em áreas grandes (thumbnails de câmera, mapa de zona).
- Stats cards, filtros, tabs e grids com forma exata — transição suave entre skeleton e dado real via `animate-fade-in` já presente nos containers.

### Tempo estimado
~5 minutos.

