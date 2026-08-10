# Runbook — VisaoTieringMetricsAbsent

**Severidade:** 🟡 warning • **Fonte:** `absent(visao_tiering_slo_status)` ou todos `status=3 (no_data)` por 30 min

## Sintomas

- Prometheus não recebe métricas do exporter há 30min.
- Grafana `visao-tiering` mostra painéis vazios ou `N/A`.

## Diagnóstico

1. Testar o endpoint manualmente:

```bash
curl -sS -H "Authorization: Bearer $PROMETHEUS_METRICS_BEARER_TOKEN" \
  "$SUPABASE_URL/functions/v1/metrics-prometheus" | head -40
```

2. Verificar rate-limit e logs:

```bash
supabase functions logs metrics-prometheus --tail 200 | grep -i "429\|401\|error"
```

3. Confirmar que o Prometheus está scrapeando (no servidor Prometheus):

```bash
curl -sS http://localhost:9090/api/v1/targets | jq '.data.activeTargets[] | select(.labels.job=="visao-metrics")'
```

## Mitigação

- **Token inválido (401):** rotacionar e redeployar:

```bash
supabase secrets set PROMETHEUS_METRICS_BEARER_TOKEN="$(openssl rand -hex 32)"
supabase functions deploy metrics-prometheus
# atualizar prometheus.yml com o novo bearer_token e recarregar:
curl -X POST http://localhost:9090/-/reload
```

- **Rate-limit muito baixo (429):** aumentar de 30 para 120 req/min na Edge Function e redeployar.
- **Fonte de dados vazia (`get_storage_tiering_slo` retornou 0 linhas):** verificar se orchestrator rodou nas últimas 24h; caso não, seguir runbook `VisaoTieringSloAtRisk`.
- **Edge Function fora do ar:** redeploy:

```bash
supabase functions deploy metrics-prometheus --no-verify-jwt
```

## Escalonamento

- > 1h sem métricas → Sev2, pois cegueira operacional impede detectar outros incidentes.

## Pós-incidente

- Adicionar dead-man's switch (alerta que dispara se `metrics-prometheus` não for scrapeado em 5min).
- Validar cobertura no `scripts/simulate-wave-storage-17-scenarios.mjs`.
