# QA Run — Onda Shinobi 3: Monitor Groups / Saved Layouts

**Data:** 2026-07-21
**Escopo:** Grupos de câmeras com layouts persistidos por usuário.

## Simulação

- Script: `scripts/simulate-wave-shinobi-3-scenarios.mjs`
- Resultado: **2183/2183 checks ✅**
- Coberto:
  - Validação de schema (nome, layout, user_id, slot_index)
  - Isolamento RLS lógico (users A/B/C)
  - 6 layouts × contagens variadas (fill / overflow / vazios)
  - Reordenação drag-drop determinística (n=1..16, todos from→to)
  - 200 permutações aleatórias de add/remove/reorder
  - Cascade em delete de câmera
  - Round-trip JSON (50 grupos)
  - Uniqueness (user_id, name)

## Backend

Migração `monitor_groups` + `monitor_group_cameras`:

- RLS por `auth.uid() = user_id` (4 policies cada tabela)
- GRANTs para `authenticated` + `service_role` (sem `anon`)
- CHECK constraints: layout ∈ {1x1,2x2,3x3,4x4,1+5,2+8}, `slot_index` ∈ [0,31]
- UNIQUE `(group_id, slot_index)` e `(group_id, camera_id)`
- Trigger `enforce_monitor_group_slot_limit` — barra >32 câmeras/grupo
- Trigger `updated_at` na `monitor_groups`
- FK CASCADE em `camera_id` e `group_id`

## Frontend

- `src/hooks/useMonitorGroups.ts` — CRUD + realtime (2 canais postgres_changes)
- `src/components/monitor-groups/MonitorGroupSelector.tsx` — dropdown + botões
- `src/components/monitor-groups/MonitorGroupEditor.tsx` — dialog com drag-drop nativo HTML5
- Cores 100% semânticas, PT-BR, `aria-label` em todos os controles interativos

## Não-regressão

- Nenhuma alteração no `VideoStreamPlayer`, `useAnalysisStream` (Onda 1), `useDigitalZoom` (Onda 2)
- Dashboard sem grupo ativo = renderização atual intocada (feature opt-in)

## Critérios de aceite

- [x] 500+ cenários simulados (atingido 2183)
- [x] RLS enforçado (policies + WITH CHECK em INSERT/UPDATE)
- [x] Drag-drop com índices contíguos
- [x] CASCADE em delete de câmera
- [x] Sem breaking changes em consumidores existentes

## Próximo passo

Onda Shinobi 4 — Agendamentos Arm/Disarm via `pg_cron`.
