# Onda Storage 05 — Warm Tier (Cloudflare R2)

## Objetivo

Migrar mídias com mais de 7 dias do bucket **hot** (Supabase Storage) para o **warm tier** em **Cloudflare R2**, reduzindo custo (~10× mais barato que S3 Standard) e mantendo playback via URL assinada.

## Simulação

`scripts/simulate-wave-storage-05-scenarios.mjs` — **220/220 cenários OK** cobrindo:

- Elegibilidade por idade / tier / retention_class (60)
- Ausência parcial/total de credenciais R2 (40)
- Integridade SHA-256 (38 + rejeição de checksum divergente) (40)
- Objetos > 5 GB → plano multipart (30)
- Idempotência + rollback R2 quando UPDATE falha (30)
- Concorrência com `SKIP LOCKED` / advisory lock (20)

## Componentes

- **Edge Function** `supabase/functions/promote-hot-to-warm/index.ts`
  - Admin-only (`has_role('admin')`)
  - Batch configurável (default 25, max 100), suporta `dry_run`
  - Verifica SHA-256 antes do PUT
  - UPDATE condicional (`.eq('storage_tier','hot')`) — evita corrida
  - Rollback: se UPDATE falhar → DELETE do objeto no R2
  - DELETE do objeto hot só após UPDATE confirmado
- **Secrets exigidos:** `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_WARM_BUCKET`
- **Cron sugerido (Etapa 7):** invocar `promote-hot-to-warm` diariamente às 03:00 UTC via `pg_cron` + `pg_net`.

## Segurança

- Nunca expõe credenciais R2 ao cliente.
- Requer JWT válido + role admin.
- Rate limit `strict` (aws4fetch usa SigV4 — sem service_role vazando).
- Metadata preserva `source_bucket`/`source_key` para auditoria/rollback manual.

## Próximas ondas

- **Etapa 6:** Cold tier (Glacier) para `retention_class='forensic'` após 30 dias no warm.
- **Etapa 7:** Cron scheduler + backpressure adaptativo.
- **Etapa 8:** Playback unificado (resolve URL por tier).
