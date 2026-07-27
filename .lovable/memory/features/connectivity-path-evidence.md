---
name: Connectivity Path Evidence
description: Onda 153 — evidência por caminho agregada no banco (RLS do chamador) e taxonomia única de culpa de código de erro
type: feature
---

# Onda 153 — Evidência por caminho de conectividade

- `src/lib/devices/connectivityFailureKind.ts` é a **regra única** de tradução
  `error_code` → classe de culpa (`transport|auth|config|device|none`).
  Código desconhecido é **neutro (`config`)**, nunca `transport`: na dúvida não
  se exila rota. Espelho SQL: `public.connectivity_failure_kind(text)`.
- `public.connectivity_path_evidence(camera_id, window_minutes, now)` é
  `SECURITY INVOKER` e `STABLE`: a RLS de `connectivity_resolution_telemetry`
  decide o que o chamador vê. Nunca trocar por `SECURITY DEFINER`.
- Regras da agregação: linhas com `succeeded IS NULL` e `chosen_path='cancelled'`
  **não são evidência**; sucesso zera o contador de quarentena; falha neutra
  preserva; só `transport` incrementa.
- `chosen_path` aceita `direct`, `relay`, `vpn`, `port_forward`, `cancelled`.
- UI: `CameraPathPlanCard` + `useCameraPathEvidence` calculam o plano com a
  mesma `planFailover` da Onda 152 — UI e motor nunca discordam.
- Gate: `npm run db:check:path-evidence` (espelho triplo TS↔simulador↔SQL,
  4.005 cenários e exercício em transação revertida
  `tests/rls/connectivity-path-evidence.sql`).
