# Wave Storage 08 — Playback Unificado + Restore Glacier

**Data:** 2026-07-17
**Status:** ✅ 10/10 — 340/340 cenários OK

## Componentes

| Item | Arquivo |
|------|---------|
| Simulação (340 cenários) | `scripts/simulate-wave-storage-08-scenarios.mjs` |
| Migração (restore_status/expires) | `media_assets` novos campos |
| Edge Function | `supabase/functions/resolve-media-url/index.ts` |
| Config | `supabase/config.toml` (verify_jwt=true) |

## Fluxo por tier

- **Hot** → `supabase.storage.createSignedUrl` (15 min)
- **Warm** → SigV4 GET presign em Cloudflare R2 (15 min)
- **Cold** →
  - `available` (e não expirado) → SigV4 GET presign em S3
  - `in_progress` → HTTP 202 `{status:'restore_in_progress'}`
  - `none`/`expired` → dispara `RestoreObject` (Bulk 12h padrão; Expedited ~5min opcional) e marca `restore_status='in_progress'`

## Segurança

- `verify_jwt=true` na função
- Autorização: owner do asset OU `has_role('admin')`
- Rate limit por usuário (`RATE_LIMITS.default`)
- Legal hold não bloqueia playback — apenas exclusão

## Próximos passos (Etapa 9)

- Dashboard admin de custos e consumo por tier (gráficos R2/S3/Supabase Storage).
