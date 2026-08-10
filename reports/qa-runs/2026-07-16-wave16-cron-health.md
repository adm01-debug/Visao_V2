# Wave 16 — Cron health + partition metrics

## Resumo

- `get_operational_metrics()` estendida com `partition_runs` (últimas 6 execuções do job mensal) e `cron_health` (agregado por job VISÃO: schedule, active, falhas em 7 dias, último status).
- `OperationsPage` ganhou 2 cards novos: Saúde dos jobs (badge destrutivo para falhas > 0) e Partições mensais.

## Simulação

- 94 cenários (2 jobs × 4 status × 11 contagens + extensão ausente + RBAC + job nunca executado), 0 unsafe.

## Gates

- Backward-compatible: novos campos aditivos, campos antigos preservados.
- Falha graciosa: cada bloco cron está em `EXCEPTION WHEN OTHERS` retornando `[]`.
- Segurança: gate `has_role(auth.uid(), 'admin')` mantido; warnings do linter são falsos positivos conhecidos.
