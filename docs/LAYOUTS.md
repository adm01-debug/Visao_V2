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

## 11. Mobile Layout Checklist (Wrapper Único)

A classe `mb-mobile-nav` é aplicada **uma única vez**, no `<main>` de `src/components/layout/MainLayout.tsx`. Como todas as rotas autenticadas passam pelo `MainLayout`, isso cobre 100% das páginas roteadas automaticamente.

**Páginas NÃO devem redeclarar `mb-mobile-nav`** — fazê-lo causa dupla margem inferior.

### Verificação

```bash
npm run check:mobile-nav
```

O script valida que:
1. `MainLayout.tsx` contém `mb-mobile-nav` (rede de segurança contra remoção acidental).
2. Nenhuma página em `src/pages/*.tsx` redeclara a classe (evita drift).

Roda automaticamente no `prebuild` e no CI. Falha quebra o build.

### Exceções

Páginas standalone que não passam pelo `MainLayout` (auth, 404, redirects) ficam na `ALLOWLIST` em `scripts/check-mobile-nav.mjs`:

```js
const ALLOWLIST = new Set([
  'AuthPage.tsx',
  'NovaPaginaIsenta.tsx', // ← adicionar aqui
]);
```

---

**Última atualização:** 21/04/2026
