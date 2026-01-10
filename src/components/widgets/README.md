# 📊 Widgets do Dashboard VISÃO

## Widgets Disponíveis (14)

### 📹 Câmeras
- `CameraPreviewWidget` - Preview de câmera
- `CameraStatusWidget` - Status das câmeras

### 🔔 Alertas
- `AlertCountWidget` - Contador de alertas
- `RecentAlertsWidget` - Alertas recentes
- `AlertTrendWidget` - Tendência de alertas

### 📊 Analytics
- `AnalyticsWidget` - Métricas gerais
- `OccupancyWidget` - Ocupação
- `PeopleCountWidget` - Contagem de pessoas

### 🤖 IA
- `AIStatusWidget` - Status da IA
- `DetectionWidget` - Detecções

### 🌡️ Sistema
- `SystemHealthWidget` - Saúde do sistema
- `StorageWidget` - Armazenamento
- `NetworkWidget` - Status de rede

### ⏰ Tempo
- `ClockWidget` - Relógio

## Cobertura

**100% Stories** - Todos os 14 widgets têm stories!

## Uso

```tsx
import { AlertCountWidget, CameraPreviewWidget } from "@/components/widgets";

<AlertCountWidget count={42} severity="high" />
<CameraPreviewWidget cameraId="cam-1" />
```

---

*Atualizado em 10/01/2026*

