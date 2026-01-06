# 📹 Video Streaming - Projeto VISÃO

## Visão Geral

Sistema de streaming de vídeo em tempo real com suporte a múltiplos protocolos.

---

## 1. Protocolos Suportados

| Protocolo | Latência | Uso |
|-----------|----------|-----|
| HLS | 2-6s | Web browsers |
| RTSP | <1s | Câmeras IP |
| WebRTC | <500ms | P2P real-time |
| RTMP | 1-3s | Ingest |

---

## 2. MediaMTX Integration

### Configuração

```yaml
# mediamtx.yml
paths:
  all:
    source: publisher
    sourceProtocol: automatic
    
hlsAddress: :8888
rtspAddress: :8554
webrtcAddress: :8889
```

### Endpoints

| Endpoint | Porta | Uso |
|----------|-------|-----|
| RTSP | 8554 | Câmeras |
| HLS | 8888 | Web players |
| WebRTC | 8889 | Low latency |
| API | 9997 | Management |

---

## 3. HLS Player

### Implementação

```typescript
import Hls from 'hls.js';

const initPlayer = (videoRef: HTMLVideoElement, url: string) => {
  if (Hls.isSupported()) {
    const hls = new Hls({
      lowLatencyMode: true,
      liveSyncDuration: 3,
      liveMaxLatencyDuration: 10,
    });
    hls.loadSource(url);
    hls.attachMedia(videoRef);
  }
};
```

### Configurações de Qualidade

| Qualidade | Resolução | Bitrate |
|-----------|-----------|---------|
| Low | 480p | 1 Mbps |
| Medium | 720p | 2.5 Mbps |
| High | 1080p | 5 Mbps |
| Ultra | 4K | 15 Mbps |

---

## 4. Camera Grid

### Layouts Disponíveis

| Layout | Grid | Câmeras |
|--------|------|---------|
| Single | 1x1 | 1 |
| Dual | 2x1 | 2 |
| Quad | 2x2 | 4 |
| Six | 3x2 | 6 |
| Nine | 3x3 | 9 |
| Sixteen | 4x4 | 16 |

### Componente

```tsx
<CameraGrid
  layout="2x2"
  cameras={selectedCameras}
  onCameraClick={handleSelect}
  showControls={true}
/>
```

---

## 5. Gravação

### Tipos

| Tipo | Descrição |
|------|-----------|
| Contínua | 24/7 |
| Por Evento | Trigger de alerta |
| Manual | Clip sob demanda |
| Agendada | Horários definidos |

### Storage

```typescript
interface RecordingConfig {
  retention: number; // dias
  quality: 'low' | 'medium' | 'high';
  format: 'mp4' | 'webm';
  segmentDuration: number; // segundos
}
```

---

## 6. Snapshot

### API

```typescript
// Capturar snapshot
const snapshot = await cameraService.takeSnapshot(cameraId);

// Resultado
interface Snapshot {
  id: string;
  cameraId: string;
  timestamp: Date;
  imageUrl: string;
  thumbnailUrl: string;
}
```

---

## 7. Picture-in-Picture

### Implementação

```typescript
const enablePiP = async (videoRef: HTMLVideoElement) => {
  if (document.pictureInPictureEnabled) {
    await videoRef.requestPictureInPicture();
  }
};
```

---

## 8. Performance

### Otimizações

| Técnica | Benefício |
|---------|-----------|
| Lazy loading | Reduz uso de banda |
| Adaptive bitrate | Qualidade dinâmica |
| Hardware decode | Menor uso de CPU |
| WebGL rendering | GPU acceleration |

### Métricas

| Métrica | Alvo |
|---------|------|
| Buffer stalls | < 1/hora |
| Startup time | < 2s |
| Rebuffering | < 1% |

---

## 9. Troubleshooting

| Problema | Solução |
|----------|---------|
| Stream não carrega | Verificar CORS |
| Alta latência | Usar WebRTC |
| Cortes frequentes | Aumentar buffer |
| CPU alta | Habilitar HW decode |

---

**Última atualização:** 06/01/2026
