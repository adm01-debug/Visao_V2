# VISÃO API — Release Notes v1.0.0

**Data:** 2026-07-17
**Status:** Stable — contrato congelado (Onda 52)
**Base URL:** `https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/public-api`
**Docs interativas:** [`/docs/api`](https://attentive-cam.lovable.app/docs/api) (Swagger UI)
**Especificação:** [`/openapi.yaml`](https://attentive-cam.lovable.app/openapi.yaml)

---

## Visão geral

Primeira release estável da API REST pública do VISÃO. Consolidação das Ondas 43-52 do plano de paridade técnica com sistemas de referência (ZoneMinder, Shinobi, Agent DVR, OpenCV).

Todos os endpoints:
- Autenticados via **Bearer JWT** do usuário (RLS aplicada — nunca `service_role`)
- Retornam **JSON** com envelope `{ data, meta? }` ou `{ error, message? }`
- Sujeitos a **rate-limit** por IP: 60 req/min padrão, 20 req/min em endpoints sensíveis
- Servem `X-API-Version: 1` em todas as respostas
- Logam telemetria em `api_usage_logs` (retenção 90 dias, sem PII — só `method`, `path`, `status`, `latency_ms`, `ip_hash`)

---

## Endpoints

### Diagnóstico

| Método | Path | Auth | Descrição |
|---|---|---|---|
| GET | `/v1/health` | ❌ | Health público |
| GET | `/v1/status` | ✅ | Métricas do usuário autenticado |

### Câmeras

| Método | Path | Descrição |
|---|---|---|
| GET | `/v1/cameras` | Lista (filtro/order/paginação) |
| GET | `/v1/cameras/:id` | Detalhe |
| POST | `/v1/cameras/:id/arm` | Arma câmera |
| POST | `/v1/cameras/:id/disarm` | Desarma (requer `reason`) |

### Eventos e alertas

| Método | Path | Descrição |
|---|---|---|
| GET | `/v1/events` | Lista de `event_alerts` |
| GET | `/v1/events/count` | Contagem com filtros |
| GET | `/v1/events/summary` | Agregados por severity/status |
| GET | `/v1/alerts` | Lista de alertas |
| POST | `/v1/alerts/:id/acknowledge` | Reconhece (idempotente) |

### Pânico e mídia

| Método | Path | Descrição |
|---|---|---|
| POST | `/v1/panic` | Aciona evento de pânico (rate-limit reduzido) |
| GET | `/v1/clips/:id/url?ttl=3600` | URL assinada (TTL máx. 7 dias) |

---

## Filtros declarativos

Sintaxe: `?filter=campo:valor,campo:valor` — apenas campos na **whitelist** de cada endpoint são aceitos (mitigação SQL-injection).

- Cameras: `status`, `type`, `location`
- Events: `severity`, `status`, `camera_id`, `event_id`
- Alerts: `severity`, `type`, `camera_id`, `acknowledged`

Ordenação: `?order=coluna` (asc) ou `?order=-coluna` (desc), também whitelisted.

Janela temporal: `?from=<ISO-8601>&to=<ISO-8601>`.

---

## SDK TypeScript

Gerado on-demand a partir do OpenAPI:

```bash
node scripts/generate-api-sdk.mjs
```

Saída em `src/sdk/`:
- `visao-api.d.ts` — tipos completos
- `visao-api-client.ts` — cliente high-level (`armCamera`, `panic`, `eventsSummary`, ...)

Exemplo:

```ts
import { VisaoClient } from "@/sdk/visao-api-client";
const api = new VisaoClient({ token: session.access_token });
const events = await api.eventsSummary({ from: "2026-07-01T00:00:00Z" });
```

---

## Webhooks v2 (Onda 49)

Assinatura HMAC-SHA256:
- Header: `X-VISAO-Signature: t=<unix>,v1=<hex>`
- Payload assinado: `${timestamp}.${body}`
- Tolerância: 300s (previne replay)
- Utilitário compartilhado: `supabase/functions/_shared/webhookHmac.ts`

---

## Política de deprecação (Onda 52)

- Contrato `/v1/*` **congelado**. Mudanças breaking exigem `/v2/*`.
- Endpoints deprecated servem header `Sunset: <RFC-1123-date>`.
- Convivência mínima: **6 meses**.
- Anúncios via `CHANGELOG.md` e `POSTING_RULES.md`.

---

## Segurança

- ✅ RLS aplicada em 100% dos endpoints (JWT do usuário via anon key)
- ✅ Whitelist estrita de campos filtráveis e ordenáveis
- ✅ Rate-limit por IP/endpoint (in-memory, sliding window)
- ✅ CORS restrito a origins Lovable + localhost
- ✅ IP hasheado em logs (SHA-256 + salt) — sem PII
- ✅ TTL máx. 7 dias em signed URLs (LGPD + custo storage)
- ✅ Idempotência em POST arm/disarm/acknowledge/panic
- ✅ Backup config com whitelist explícita (nunca secrets)

---

## Observabilidade

- **Dashboard interno:** `/admin/api-usage` — top endpoints, p95, error rate, volume/dia
- **Telemetria:** `public.api_usage_logs` (RLS: usuário vê os seus + admin vê todos)
- **Retenção:** 90 dias via `run_retention_cleanup()` (cron `visao-daily-retention`, 03:30 UTC diário)
- **RPC agregado:** `get_api_usage_stats(_days INT)` — apenas admin

---

## Import/Export de configuração (Onda 46/46.1)

Edge function `settings-backup`:
- **GET / /export**: download JSON com whitelist (cameras, zones, rules, notifications) — nunca secrets
- **POST**: valida `schema_version`, retorna preview

RPC `public.import_settings_backup(payload, strategy)`:
- Transacional (rollback total em falha)
- Limite 2000 registros combinados
- Reatribui `user_id = auth.uid()` (impede cross-tenant)
- Estratégias: `skip` | `overwrite`
- Grava em `audit_logs`

---

## Cenários validados

Cobertura de simulação: **39 cenários** em `scripts/simulate-waves-44-52-scenarios.mjs` + `simulate-finalization-scenarios.mjs`.

Gaps críticos endereçados: whitelist SQL, TTL cap, idempotência POST, HMAC + timestamp, rate-limit sensível, RLS end-to-end, backup whitelist, health público vs. status autenticado, hash de IP.

---

## Próximas versões

- **v1.1** (planejada): endpoint POST `/v1/trigger-alert`, executor real de import (hoje retorna preview)
- **v2.0** (sem prazo): revisão de contrato — apenas se breaking necessário
