# Runbook — VisaoGlacierStuckAlertsSpike

**Severidade:** 🟡 warning • **Fonte:** `visao_glacier_stuck_alerts_24h > 5` por 10 min

## Sintomas

- Volume anômalo de alertas Glacier stuck (>5 em 24h).
- Canal Telegram Ops recebendo notificações repetidas.

## Diagnóstico

1. Ver histórico de alertas emitidos:

```sql
select id, media_asset_id, first_seen_at, last_seen_at, delivered_at, delivery_status
from public.glacier_stuck_alerts
where first_seen_at > now() - interval '24 hours'
order by first_seen_at desc;
```

2. Cruzar com falhas do orchestrator:

```sql
select operation, count(*), max(started_at)
from public.storage_tiering_runs
where operation = 'glacier_restore' and status = 'failed'
  and started_at > now() - interval '24 hours'
group by 1;
```

3. Checar logs do monitor:

```bash
supabase functions logs glacier-stuck-monitor --tail 200
```

## Mitigação

- **Dedup falhando:** verificar janela de 6h e limpar alertas duplicados:

```sql
delete from public.glacier_stuck_alerts a
using public.glacier_stuck_alerts b
where a.media_asset_id = b.media_asset_id
  and a.first_seen_at > b.first_seen_at
  and a.first_seen_at - b.first_seen_at < interval '6 hours';
```

- **Causa raiz upstream:** seguir runbook `VisaoGlacierRestoreStuck` para resolver as restaurações originais — o spike deve cessar naturalmente.

## Escalonamento

- Se >20 alertas em 24h → acionar time de Storage para triagem em lote.

## Pós-incidente

- Ajustar threshold do alerta se ruído esperado (ex.: janela de migração planejada).
- Documentar padrão sazonal identificado.
