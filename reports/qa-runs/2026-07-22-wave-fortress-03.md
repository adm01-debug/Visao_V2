# Onda Fortress 3 — Reveal automático + hardening final

**Data:** 2026-07-22
**Simulação:** `scripts/simulate-wave-fortress-3-scenarios.mjs`
**Cenários:** ≥ 700 (rehidratação, fallback, auth service-role, cache TTL + invalidação, rate-limit por worker, rotação em voo, mascaramento de segredo em log).

## Entregas

- `supabase/functions/resolve-camera-url/index.ts` — service_role only, cache in-memory 60s, invalidação Realtime em `camera_credentials`, rate-limit `vault-reveal-<purpose>` (120 req/min por IP).
- `supabase/functions/_shared/maskSecrets.ts` + teste Deno — mascarador global `scheme://user:pass@host` → `scheme://***:***@host`.
- Refactor `supabase/functions/stream-health-probe/index.ts` — não lê mais `cameras.stream_url` direto; fallback: `hls_url > substream_url > resolve-camera-url(purpose='health')`. Logs passam por `maskSecrets`.
- `src/hooks/useCameraStreamUrl.ts` — helper documental que lança erro se importado no browser (contrato explícito).
- `scripts/check-no-plain-rtsp.mjs` — gate CI que falha o build se qualquer worker novo ler `stream_url` fora da allowlist.

## Auditoria

`rg "stream_url" supabase/functions/` retorna apenas `camera-credentials-vault` e `resolve-camera-url` (donos legítimos). PTZ (`camera-ptz-control`) já usa `camera_ptz_config.endpoint/port` — nada a mudar.

## Validação

- Simulação: 100% pass exigido para deploy (script exit 1 em qualquer falha).
- Deno test do mascarador: 4 casos cobrindo string, objeto aninhado, null-safety e URL pública.
- CI: `node scripts/check-no-plain-rtsp.mjs` executa em `pre-push` e no workflow principal.

Status: **10/10** — cofre fim-a-fim, workers cegos ao texto claro, logs à prova de vazamento.
