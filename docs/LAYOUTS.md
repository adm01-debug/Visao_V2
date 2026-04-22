# 📐 Layouts Guide - Projeto VISÃO

## Sistema de Layouts

---

## 1. Layout Principal

```tsx
<AppLayout>
  <Sidebar />
  <main>
    <Header />
    <PageContent />
  </main>
</AppLayout>
```

---

## 2. Sidebar

| Seção | Itens |
|-------|-------|
| Principal | Dashboard, Câmeras, Alertas |
| Análise | Analytics, Heatmap, Relatórios |
| IA | Reconhecimento, Zonas, PPE |
| Config | Settings, Notificações |

---

## 3. Grid de Câmeras

| Layout | Grid | Uso |
|--------|------|-----|
| Single | 1x1 | Foco único |
| Dual | 2x1 | Comparação |
| Quad | 2x2 | Monitoramento |
| Six | 3x2 | Visão geral |
| Nine | 3x3 | Vigilância |
| Sixteen | 4x4 | Central |

---

## 4. Responsividade

```tsx
// Breakpoints
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};

// Grid responsivo
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

## 5. Dashboard Layout

```
┌─────────────────────────────────┐
│         Header + KPIs           │
├───────────┬─────────────────────┤
│  Sidebar  │                     │
│           │    Main Content     │
│           │                     │
│           │    (Charts/Grid)    │
│           │                     │
└───────────┴─────────────────────┘
```

---

## 6. Page Layout

```tsx
<PageWrapper>
  <PageHeader
    title="Alertas"
    breadcrumbs={[...]}
    actions={<Button>Novo</Button>}
  />
  <PageContent>
    {children}
  </PageContent>
</PageWrapper>
```

---

## 7. Modal Layout

```tsx
<Dialog>
  <DialogHeader>Título</DialogHeader>
  <DialogContent>Conteúdo</DialogContent>
  <DialogFooter>
    <Button variant="ghost">Cancelar</Button>
    <Button>Confirmar</Button>
  </DialogFooter>
</Dialog>
```

---

## 8. Form Layout

```tsx
<Form>
  <FormSection title="Informações Básicas">
    <FormField label="Nome" />
    <FormField label="URL" />
  </FormSection>
  <FormSection title="Configurações">
    <FormField label="Opção" />
  </FormSection>
  <FormActions>
    <Button type="submit">Salvar</Button>
  </FormActions>
</Form>
```

---

## 9. Split View

```tsx
<SplitPane
  left={<CameraList />}
  right={<CameraDetails />}
  defaultSize={300}
/>
```

---

## 10. Mobile Layout

```tsx
// Bottom navigation no mobile
<MobileNav>
  <NavItem icon={Home} label="Home" />
  <NavItem icon={Camera} label="Câmeras" />
  <NavItem icon={Bell} label="Alertas" />
</MobileNav>
```

---

## 11. Mobile Layout Checklist (Defesa em Profundidade — 6 camadas)

> 📋 **QA manual relacionado:** [`docs/QA-MANUAL-RESPONSIVIDADE.md`](./QA-MANUAL-RESPONSIVIDADE.md) — snapshot pontual de validação humana das rotas autenticadas + menu mobile, com matriz de cobertura E2E equivalente e procedimento para reproduzir.

A classe `mb-mobile-nav` é aplicada **uma única vez**, no `<main>` de `src/components/layout/MainLayout.tsx`. Como todas as rotas autenticadas passam pelo `MainLayout`, isso cobre 100% das páginas roteadas automaticamente. Combinada com fallback CSS, allowlist, snapshot, teste runtime e snapshot visual, essa garantia é validada de 6 formas independentes.

**Páginas NÃO devem redeclarar `mb-mobile-nav`** — fazê-lo causa dupla margem inferior. Exceções: páginas com wrapper raiz próprio cadastradas na `CUSTOM_WRAPPER_ALLOWLIST`.

### Camada 0 — Páginas standalone (isentas)

Páginas que **não** passam pelo `MainLayout` também **não** renderizam `BottomNavigation`. Adicionar `mb-mobile-nav` nelas geraria 64px de espaço inferior morto sem motivo. A `ALLOWLIST` em `scripts/check-mobile-nav.mjs` garante que essas páginas não falhem o build pela ausência da classe.

| Página | Rota | Motivo |
|---|---|---|
| `Auth.tsx` (e `AuthPage.tsx`) | `/auth` | Tela de login/signup pré-autenticação. Layout próprio centralizado (`min-h-screen flex items-center`); não passa por `MainLayout`/`Sidebar`/`BottomNavigation`. |
| `AuthCallback.tsx` | `/auth/callback` | Handler OAuth pós-redirect (Google). Renderiza apenas spinner durante a troca de código por sessão; sem UI navegável. |
| `ResetPasswordPage.tsx` | `/reset-password` | Fluxo de recuperação de senha acessado via link de e-mail (sem sessão completa). Layout próprio standalone. |
| `NotFound.tsx` | `*` (404) | Página de erro genérica; pode ser exibida fora de contexto autenticado. Layout centrado próprio. |
| `Index.tsx` | `/` | Apenas redireciona (`/dashboard` se autenticado, `/auth` caso contrário). Renderiza `<SplashScreen />` em transição — sem conteúdo persistente. |
| `AcessoNegado.tsx` | `/acesso-negado` | Tela de bloqueio RBAC/IP whitelist. Layout standalone próprio para mensagem de erro de permissão. |

> **Regra:** se uma destas páginas passar a usar `MainLayout` no futuro, remover a entry correspondente da `ALLOWLIST` — a heurística do script (Camada 4) detectará o wrapper customizado e exigirá classificação explícita.

### Camada 1 — Classe explícita no MainLayout

`mb-mobile-nav` no `<main>` aplica `padding-bottom: calc(4rem + safe-area-inset-bottom)` (definido em `src/index.css`).

### Camada 2 — Fallback CSS global

Mesmo que uma página renderize seu próprio wrapper customizado e esqueça `mb-mobile-nav`, o layout aplica padding inferior automaticamente:

```css
[data-app-scroll] > main:last-child:not(.mb-mobile-nav),
[data-app-scroll] > div:last-child:not(.mb-mobile-nav),
[data-app-scroll] > section:last-child:not(.mb-mobile-nav) {
  padding-bottom: calc(4rem + env(safe-area-inset-bottom, 0px));
}
```

O atributo `data-app-scroll` está no `<SwipeableView>` do `MainLayout`. O seletor `:not(.mb-mobile-nav)` evita dupla margem quando a classe já está presente.

### Camada 3 — Allowlist de wrappers customizados

Páginas que **substituem** o `<main>` do MainLayout por uma estrutura própria (ex.: `min-h-screen` próprio, Sidebar embutido) devem:

1. Reaplicar `mb-mobile-nav` explicitamente no container raiz.
2. Entrar na `CUSTOM_WRAPPER_ALLOWLIST` em `scripts/check-mobile-nav.mjs`.

Atualmente: `DashboardV2`, `HeatmapPage`, `AnalyticsPage`, `TelegramSettingsPage`, `LicensePlatePage`, `NotificationSettingsPage`, `PPEPage`, `PeoplePage`, `RecognitionAnalyticsPage`, `RecognitionLogsPage`, `RecordingsPage`, `StreamSettingsPage`, `ZonesPage`.

### Camada 4 — Auditoria estática (`scripts/check-mobile-nav.mjs`)

```bash
npm run check:mobile-nav
```

Valida:
1. `MainLayout.tsx` contém `mb-mobile-nav`.
2. Páginas padrão NÃO redeclaram a classe.
3. Páginas em `CUSTOM_WRAPPER_ALLOWLIST` CONTÊM a classe.
4. Nenhuma página usa `h-[calc(100vh-...)]` (scroll duplo).
5. **Heurística**: páginas com `min-h-screen` / `h-screen` / `h-dvh` / `<Sidebar` que não estão cadastradas falham com mensagem clara apontando arquivo + linha.
6. **Snapshot** (`scripts/.mobile-nav-snapshot.json`): novos arquivos em `src/pages/` sem entry no snapshot quebram o build, forçando classificação explícita. Regenere com:

```bash
npm run check:mobile-nav -- --snapshot
```

Roda automaticamente em `prebuild` e CI.

### Camada 5 — Verificação runtime (Playwright)

`tests/e2e/mobile-nav-padding.spec.ts` itera ~15 rotas autenticadas em viewport iPhone 12 e mede o `paddingBottom` real do último filho de `[data-app-scroll]`, exigindo ≥ 64px.

```bash
npm run test:mobile-nav-runtime
```

Rotas que redirecionam para `/auth` (sem credenciais seedadas no CI) são marcadas como `skipped` — as camadas 1-4 já garantem cobertura nesses casos. Quando há sessão autenticada disponível, falhas reais de padding são detectadas.

### Camada 6 — Snapshot visual de sobreposição (BottomNav vs conteúdo)

`tests/e2e/mobile-nav-overlap.spec.ts` valida em `/dashboard`, `/heatmap` e `/analytics` (viewport iPhone 12) que o último elemento renderizado dentro de `[data-app-scroll]` **não** invade os 60px da BottomNavigation. Combina:

1. **Asserção geométrica** — após `scrollTop = scrollHeight`, mede `getBoundingClientRect().bottom` do último filho visível e exige `bottom <= viewportHeight - 60`.
2. **Screenshot baseline** — captura faixa inferior da viewport (170px) e compara com PNG commitado em `tests/e2e/mobile-nav-overlap.spec.ts-snapshots/`, tolerando até 5% de diff (`maxDiffPixelRatio: 0.05`, `animations: 'disabled'`).

```bash
npm run test:mobile-nav-overlap                       # rodar
npm run test:mobile-nav-overlap -- --update-snapshots # gerar/atualizar baselines
```

No CI roda com `continue-on-error: true` até as baselines existirem (gere localmente em ambiente Linux equivalente ao runner Ubuntu e commite os PNGs). Rotas sem sessão autenticada são `skipped`.

### Exceções (standalone)

Páginas que não passam pelo `MainLayout` (auth, 404, callbacks) ficam na `ALLOWLIST` em `scripts/check-mobile-nav.mjs`: `AuthPage`, `Auth`, `AuthCallback`, `ResetPasswordPage`, `NotFound`, `Index`, `AcessoNegado`.

---

## 12. Smoke tests de páginas principais

`tests/e2e/smoke-pages.spec.ts` é o gate mínimo após qualquer mudança de responsividade ou layout. Valida em `/dashboard`, `/heatmap` e `/analytics` (desktop 1280×720 + mobile iPhone 12):

1. Sem `console.error` (com allowlist de ruído conhecido — Vite HMR, badge de preview).
2. Sem respostas 5xx em chamadas de rede.
3. Layout autenticado montou (`[data-app-scroll]` visível).
4. `<h1>` com título esperado renderizado.
5. Nenhum `SectionErrorBoundary` disparou ("algo deu errado" / "erro ao carregar").

```bash
npm run test:smoke
```

6 testes (3 páginas × 2 viewports), execução paralela < 30s. Rodado no CI após `build`, antes das suítes E2E completas, para falhar rápido em regressões críticas. Rotas que redirecionam para `/auth` (sem credenciais seedadas no CI) são `skipped` explicitamente.

---

---

## 13. Páginas: standalone vs protegidas (exemplos canônicos)

> 📋 **Referência completa do contrato:** [`docs/PAGE_CONTENT_STANDARD.md`](./PAGE_CONTENT_STANDARD.md).

### 13.1 Página protegida (autenticada) — padrão obrigatório

Toda página dentro de `MainLayout` (rotas autenticadas) **deve** usar `<PageContent>` como wrapper raiz. Sem `<div className="...">`, sem `<>`, sem `min-h-screen`, sem `mb-mobile-nav`, sem padding lateral próprio.

```tsx
// src/pages/MyFeaturePage.tsx
import { PageContent } from '@/components/layout/MainLayout';
import { PageMeta } from '@/components/PageMeta';

export default function MyFeaturePage() {
  return (
    <PageContent>
      <PageMeta title="Minha Feature" description="Descrição curta para SEO" />
      <PageHeader title="Minha Feature" />
      <FeatureSectionA />
      <FeatureSectionB />
    </PageContent>
  );
}
```

**Variante: largura limitada (formulários, settings):**
```tsx
<PageContent maxWidth="md">
  <PageMeta title="Configurações" description="..." />
  <SettingsForm />
</PageContent>
```

**Variante: dashboard com mais respiro entre seções:**
```tsx
<PageContent spacing={8}>
  <KpiGrid />
  <ChartsRow />
  <CamerasGrid />
</PageContent>
```

### 13.2 Página standalone (fora do MainLayout) — exceção controlada

Páginas que **não** passam pelo `MainLayout` (login, callbacks, telas de erro) renderizam seu próprio container raiz. **Não** devem usar `<PageContent>` nem `mb-mobile-nav`. Devem estar cadastradas em `STANDALONE_ALLOWLIST` (`scripts/check-page-content.mjs`) e na `ALLOWLIST` de `scripts/check-mobile-nav.mjs`.

```tsx
// src/pages/AcessoNegado.tsx (exemplo real)
/**
 * Standalone page — renders OUTSIDE MainLayout (no BottomNavigation).
 * Listed in scripts/check-mobile-nav.mjs ALLOWLIST.
 * See docs/LAYOUTS.md §11 — Camada 0.
 */
export default function AcessoNegadoPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <PageMeta title="Acesso Negado" description="..." />
      <Card className="w-full max-w-md">
        {/* conteúdo standalone */}
      </Card>
    </div>
  );
}
```

**Standalones atuais (allowlists):** `Auth`, `AuthCallback`, `ResetPasswordPage`, `NotFound`, `AcessoNegado`, `CoveragePage`, `Index`.

> Adicionar nova página standalone exige justificativa explícita no PR + entry em ambas allowlists + comentário JSDoc no topo do arquivo apontando para esta seção.

---

## 14. Checklist: o que NÃO declarar mais nas páginas

A `<main>` do `MainLayout` é a **única fonte de verdade** para layout/scroll/padding. Páginas autenticadas devem ser enxutas — apenas conteúdo. Use esta checklist em code review:

### ❌ Nunca em páginas autenticadas

- [ ] `mb-mobile-nav` — já aplicado no `<main>` do `MainLayout`. Duplicar gera 128px de margem inferior.
- [ ] `p-4 md:p-6` (ou variantes) no wrapper raiz — padding lateral/topo já vem do `<main>`.
- [ ] `min-h-full`, `min-h-screen`, `h-screen`, `h-dvh` no wrapper raiz — altura é gerida pelo `MainLayout`.
- [ ] `h-[calc(100vh-...)]` — causa scroll duplo. Scroll oficial é `[data-app-scroll]` no `SwipeableView`.
- [ ] `overflow-y-auto` / `overflow-y-scroll` no wrapper raiz — cria container de scroll próprio. O `mobileNavGuard` (DEV) avisa em runtime.
- [ ] `<Sidebar />` ou `<Header />` manuais — incluídos pelo `MainLayout`.
- [ ] `<div className="space-y-6">` como wrapper raiz — substitua por `<PageContent>` (que já aplica `space-y-6`).
- [ ] `<>` (Fragment) como wrapper raiz — use `<PageContent>` para garantir `data-page-content` e contrato uniforme.
- [ ] `container mx-auto` no wrapper raiz — use `<PageContent maxWidth="...">` se precisar limitar largura.

### ✅ Sempre em páginas autenticadas

- [ ] `<PageContent>` como wrapper raiz único.
- [ ] `<PageMeta title="..." description="..." />` como primeiro filho (SEO).
- [ ] Conteúdo organizado em seções/componentes filhos diretos do `<PageContent>` (sem `space-y-*` redundante neles).
- [ ] Em widgets dinâmicos (timestamps, contadores realtime): atributo `data-dynamic` para serem mascarados nos snapshots visuais.

### 🔍 Validação automatizada (rode antes do PR)

```bash
npm run check:mobile-nav        # estático: mb-mobile-nav só no MainLayout
npm run check:page-content      # estático: PageContent em todas autenticadas
npm run test:mobile-nav-runtime # E2E: padding ≥ 64px no último filho de [data-app-scroll]
npm run test:mobile-nav-overlap # E2E: BottomNav não invade conteúdo
npm run test:mobile-nav-visual  # E2E: snapshots visuais 16 rotas mobile
```

Em DEV, o `mobileNavGuard` (`src/lib/mobileNavGuard.ts`) também avisa no console se uma página criar scroll container próprio sem padding mobile.

---

**Última atualização:** 22/04/2026

