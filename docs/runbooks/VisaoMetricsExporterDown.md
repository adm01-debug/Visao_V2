# Runbook — VisaoMetricsExporterDown / Absent / HeartbeatStale

**Severidade:** 🔴 critical (Down/Absent) • 🟡 warning (HeartbeatStale) • **Serviço:** `visao-observability`

Dead-man's switch para o exporter `metrics-prometheus`. Enquanto os alertas de tiering dependem da própria métrica exportada, este runbook trata a **cegueira operacional**: o exporter em si parou.

## Sintomas

- PagerDuty: `VisaoMetricsExporterDown` (scrape `up == 0` por 2min) ou `VisaoMetricsExporterAbsent` (target sumiu por 5min).
- Chat Ops: `VisaoMetricsExporterHeartbeatStale` — endpoint responde, mas `visao_exporter_heartbeat_timestamp_seconds` está atrasado >3min.
- Grafana `visao-tiering` com painéis "No data" e nenhum outro alerta de tiering ativo (silêncio suspeito).

## Diagnóstico

1. Testar o endpoint diretamente:

```bash
curl -sS -o /tmp/metrics.txt -w "%{http_code}\n" \
  -H "Authorization: Bearer $PROMETHEUS_METRICS_BEARER_TOKEN" \
  "$SUPABASE_URL/functions/v1/metrics-prometheus"
grep -E "^visao_exporter_heartbeat_timestamp_seconds" /tmp/metrics.txt
```

2. Verificar target no Prometheus:

```bash
curl -sS http://localhost:9090/api/v1/targets \
  | jq '.data.activeTargets[] | select(.labels.job=="visao-metrics") | {health,lastError,lastScrape}'
```

3. Logs recentes da Edge Function:

```bash
supabase functions logs metrics-prometheus --tail 200 | grep -iE "401|429|error|timeout"
```

## Mitigação

- **HTTP 401:** token divergente. Rotacionar e recarregar Prometheus:

```bash
supabase secrets set PROMETHEUS_METRICS_BEARER_TOKEN="$(openssl rand -hex 32)"
supabase functions deploy metrics-prometheus
# atualizar prometheus.yml com o novo bearer_token e recarregar:
curl -X POST http://localhost:9090/-/reload
```

- **HTTP 429:** rate-limit atingido. Aumentar `maxRequests` de 30 → 120 na função e redeployar.
- **HTTP 5xx / timeout:** redeploy da função:

```bash
supabase functions deploy metrics-prometheus
```

- **Target ausente:** validar `prometheus.yml` (job `visao-metrics`, `scheme: https`, `bearer_token`) e recarregar via `-/reload`.
- **HeartbeatStale mas endpoint OK:** o exporter responde com fontes indisponíveis. Cruzar com `VisaoTieringMetricsAbsent` e seguir runbook correspondente.

## Escalonamento

- Down/Absent >15min → Sev1 (cegueira operacional afeta todos os SLOs).
- HeartbeatStale >30min → escalar para Tech Lead de Plataforma.

## Pós-incidente

- Adicionar smoke test do exporter em `scripts/simulate-wave-storage-20-scenarios.mjs`.
- Revisar frequência de scrape (default 30s) e `for` do alerta.
- Registrar RCA em `reports/incidents/`.
