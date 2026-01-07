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

**Última atualização:** 06/01/2026
