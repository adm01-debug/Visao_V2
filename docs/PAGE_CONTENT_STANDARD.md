# Padrão de Conteúdo de Páginas (`PageContent`)

Para garantir **margem, altura e comportamento de scroll consistentes** em todos os módulos autenticados, todas as páginas autenticadas devem usar o componente `PageContent` como wrapper raiz do conteúdo.

## Contrato (única fonte de verdade)

| Responsabilidade | Local | Não duplicar em |
|---|---|---|
| Scroll container | `[data-app-scroll]` no `MainLayout` | Páginas |
| Padding lateral/topo (`p-4 md:p-6`) | `<main>` no `MainLayout` | Páginas |
| Espaço para BottomNav (`mb-mobile-nav`) | `<main>` no `MainLayout` | Páginas |
| `min-h-full` | `<main>` no `MainLayout` | Páginas |
| Espaçamento vertical entre seções (`space-y-6`) | `PageContent` | `<div>` ad-hoc |
| Largura máxima opcional (`max-w-*`) | `PageContent` (prop `maxWidth`) | Wrappers ad-hoc |

**Regra de ouro:** páginas NUNCA criam container de scroll próprio nem aplicam `mb-mobile-nav`. O guard runtime (`mobileNavGuard`) avisa em DEV se essa regra for violada.

## API

```tsx
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';

export default function MyPage() {
  return (
    <PageContent>
      <PageMeta title="Minha página" description="..." />
      <SectionA />
      <SectionB />
    </PageContent>
  );
}
```

### Props

| Prop | Tipo | Default | Uso |
|---|---|---|---|
| `children` | `ReactNode` | — | Seções da página |
| `className` | `string` | — | Classes utilitárias adicionais |
| `maxWidth` | `'sm' \| 'md' \| 'lg' \| 'xl' \| '2xl' \| 'full'` | `'full'` | Largura máxima centralizada |
| `spacing` | `4 \| 6 \| 8` | `6` | Gap vertical entre filhos diretos (Tailwind `space-y-*`) |

### Exemplos

**Página de configurações (largura limitada para legibilidade):**
```tsx
<PageContent maxWidth="md">
  <PageMeta ... />
  <SettingsForm />
</PageContent>
```

**Dashboard (full width, mais respiro entre seções):**
```tsx
<PageContent spacing={8}>
  <KpiGrid />
  <ChartsRow />
  <CamerasGrid />
</PageContent>
```

## Verificação automatizada

- **Static check:** `npm run check:page-content` (prebuild + CI). Lista páginas pendentes de migração; falha se uma página NOVA for criada sem `PageContent`.
- **Modo strict:** `npm run check:page-content -- --strict`. Falha se qualquer página autenticada não usar `PageContent`. Promover quando todas estiverem migradas.
- **Runtime guard:** `mobileNavGuard` em DEV detecta containers de scroll próprios sem padding suficiente.
- **Visual regression:** `npm run test:mobile-nav-visual` valida snapshots mobile em todas as rotas críticas.

## Migração de páginas existentes

A lista `PENDING_MIGRATION` em `scripts/check-page-content.mjs` rastreia páginas que ainda não foram migradas. Para migrar uma página:

1. Substitua o wrapper raiz (`<div className="space-y-6">`, `<>`, etc.) por `<PageContent>`.
2. Remova `space-y-*` redundante do filho direto.
3. Remova qualquer `mb-mobile-nav`, `p-4 md:p-6`, ou `min-h-full` que estejam duplicados.
4. Rode `npm run check:page-content` — se a migração estiver correta, a página será removida automaticamente da lista de pendentes na próxima execução.
5. Remova manualmente o nome da página de `PENDING_MIGRATION` no script.
6. Valide visualmente em mobile (`npm run test:mobile-nav-visual` ou DevTools).

Quando `PENDING_MIGRATION` estiver vazio, atualize o CI para usar `--strict`.

## Páginas standalone (exceção)

Páginas que **não** usam `MainLayout` (sem Sidebar/BottomNav) ficam em `STANDALONE_ALLOWLIST`:

- `Auth.tsx`, `AuthCallback.tsx`, `ResetPasswordPage.tsx` — fluxo de autenticação.
- `NotFound.tsx`, `AcessoNegado.tsx` — telas de erro.
- `CoveragePage.tsx` — dashboard interno de cobertura.
- `Index.tsx` — landing/redirect.

Adicionar nova standalone exige justificativa explícita no PR.
