# Runbook — VisaoTieringSuccessRatioLow

**Severidade:** 🟡 warning • **Fonte:** `visao_tiering_success_ratio < 0.9` por 20 min

## Sintomas

- Taxa de sucesso <90% em ao menos uma operação de tiering.
- Card `StorageTieringSloCard` exibe operação em vermelho na coluna Success.

## Diagnóstico

1. Agrupar falhas recentes por mensagem de erro:

```sql
select operation, error_message, count(*) as ocorrencias
from public.storage_tiering_runs
where started_at > now() - interval '1 hour' and status = 'failed'
group by 1, 2
order by ocorrencias desc
limit 20;
```

2. Ver distribuição por tier de origem/destino:

```sql
select operation, status, count(*)
from public.storage_tiering_runs
where started_at > now() - interval '1 hour'
group by 1, 2;
```

3. Logs das funções envolvidas:

```bash
supabase functions logs promote-hot-to-warm --tail 300 | grep -i "error\|denied\|timeout"
supabase functions logs archive-warm-to-cold --tail 300 | grep -i "error\|denied\|timeout"
```

## Mitigação

- **Credenciais expiradas (R2/AWS):** rotacionar segredos e redeployar funções:

```bash
supabase secrets set CLOUDFLARE_R2_ACCESS_KEY_ID=... CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
supabase functions deploy promote-hot-to-warm
```

- **Objetos ausentes na origem:** marcar como órfãos e pular:

```sql
update public.media_assets
set tier = 'missing', updated_at = now()
where id in (select media_asset_id from public.storage_tiering_runs
             where error_message ilike '%NoSuchKey%' and started_at > now() - interval '1 hour');
```

- **Erros transientes:** requeue automático via re-execução do orchestrator (já implementado com backoff).

## Escalonamento

- Ratio <70% → escalar para Sev2 e envolver time de Storage.
- Falha sistêmica no provider (R2/AWS) → comunicar stakeholders e ativar página de status.

## Pós-incidente

- Publicar resumo em `reports/qa-runs/`.
- Adicionar cenário sintético cobrindo o modo de falha ao script da onda vigente.
