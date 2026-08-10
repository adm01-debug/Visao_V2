# QA Wave 7 — Hardening pós-scan adversarial

**Data:** 2026-07-15

## Contexto

O `security--run_security_scan` retornou 2 findings WARN (não críticos) após a Onda 6:

1. `panic_events` — apenas o criador via/atualiza — bloqueia responders/admins em emergências
2. `camera_detection_rules` — inconsistência entre modelo por-usuário (cameras) e por-organização (rules) permite referenciar câmera fora da org

## Correções

### Migration 1 — panic_events emergency access

- Nova policy SELECT: admins e managers veem todos os eventos de pânico
- Nova policy UPDATE: admins e managers podem resolver qualquer evento
- Usuários comuns mantêm escopo por `user_id`

### Migration 2 — camera_detection_rules cross-model validation

- Nova função `validate_cdr_camera_org_consistency()` SECURITY DEFINER + `search_path = public`
- Trigger BEFORE INSERT/UPDATE valida que `camera_id` pertence a um `user_id` membro de `organization_id`
- Erros `23503` (câmera inexistente) e `42501` (câmera fora da org)

### Migration 3 — Least privilege na função

- `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`
- `GRANT EXECUTE TO service_role`
- Fecha WARN 0028/0029 do supabase linter (função só é invocada por trigger)

## Resultado do re-scan

- `security--run_security_scan`: **0 findings críticos, 0 warns actionable** ✅
- `supabase--linter`: **0 issues** ✅

## Impacto

Cobertura RLS agora contempla:

- Emergências multi-usuário (pânico)
- Consistência cross-schema entre modelos ownership (user_id) e org (organization_id)

Sistema **10/10 mantido** com defesa adicional. Zero regressão no frontend (mudanças puramente no banco).
