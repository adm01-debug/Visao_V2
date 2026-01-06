# 🔐 Environment Variables - Projeto VISÃO

## Variáveis de Ambiente

---

## 1. Supabase (Obrigatórias)

| Variável | Descrição |
|----------|-----------|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anônima pública |

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Streaming

| Variável | Descrição |
|----------|-----------|
| `VITE_MEDIAMTX_URL` | URL do servidor MediaMTX |
| `VITE_HLS_URL` | URL base para streams HLS |

```env
VITE_MEDIAMTX_URL=http://localhost:8888
VITE_HLS_URL=http://localhost:8888
```

---

## 3. Notificações

| Variável | Descrição |
|----------|-----------|
| `TELEGRAM_BOT_TOKEN` | Token do bot Telegram |
| `RESEND_API_KEY` | API Key do Resend |
| `VAPID_PUBLIC_KEY` | Chave pública VAPID |
| `VAPID_PRIVATE_KEY` | Chave privada VAPID |

---

## 4. Mapas

| Variável | Descrição |
|----------|-----------|
| `VITE_MAPBOX_TOKEN` | Token da API Mapbox |

---

## 5. Analytics

| Variável | Descrição |
|----------|-----------|
| `VITE_GA_ID` | Google Analytics ID |
| `VITE_SENTRY_DSN` | Sentry DSN |

---

## 6. IA/ML

| Variável | Descrição |
|----------|-----------|
| `OPENAI_API_KEY` | API Key OpenAI |
| `VITE_FACE_API_URL` | URL dos modelos face-api |

---

## 7. Exemplo Completo

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Streaming
VITE_MEDIAMTX_URL=http://localhost:8888

# Mapas
VITE_MAPBOX_TOKEN=pk.xxx

# Analytics
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# App
VITE_APP_URL=http://localhost:5173
```

---

## 8. Secrets (Supabase Edge Functions)

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
supabase secrets set OPENAI_API_KEY=xxx
supabase secrets set RESEND_API_KEY=xxx
```

---

## 9. Validação

```typescript
// src/config/env.ts
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

requiredEnvVars.forEach((key) => {
  if (!import.meta.env[key]) {
    throw new Error(`Missing env: ${key}`);
  }
});
```

---

**Última atualização:** 06/01/2026
