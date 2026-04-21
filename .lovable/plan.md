

## Unificar wrapper de PageMeta em um Page shell consistente

Criar um único componente `<Page>` que centraliza `PageMeta` + estrutura padrão de wrapper, e migrar todas as páginas (incluindo `Câmeras`, `Alertas`, `Zonas`) para usá-lo. Hoje cada página declara `PageMeta` em uma posição diferente — algumas dentro de `<MainLayout>`, outras em `<>` ou `<div className="page-container">` — o que gera divergências de layout e instabilidade durante loading.

### Estado atual (resumido)

- 34 arquivos importam `PageMeta` diretamente.
- Posições do `PageMeta` divergem:
  - `CamerasPage`: dentro de `<div className="page-container space-y-4 sm:space-y-6">`.
  - `AlertsPage`: provavelmente dentro de `<div>` próprio (a confirmar).
  - `ZonesPage`: dentro de `<div>` com layout custom.
  - `ReportsPage`: dentro de `<><PageContent></PageContent></>`.
  - `BehaviorDetectionPage`, `ProductivityDashboardPage`: dentro de `<MainLayout>` (incorreto — `MainLayout` já é aplicado pelo roteador).
  - `PPEPage`, `GoalsAlertsPage`, `JourneyReportsPage`, `HelpPage`, `SettingsPage`: dentro de `<div className="p-6 …">` próprio.
- Resultado: `mb-mobile-nav` é redeclarado em algumas, ausente em outras; `PageMeta` às vezes fica antes do `<h1>`, às vezes depois; durante loading o shell oscila.

### Solução: componente `<Page>` único

**1. Novo componente** `src/components/layout/Page.tsx` (~60 linhas)

```tsx
interface PageProps {
  title: string;                    // obrigatório → vai para PageMeta
  description?: string;             // opcional → PageMeta
  noIndex?: boolean;                 // opcional → PageMeta
  className?: string;                // classes extras no container
  variant?: 'default' | 'wide' | 'narrow' | 'flush';
  children: ReactNode;
}
```

- Renderiza:
  ```tsx
  <>
    <PageMeta title={title} description={description} noIndex={noIndex} />
    <div className={cn(variantClasses[variant], className)}>
      {children}
    </div>
  </>
  ```
- Variants:
  - `default`: `space-y-4 sm:space-y-6` (uso geral).
  - `wide`: `max-w-7xl mx-auto space-y-6` (relatórios, produtividade).
  - `narrow`: `max-w-4xl mx-auto space-y-6` (configurações, help).
  - `flush`: sem padding/spacing (páginas com layout próprio tipo Dashboard V2).
- **Não** redeclara `mb-mobile-nav` (já está no `<main>` do `MainLayout` — Camada 1 do checklist).
- **Não** envolve em `<MainLayout>` (o roteador já faz via `ProtectedLayoutRoute`).

**2. Re-exportar** em `src/components/layout/index.ts`: `export { Page } from './Page'`.

**3. Migrar páginas** para o novo wrapper. Substituir o padrão:

```tsx
// Antes
<div className="page-container space-y-4 sm:space-y-6">
  <PageMeta title="…" description="…" />
  <Header/>
  <Content/>
</div>

// Depois
<Page title="…" description="…">
  <Header/>
  <Content/>
</Page>
```

Páginas a migrar (lista priorizada):

- **Foco do pedido** (3 páginas): `CamerasPage`, `AlertsPage`, `ZonesPage`.
- **Demais páginas autenticadas** que usam `PageMeta`: `ReportsPage`, `SettingsPage`, `PPEPage`, `BehaviorDetectionPage`, `JourneyReportsPage`, `GoalsAlertsPage`, `ProductivityDashboardPage`, `HelpPage` e as outras ~26 do `code--search_files` — migrar todas em uma só passada para garantir consistência total.
- Páginas standalone (`Auth`, `AuthCallback`, `ResetPasswordPage`, `NotFound`, `Index`, `AcessoNegado`) **não** migram — continuam com `PageMeta` direto, pois têm layout próprio fora do `MainLayout`.

**4. Remover `MainLayout` aninhado** em `BehaviorDetectionPage` e `ProductivityDashboardPage` — o roteador já aplica. Isso elimina dupla renderização de Sidebar/Header.

**5. Auditoria estática** — novo script `scripts/check-page-wrapper.mjs`:

- Falha se um arquivo em `src/pages/**/*.tsx` (fora da allowlist standalone) importa `PageMeta` diretamente em vez de usar `<Page>`.
- Falha se uma página dentro do `MainLayout` declara `mb-mobile-nav`, `<Sidebar>` ou `<MainLayout>` (já validado por `check:mobile-nav`, mas reforçamos a regra do wrapper único).
- Allowlist explícita: `Auth`, `AuthCallback`, `ResetPasswordPage`, `NotFound`, `Index`, `AcessoNegado`, `DashboardV2` (variant=`flush` aceita estrutura própria).
- Adicionar ao `prebuild` e CI.

**6. Documentação** `docs/PAGE_WRAPPER.md` (novo, ~50 linhas):

- Quando usar cada `variant`.
- Por que `<Page>` é obrigatório (consistência de SEO + spacing + acessibilidade).
- Como adicionar uma nova página (exemplo).
- Lista de páginas standalone isentas.

### Critérios de aceitação

- Todas as páginas autenticadas usam `<Page title="…">` e nenhuma importa `PageMeta` diretamente.
- `CamerasPage`, `AlertsPage`, `ZonesPage` têm exatamente o mesmo wrapper top-level → durante loading, o shell (espaçamento, paddings, posição do header) é idêntico estruturalmente entre as três.
- Nenhuma página redeclara `<MainLayout>` ou `<Sidebar>`.
- `npm run check:page-wrapper` passa; integrado ao `prebuild`.
- `npm run check:mobile-nav` continua verde (sem regressão).
- TypeScript strict + lint zero-warnings + build OK.
- Sem regressão visual: `<Page variant="default">` produz exatamente o mesmo `space-y` / paddings que `page-container space-y-4 sm:space-y-6` tinha antes.

### Arquivos a criar/editar

- ➕ `src/components/layout/Page.tsx` (novo wrapper unificado)
- ➕ `scripts/check-page-wrapper.mjs` (auditoria estática)
- ➕ `docs/PAGE_WRAPPER.md`
- ✏️ `src/components/layout/index.ts` (export)
- ✏️ `package.json` (script `check:page-wrapper` + adicionar ao `prebuild`)
- ✏️ ~30 arquivos em `src/pages/**` — substituir `<div>+PageMeta` por `<Page>` (mudança mecânica, ~3 linhas por arquivo)
- ✏️ `BehaviorDetectionPage.tsx`, `ProductivityDashboardPage.tsx` — remover `<MainLayout>` aninhado
- ✏️ `docs/LAYOUTS.md` — adicionar seção "Page Wrapper" referenciando `PAGE_WRAPPER.md`

### Riscos

- **Risco:** páginas com estrutura muito custom (ex.: `DashboardV2`, `HeatmapPage`) podem não caber em nenhum variant.
  - **Mitigação:** variant `flush` permite que a página gerencie spacing internamente; `<Page>` apenas garante `PageMeta` consistente.
- **Risco:** migração de 30+ arquivos pode introduzir typos.
  - **Mitigação:** `check:page-wrapper` falha o build se sobrar `import { PageMeta }` direto fora da allowlist; TS strict garante props corretas.
- **Risco:** remover `<MainLayout>` aninhado de `BehaviorDetectionPage`/`ProductivityDashboardPage` pode mudar visual se elas dependiam de algo do layout duplicado.
  - **Mitigação:** validar visualmente no preview após a migração; o `MainLayout` do roteador entrega exatamente o mesmo shell (Sidebar + Header + main).
- **Risco:** páginas que tinham `mb-mobile-nav` próprio (parte da `CUSTOM_WRAPPER_ALLOWLIST` do `check:mobile-nav`) podem precisar ficar fora do `<Page>` ou usar variant `flush`.
  - **Mitigação:** mapear durante implementação — se `<Page>` cobre, remover entrada da allowlist; se não, manter standalone com nota explícita.

