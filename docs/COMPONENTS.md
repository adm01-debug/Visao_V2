# 🧩 Components Guide - Projeto VISÃO

## Biblioteca de Componentes

---

## 1. Estrutura

```
src/components/
├── ui/              # shadcn/ui base
├── admin/           # Admin dashboard
├── alerts/          # Sistema de alertas
├── cameras/         # Grid e players
├── recognition/     # Facial recognition
└── zones/           # Zone editor
```

---

## 2. UI Base (shadcn/ui)

| Componente | Uso |
|------------|-----|
| Button | Ações |
| Card | Containers |
| Dialog | Modais |
| Table | Listas |
| Input | Formulários |
| Select | Dropdowns |
| Badge | Status |
| Toast | Notificações |

---

## 3. Componentes de Negócio

### AlertCard
```tsx
<AlertCard
  alert={alert}
  onAcknowledge={handleAck}
  onDismiss={handleDismiss}
/>
```

### CameraPlayer
```tsx
<CameraPlayer
  camera={camera}
  controls={true}
  onSnapshot={handleSnapshot}
/>
```

### ZoneEditor
```tsx
<ZoneEditor
  camera={camera}
  zones={zones}
  onSave={handleSave}
/>
```

---

## 4. Padrões de Props

```typescript
interface ComponentProps {
  // Dados
  data: DataType;
  
  // Estado
  isLoading?: boolean;
  disabled?: boolean;
  
  // Callbacks
  onAction?: (item: DataType) => void;
  
  // Estilo
  className?: string;
  variant?: 'default' | 'outline';
}
```

---

## 5. Composição

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
    <CardDescription>Descrição</CardDescription>
  </CardHeader>
  <CardContent>
    Conteúdo
  </CardContent>
  <CardFooter>
    <Button>Ação</Button>
  </CardFooter>
</Card>
```

---

## 6. Estados

### Loading
```tsx
<Skeleton className="h-4 w-full" />
```

### Empty
```tsx
<EmptyState
  icon={<AlertCircle />}
  title="Nenhum alerta"
  action={<Button>Criar</Button>}
/>
```

### Error
```tsx
<ErrorState
  title="Erro ao carregar"
  retry={refetch}
/>
```

---

## 7. Responsividade

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {cameras.map((c) => (
    <CameraCard key={c.id} camera={c} />
  ))}
</div>
```

---

## 8. Storybook

```bash
npm run storybook
# http://localhost:6006
```

**276 stories documentadas (100% cobertura)**

---

## 9. Criando Componentes

```tsx
// ComponentName.tsx
interface Props {
  title: string;
}

export const ComponentName = ({ title }: Props) => {
  return <div>{title}</div>;
};

// ComponentName.stories.tsx
export const Default: Story = {
  args: { title: 'Exemplo' },
};
```

---

**Última atualização:** 06/01/2026
