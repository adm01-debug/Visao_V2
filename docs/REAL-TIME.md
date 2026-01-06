# ⚡ Real-Time Guide - Projeto VISÃO

## Visão Geral

Comunicação em tempo real com WebSocket e Supabase Realtime.

---

## 1. Supabase Realtime

### Conexão

```typescript
import { supabase } from '@/integrations/supabase/client';

const channel = supabase
  .channel('alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'alerts',
  }, (payload) => {
    console.log('New alert:', payload.new);
  })
  .subscribe();
```

### Eventos Suportados

| Evento | Descrição |
|--------|-----------|
| INSERT | Novo registro |
| UPDATE | Registro atualizado |
| DELETE | Registro removido |
| * | Todos os eventos |

---

## 2. Broadcast

### Enviar

```typescript
const channel = supabase.channel('room-1');

channel.send({
  type: 'broadcast',
  event: 'cursor',
  payload: { x: 100, y: 200 },
});
```

### Receber

```typescript
channel.on('broadcast', { event: 'cursor' }, (payload) => {
  console.log('Cursor position:', payload);
});
```

---

## 3. Presence

### Tracking

```typescript
const channel = supabase.channel('room-1');

channel
  .on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState();
    console.log('Online users:', state);
  })
  .subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      await channel.track({
        user_id: userId,
        online_at: new Date().toISOString(),
      });
    }
  });
```

---

## 4. WebSocket Nativo

### Conexão

```typescript
const ws = new WebSocket('wss://api.visao.app/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({
    type: 'subscribe',
    channel: 'alerts',
  }));
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  handleMessage(data);
};
```

---

## 5. Canais

| Canal | Conteúdo |
|-------|----------|
| `alerts` | Novos alertas |
| `cameras:{id}` | Status da câmera |
| `recognition` | Matches faciais |
| `zones:{id}` | Eventos de zona |
| `system` | Status do sistema |

---

## 6. React Hooks

### useRealtimeAlerts

```typescript
const { alerts, isConnected } = useRealtimeAlerts({
  severity: ['high', 'critical'],
  onNewAlert: (alert) => {
    playSound();
    showNotification(alert);
  },
});
```

### useRealtimeRecognition

```typescript
const { matches } = useRealtimeRecognition({
  cameraId: 'uuid',
  onMatch: (match) => {
    console.log('Match:', match);
  },
});
```

---

## 7. Reconexão

### Política

| Tentativa | Delay |
|-----------|-------|
| 1 | 1s |
| 2 | 2s |
| 3 | 4s |
| 4 | 8s |
| 5+ | 30s |

### Implementação

```typescript
let retryCount = 0;

ws.onclose = () => {
  const delay = Math.min(30000, Math.pow(2, retryCount) * 1000);
  setTimeout(reconnect, delay);
  retryCount++;
};
```

---

## 8. Performance

### Throttling

```typescript
// Limitar updates a 10/s
const throttledUpdate = throttle(updatePosition, 100);
```

### Batching

```typescript
// Agrupar mensagens
const messages = [];
const flush = debounce(() => {
  ws.send(JSON.stringify(messages));
  messages.length = 0;
}, 50);
```

---

**Última atualização:** 06/01/2026
