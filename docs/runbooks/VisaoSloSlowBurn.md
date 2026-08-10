# Runbook — VisaoSlo*SlowBurn / BudgetLow (Ticket-level)

**Severidade:** 🟡 warning
**SLOs cobertos:** `metrics_availability`, `app_availability`, `tiering_success`, `probe_latency`

## Contexto

Slow-burn (3x em 1d+1h) sinaliza degradação sustentada mas não urgente. Não é
página — é ticket. Ignorar leva ao `VisaoSloBudgetExhausted` (freeze de deploys).

## Sintomas

- Grafana `visao-slo`: painel _Error Budget restante 30d_ caindo consistentemente.
- Alerta `VisaoSloBudgetLow` (>=80% consumido) ou `VisaoSloTieringSlowBurn`.

## Diagnóstico (copy-paste)

```promql
# Tendência do budget nas últimas 24h
slo:error_budget_burned:metrics_30d
slo:error_budget_burned:app_30d
slo:error_budget_burned:tiering_7d

# Latência sustentada?
slo:probe_duration_gauge:1h

# Qual instance domina o erro? (top offenders)
topk(5, 1 - avg_over_time(probe_success[1d]))
```

```sql
-- Se tiering: quais operações falham mais?
SELECT operation, success_ratio, p95_seconds, status
FROM public.get_storage_tiering_slo(_window_hours := 168)
ORDER BY success_ratio ASC;
```

## Mitigação

1. Abrir ticket no board de reliability com owner e prazo (≤ 3 dias úteis).
2. Se latência: investigar dependências externas (R2, Glacier, Supabase edge).
3. Se tiering: rodar `SELECT public.run_index_maintenance();` (Onda 26) e
   `VACUUM ANALYZE public.media_assets;`.
4. Considerar aumentar `pg_stat_statements` amostragem (`SELECT * FROM public.get_slow_queries(10);`).

## Escalonamento

- Não resolvido em 3d → escalar para tech lead.
- Se `VisaoSloBudgetExhausted` dispara → freeze imediato, seguir `VisaoSloFastBurn.md`.

## Pós-incidente

- Atualizar dashboard com root cause label.
- Se estrutural: propor onda dedicada (schema, particionamento, cache).
