# 🎨 Catálogo de Componentes

## Componentes Base (shadcn/ui)

| Componente | Descrição |
|------------|-----------|
| Button | Botões com variantes |
| Input | Campos de entrada |
| Select | Dropdown de seleção |
| Dialog | Modais |
| Sheet | Painéis laterais |
| Toast | Notificações |
| Table | Tabelas de dados |
| Card | Cards de conteúdo |

## Componentes de Câmera

### VideoStreamPlayer
Player de vídeo com HLS/RTSP.

```tsx
<VideoStreamPlayer 
  cameraId="cam-1"
  autoPlay
  controls
  onError={(e) => console.error(e)}
/>
```

### CameraGrid
Grid de múltiplas câmeras.

```tsx
<CameraGrid 
  cameras={cameras}
  columns={3}
  onCameraClick={(id) => navigate(`/camera/${id}`)}
/>
```

### PTZControls
Controles Pan-Tilt-Zoom.

```tsx
<PTZControls cameraId="cam-1" />
```

## Componentes de Alertas

### AlertCard
Card de alerta individual.

### AlertList
Lista de alertas com filtros.

### AlertTimeline
Timeline visual de alertas.

## Componentes de Zonas

### ZoneEditor
Editor visual de zonas.

```tsx
<ZoneEditor 
  cameraId="cam-1"
  onZoneCreated={(zone) => saveZone(zone)}
/>
```

### ZoneOverlay
Overlay de zonas sobre vídeo.

## Componentes de IA

### FaceRecognitionOverlay
Overlay com detecção facial.

### PPEDetectionOverlay
Overlay de detecção de EPIs.

### LicensePlateReader
Leitor de placas veiculares.

## Componentes de Dashboard

### StatsCard
Card com estatísticas.

### ActivityChart
Gráfico de atividade.

### AlertsWidget
Widget de alertas recentes.

## Storybook

Acesse a documentação visual:

```bash
npm run storybook
```
