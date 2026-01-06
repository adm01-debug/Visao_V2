# 🔗 Webhooks Guide - Projeto VISÃO

## Visão Geral

Sistema de webhooks para integração com sistemas externos.

---

## 1. Eventos Disponíveis

| Evento | Descrição |
|--------|-----------|
| `alert.created` | Novo alerta criado |
| `alert.acknowledged` | Alerta reconhecido |
| `recognition.match` | Match de reconhecimento facial |
| `recognition.unknown` | Pessoa desconhecida detectada |
| `zone.violation` | Violação de zona |
| `camera.status` | Status da câmera alterado |
| `recording.started` | Gravação iniciada |
| `recording.stopped` | Gravação finalizada |

---

## 2. Configuração

### Criar Webhook

```typescript
const webhook = await webhookService.create({
  url: 'https://api.example.com/webhook',
  secret: 'webhook-secret-key',
  events: ['alert.created', 'recognition.match'],
  enabled: true,
});
```

### Payload

```json
{
  "id": "evt_xxx",
  "type": "alert.created",
  "timestamp": "2026-01-06T12:00:00Z",
  "data": {
    "alertId": "uuid",
    "type": "intrusion",
    "severity": "high",
    "cameraId": "uuid",
    "cameraName": "Entrada Principal"
  }
}
```

---

## 3. Segurança

### Assinatura HMAC

```typescript
const signature = crypto
  .createHmac('sha256', secret)
  .update(payload)
  .digest('hex');

// Header
'X-Visao-Signature': `sha256=${signature}`
```

### Verificação

```typescript
const isValid = crypto.timingSafeEqual(
  Buffer.from(receivedSignature),
  Buffer.from(expectedSignature)
);
```

---

## 4. Retry Policy

| Tentativa | Delay |
|-----------|-------|
| 1 | Imediato |
| 2 | 1 min |
| 3 | 5 min |
| 4 | 15 min |
| 5 | 1 hora |

### Códigos de Sucesso

- 2xx: Sucesso
- 3xx: Sucesso (redirect seguido)
- 4xx: Falha (não retentar)
- 5xx: Falha (retentar)

---

## 5. Eventos Detalhados

### alert.created

```json
{
  "type": "alert.created",
  "data": {
    "alertId": "uuid",
    "type": "intrusion",
    "severity": "high",
    "cameraId": "uuid",
    "cameraName": "Camera 01",
    "imageUrl": "https://...",
    "timestamp": "2026-01-06T12:00:00Z"
  }
}
```

### recognition.match

```json
{
  "type": "recognition.match",
  "data": {
    "personId": "uuid",
    "personName": "João Silva",
    "confidence": 0.95,
    "cameraId": "uuid",
    "imageUrl": "https://...",
    "group": "employees"
  }
}
```

### zone.violation

```json
{
  "type": "zone.violation",
  "data": {
    "zoneId": "uuid",
    "zoneName": "Área Restrita",
    "violationType": "entry",
    "cameraId": "uuid",
    "personCount": 1
  }
}
```

---

## 6. Testando Webhooks

### Endpoint de Teste

```bash
curl -X POST https://api.visao.app/webhooks/test \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"webhookId": "uuid", "event": "alert.created"}'
```

### Logs

```typescript
const logs = await webhookService.getLogs('webhook-id', {
  limit: 100,
  status: 'failed',
});
```

---

## 7. Integrações Comuns

| Serviço | Uso |
|---------|-----|
| Slack | Notificações |
| Discord | Alertas |
| IFTTT | Automações |
| Zapier | Integrações |
| Make | Workflows |

---

**Última atualização:** 06/01/2026
