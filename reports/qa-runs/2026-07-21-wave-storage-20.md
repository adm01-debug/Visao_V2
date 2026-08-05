# Onda Storage 20 — Dead-man's switch do exporter Prometheus

**Status:** ✅ 10/10 — 18/18 checks estruturais + 200/200 cenários de threshold sem misfire.

## Entregas

- `observability/prometheus/visao-tiering.rules.yml` — novo grupo `visao-exporter-deadman` com 3 alertas:
  - 🔴 `VisaoMetricsExporterDown` (`up{job="visao-metrics"} == 0` for 2m)
  - 🔴 `VisaoMetricsExporterAbsent` (`absent(up{job="visao-metrics"})` for 5m)
  - 🟡 `VisaoMetricsExporterHeartbeatStale` (`time() - visao_exporter_heartbeat_timestamp_seconds > 180` for 3m)
- `supabase/functions/metrics-prometheus/index.ts` — emite sempre `visao_exporter_heartbeat_timestamp_seconds` e `visao_exporter_build_info{version,wave}` no final do render, independentemente das fontes RPC.
- `docs/runbooks/VisaoMetricsExporterDown.md` — runbook completo (Sintomas → Diagnóstico → Mitigação → Escalonamento → Pós-incidente) com comandos `curl`, `supabase functions logs/deploy/secrets` e reload do Prometheus.
- `docs/runbooks/README.md` — índice atualizado.
- `scripts/simulate-wave-storage-20-scenarios.mjs` — valida presença dos alertas, expressões, severidade, emissão do heartbeat no exporter, forma do runbook e 200 cenários sintéticos de threshold.

## Motivação

Os alertas de tiering (Onda 18) dependem da própria métrica exportada — se o exporter cai, os painéis ficam mudos. O dead-man's switch garante que o silêncio dispare por si só via `up`/`absent`, e o heartbeat detecta o caso em que o exporter responde 200 mas está congelado.

## Próxima onda (21)

Configuração de `blackbox_exporter` para probe HTTPS externo do endpoint `/metrics` + alerta de SSL expiry.
