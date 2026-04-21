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

## 11. Mobile Layout Checklist (Defesa em Profundidade — 5 camadas)

A classe `mb-mobile-nav` é aplicada **uma única vez**, no `<main>` de `src/components/layout/MainLayout.tsx`. Como todas as rotas autenticadas passam pelo `MainLayout`, isso cobre 100% das páginas roteadas automaticamente. Combinada com fallback CSS, allowlist, snapshot e teste runtime, essa garantia é validada de 5 formas independentes.

**Páginas NÃO devem redeclarar `mb-mobile-nav`** — fazê-lo causa dupla margem inferior. Exceções: páginas com wrapper raiz próprio cadastradas na `CUSTOM_WRAPPER_ALLOWLIST`.

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

### Exceções (standalone)

Páginas que não passam pelo `MainLayout` (auth, 404, callbacks) ficam na `ALLOWLIST` em `scripts/check-mobile-nav.mjs`: `AuthPage`, `Auth`, `AuthCallback`, `ResetPasswordPage`, `NotFound`, `Index`, `AcessoNegado`.

---

**Última atualização:** 21/04/2026

