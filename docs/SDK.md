# 🔌 SDK Reference - Projeto VISÃO

## Visão Geral

SDK para integração com o sistema VISÃO via API REST e WebSocket.

---

## 1. Instalação

```bash
npm install @visao/sdk
# ou
yarn add @visao/sdk
```

---

## 2. Configuração

```typescript
import { VisaoClient } from '@visao/sdk';

const client = new VisaoClient({
  baseUrl: 'https://api.visao.app',
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
});
```

---

## 3. Autenticação

### API Key

```typescript
// Header
Authorization: Bearer <api-key>
```

### JWT

```typescript
const { session } = await client.auth.signIn({
  email: 'user@example.com',
  password: 'password',
});

// Usar session.access_token
```

---

## 4. Câmeras

### Listar

```typescript
const cameras = await client.cameras.list();
```

### Obter

```typescript
const camera = await client.cameras.get('camera-id');
```

### Criar

```typescript
const camera = await client.cameras.create({
  name: 'Câmera Entrada',
  rtspUrl: 'rtsp://192.168.1.100:554/stream',
  location: { lat: -23.5505, lng: -46.6333 },
});
```

### Atualizar

```typescript
await client.cameras.update('camera-id', {
  name: 'Câmera Entrada Principal',
});
```

### Deletar

```typescript
await client.cameras.delete('camera-id');
```

---

## 5. Alertas

### Listar

```typescript
const alerts = await client.alerts.list({
  severity: ['high', 'critical'],
  startDate: '2026-01-01',
  endDate: '2026-01-06',
});
```

### Marcar como Lido

```typescript
await client.alerts.markAsRead('alert-id');
```

### Webhook

```typescript
client.alerts.onNew((alert) => {
  console.log('Novo alerta:', alert);
});
```

---

## 6. Reconhecimento Facial

### Registrar Pessoa

```typescript
const person = await client.recognition.registerPerson({
  name: 'João Silva',
  imageBase64: 'data:image/jpeg;base64,...',
  group: 'employees',
});
```

### Buscar Pessoa

```typescript
const match = await client.recognition.identify({
  imageBase64: 'data:image/jpeg;base64,...',
  threshold: 0.6,
});
```

### Comparar Faces

```typescript
const result = await client.recognition.compare({
  image1: 'base64...',
  image2: 'base64...',
});
// result.similarity: 0.0 - 1.0
```

---

## 7. Zonas

### Criar Zona

```typescript
const zone = await client.zones.create({
  name: 'Área Restrita',
  type: 'restricted',
  cameraId: 'camera-id',
  polygon: [
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 },
    { x: 0.1, y: 0.9 },
  ],
});
```

---

## 8. Gravações

### Listar

```typescript
const recordings = await client.recordings.list({
  cameraId: 'camera-id',
  startDate: '2026-01-01T00:00:00Z',
  endDate: '2026-01-01T23:59:59Z',
});
```

### Download

```typescript
const url = await client.recordings.getDownloadUrl('recording-id');
```

---

## 9. WebSocket

### Conectar

```typescript
const ws = client.realtime.connect();

ws.subscribe('alerts', (alert) => {
  console.log('Alert:', alert);
});

ws.subscribe('camera:camera-id', (event) => {
  console.log('Camera event:', event);
});
```

### Eventos

| Canal | Evento | Payload |
|-------|--------|---------|
| `alerts` | Novo alerta | `Alert` |
| `camera:{id}` | Status | `CameraStatus` |
| `recognition` | Match | `RecognitionMatch` |
| `zones:{id}` | Violação | `ZoneViolation` |

---

## 10. Tipos

```typescript
interface Camera {
  id: string;
  name: string;
  rtspUrl: string;
  status: 'online' | 'offline';
  location?: {
    lat: number;
    lng: number;
  };
}

interface Alert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cameraId: string;
  timestamp: string;
  acknowledged: boolean;
}

interface Person {
  id: string;
  name: string;
  group: string;
  encoding: number[];
  createdAt: string;
}
```

---

## 11. Rate Limits

| Endpoint | Limite |
|----------|--------|
| `/cameras` | 100/min |
| `/alerts` | 200/min |
| `/recognition` | 50/min |
| `/recordings` | 30/min |

---

## 12. Erros

| Código | Descrição |
|--------|-----------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Server Error |

---

**Última atualização:** 06/01/2026
