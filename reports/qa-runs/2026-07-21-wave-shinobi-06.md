# QA Run — Onda Shinobi 6: Máscaras de Movimento (motion regions)

**Data:** 2026-07-21
**Escopo:** Regiões poligonais include/exclude por câmera para filtrar detecção de movimento.

## Simulação
- Script: `scripts/simulate-wave-shinobi-6-scenarios.mjs`
- Resultado: **1519/1519 checks ✅**
- Coberto: ray-casting (quadrado, triângulo, hexágono), validação de polígono (min 3 pontos, NaN), clamp de sensibilidade, precedência exclude > include, isolamento por user_id, 500 permutações aleatórias, edge points/vértices.

## Backend
- `public.motion_masks` — polígono JSONB normalizado 0..1, CHECK `jsonb_array_length >= 3`, modo `include|exclude`, sensibilidade 0..100, RLS por `auth.uid()`.
- `public.point_in_polygon(polygon, x, y)` — IMMUTABLE, ray-casting em PL/pgSQL.
- `public.point_triggers_motion(camera_id, x, y)` — STABLE + SECURITY DEFINER, aplica regra `exclude vence include`; `EXECUTE` revogado de anon.
- Índice parcial `idx_motion_masks_camera WHERE enabled = true` para lookups de detecção.

## Frontend
- `src/hooks/useMotionMasks.ts` — CRUD + realtime + `pointInPolygon` client-side idêntico ao DB.
- `src/components/motion/MotionMaskEditor.tsx` — SVG editor com coords 0..1, undo/limpar, preview opcional, semântica de cores `include=primary`, `exclude=destructive`.
- `src/pages/MotionMasksPage.tsx` — rota `/motion-masks` com seleção de câmera, editor e lista de máscaras.

## Critérios de aceite
- [x] 600+ cenários simulados (1519)
- [x] RLS por `auth.uid()`
- [x] CHECK constraint no polígono
- [x] Precedência exclude > include (implementada no DB e no client)
- [x] Coordenadas normalizadas (0..1) → independentes da resolução
- [x] Rota `/motion-masks` registrada

## Próximo passo
Onda Shinobi 7 — Auto-restart de streams RTSP degradados (health check + reconexão).
