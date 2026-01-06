# ⚡ Edge Functions Guide - Projeto VISÃO

## Visão Geral

Funções serverless no Supabase para processamento de IA e integrações.

---

## 1. Funções Disponíveis

| Função | Descrição | Método |
|--------|-----------|--------|
| `analyze-image` | Análise geral de imagem | POST |
| `detect-faces` | Detecção facial | POST |
| `compare-faces` | Comparação 1:1 | POST |
| `generate-face-encoding` | Gerar encoding | POST |
| `analyze-license-plate` | OCR de placas | POST |
| `send-alert-notification` | Enviar notificação | POST |
| `send-telegram` | Enviar Telegram | POST |
| `check-ip` | Verificar IP | POST |
| `get-mapbox-token` | Token Mapbox | GET |

---

## 2. Estrutura

```
supabase/functions/
├── _shared/
│   ├── cors.ts
│   └── utils.ts
├── analyze-image/
│   └── index.ts
├── detect-faces/
│   └── index.ts
└── ...
```

---

## 3. Exemplo: detect-faces

### Código

```typescript
// supabase/functions/detect-faces/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    // Processar imagem com face-api
    const faces = await detectFaces(imageBase64);
    
    return new Response(
      JSON.stringify({ faces }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: corsHeaders }
    );
  }
});
```

---

## 4. Chamando Funções

### Via SDK

```typescript
const { data, error } = await supabase.functions.invoke('detect-faces', {
  body: { imageBase64: 'data:image/jpeg;base64,...' },
});
```

### Via REST

```bash
curl -X POST \
  https://xxx.supabase.co/functions/v1/detect-faces \
  -H "Authorization: Bearer $ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "..."}'
```

---

## 5. Variáveis de Ambiente

```bash
# Definir secrets
supabase secrets set OPENAI_API_KEY=xxx
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
```

### Acessar no código

```typescript
const apiKey = Deno.env.get('OPENAI_API_KEY');
```

---

## 6. CORS

```typescript
// _shared/cors.ts
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

---

## 7. Deploy

```bash
# Deploy todas
supabase functions deploy

# Deploy específica
supabase functions deploy detect-faces

# Logs
supabase functions logs detect-faces
```

---

## 8. Limites

| Recurso | Limite |
|---------|--------|
| Timeout | 60s |
| Memory | 150MB |
| Payload | 6MB |
| Concurrent | 50 |

---

## 9. Testes Locais

```bash
# Iniciar Supabase local
supabase start

# Servir funções
supabase functions serve

# Testar
curl http://localhost:54321/functions/v1/detect-faces
```

---

**Última atualização:** 06/01/2026
