# 📚 API Reference - Projeto VISÃO

## Base URL

```
Production: https://api.visao.app/v1
Development: http://localhost:3000/api/v1
```

---

## Autenticação

Todas as requisições requerem autenticação via Bearer Token.

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 1. Cameras

#### GET /cameras
Lista todas as câmeras.

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Câmera 01",
      "rtsp_url": "rtsp://...",
      "status": "online",
      "location": { "lat": -23.55, "lng": -46.63 }
    }
  ],
  "meta": { "total": 10, "page": 1, "limit": 20 }
}
```

#### GET /cameras/:id
Obtém uma câmera específica.

#### POST /cameras
Cria uma nova câmera.

**Body:**
```json
{
  "name": "Câmera Entrada",
  "rtsp_url": "rtsp://192.168.1.100:554/stream",
  "location": { "lat": -23.55, "lng": -46.63 }
}
```

#### PATCH /cameras/:id
Atualiza uma câmera.

#### DELETE /cameras/:id
Remove uma câmera.

---

### 2. Alerts

#### GET /alerts
Lista alertas com filtros.

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| severity | string[] | low, medium, high, critical |
| type | string[] | Tipo de alerta |
| start_date | ISO8601 | Data inicial |
| end_date | ISO8601 | Data final |
| acknowledged | boolean | Filtrar por status |

#### GET /alerts/:id
Obtém um alerta específico.

#### PATCH /alerts/:id/acknowledge
Marca alerta como lido.

#### DELETE /alerts/:id
Remove um alerta.

---

### 3. People

#### GET /people
Lista pessoas cadastradas.

#### GET /people/:id
Obtém uma pessoa.

#### POST /people
Cadastra nova pessoa.

**Body:**
```json
{
  "name": "João Silva",
  "group": "employees",
  "image_base64": "data:image/jpeg;base64,..."
}
```

#### PATCH /people/:id
Atualiza pessoa.

#### DELETE /people/:id
Remove pessoa.

---

### 4. Zones

#### GET /zones
Lista zonas de monitoramento.

#### POST /zones
Cria nova zona.

**Body:**
```json
{
  "name": "Área Restrita",
  "type": "restricted",
  "camera_id": "uuid",
  "polygon": [
    { "x": 0.1, "y": 0.1 },
    { "x": 0.9, "y": 0.1 },
    { "x": 0.9, "y": 0.9 },
    { "x": 0.1, "y": 0.9 }
  ]
}
```

---

### 5. Recordings

#### GET /recordings
Lista gravações.

**Query Params:**
| Param | Tipo | Descrição |
|-------|------|-----------|
| camera_id | uuid | Filtrar por câmera |
| start_date | ISO8601 | Data inicial |
| end_date | ISO8601 | Data final |

#### GET /recordings/:id/download
Obtém URL de download.

#### DELETE /recordings/:id
Remove gravação.

---

### 6. Recognition

#### POST /recognition/identify
Identifica pessoa em imagem.

**Body:**
```json
{
  "image_base64": "data:image/jpeg;base64,...",
  "threshold": 0.6
}
```

**Response:**
```json
{
  "matches": [
    {
      "person_id": "uuid",
      "name": "João Silva",
      "confidence": 0.85
    }
  ]
}
```

#### POST /recognition/compare
Compara duas faces.

**Body:**
```json
{
  "image1_base64": "...",
  "image2_base64": "..."
}
```

**Response:**
```json
{
  "similarity": 0.92,
  "match": true
}
```

---

### 7. Analytics

#### GET /analytics/dashboard
Métricas do dashboard.

#### GET /analytics/alerts
Estatísticas de alertas.

#### GET /analytics/recognition
Estatísticas de reconhecimento.

---

## Edge Functions (Supabase)

| Function | Método | Descrição |
|----------|--------|-----------|
| `/analyze-image` | POST | Análise geral |
| `/detect-faces` | POST | Detecção facial |
| `/compare-faces` | POST | Comparação 1:1 |
| `/generate-face-encoding` | POST | Gerar encoding |
| `/analyze-license-plate` | POST | OCR de placas |
| `/send-alert-notification` | POST | Enviar notificação |
| `/send-telegram` | POST | Enviar Telegram |
| `/check-ip` | POST | Verificar IP |
| `/get-mapbox-token` | GET | Token Mapbox |

---

## Códigos de Erro

| Código | Descrição |
|--------|-----------|
| 400 | Requisição inválida |
| 401 | Não autorizado |
| 403 | Acesso negado |
| 404 | Não encontrado |
| 409 | Conflito |
| 422 | Entidade não processável |
| 429 | Rate limit excedido |
| 500 | Erro interno |

---

## Rate Limits

| Endpoint | Limite |
|----------|--------|
| `/cameras` | 100/min |
| `/alerts` | 200/min |
| `/recognition` | 50/min |
| `/recordings` | 30/min |

---

**Última atualização:** 06/01/2026
