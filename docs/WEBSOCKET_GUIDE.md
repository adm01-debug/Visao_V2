# WebSocket Guide

## Overview

Real-time communication for VIS-O.

## Connection

```ts
const ws = new WebSocket('wss://api.vis-o.app/ws');
ws.onopen = () => console.log('Connected');
ws.onmessage = (event) => handleMessage(JSON.parse(event.data));
ws.onclose = () => console.log('Disconnected');
```

## Authentication

Send auth message after connection:
```json
{ "type": "auth", "token": "your-jwt-token" }
```

## Message Types

### Subscribe to Camera
```json
{ "type": "subscribe", "channel": "camera", "id": "camera-id" }
```

### Unsubscribe
```json
{ "type": "unsubscribe", "channel": "camera", "id": "camera-id" }
```

### Server Events

#### Alert
```json
{ "type": "alert", "data": { "id": "...", "severity": "high" } }
```

#### Camera Status
```json
{ "type": "camera_status", "data": { "id": "...", "status": "online" } }
```

## Reconnection

Implement exponential backoff:
```ts
let retries = 0;
const reconnect = () => {
  const delay = Math.min(1000 * Math.pow(2, retries), 30000);
  setTimeout(() => connect(), delay);
  retries++;
};
```

## Best Practices

1. Handle disconnections gracefully
2. Implement heartbeat ping/pong
3. Resubscribe on reconnect
4. Use message queue for offline

---

*Last updated: January 2026*
