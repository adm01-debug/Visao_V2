# MediaMTX - Servidor de Streaming RTSP→HLS

## Visão Geral

O MediaMTX é um servidor de mídia que converte streams RTSP de câmeras IP para HLS/WebRTC, permitindo visualização em navegadores web.

## Arquitetura

```
┌─────────────┐     RTSP      ┌─────────────┐     HLS/WebRTC    ┌─────────────┐
│   Câmera    │ ────────────► │  MediaMTX   │ ─────────────────► │   Browser   │
│     IP      │  rtsp://...   │   Server    │   /stream.m3u8    │   (VISÃO)   │
└─────────────┘               └─────────────┘                    └─────────────┘
```

## Instalação

### Docker (Recomendado)

```bash
docker run -d \
  --name mediamtx \
  --restart unless-stopped \
  -p 8554:8554 \
  -p 1935:1935 \
  -p 8888:8888 \
  -p 8889:8889 \
  -p 8890:8890/udp \
  -v $(pwd)/mediamtx.yml:/mediamtx.yml \
  bluenviron/mediamtx:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  mediamtx:
    image: bluenviron/mediamtx:latest
    container_name: visao-mediamtx
    restart: unless-stopped
    ports:
      - "8554:8554"   # RTSP
      - "1935:1935"   # RTMP
      - "8888:8888"   # HLS
      - "8889:8889"   # WebRTC HTTP
      - "8890:8890/udp" # WebRTC UDP
    volumes:
      - ./mediamtx.yml:/mediamtx.yml
    environment:
      - MTX_PROTOCOLS=tcp,udp
```

## Configuração (mediamtx.yml)

```yaml
# MediaMTX Configuration for VISÃO

# Logging
logLevel: info
logDestinations: [stdout]

# API for management
api: yes
apiAddress: :9997

# RTSP server
rtsp: yes
protocols: [tcp, udp]
rtspAddress: :8554

# RTMP server  
rtmp: yes
rtmpAddress: :1935

# HLS server (for browser playback)
hls: yes
hlsAddress: :8888
hlsAlwaysRemux: yes
hlsSegmentCount: 3
hlsSegmentDuration: 1s
hlsPartDuration: 200ms
hlsSegmentMaxSize: 50M
hlsAllowOrigin: '*'

# WebRTC server (low latency)
webrtc: yes
webrtcAddress: :8889
webrtcAllowOrigin: '*'
webrtcICEServers2:
  - url: stun:stun.l.google.com:19302

# Paths (camera streams)
paths:
  # Exemplo: Câmera 1 - Entrada Principal
  cam1:
    source: rtsp://admin:password@192.168.1.100:554/stream1
    sourceOnDemand: yes
    sourceOnDemandStartTimeout: 10s
    sourceOnDemandCloseAfter: 10s
    
  # Exemplo: Câmera 2 - Estacionamento  
  cam2:
    source: rtsp://admin:password@192.168.1.101:554/stream1
    sourceOnDemand: yes
    
  # Exemplo: Câmera 3 - Recepção
  cam3:
    source: rtsp://admin:password@192.168.1.102:554/stream1
    sourceOnDemand: yes

  # Stream genérico (aceita qualquer publicação)
  all:
    source: publisher
```

## URLs de Acesso

Após configurar, os streams ficam disponíveis em:

| Protocolo | URL | Uso |
|-----------|-----|-----|
| RTSP | `rtsp://servidor:8554/cam1` | Clientes RTSP |
| RTMP | `rtmp://servidor:1935/cam1` | OBS, FFmpeg |
| HLS | `http://servidor:8888/cam1/index.m3u8` | **Browsers (VISÃO)** |
| WebRTC | `http://servidor:8889/cam1` | Baixa latência |

## Integração com VISÃO

### 1. Configurar URL do MediaMTX no Supabase

```sql
-- Adicionar coluna stream_url na tabela cameras
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS stream_url TEXT;
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS stream_type TEXT DEFAULT 'hls';

-- Exemplo de atualização
UPDATE cameras 
SET stream_url = 'http://mediamtx.seudominio.com:8888/cam1/index.m3u8',
    stream_type = 'hls'
WHERE name = 'Entrada Principal';
```

### 2. Variáveis de Ambiente

```env
# .env
VITE_MEDIAMTX_URL=http://localhost:8888
VITE_MEDIAMTX_WEBRTC_URL=http://localhost:8889
```

### 3. Uso no Frontend

```typescript
// Construir URL do stream
const getStreamUrl = (cameraPath: string, type: 'hls' | 'webrtc' = 'hls') => {
  const baseUrl = import.meta.env.VITE_MEDIAMTX_URL || 'http://localhost:8888';
  const webrtcUrl = import.meta.env.VITE_MEDIAMTX_WEBRTC_URL || 'http://localhost:8889';
  
  if (type === 'webrtc') {
    return `${webrtcUrl}/${cameraPath}`;
  }
  return `${baseUrl}/${cameraPath}/index.m3u8`;
};
```

## Comandos Úteis

```bash
# Ver status dos streams
curl http://localhost:9997/v3/paths/list

# Adicionar câmera via API
curl -X POST http://localhost:9997/v3/config/paths/add/novacam \
  -H "Content-Type: application/json" \
  -d '{"source": "rtsp://admin:pass@192.168.1.103:554/stream1"}'

# Remover câmera
curl -X POST http://localhost:9997/v3/config/paths/remove/novacam

# Ver métricas
curl http://localhost:9997/metrics
```

## Troubleshooting

### Stream não carrega
1. Verificar se a câmera está acessível: `ffprobe rtsp://...`
2. Verificar logs: `docker logs visao-mediamtx`
3. Testar HLS direto: `ffplay http://localhost:8888/cam1/index.m3u8`

### Alta latência
- Use WebRTC em vez de HLS para latência < 500ms
- Reduza `hlsSegmentDuration` para 500ms
- Ative `hlsPartDuration` para LL-HLS

### CORS errors
- Verifique `hlsAllowOrigin: '*'` no config
- Configure proxy reverso se necessário

## Segurança (Produção)

```yaml
# Autenticação básica
paths:
  cam1:
    source: rtsp://admin:password@192.168.1.100:554/stream1
    readUser: visao
    readPass: senha_segura
    publishUser: ""
    publishPass: ""
```

## Monitoramento

```yaml
# Prometheus metrics
metrics: yes
metricsAddress: :9998

# Health check
curl http://localhost:9997/v3/paths/list
```
