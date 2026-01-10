# 🪝 Hooks do VISÃO

## Estrutura

```
hooks/
├── index.ts          # Export central
├── __tests__/        # 125 testes
└── use*.ts           # 125 hooks customizados
```

## Categorias de Hooks

### 📹 Câmeras e Streaming
- `useCameras` - Gerenciamento de câmeras
- `useCameraSnapshots` - Capturas de tela
- `useVideoStream` - Streams de vídeo
- `useMediaRecorder` - Gravação de mídia

### 🤖 IA e Detecção
- `useFaceDetection` - Detecção facial
- `useFaceRecognition` - Reconhecimento facial
- `usePPEDetection` - Detecção de EPIs
- `useZoneDetection` - Detecção em zonas
- `useMLModels` - Modelos de ML

### 🔔 Alertas e Notificações
- `useAlerts` - Gerenciamento de alertas
- `useNotifications` - Notificações push
- `useRealtimeAlerts` - Alertas em tempo real

### 💾 Armazenamento
- `useLocalStorage` - LocalStorage
- `useSessionStorage` - SessionStorage
- `useIndexedDB` - IndexedDB

### 🌐 Rede e API
- `useWebSocket` - WebSocket
- `usePolling` - Polling de dados
- `useNetworkStatus` - Status de rede

### ⚡ Performance
- `useDebounce` - Debounce
- `useThrottle` - Throttle
- `useMounted` - Lifecycle

## Cobertura de Testes

**125 arquivos de teste** - 100% dos hooks testados!

---

*Atualizado em 10/01/2026*

