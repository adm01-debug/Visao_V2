# Runbook — VisaoTieringSloViolated

**Severidade:** 🔴 critical • **Fonte:** `visao_tiering_slo_status == 2` por 10 min • **Serviço:** `visao-tiering`

## Sintomas

- Alerta disparado no PagerDuty com label `operation=<hot_to_warm|warm_to_cold|glacier_restore>`.
- Painel Grafana `visao-tiering` mostra status **Violated** (vermelho) na operação afetada.
- Card `StorageTieringSloCard` em `/operations` exibe p95/p99 acima do orçamento.

## Diagnóstico

1. Identificar a operação afetada e latência atual:

```sql
select operation, p50_seconds, p95_seconds, p99_seconds, success_ratio, slo_status, window_start
from public.get_storage_tiering_slo()
order by slo_status desc, p95_seconds desc;
```

2. Ver as últimas execuções e taxa de falha:

```sql
select id, operation, status, duration_ms, error_message, started_at
from public.storage_tiering_runs
where started_at > now() - interval '30 minutes'
order by started_at desc
limit 50;
```

3. Checar logs da Edge Function orquestradora:

```bash
supabase functions logs promote-hot-to-warm --tail 200
supabase functions logs archive-warm-to-cold --tail 200
```

## Mitigação

- **Backlog alto no worker:** aumentar `BATCH_SIZE` e concorrência da função afetada (variável de ambiente da Edge Function).
- **Erros 5xx no R2/Glacier:** ativar circuit breaker manualmente pausando o cron:

```sql
select cron.unschedule('storage-tiering-orchestrator');
-- após mitigar upstream:
select cron.schedule('storage-tiering-orchestrator', '*/5 * * * *',
  $$select net.http_post('https://<PROJECT_REF>.functions.supabase.co/storage-tiering-orchestrator', '{}'::jsonb)$$);
```

- **Fila travada por advisory lock órfão:** liberar locks pendentes:

```sql
select pg_advisory_unlock_all();
select classid, objid, pid, granted from pg_locks where locktype = 'advisory';
```

## Escalonamento

- Se p95 não retornar ao SLO em **30 min** após mitigação → acionar Tech Lead de Plataforma.
- Se houver perda de dados suspeita → abrir incidente **Sev1** e notificar DPO (LGPD).

## Pós-incidente

- Registrar RCA em `reports/incidents/YYYY-MM-DD-<slug>.md`.
- Adicionar cenário ao `scripts/simulate-wave-storage-*.mjs` se for regressão nova.
- Revisar thresholds do alerta se falso-positivo recorrente.
