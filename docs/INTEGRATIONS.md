# 🔌 Integrations Guide - Projeto VISÃO

## Integrações Disponíveis

---

## 1. Notificações

### Telegram
```typescript
// Configurar bot
const telegram = {
  botToken: 'YOUR_BOT_TOKEN',
  chatId: '123456789',
};

// Enviar alerta
await sendTelegramAlert(alert, telegram);
```

### Email (Resend)
```typescript
await resend.emails.send({
  from: 'alerts@visao.app',
  to: 'user@example.com',
  subject: `Alerta: ${alert.type}`,
  html: alertTemplate(alert),
});
```

### Push Notifications
```typescript
await webpush.sendNotification(subscription, JSON.stringify({
  title: 'Novo Alerta',
  body: alert.message,
  icon: '/icon.png',
}));
```

---

## 2. Storage

### Supabase Storage
```typescript
const { data } = await supabase.storage
  .from('recordings')
  .upload(`${cameraId}/${timestamp}.mp4`, file);
```

### AWS S3
```typescript
await s3.putObject({
  Bucket: 'visao-recordings',
  Key: `${cameraId}/${timestamp}.mp4`,
  Body: buffer,
});
```

---

## 3. Streaming

### MediaMTX
```yaml
# Configuração
paths:
  camera1:
    source: rtsp://192.168.1.100:554/stream
```

### HLS.js
```typescript
const hls = new Hls();
hls.loadSource('http://mediamtx:8888/camera1/index.m3u8');
hls.attachMedia(videoElement);
```

---

## 4. Analytics

### Google Analytics
```typescript
gtag('event', 'alert_created', {
  alert_type: alert.type,
  severity: alert.severity,
});
```

### Mixpanel
```typescript
mixpanel.track('Recognition Match', {
  confidence: match.confidence,
  camera: match.cameraId,
});
```

---

## 5. Mapas

### Mapbox
```typescript
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [-46.63, -23.55],
  zoom: 12,
});
```

---

## 6. Calendário

### Google Calendar
```typescript
await calendar.events.insert({
  calendarId: 'primary',
  requestBody: {
    summary: `Alerta: ${alert.type}`,
    start: { dateTime: alert.timestamp },
    end: { dateTime: endTime },
  },
});
```

---

## 7. Webhooks

### Outgoing
```typescript
await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Signature': signature,
  },
  body: JSON.stringify(payload),
});
```

---

## 8. MQTT (IoT)

```typescript
const client = mqtt.connect('mqtt://broker:1883');

client.subscribe('visao/alerts/#');
client.on('message', (topic, message) => {
  handleAlert(JSON.parse(message.toString()));
});
```

---

**Última atualização:** 06/01/2026
