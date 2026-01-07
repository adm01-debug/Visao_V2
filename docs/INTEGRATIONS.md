# 🔌 Integrations Guide - Projeto VISÃO

## Integrações Disponíveis

---

## 1. Telegram

### Configuração
```typescript
const telegramConfig = {
  botToken: 'YOUR_BOT_TOKEN',
  chatIds: ['123456789', '-100123456789'],
  alertTypes: ['intrusion', 'blacklist', 'ppe_missing'],
};
```

### Comandos do Bot
| Comando | Descrição |
|---------|-----------|
| `/start` | Iniciar bot |
| `/status` | Status do sistema |
| `/cameras` | Listar câmeras |
| `/alerts` | Últimos alertas |

---

## 2. Email (Resend)

```typescript
const emailConfig = {
  apiKey: 'YOUR_RESEND_KEY',
  from: 'alerts@visao.app',
  templates: {
    alert: 'tmpl_alert_v1',
    report: 'tmpl_report_v1',
  },
};
```

---

## 3. Push Notifications

```typescript
// Service Worker
navigator.serviceWorker.register('/sw.js');

// Solicitar permissão
Notification.requestPermission();
```

---

## 4. Webhooks

| Evento | Payload |
|--------|---------|
| `alert.created` | Alert object |
| `recognition.match` | Match object |
| `zone.violation` | Violation object |

---

## 5. Supabase

### Database
- PostgreSQL com RLS
- Realtime subscriptions
- Edge Functions

### Storage
- Buckets para gravações
- CDN integrado

---

## 6. MediaMTX

```yaml
# Streaming server
hlsAddress: :8888
rtspAddress: :8554
webrtcAddress: :8889
```

---

## 7. Mapbox

```typescript
// Token via Edge Function
const token = await getMapboxToken();
```

---

## 8. Face-api.js

| Modelo | Uso |
|--------|-----|
| ssdMobilenetv1 | Detecção |
| faceLandmark68Net | Landmarks |
| faceRecognitionNet | Encoding |

---

## 9. Slack (via Webhook)

```typescript
await fetch(SLACK_WEBHOOK_URL, {
  method: 'POST',
  body: JSON.stringify({
    text: `🚨 Alerta: ${alert.type}`,
    attachments: [{ image_url: alert.imageUrl }],
  }),
});
```

---

## 10. APIs Externas

| API | Uso |
|-----|-----|
| OpenAI | Análise de imagem |
| Twilio | SMS |
| SendGrid | Email alternativo |

---

**Última atualização:** 06/01/2026
