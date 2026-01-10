# ⚡ Edge Functions - Guia Completo

## Visão Geral

O VISÃO utiliza 10 Edge Functions no Supabase para processamento serverless.

## Funções Disponíveis

### 🤖 IA e Detecção

#### analyze-image
Análise de imagem com OpenAI Vision API.
- **Input:** URL da imagem
- **Output:** Descrição e objetos detectados

#### detect-faces
Detecção de faces em imagens.
- **Input:** Base64 da imagem
- **Output:** Array de faces detectadas com coordenadas

#### compare-faces
Comparação entre duas faces.
- **Input:** Duas imagens em base64
- **Output:** Score de similaridade (0-100)

#### generate-face-encoding
Gera encoding de face para armazenamento.
- **Input:** Imagem de face
- **Output:** Vector de 128 dimensões

#### analyze-license-plate
OCR para leitura de placas de veículos.
- **Input:** Imagem da placa
- **Output:** Texto da placa, confiança

### 🔔 Notificações

#### send-alert-notification
Envia alertas multi-canal.
- **Canais:** Email, SMS, Push, Webhook

#### send-telegram
Notificações via Telegram Bot.
- **Input:** chat_id, message
- **Output:** success/error

### ⚙️ Sistema

#### check-ip
Verifica se IP está na whitelist.
- **Input:** IP address
- **Output:** allowed/denied

#### get-mapbox-token
Retorna token do Mapbox para mapas.
- **Output:** Token temporário

#### process-automation-rules
Executa regras de automação configuradas.
- **Input:** Evento trigger
- **Output:** Ações executadas

## Uso

```typescript
import { supabase } from "@/integrations/supabase/client";

// Detectar faces
const { data } = await supabase.functions.invoke("detect-faces", {
  body: { image: base64Image }
});

// Enviar alerta
await supabase.functions.invoke("send-alert-notification", {
  body: { alertId: "123", channels: ["email", "telegram"] }
});
```

---

*Atualizado em 10/01/2026*

