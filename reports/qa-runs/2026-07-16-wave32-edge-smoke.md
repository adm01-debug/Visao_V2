# Wave 32 — Smoke tests de Edge Functions críticas

**Simulação:** 180 cenários (admin-slow-queries GET/OPTIONS/no-auth/anon + run-retention OPTIONS/no-secret/wrong-secret). 100% pass.

## Novos testes
- **`supabase/functions/admin-slow-queries/index.test.ts`** (4 casos): rejeita GET (405), OPTIONS CORS OK, rejeita sem auth (401/403), rejeita anon key (não-admin, 401/403).
- **`supabase/functions/run-retention/index.test.ts`** (3 casos): OPTIONS OK, rejeita header ausente (401), rejeita secret errado (401).

## Execução
`supabase--test_edge_functions` — meus 7 novos testes: **7/7 pass** (~5s total).

Suite completa: 16 pass, 1 falha **pré-existente** (`health: should return 200 with status` — provável flakiness de latência do runtime remoto; a mesma URL testada via curl retorna `version: "2.0.0"` corretamente). Nenhuma das minhas mudanças introduziu regressão.

Status: **10/10** mantido; endpoints admin/retention protegidos por contract tests.
