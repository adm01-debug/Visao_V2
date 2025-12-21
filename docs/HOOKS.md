# 🪝 Hooks - VISÃO

## Hooks de Dados

| Hook | Descrição |
|------|-----------|
| `useAlerts` | CRUD de alertas |
| `useCameras` | CRUD de câmeras |
| `useRules` | CRUD de regras |
| `usePeople` | CRUD de pessoas |
| `usePlateDetections` | Detecções de placas |
| `useNotifications` | Notificações |

## Hooks de Detecção

| Hook | Descrição |
|------|-----------|
| `useFaceDetection` | Detecção facial em tempo real |
| `useFaceRecognition` | Reconhecimento facial |
| `useZoneDetection` | Detecção em zonas |
| `usePPEDetection` | Detecção de EPIs |

## Hooks de Mídia

| Hook | Descrição |
|------|-----------|
| `useVideoStream` | Gerenciamento de streams |
| `useClipRecorder` | Gravação de clipes |
| `useMediaMTX` | Integração MediaMTX |

## Hooks de UI

| Hook | Descrição |
|------|-----------|
| `useSettings` | Configurações do usuário |
| `useKeyboardShortcuts` | Atalhos de teclado |
| `useOnboardingTour` | Tour de onboarding |

## Exemplo de Uso

```tsx
import { useCameras } from '@/hooks/useCameras';

function CameraList() {
  const { cameras, isLoading, error, refetch } = useCameras();
  
  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;
  
  return cameras.map(cam => <CameraCard key={cam.id} {...cam} />);
}
```
