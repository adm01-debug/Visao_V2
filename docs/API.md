# 📡 API - Edge Functions

Documentação das Edge Functions do Supabase para o VISÃO.

## 🔌 Endpoints Disponíveis

### Base URL
```
https://[PROJECT_ID].supabase.co/functions/v1
```

---

## 🖼️ analyze-image

Analisa uma imagem usando GPT-4 Vision.

**Endpoint:** `POST /analyze-image`

**Headers:**
```
Authorization: Bearer [SUPABASE_ANON_KEY]
Content-Type: application/json
```

**Body:**
```json
{
  "imageBase64": "base64_encoded_image",
  "analysisType": "security" | "safety" | "productivity",
  "customPrompt": "Instrução opcional adicional"
}
```

**Response:**
```json
{
  "success": true,
  "analysis": {
    "type": "security",
    "summary": "Descrição da análise",
    "detections": [
      {
        "type": "person",
        "description": "Pessoa detectada",
        "confidence": 0.95,
        "location": "centro da imagem"
      }
    ],
    "alerts": [],
    "metadata": {}
  }
}
```

---

## 👤 detect-faces

Detecta rostos em uma imagem.

**Endpoint:** `POST /detect-faces`

**Body:**
```json
{
  "imageBase64": "base64_encoded_image"
}
```

**Response:**
```json
{
  "success": true,
  "faces": [
    {
      "boundingBox": { "x": 100, "y": 50, "width": 80, "height": 100 },
      "confidence": 0.98,
      "landmarks": {
        "leftEye": { "x": 120, "y": 70 },
        "rightEye": { "x": 160, "y": 70 },
        "nose": { "x": 140, "y": 90 }
      }
    }
  ],
  "count": 1
}
```

---

## 🔐 compare-faces

Compara dois rostos para verificar se são a mesma pessoa.

**Endpoint:** `POST /compare-faces`

**Body:**
```json
{
  "face1Base64": "base64_encoded_face_1",
  "face2Base64": "base64_encoded_face_2"
}
```

**Response:**
```json
{
  "success": true,
  "match": true,
  "similarity": 0.92,
  "confidence": "high"
}
```

---

## 📊 generate-face-encoding

Gera encoding facial de 128 dimensões para cadastro.

**Endpoint:** `POST /generate-face-encoding`

**Body:**
```json
{
  "imageBase64": "base64_encoded_image",
  "personId": "uuid_pessoa_opcional"
}
```

**Response:**
```json
{
  "success": true,
  "encoding": [0.123, -0.456, ...], // Array de 128 floats
  "faceQuality": 0.95,
  "saved": true
}
```

---

## 🔔 send-alert-notification

Envia notificação de alerta por múltiplos canais.

**Endpoint:** `POST /send-alert-notification`

**Body:**
```json
{
  "alertId": "uuid_alerta",
  "channels": ["email", "telegram", "push"],
  "recipients": ["user@email.com"],
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "sent": {
    "email": true,
    "telegram": true,
    "push": false
  },
  "errors": []
}
```

---

## 📱 send-telegram

Envia mensagem para o Telegram.

**Endpoint:** `POST /send-telegram`

**Body:**
```json
{
  "message": "Texto da mensagem",
  "chatId": "-100123456789",
  "imageUrl": "https://url/imagem.jpg",
  "buttons": [
    { "text": "Ver Alerta", "url": "https://app/alert/123" }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "messageId": 12345
}
```

---

## 🚗 analyze-license-plate

Detecta e lê placas de veículos.

**Endpoint:** `POST /analyze-license-plate`

**Body:**
```json
{
  "imageBase64": "base64_encoded_image",
  "region": "BR"
}
```

**Response:**
```json
{
  "success": true,
  "plates": [
    {
      "text": "ABC1D23",
      "confidence": 0.97,
      "boundingBox": { "x": 200, "y": 150, "width": 100, "height": 30 },
      "format": "mercosul"
    }
  ],
  "count": 1
}
```

---

## 🔒 Autenticação

Todas as Edge Functions requerem autenticação via header `Authorization`.

### Token de Serviço (Supabase)
```bash
curl -X POST https://[PROJECT_ID].supabase.co/functions/v1/analyze-image \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "..."}'
```

### Token de Usuário (Autenticado)
```javascript
const { data: { session } } = await supabase.auth.getSession();

await supabase.functions.invoke('analyze-image', {
  body: { imageBase64: '...' },
  headers: {
    Authorization: `Bearer ${session.access_token}`
  }
});
```

---

## 📊 Rate Limits

| Função | Limite | Período |
|--------|--------|---------|
| analyze-image | 100 | por hora |
| detect-faces | 200 | por hora |
| compare-faces | 150 | por hora |
| generate-face-encoding | 100 | por hora |
| send-alert-notification | 500 | por hora |
| send-telegram | 300 | por hora |
| analyze-license-plate | 150 | por hora |

---

## 🔧 Variáveis de Ambiente (Edge Functions)

```env
# OpenAI
OPENAI_API_KEY=sk-...

# Telegram
TELEGRAM_BOT_TOKEN=123456789:ABC...
TELEGRAM_CHAT_ID=-100...

# Resend (Email)
RESEND_API_KEY=re_...

# Supabase
SUPABASE_URL=https://....supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 📝 Exemplos

### JavaScript/TypeScript
```typescript
import { supabase } from '@/integrations/supabase/client';

// Analisar imagem
const { data, error } = await supabase.functions.invoke('analyze-image', {
  body: {
    imageBase64: base64Image,
    analysisType: 'security'
  }
});

if (error) throw error;
console.log(data.analysis);
```

### cURL
```bash
curl -X POST \
  https://PROJECT.supabase.co/functions/v1/detect-faces \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "/9j/4AAQSkZJRg..."}'
```

---

*Última atualização: Dezembro 2025*
