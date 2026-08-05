# Wave 17 — Telemetria de cache: schema + índice

## Gap detectado

A pipeline InsightFace tentava gravar `query_type` e `metadata` em `query_telemetry`, mas as colunas não existiam. Adicionalmente `user_id NOT NULL` bloqueava telemetria de sistema (edge functions sem contexto de usuário). Resultado: dashboard operacional exibia `cache_stats` sempre vazio.

## Correções

1. `ALTER TABLE query_telemetry ADD COLUMN query_type text, metadata jsonb`.
2. `ALTER COLUMN user_id DROP NOT NULL` — permite eventos de sistema.
3. Nova policy INSERT força `auth.uid() = user_id` para usuários finais (system events só via service_role).
4. Índice parcial `idx_query_telemetry_edge_cache_recent (created_at DESC, query_type) WHERE table_name='edge_cache' AND metadata IS NOT NULL` — cobre exatamente o predicado do `get_operational_metrics()`.

## Simulação

- 127 cenários (5 volumes × 5 namespaces × 5 hit rates + idempotência + escrita concorrente), 0 unsafe.

## Gates

- Backward-compat: colunas nullable, sem breaking changes.
- Segurança RLS: policy INSERT preservada para usuários; sistema usa service_role.
- Warnings do linter: falsos positivos conhecidos (SECURITY DEFINER de admin com `has_role` gate).
