# Runbook — VisaoGlacierRestoreStuck

**Severidade:** 🔴 critical • **Fonte:** `visao_glacier_restore_stuck_total > 0` por 5 min

## Sintomas

- Alerta com contagem de restaurações Glacier pendentes há **>12h**.
- Card `GlacierRestoreMonitorCard` em `/operations` destaca linhas em vermelho.
- Usuários reportam vídeos frios indisponíveis para playback.

## Diagnóstico

1. Listar restaurações travadas:

```sql
select id, media_asset_id, requested_at, status, provider_job_id, retries
from public.get_glacier_restore_status(50)
where requested_at < now() - interval '12 hours' and status <> 'completed'
order by requested_at asc;
```

2. Confirmar status real no AWS S3:

```bash
aws s3api head-object --bucket "$COLD_BUCKET" --key "<object-key>" \
  --query '{Restore:Restore,StorageClass:StorageClass}'
```

3. Verificar quota da conta AWS (Glacier tem limites de expedited retrievals).

## Mitigação

- **Job existe na AWS mas nosso registro está stuck:** re-sincronizar status manualmente:

```sql
update public.glacier_restores
set status = 'completed', completed_at = now()
where id = '<uuid>';
```

- **Job nunca foi aceito:** re-submeter a restauração:

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/resolve-media-url" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"media_asset_id":"<uuid>","force_restore":true,"tier":"expedited"}'
```

- **Bucket lifecycle bloqueando restore:** revisar policy de lifecycle no bucket cold.

## Escalonamento

- >10 travadas por >2h → Sev1 + comunicar clientes afetados.
- Suspeita de perda em Glacier Deep Archive → abrir ticket AWS Enterprise Support imediatamente.

## Pós-incidente

- Se recorrente, ajustar SLA de restauração exposto ao cliente e considerar tier `Standard` em vez de `Bulk`.
- Registrar em `reports/incidents/`.
