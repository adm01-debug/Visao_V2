# 🧩 Components - VISÃO

## Core Components

| Component | Descrição |
|-----------|-----------|
| `VideoPlayer` | Player de vídeo HLS |
| `CameraGrid` | Grid de câmeras |
| `AlertsPanel` | Painel de alertas |
| `Sidebar` | Menu lateral |
| `Header` | Cabeçalho |

## Detection Components

| Component | Descrição |
|-----------|-----------|
| `FaceDetectionOverlay` | Overlay de detecção facial |
| `ZoneEditor` | Editor de zonas |
| `RulesPanel` | Painel de regras |

## UI Components

Utilizamos [shadcn/ui](https://ui.shadcn.com/) para componentes base:
- Button, Card, Dialog, Input, Select, Table, Tabs, Toast

## Exemplo

```tsx
import { CameraGrid } from '@/components/CameraGrid';
import { useCameras } from '@/hooks/useCameras';

function Dashboard() {
  const { cameras } = useCameras();
  return <CameraGrid cameras={cameras} columns={3} />;
}
```
