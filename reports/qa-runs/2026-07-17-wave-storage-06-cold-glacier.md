# Onda Storage 06 — Cold Tier (AWS S3 Glacier Deep Archive)

## Objetivo
Migrar mídias `warm` (Cloudflare R2) com **≥ 30 dias** desde `promoted_at` para **AWS S3 Glacier / Deep Archive**, quando `retention_class ∈ {extended, forensic}` e sem `legal_hold`. Custo típico: ~$1/TB/mês (Deep Archive).

## Simulação
`scripts/simulate-wave-storage-06-scenarios.mjs` — **260/260 cenários OK**:
- Elegibilidade por tier / retention_class / idade (80)
- Ausência parcial/total de secrets AWS (40)
- Validação `storage_class` (aceita `GLACIER | DEEP_ARCHIVE | GLACIER_IR`) (30)
- Integridade SHA-256 (40)
- `legal_hold=true` bloqueia arquivamento (LGPD/retenção legal) (30)
- Rollback S3 quando UPDATE falha (20)
- Restore workflow (Expedited não é permitido em Deep Archive) (20)

## Migração DB
`media_assets` ganhou colunas:
- `legal_hold BOOLEAN NOT NULL DEFAULT false` — trava LGPD
- `archived_at TIMESTAMPTZ` — timestamp warm→cold
- `restore_requested_at` / `restore_available_until TIMESTAMPTZ` — janela de restore
- `storage_class TEXT` — classe efetiva no S3
- Índice parcial `idx_media_assets_warm_ready_cold` para o job

## Componentes
- **Edge Function** `supabase/functions/archive-warm-to-cold/index.ts`
  - Admin-only + rate-limit `strict`
  - Batch configurável (default 20, max 100), suporta `dry_run`
  - Verifica SHA-256 antes do PUT
  - `x-amz-storage-class: DEEP_ARCHIVE` + `x-amz-server-side-encryption: AES256`
  - UPDATE condicional (`.eq('storage_tier','warm').eq('legal_hold', false)`)
  - Rollback S3 se UPDATE falhar; DELETE R2 apenas após confirmação
- **Secrets exigidos:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_COLD_BUCKET`, `S3_COLD_STORAGE_CLASS` (opcional, default `DEEP_ARCHIVE`)

## LGPD / Governança
- `legal_hold=true` impede tanto arquivamento cold quanto delete via trigger de retenção (a implementar na Etapa 8).
- Metadata preserva `source_bucket`/`source_key` para auditoria.
- Criptografia SSE-S3 (`AES256`) obrigatória.

## Próximas ondas
- **Etapa 7:** Cron scheduler unificado (hot→warm diário, warm→cold semanal) + backpressure adaptativo.
- **Etapa 8:** Playback unificado resolvendo tier + fluxo de restore assíncrono do Glacier.
- **Etapa 9:** Dashboard de custos por tier.
- **Etapa 10:** Ferramenta de "Direito ao Esquecimento" LGPD.
