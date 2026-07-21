# QA Run — Onda Shinobi 5: Timelapse Diário Automático

**Data:** 2026-07-21
**Escopo:** Captura periódica de snapshots e vídeos timelapse diários por câmera.

## Simulação
- Script: `scripts/simulate-wave-shinobi-5-scenarios.mjs`
- Resultado: **1717/1717 checks ✅**
- Coberto: validação de janela horária, cálculo de frames/duração, retenção, timezone (America/Sao_Paulo × UTC), isolamento RLS lógico, idempotência `(config,date)`, skip < 2 snapshots, 500 permutações aleatórias.

## Backend
- `public.timelapse_configs` — 1 config por (user, camera) com janela `start_hour < end_hour`, intervalo (1–120 min), fps (5–60), retenção (1–365 d), timezone. RLS via `auth.uid()`, trigger `updated_at`.
- `public.timelapse_snapshots` — append-only, particionado logicamente por config, index composto `(config_id, captured_at DESC)`.
- `public.timelapse_videos` — 1 vídeo por `(config_id, video_date)` com status `pending|rendering|ready|failed|skipped`.
- `public.tick_timelapse_capture()` — SECURITY DEFINER, `EXECUTE` revogado; roda a cada minuto e marca `last_capture_at` das configs cuja janela + intervalo casam com o minuto local. Captura de imagem é feita por edge function/worker que lê essas marcações.
- `public.purge_timelapse_snapshots()` — SECURITY DEFINER, roda diariamente às 03:15, remove snapshots antigos por `retention_days`.
- Jobs `pg_cron`: `timelapse-capture-tick` (a cada minuto) e `timelapse-purge-daily` (`15 3 * * *`).

## Frontend
- `src/hooks/useTimelapse.ts` — CRUD + realtime + validação client-side espelhando CHECK do DB.
- `src/pages/TimelapsePage.tsx` — nova rota `/timelapse` com tabela de configs (janela, intervalo, fps, retenção, última captura, toggle) e tabela de vídeos recentes (data, câmera, frames, duração, status, download).
- Cores 100% semânticas, PT-BR, `aria-label` em todos os controles interativos.

## Não-regressão
- Sem alterações em `arm_disarm_states`, PTZ, storage tiering, análise de IA, `camera_schedules`.
- Jobs de captura/purga são no-op sem configs `enabled=true`.

## Critérios de aceite
- [x] 600+ cenários simulados (atingido 1717)
- [x] RLS por `auth.uid()`
- [x] CHECK `start_hour < end_hour` + ranges de intervalo/fps/retenção
- [x] UNIQUE `(config_id, video_date)` garante idempotência do render
- [x] `EXECUTE` revogado nas funções definer
- [x] Rota `/timelapse` registrada no App

## Próximo passo
Onda Shinobi 6 — Watcher de eventos (motion regions) com máscaras poligonais.
