# ⚙️ Environment Variables - Projeto VISÃO

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

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITE_MEDIAMTX_URL` | URL do MediaMTX | `http://localhost:8888` |
| `VITE_HLS_PATH` | Path para streams HLS | `/hls` |

---

## 3. Integrações

| Variável | Descrição |
|----------|-----------|
| `VITE_TELEGRAM_BOT_TOKEN` | Token do bot Telegram |
| `VITE_RESEND_API_KEY` | API key do Resend |
| `VITE_MAPBOX_TOKEN` | Token do Mapbox |

---

## 4. Feature Flags

| Variável | Descrição | Default |
|----------|-----------|---------|
| `VITE_ENABLE_PWA` | Habilitar PWA | `true` |
| `VITE_ENABLE_ANALYTICS` | Habilitar analytics | `true` |
| `VITE_ENABLE_FACE_RECOGNITION` | Reconhecimento facial | `true` |

---

## 5. Desenvolvimento

| Variável | Descrição |
|----------|-----------|
| `VITE_DEBUG` | Modo debug |
| `VITE_LOG_LEVEL` | Nível de log (debug/info/warn/error) |

---

## 6. Exemplo Completo

```env
# .env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...

# Streaming
VITE_MEDIAMTX_URL=http://localhost:8888

# Integrações
VITE_TELEGRAM_BOT_TOKEN=123456:ABC-DEF
VITE_RESEND_API_KEY=re_xxx

# Features
VITE_ENABLE_PWA=true
VITE_ENABLE_FACE_RECOGNITION=true

# Dev
VITE_DEBUG=false
VITE_LOG_LEVEL=info
```

---

## 7. Secrets (Supabase Edge Functions)

```bash
supabase secrets set OPENAI_API_KEY=xxx
supabase secrets set TELEGRAM_BOT_TOKEN=xxx
```

---

## 8. Validação

```typescript
// Verificar variáveis obrigatórias
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
];

requiredEnvVars.forEach((key) => {
  if (!import.meta.env[key]) {
    throw new Error(`Missing: ${key}`);
  }
});
```

---

**Última atualização:** 06/01/2026
