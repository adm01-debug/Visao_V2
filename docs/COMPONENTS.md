# 🧩 Components Guide - Projeto VISÃO

## Biblioteca de Componentes

---

## 1. Estrutura

```
src/components/
├── ui/              # shadcn/ui base
├── admin/           # Admin específicos
├── camera/          # Câmera/streaming
├── alerts/          # Sistema de alertas
├── recognition/     # Reconhecimento
└── common/          # Reutilizáveis
```

---

## 2. Componentes UI Base

| Componente | Uso |
|------------|-----|
| `Button` | Ações |
| `Card` | Containers |
| `Dialog` | Modais |
| `Input` | Formulários |
| `Select` | Seleção |
| `Badge` | Status |
| `Table` | Dados |

---

## 3. Componentes de Câmera

```tsx
<CameraPlayer
  cameraId="uuid"
  autoPlay={true}
  controls={true}
  onError={handleError}
/>

<CameraGrid
  layout="2x2"
  cameras={cameras}
  onSelect={handleSelect}
/>
```

---

## 4. Componentes de Alerta

```tsx
<AlertCard
  alert={alert}
  onAcknowledge={handleAck}
  onDismiss={handleDismiss}
/>

<AlertBadge severity="high" />
```

---

## 5. Componentes de Estado

```tsx
<EmptyState
  icon={<AlertCircle />}
  title="Nenhum alerta"
  description="Não há alertas para exibir"
/>

<ErrorState
  error={error}
  onRetry={refetch}
/>

<LoadingSpinner size="lg" />
```

---

## 6. Props Comuns

```typescript
interface BaseProps {
  className?: string;
  children?: React.ReactNode;
}

interface LoadingProps {
  isLoading?: boolean;
  loadingText?: string;
}
```

---

## 7. Composição

```tsx
<Card>
  <CardHeader>
    <CardTitle>Título</CardTitle>
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

## 8. Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

---

## 9. Storybook

```bash
npm run storybook
# 276 stories disponíveis
```

---

## 10. Criando Componentes

```tsx
// Template
interface MyComponentProps {
  title: string;
  variant?: 'primary' | 'secondary';
}

export const MyComponent = ({
  title,
  variant = 'primary',
}: MyComponentProps) => {
  return (
    <div className={cn('base', variants[variant])}>
      {title}
    </div>
  );
};
```

---

**Última atualização:** 06/01/2026
