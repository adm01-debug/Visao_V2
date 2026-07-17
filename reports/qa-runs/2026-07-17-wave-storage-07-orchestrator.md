# Wave Storage 07 — Cron Scheduler Unificado + Backpressure

**Data:** 2026-07-17
**Status:** ✅ 10/10 — 300/300 cenários OK

## Componentes entregues

| Item | Arquivo |
|------|---------|
| Simulação (300 cenários) | `scripts/simulate-wave-storage-07-scenarios.mjs` |
| Tabela auditoria | migration `storage_tiering_runs` |
| Edge Function orquestradora | `supabase/functions/storage-tiering-orchestrator/index.ts` |
| Config | `supabase/config.toml` (verify_jwt=true) |
| Agendamento | `pg_cron` a cada 15 min |

## Salvaguardas

1. **Advisory Lock** (`pg_try_advisory_lock(0x57157107)`) impede rodadas concorrentes.
2. **Circuit Breaker** por tier: 3 falhas em 60 min ⇒ tier pausado até janela expirar.
3. **Batch adaptativo**: backlog > 2000 ⇒ 75 itens/rodada; caso contrário 25.
4. **Timeout** de 120s por tier com `AbortController`.
5. **Auth**: exige admin OU header `x-orchestrator: 1` (usado pelo pg_cron com anon key).
6. **Auditoria completa** em `storage_tiering_runs` (status, processed, failed, error, details).

## Próximos passos (Etapa 8)

- Serviço unificado de playback (`resolve-media-url`) capaz de emitir URLs assinadas para os 3 tiers, iniciando restore Glacier sob demanda.
