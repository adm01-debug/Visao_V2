# Onda 106 — Simulação: RLS em partições

**Executado:** 2026-07-26T15:54:30.959Z
**Cenários:** 1152
**Seguros:** 1072
**Inseguros:** 80

## Por estado de blindagem

| Estado                       | Total | Seguros | Inseguros |
| ---------------------------- | ----: | ------: | --------: |
| rls_on_policy_on_grant_on    |   192 |     192 |         0 |
| rls_on_policy_off_grant_on   |   192 |     192 |         0 |
| rls_off_policy_off_grant_on  |   192 |     152 |        40 |
| rls_off_policy_on_grant_on   |   192 |     152 |        40 |
| rls_on_policy_on_grant_off   |   192 |     192 |         0 |
| rls_off_policy_off_grant_off |   192 |     192 |         0 |

## Gaps previstos

- ensure_future_partitions() aplica GRANT mas não ENABLE ROW LEVEL SECURITY → partição nova nasce legível entre tenants em acesso direto.
- RLS do pai só é aplicada quando a query passa pela tabela particionada; SELECT direto na partição usa a RLS da própria partição.
- RLS ligada sem policy vira deny-all: a migração precisa criar a policy no mesmo passo, senão a app quebra em produção.
- CREATE POLICY não é idempotente (falha com 42710) — proteger com checagem em pg_policies antes de criar.
- Partições criadas manualmente (hotfix/DBA) escapam da função → o gate de CI precisa varrer relispartition, não confiar na função.
- service_role permanece com bypass de RLS por design (cron/workers); o gate não deve sinalizar isso como falha.
- anon não deve receber GRANT em nenhuma partição — reconferir após cada ALTER na tabela pai.

## Conclusão

Todos os cenários inseguros pertencem a estados com `rls_off` — exatamente o que a
migração da Onda 106 elimina ao ligar RLS + policy dentro de `ensure_future_partitions`
e ao adicionar o gate de partições em `check-rls-exposure.mjs`.
