# QA Run — Onda Shinobi 4: Agendamentos Arm/Disarm via `pg_cron`

**Data:** 2026-07-21
**Escopo:** Programar horários recorrentes para armar/desarmar câmeras.

## Simulação

- Script: `scripts/simulate-wave-shinobi-4-scenarios.mjs`
- Resultado: **792/792 checks ✅**
- Coberto:
  - Parsing/validação de CRON (10 válidos, 9 inválidos)
  - Match minuto-a-minuto e `findNext` (janela até 400 dias)
  - Escopos camera/group/all com CHECK constraints correspondentes
  - Resolução de conflitos arm↔disarm (regra determinística: `disarm` vence)
  - Isolamento RLS lógico (users A/B/C)
  - Bitmask de dias da semana (128 combinações válidas + rejeita 0)
  - 300 permutações aleatórias de agendas

## Backend

Migração aplicada:

- `public.camera_schedules` — CHECK de escopo, regex de shape do CRON, unique-safe.
- `public.camera_schedule_runs` — histórico append-only (INSERTs apenas via SECURITY DEFINER).
- `public.cron_matches(expr, ts, tz)` — parser PL/pgSQL de 5 campos com AT TIME ZONE.
- `public.resolve_schedule_cameras(user_id, scope, camera_id, group_id)` — expande escopo em lista de câmeras do usuário.
- `public.execute_camera_schedules()` — SECURITY DEFINER, `EXECUTE` revogado de public/anon/authenticated.
- `UNIQUE (camera_id)` em `arm_disarm_states` para suportar `ON CONFLICT`.
- `pg_cron` job `camera-schedules-tick` — a cada minuto.

RLS:

- `camera_schedules`: 4 policies via `auth.uid() = user_id`.
- `camera_schedule_runs`: SELECT-only para o dono; INSERT feito pela função definer.

## Frontend

- `src/hooks/useCameraSchedules.ts` — CRUD + realtime + helpers `buildDailyCron`, `daysToCronField`, `validateScheduleInput`.
- `src/components/schedules/ScheduleForm.tsx` — dialog com escopo (radio), câmera/grupo, ação, hora, minuto, dias (toggle), toggle ativo e preview do CRON gerado.
- `src/pages/SchedulesPage.tsx` — nova rota `/schedules` com tabela (nome, alvo, ação, CRON, última execução + status, toggle enabled, editar/remover).
- Cores 100% semânticas, PT-BR, `aria-label` em controles interativos.

## Não-regressão

- `VideoStreamPlayer`, `useAnalysisStream`, `useDigitalZoom`, `MonitorGroups` intactos.
- `arm_disarm_states` permanece a fonte de verdade; schedule apenas usa `INSERT ... ON CONFLICT UPDATE`.
- Job `pg_cron` no-op quando não há schedules `enabled=true` casando o minuto.

## Critérios de aceite

- [x] 600+ cenários simulados (atingido 792)
- [x] RLS por `auth.uid()`
- [x] CHECK de escopo + regex de CRON no DB
- [x] Histórico auditável em `camera_schedule_runs`
- [x] `EXECUTE` revogado no runner definer
- [x] Rota `/schedules` registrada no App

## Próximo passo

Onda Shinobi 5 — Timelapse Diário Automático (snapshots agendados agrupados em vídeo por câmera/dia).
