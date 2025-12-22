# Edge Functions - VISÃO

## Funções Disponíveis

### analyze-image
Analisa imagem para detecção de objetos/pessoas
```typescript
POST /functions/v1/analyze-image
{ imageUrl: string, analysisType: 'security' | 'ppe' }
```

### detect-faces
Detecta faces em imagem
```typescript
POST /functions/v1/detect-faces
{ imageBase64: string }
```

### compare-faces
Compara duas faces
```typescript
POST /functions/v1/compare-faces
{ face1: string, face2: string }
```

### send-alert-notification
Envia notificação de alerta
```typescript
POST /functions/v1/send-alert-notification
{ alertId: string, channels: string[] }
```

### send-telegram
Envia mensagem via Telegram
```typescript
POST /functions/v1/send-telegram
{ chatId: string, message: string }
```

## Deploy
```bash
supabase functions deploy <function-name>
```
