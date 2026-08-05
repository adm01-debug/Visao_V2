# Runbook — VisaoSlo*FastBurn / MediumBurn (Multi-Burn-Rate)

**Severidade:** 🔴 critical
**SLOs cobertos:** `metrics_availability` (99.9%), `app_availability` (99.5%), `tiering_success` (99%)
**Origem:** `observability/prometheus/visao-slo.rules.yml`

## Contexto

Alertas multi-burn-rate (Google SRE Workbook cap. 5). Um alerta _fast_ só dispara
quando burn rate **longo** (1h/6h) E **curto** (5m/30m) excedem o threshold —
isso reduz drasticamente falsos-positivos comparado a alertas single-window.

| Burn rate | Janelas  | Tempo p/ consumir budget 30d | Severidade |
| --------- | -------- | ---------------------------- | ---------- |
| 14.4x     | 1h + 5m  | ~2h                          | page       |
| 6x        | 6h + 30m | ~5h                          | page       |
| 3x        | 1d + 1h  | ~10d                         | ticket     |

## Sintomas

- PagerDuty: `VisaoSloMetricsFastBurn` / `VisaoSloAppFastBurn` / `VisaoSloTieringFastBurn`.
- Grafana `visao-slo`: painel _Burn rate atual_ > threshold; _Time-to-exhaustion_ < janela do SLO.

## Diagnóstico (copy-paste)

```promql
# 1. Qual instance está queimando?
1 - slo:probe_success_ratio:metrics_5m
1 - slo:probe_success_ratio:app_5m

# 2. É latência ou disponibilidade?
slo:probe_duration_gauge:5m
probe_http_status_code{job=~"visao-blackbox-https.*"}

# 3. É regional ou global? (correlaciona com Onda 23)
count by (region) (probe_success == 0)
```

```bash
# 4. TLS/cert saudável?
openssl s_client -connect fsisdfdwlbfeadwfqpir.supabase.co:443 -servername fsisdfdwlbfeadwfqpir.supabase.co </dev/null 2>/dev/null | openssl x509 -noout -dates

# 5. Edge Function respondendo?
curl -sS -o /dev/null -w '%{http_code} %{time_total}\n' \
  -H "Authorization: Bearer $PROMETHEUS_METRICS_BEARER_TOKEN" \
  https://fsisdfdwlbfeadwfqpir.supabase.co/functions/v1/metrics-prometheus
```

## Mitigação

1. **Se global outage** (todas as regiões DOWN):
   - Rollback do último deploy: `git revert HEAD && git push`.
   - Restart Edge Function: `supabase functions deploy metrics-prometheus`.
2. **Se regional apenas**:
   - Escalar para NOC do PoP afetado; seguir `VisaoBlackboxRegionalDivergence.md`.
3. **Se tiering**:
   - Pausar `orchestrate-tiering` cron: `SELECT cron.unschedule('orchestrate-tiering');`.
   - Investigar `glacier_stuck_alerts` / `get_storage_tiering_slo`.
4. **Silenciar** alertas ruidosos por 1h enquanto mitiga:
   `amtool silence add alertname=VisaoSloMetricsFastBurn --duration=1h --comment="mitigating <ticket>"`

## Escalonamento

- **Fast burn não mitigado em 30min** → escalar para engineering manager.
- **Budget 100% consumido** (`VisaoSloBudgetExhausted`) → **freeze de deploys** até recovery + postmortem.

## Pós-incidente

- Criar postmortem (template em `docs/postmortems/`).
- Registrar consumo no controle de error budget mensal.
- Se recorrente (>3 fast burns em 30d): revisar SLO target ou reforçar resiliência (retries, cache, circuit-breaker Onda 23).
