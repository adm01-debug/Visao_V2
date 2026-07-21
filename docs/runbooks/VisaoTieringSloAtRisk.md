# Runbook — VisaoTieringSloAtRisk

**Severidade:** 🟡 warning • **Fonte:** `visao_tiering_slo_status == 1` por 15 min • **Serviço:** `visao-tiering`

## Sintomas

- Aviso no canal Telegram Ops com `operation=<...>`.
- Grafana mostra status **At Risk** (amarelo); ainda dentro do SLO mas tendência de queda.

## Diagnóstico

1. Comparar latência atual vs janela anterior:

```sql
select operation, p95_seconds, success_ratio, slo_status
from public.get_storage_tiering_slo();
```

2. Verificar volume de itens elegíveis para promoção/arquivamento:

```sql
select tier, count(*) filter (where eligible_for_promotion_at < now()) as backlog
from public.media_assets
group by tier;
```

3. Conferir uso de recursos das Edge Functions no painel do backend.

## Mitigação

- Reduzir intervalo do cron do orchestrator temporariamente:

```sql
select cron.alter_job(
  (select jobid from cron.job where jobname = 'storage-tiering-orchestrator'),
  schedule => '*/2 * * * *'
);
```

- Aquecer cache de credenciais SigV4 (chamar warmup):

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/promote-hot-to-warm" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{"warmup":true}'
```

## Escalonamento

- Se degradar para `Violated` em qualquer momento → seguir runbook `VisaoTieringSloViolated`.
- Persistindo >2h em risco → abrir ticket de capacity planning.

## Pós-incidente

- Anotar tendência em `reports/qa-runs/` do dia.
- Se relacionado a pico sazonal → registrar em memória de capacity.
