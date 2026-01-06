# 📐 Layouts Guide - Projeto VISÃO

## Sistema de Layouts

---

## 1. Layout Principal

```tsx
<div className="min-h-screen bg-background">
  <Sidebar />
  <main className="ml-64 p-6">
    <PageHeader title="Dashboard" />
    <div className="mt-6">
      {children}
    </div>
  </main>
</div>
```

---

## 2. Sidebar

```tsx
<aside className="fixed left-0 top-0 h-screen w-64 border-r bg-card">
  <Logo />
  <Navigation items={navItems} />
  <UserMenu />
</aside>
```

---

## 3. Grid de Câmeras

| Layout | Grid | Câmeras |
|--------|------|---------|
| 1x1 | `grid-cols-1` | 1 |
| 2x1 | `grid-cols-2` | 2 |
| 2x2 | `grid-cols-2` | 4 |
| 3x2 | `grid-cols-3` | 6 |
| 3x3 | `grid-cols-3` | 9 |
| 4x4 | `grid-cols-4` | 16 |

```tsx
<div className={`grid gap-2 ${layoutClass}`}>
  {cameras.map((camera) => (
    <CameraPlayer key={camera.id} camera={camera} />
  ))}
</div>
```

---

## 4. Dashboard

```tsx
<div className="grid gap-6">
  {/* KPIs */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <StatCard title="Alertas" value={stats.alerts} />
    <StatCard title="Câmeras" value={stats.cameras} />
  </div>
  
  {/* Charts */}
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <AlertsChart data={alertsData} />
    <RecognitionChart data={recData} />
  </div>
  
  {/* Table */}
  <Card>
    <AlertsTable alerts={alerts} />
  </Card>
</div>
```

---

## 5. Responsividade

```tsx
// Mobile first
<div className="
  grid 
  grid-cols-1 
  sm:grid-cols-2 
  md:grid-cols-3 
  lg:grid-cols-4 
  gap-4
">
```

### Breakpoints

| Breakpoint | Tamanho |
|------------|---------|
| sm | 640px |
| md | 768px |
| lg | 1024px |
| xl | 1280px |
| 2xl | 1536px |

---

## 6. Modais

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Abrir</Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Título</DialogTitle>
    </DialogHeader>
    {content}
    <DialogFooter>
      <Button>Confirmar</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## 7. Formulários

```tsx
<form className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <FormField name="name" label="Nome" />
    <FormField name="email" label="Email" />
  </div>
  <div className="flex justify-end gap-2">
    <Button variant="outline">Cancelar</Button>
    <Button type="submit">Salvar</Button>
  </div>
</form>
```

---

## 8. Fullscreen

```tsx
const [isFullscreen, setFullscreen] = useState(false);

<div className={isFullscreen ? 'fixed inset-0 z-50' : ''}>
  <CameraPlayer camera={camera} />
</div>
```

---

**Última atualização:** 06/01/2026
